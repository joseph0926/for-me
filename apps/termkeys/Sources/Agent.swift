import AppKit
import ApplicationServices
import Carbon

final class Agent {
    private static let signature: OSType = 0x544B4559 // TKEY
    private let locations: Locations
    private let accessibility: AccessibilityClient
    private lazy var links = LinkClicks(resolve: { [weak self] pid, point in
        self?.webAddress(pid: pid, point: point)
    }, open: { url in NSWorkspace.shared.open(url) })
    private var handler: EventHandlerRef?
    private var observer: AXObserver?
    private var observedPID: pid_t?
    private var notifications: [NSObjectProtocol] = []
    private var timer: Timer?
    private var menuOpen = false
    private var suspended = false
    private var didPrompt = false
    private var received = 0
    private var sent = 0
    private var lastWrite = Date.distantPast
    private var lastState = ""
    private var lastReportedLinkResult: LinkClickResult?
    private var lastError: String?
    private var setupError: String?

    private let shortcuts = ShortcutRegistration<EventHotKeyRef>(register: { shortcut in
        var reference: EventHotKeyRef?
        let result = RegisterEventHotKey(
            UInt32(shortcut.arrow), UInt32(cmdKey),
            EventHotKeyID(signature: Agent.signature, id: shortcut.rawValue),
            GetApplicationEventTarget(), OptionBits(kEventHotKeyExclusive), &reference
        )
        guard result == noErr, let reference else {
            throw TermKeysError("단축키 등록 실패 (\(result)). 다른 단축키 앱과의 충돌을 확인하세요.")
        }
        return reference
    }, unregister: { reference in
        // An unregistration error must not leave an invisible global shortcut behind.
        guard UnregisterEventHotKey(reference) == noErr else { exit(1) }
    })

    init(locations: Locations, accessibility: AccessibilityClient = AccessibilityClient()) {
        self.locations = locations
        self.accessibility = accessibility
    }

    deinit { removeObserver() }

    func start() {
        var event = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let result = InstallEventHandler(GetApplicationEventTarget(), { _, event, context in
            guard let event, let context else { return OSStatus(eventNotHandledErr) }
            let agent = Unmanaged<Agent>.fromOpaque(context).takeUnretainedValue()
            return agent.handle(event)
        }, 1, &event, Unmanaged.passUnretained(self).toOpaque(), &handler)
        if result != noErr { setupError = "단축키 통지 처리 시작 실패 (\(result))" }

        let center = NSWorkspace.shared.notificationCenter
        for name in [NSWorkspace.didActivateApplicationNotification, NSWorkspace.didDeactivateApplicationNotification,
                     NSWorkspace.didTerminateApplicationNotification] {
            notifications.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                guard let self else { return }
                self.links.stop()
                self.shortcuts.clear()
                self.refresh()
            })
        }
        for name in [NSWorkspace.sessionDidResignActiveNotification, NSWorkspace.screensDidSleepNotification] {
            notifications.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                self?.suspended = true
                self?.shortcuts.clear()
                self?.refresh()
            })
        }
        for name in [NSWorkspace.sessionDidBecomeActiveNotification, NSWorkspace.screensDidWakeNotification] {
            notifications.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                self?.suspended = false
                self?.refresh()
            })
        }
        refresh()
        timer = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in self?.refresh() }
        RunLoop.main.add(timer!, forMode: .common)
        NSApplication.shared.run()
    }

    private func refresh() {
        if let setupError {
            links.stop()
            shortcuts.clear()
            report("unavailable", setupError)
            return
        }
        guard AXIsProcessTrusted() else {
            links.stop()
            shortcuts.clear()
            removeObserver()
            if !didPrompt {
                didPrompt = true
                let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
                _ = AXIsProcessTrustedWithOptions(options as CFDictionary)
            }
            report("permission-required", "시스템 설정 → 개인정보 보호 및 보안 → 손쉬운 사용에서 TermKeys를 허용하세요.")
            return
        }
        guard !suspended, let app = NSWorkspace.shared.frontmostApplication,
              app.bundleIdentifier == "com.apple.Terminal" else {
            links.stop()
            shortcuts.clear()
            removeObserver()
            report("waiting-terminal", "실행 중. 기본 터미널을 사용할 때만 두 단축키를 등록합니다.")
            return
        }
        guard observe(app.processIdentifier) else {
            links.stop()
            shortcuts.clear()
            report("focus-unavailable", "터미널의 초점 또는 메뉴 감시를 시작할 수 없어 단축키를 등록하지 않았습니다.")
            return
        }
        let focus = readFocus(app)
        guard focus.allowsShortcuts,
              NSWorkspace.shared.frontmostApplication?.processIdentifier == app.processIdentifier else {
            links.stop()
            shortcuts.clear()
            report("waiting-input", "실행 중. 터미널 입력 영역을 기다립니다.")
            return
        }
        let listening = links.listen(to: focus.pid)
        do {
            try shortcuts.update(target: focus.pid)
            if listening {
                report("registered", "줄 이동 단축키와 웹 주소 클릭 입력을 기다립니다.")
            } else {
                report("link-listener-unavailable", "줄 이동 단축키는 등록됐으나 마우스 입력을 받을 수 없습니다. 손쉬운 사용 권한을 확인하세요.")
            }
        } catch {
            report("registration-failed", error.localizedDescription)
        }
    }

    func observe(_ pid: pid_t) -> Bool {
        if observedPID == pid { return observer != nil }
        removeObserver()
        var candidate: AXObserver?
        let result = accessibility.createObserver(pid, { _, _, notification, context in
            guard let context else { return }
            let agent = Unmanaged<Agent>.fromOpaque(context).takeUnretainedValue()
            if notification as String == kAXMenuOpenedNotification { agent.menuOpen = true }
            if notification as String == kAXMenuClosedNotification { agent.menuOpen = false }
            agent.links.cancel()
            agent.shortcuts.clear()
            agent.refresh()
        }, &candidate)
        guard result == .success, let candidate else { return false }
        let application = AXUIElementCreateApplication(pid)
        guard accessibility.subscribe(candidate, application: application,
                                      context: Unmanaged.passUnretained(self).toOpaque()) else { return false }
        observer = candidate
        observedPID = pid
        CFRunLoopAddSource(CFRunLoopGetMain(), AXObserverGetRunLoopSource(candidate), .commonModes)
        return true
    }

    private func removeObserver() {
        if let observer { CFRunLoopRemoveSource(CFRunLoopGetMain(), AXObserverGetRunLoopSource(observer), .commonModes) }
        observer = nil
        observedPID = nil
        menuOpen = false
    }

    func readFocus(_ app: NSRunningApplication) -> InputFocus {
        let application = AXUIElementCreateApplication(app.processIdentifier)
        guard let input = elementAttribute(application, kAXFocusedUIElementAttribute),
              let role = stringAttribute(input, kAXRoleAttribute),
              let window = elementAttribute(input, kAXWindowAttribute),
              let subrole = stringAttribute(window, kAXSubroleAttribute) else {
            return InputFocus(pid: app.processIdentifier, bundle: app.bundleIdentifier,
                              role: nil, windowSubrole: nil, menuOpen: menuOpen)
        }
        return InputFocus(pid: app.processIdentifier, bundle: app.bundleIdentifier,
                          role: role, windowSubrole: subrole, menuOpen: menuOpen)
    }

    private func elementAttribute(_ element: AXUIElement, _ name: String) -> AXUIElement? {
        guard let value = accessibility.attribute(element, name),
              CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
        return (value as! AXUIElement)
    }

    private func stringAttribute(_ element: AXUIElement, _ name: String) -> String? {
        accessibility.attribute(element, name) as? String
    }

    private func webAddress(pid: pid_t, point: CGPoint) -> URL? {
        guard AXIsProcessTrusted(), !suspended, !menuOpen, observedPID == pid,
              let app = NSWorkspace.shared.frontmostApplication, app.processIdentifier == pid,
              app.bundleIdentifier == "com.apple.Terminal" else { return nil }
        let application = AXUIElementCreateApplication(pid)
        guard let input = elementAttribute(application, kAXFocusedUIElementAttribute),
              let hit = accessibility.hitTest(point),
              stringAttribute(input, kAXRoleAttribute) == kAXTextAreaRole,
              let window = elementAttribute(input, kAXWindowAttribute),
              stringAttribute(window, kAXSubroleAttribute) == kAXStandardWindowSubrole,
              let url = accessibility.webAddress(at: point, in: input, hit: hit),
              NSWorkspace.shared.frontmostApplication?.processIdentifier == pid else { return nil }
        return url
    }

    private func handle(_ event: EventRef) -> OSStatus {
        var id = EventHotKeyID()
        guard GetEventParameter(event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID),
                                nil, MemoryLayout<EventHotKeyID>.size, nil, &id) == noErr,
              id.signature == Self.signature, let shortcut = LineShortcut(rawValue: id.id) else {
            return OSStatus(eventNotHandledErr)
        }
        received += 1
        guard let app = NSWorkspace.shared.frontmostApplication else {
            shortcuts.clear()
            return noErr
        }
        let focus = readFocus(app)
        guard AXIsProcessTrusted(), !suspended, focus.allowsShortcuts, shortcuts.pid == focus.pid else {
            // A focus change can race its notification. Release the reservation and
            // return the original shortcut to the currently focused app.
            shortcuts.clear()
            if let events = keyPair(key: shortcut.arrow, flags: .maskCommand),
               NSWorkspace.shared.frontmostApplication?.processIdentifier == app.processIdentifier {
                for event in events { event.postToPid(app.processIdentifier) }
            }
            refresh()
            return noErr
        }
        guard CGPreflightPostEventAccess(),
              let events = keyPair(key: shortcut.controlKey, flags: .maskControl, character: shortcut.controlCharacter) else {
            shortcuts.clear()
            report("post-unavailable", "이동 키 전송 권한을 확인하지 못했습니다. 손쉬운 사용 권한을 확인하세요.", force: true)
            return noErr
        }
        guard NSWorkspace.shared.frontmostApplication?.processIdentifier == focus.pid else { return noErr }
        for event in events { event.postToPid(focus.pid) }
        sent += 1
        report("registered", "두 단축키 등록됨. 키 전송을 요청했습니다. 실제 이동 성공 여부는 별도 확인이 필요합니다.", force: true)
        return noErr
    }

    private func report(_ state: String, _ detail: String, force: Bool = false) {
        let linkResult = links.lastResult
        guard force || state != lastState || linkResult != lastReportedLinkResult || Date().timeIntervalSince(lastWrite) >= 1 else { return }
        do {
            let snapshot = AgentStatus(version: appVersion, pid: getpid(), updated: Date(), state: state, detail: detail,
                                       secureInput: IsSecureEventInputEnabled(), hotKeyEvents: received, sentPairs: sent,
                                       lastLinkResult: linkResult?.rawValue)
            try JSONEncoder().encode(snapshot).write(to: locations.status, options: .atomic)
            lastWrite = Date()
            lastState = state
            lastReportedLinkResult = linkResult
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
