import AppKit

/// Allow hand jitter, but a drag outside this radius cannot become a click by returning.
struct LinkClickGesture {
    private static let tolerance: CGFloat = 2
    private(set) var pressed: CGPoint?

    mutating func handle(_ type: CGEventType, at point: CGPoint, flags: CGEventFlags, count: Int64) -> CGPoint? {
        let modifiers: CGEventFlags = [.maskCommand, .maskControl, .maskAlternate, .maskShift, .maskSecondaryFn]
        let commandOnly = flags.intersection(modifiers) == .maskCommand
        if type == .leftMouseDown {
            pressed = commandOnly && count == 1 ? point : nil
            return nil
        }
        guard let start = pressed else { return nil }
        let withinTolerance = hypot(point.x - start.x, point.y - start.y) <= Self.tolerance
        if type == .leftMouseDragged && commandOnly && withinTolerance { return nil }
        pressed = nil
        guard type == .leftMouseUp, commandOnly, count == 1, withinTolerance else { return nil }
        return start
    }
}

enum LinkClickResult: String {
    case pressed = "버튼 놓기를 기다리는 중"
    case pending = "주소를 확인하는 중"
    case gestureCancelled = "드래그 또는 보조키 변경으로 취소됨"
    case interrupted = "다른 마우스 입력으로 취소됨"
    case doubleClick = "더블 클릭으로 터미널에 맡김"
    case contextChanged = "앱이나 입력 영역의 상태가 바뀌어 취소됨"
    case noTarget = "클릭한 위치에서 웹 주소를 확인하지 못함"
    case differentTarget = "눌렀을 때와 놓았을 때의 주소가 일치하지 않음"
    case revalidationFailed = "열기 직전에 같은 주소를 다시 확인하지 못함"
    case accepted = "macOS가 열기 요청을 수락함"
    case rejected = "macOS가 열기 요청을 거절함"
}

final class LinkClicks {
    private(set) var lastResult: LinkClickResult?
    typealias Resolve = (pid_t, CGPoint) -> URL?
    typealias CreateTap = (pid_t, CGEventTapPlacement, CGEventTapOptions, CGEventMask, CGEventTapCallBack, UnsafeMutableRawPointer?) -> CFMachPort?
    private let createTap: CreateTap
    private let doubleClickInterval: TimeInterval
    private let resolve: Resolve
    private let open: (URL) -> Bool
    private var pid: pid_t?
    private var tap: CFMachPort?
    private var source: CFRunLoopSource?
    private var gesture = LinkClickGesture()
    private var pending: Timer?
    private var retryAfter: TimeInterval = 0

    init(doubleClickInterval: TimeInterval = NSEvent.doubleClickInterval,
         createTap: @escaping CreateTap = CGEvent.tapCreateForPid,
         resolve: @escaping Resolve, open: @escaping (URL) -> Bool) {
        self.doubleClickInterval = doubleClickInterval
        self.createTap = createTap
        self.resolve = resolve
        self.open = open
    }

    deinit { stop() }

    func cancel() {
        if pending != nil || gesture.pressed != nil { lastResult = .contextChanged }
        pending?.invalidate()
        pending = nil
        gesture = LinkClickGesture()
    }

    func stop() {
        cancel()
        if let source { CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes) }
        if let tap { CFMachPortInvalidate(tap) }
        source = nil
        tap = nil
        pid = nil
        retryAfter = 0
    }

    func listen(to target: pid_t) -> Bool {
        if pid != target {
            stop()
            pid = target
        }
        if let tap { return CGEvent.tapIsEnabled(tap: tap) }
        let now = ProcessInfo.processInfo.systemUptime
        guard now >= retryAfter else { return false }
        retryAfter = now + 5
        let events: [CGEventType] = [.leftMouseDown, .leftMouseUp, .leftMouseDragged, .rightMouseDown, .otherMouseDown, .scrollWheel]
        let mask = events.reduce(CGEventMask(0)) { $0 | (1 << $1.rawValue) }
        let callback: CGEventTapCallBack = { _, type, event, context in
            if let context {
                let monitor = Unmanaged<LinkClicks>.fromOpaque(context).takeUnretainedValue()
                if let pid = monitor.pid { monitor.receive(type, event, for: pid) }
            }
            return Unmanaged.passUnretained(event)
        }
        guard let port = createTap(target, .tailAppendEventTap, .listenOnly, mask, callback,
                                   Unmanaged.passUnretained(self).toOpaque()) else { return false }
        guard let loopSource = CFMachPortCreateRunLoopSource(nil, port, 0) else {
            CFMachPortInvalidate(port)
            return false
        }
        tap = port
        source = loopSource
        CFRunLoopAddSource(CFRunLoopGetMain(), loopSource, .commonModes)
        return CGEvent.tapIsEnabled(tap: port)
    }

    func receive(_ type: CGEventType, _ event: CGEvent, for target: pid_t) {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            cancel()
            if type == .tapDisabledByTimeout, let tap { CGEvent.tapEnable(tap: tap, enable: true) }
            return
        }
        let point = event.location
        let count = event.getIntegerValueField(.mouseEventClickState)
        if pending != nil {
            pending?.invalidate()
            pending = nil
            lastResult = type == .leftMouseDown && count == 2 ? .doubleClick : .interrupted
        }
        let wasPressed = gesture.pressed != nil
        guard let start = gesture.handle(type, at: point, flags: event.flags, count: count) else {
            if type == .leftMouseDown && gesture.pressed != nil { lastResult = .pressed }
            if wasPressed && gesture.pressed == nil { lastResult = .gestureCancelled }
            return
        }
        lastResult = .pending
        // Leave the event callback before querying Terminal. A second click cancels the pending open.
        schedule(after: 0) { [weak self] in
            guard let self else { return }
            guard let url = self.resolve(target, point) else {
                self.lastResult = .noTarget
                return
            }
            guard start == point || self.resolve(target, start) == url else {
                self.lastResult = .differentTarget
                return
            }
            self.schedule(after: self.doubleClickInterval) { [weak self] in
                guard let self else { return }
                guard self.resolve(target, point) == url else {
                    self.lastResult = .revalidationFailed
                    return
                }
                self.lastResult = self.open(url) ? .accepted : .rejected
            }
        }
    }

    private func schedule(after delay: TimeInterval, _ action: @escaping () -> Void) {
        let timer = Timer(timeInterval: delay, repeats: false) { [weak self] _ in
            self?.pending = nil
            action()
        }
        pending = timer
        RunLoop.main.add(timer, forMode: .common)
    }
}
