import AppKit
import ApplicationServices
import Carbon

final class Agent {
    private let locations: Locations
    private var tap: CFMachPort?
    private var source: CFRunLoopSource?
    private var timer: Timer?
    private var mapping = KeyMapping()
    private var userDisabled = false
    private var didPrompt = false
    private var lastError: String?

    init(locations: Locations) { self.locations = locations }

    func start() {
        refresh()
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            self?.refresh()
        }
        NSApplication.shared.run()
    }

    private func refresh() {
        guard AXIsProcessTrusted() else {
            removeTap()
            if !didPrompt {
                didPrompt = true
                let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
                _ = AXIsProcessTrustedWithOptions(options as CFDictionary)
            }
            report("permission-required", "시스템 설정 → 개인정보 보호 및 보안 → 손쉬운 사용에서 TermKeys를 허용하세요.")
            return
        }
        if IsSecureEventInputEnabled() {
            mapping.reset()
            report("secure-input", "보안 키보드 입력으로 일시 중지됨. 해당 설정은 자동으로 바꾸지 않습니다.")
            return
        }
        if userDisabled {
            report("paused", "macOS가 키 변환을 중지했습니다. termkeys off 후 on으로 다시 시작하세요.")
            return
        }
        if tap == nil { installTap() }
        guard let tap, CGEvent.tapIsEnabled(tap: tap) else {
            report("unavailable", "키 변환을 시작하지 못했습니다. 손쉬운 사용 권한을 확인하고 off 후 on을 실행하세요.")
            return
        }
        report("ready", "실행 중. 기본 터미널의 입력 영역에서 ⌘←/⌘→를 Ctrl+A/E로 바꿉니다.")
    }

    private func installTap() {
        let mask = (CGEventMask(1) << CGEventType.keyDown.rawValue)
            | (CGEventMask(1) << CGEventType.keyUp.rawValue)
        let callback: CGEventTapCallBack = { _, type, event, context in
            guard let context else { return Unmanaged.passUnretained(event) }
            let agent = Unmanaged<Agent>.fromOpaque(context).takeUnretainedValue()
            return agent.handle(type: type, event: event)
        }
        guard let newTap = CGEvent.tapCreate(
            tap: .cgSessionEventTap, place: .headInsertEventTap, options: .defaultTap,
            eventsOfInterest: mask, callback: callback,
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        ) else { return }
        guard let newSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, newTap, 0) else {
            CFMachPortInvalidate(newTap)
            return
        }
        tap = newTap
        source = newSource
        CFRunLoopAddSource(CFRunLoopGetMain(), newSource, .commonModes)
    }

    private func removeTap() {
        if let source { CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes) }
        if let tap { CFMachPortInvalidate(tap) }
        source = nil
        tap = nil
        mapping.reset()
    }

    private func handle(type: CGEventType, event: CGEvent) -> Unmanaged<CGEvent>? {
        if type == .tapDisabledByTimeout {
            mapping.reset()
            if let tap { CGEvent.tapEnable(tap: tap, enable: true) }
            return Unmanaged.passUnretained(event)
        }
        if type == .tapDisabledByUserInput {
            userDisabled = true
            mapping.reset()
            return Unmanaged.passUnretained(event)
        }
        guard type == .keyDown || type == .keyUp else { return Unmanaged.passUnretained(event) }
        let key = CGKeyCode(event.getIntegerValueField(.keyboardEventKeycode))
        guard key == 123 || key == 124 else { return Unmanaged.passUnretained(event) }
        guard mapping.needsFocusCheck(key: key, flags: event.flags, isDown: type == .keyDown) else {
            return Unmanaged.passUnretained(event)
        }
        let eligible = !IsSecureEventInputEnabled() && terminalInputIsFocused()
        guard let destination = mapping.translate(
            key: key, flags: event.flags, isDown: type == .keyDown, eligible: eligible
        ) else { return Unmanaged.passUnretained(event) }
        event.setIntegerValueField(.keyboardEventKeycode, value: Int64(destination))
        event.flags = .maskControl
        // Replace the arrow's cached text too; avoid relying on the active keyboard layout.
        var character: UniChar = destination == 0 ? 1 : 5
        event.keyboardSetUnicodeString(stringLength: 1, unicodeString: &character)
        return Unmanaged.passUnretained(event)
    }

    private func terminalInputIsFocused() -> Bool {
        guard let app = NSWorkspace.shared.frontmostApplication,
              app.bundleIdentifier == "com.apple.Terminal" else { return false }
        let element = AXUIElementCreateApplication(app.processIdentifier)
        AXUIElementSetMessagingTimeout(element, 0.03)
        var focused: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXFocusedUIElementAttribute as CFString, &focused) == .success,
              let focused, CFGetTypeID(focused) == AXUIElementGetTypeID() else { return false }
        let input = focused as! AXUIElement
        var role: CFTypeRef?
        guard AXUIElementCopyAttributeValue(input, kAXRoleAttribute as CFString, &role) == .success,
              role as? String == kAXTextAreaRole else { return false }
        // Read only roles, never terminal text, selection, commands or window titles.
        var window: CFTypeRef?
        guard AXUIElementCopyAttributeValue(input, kAXWindowAttribute as CFString, &window) == .success,
              let window, CFGetTypeID(window) == AXUIElementGetTypeID() else { return false }
        var subrole: CFTypeRef?
        return AXUIElementCopyAttributeValue(window as! AXUIElement, kAXSubroleAttribute as CFString, &subrole) == .success
            && subrole as? String == kAXStandardWindowSubrole
    }

    private func report(_ state: String, _ detail: String) {
        do {
            let snapshot = AgentStatus(version: appVersion, pid: getpid(), updated: Date(), state: state, detail: detail)
            try JSONEncoder().encode(snapshot).write(to: locations.status, options: .atomic)
            lastError = nil
        } catch {
            let message = "상태 파일 기록 실패: \(error.localizedDescription)"
            if lastError != message {
                FileHandle.standardError.write(Data((message + "\n").utf8))
                lastError = message
            }
        }
    }
}
