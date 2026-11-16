import AppKit
import ApplicationServices

func checkAccessibility(expect: @escaping (Bool, String) -> Void) throws {
    let required = [kAXFocusedUIElementChangedNotification, kAXFocusedWindowChangedNotification,
                    kAXMenuOpenedNotification, kAXMenuClosedNotification]
    for failure in required {
        var added: [String] = []
        var removed: [String] = []
        var fail = true
        var client = AccessibilityClient()
        client.setTimeout = { _, _ in .success }
        client.addNotification = { _, _, name, _ in
            if fail && name as String == failure { return .notificationUnsupported }
            added.append(name as String)
            return .success
        }
        client.removeNotification = { _, _, name in removed.append(name as String); return .success }
        let agent = Agent(locations: Locations(), accessibility: client)
        expect(!agent.observe(getpid()), "Agent rejects failed notification: \(failure)")
        expect(removed == Array(added.reversed()), "Failed setup removes partial subscriptions")
        fail = false
        added.removeAll()
        expect(agent.observe(getpid()), "Failure is not cached as a successful observer")
        expect(added == required, "Recovery installs focus and both menu notifications")
        expect(agent.observe(getpid()), "Same observer can be reused")
        expect(added.count == 4, "Reuse does not duplicate subscriptions")
    }

    guard let app = NSRunningApplication(processIdentifier: getpid()) else {
        throw TermKeysError("Cannot inspect test process identity")
    }
    let input = AXUIElementCreateApplication(getpid() + 100_000)
    let window = AXUIElementCreateApplication(getpid() + 200_000)
    let attributes = [kAXFocusedUIElementAttribute, kAXRoleAttribute, kAXWindowAttribute, kAXSubroleAttribute]
    var limited: AXUIElement?
    var copied: [String] = []
    var timeouts: [Float] = []
    var client = AccessibilityClient()
    client.setTimeout = { element, seconds in limited = element; timeouts.append(seconds); return .success }
    client.copyAttribute = { element, name, value in
        expect(limited.map { CFEqual($0, element) } == true, "Each exact receiver has a timeout before IPC")
        limited = nil
        copied.append(name as String)
        switch name as String {
        case kAXFocusedUIElementAttribute: value.pointee = input
        case kAXRoleAttribute: value.pointee = kAXTextAreaRole as CFString
        case kAXWindowAttribute: value.pointee = window
        case kAXSubroleAttribute: value.pointee = kAXStandardWindowSubrole as CFString
        default: return .attributeUnsupported
        }
        return .success
    }
    let focus = Agent(locations: Locations(), accessibility: client).readFocus(app)
    expect(copied == attributes, "Reads application, input and window")
    expect(timeouts == [0.05, 0.05, 0.05, 0.05], "All four calls have 50ms per-call limit")
    expect(focus.role == kAXTextAreaRole && focus.windowSubrole == kAXStandardWindowSubrole, "Successful role lookup preserved")

    for failAt in 1...4 {
        var configured = 0
        copied.removeAll()
        var failing = client
        failing.setTimeout = { element, seconds in
            configured += 1
            if configured == failAt { return .invalidUIElement }
            limited = element
            return .success
        }
        let result = Agent(locations: Locations(), accessibility: failing).readFocus(app)
        expect(result.role == nil && !result.allowsShortcuts, "Timeout setup failure denies shortcuts")
        expect(copied.count == failAt - 1, "No unbounded IPC after timeout setup failure")
    }

    for delayed in [kAXRoleAttribute, kAXSubroleAttribute] {
        var calls = 0
        var delayedClient = client
        delayedClient.copyAttribute = { element, name, value in
            calls += 1
            if name as String == delayed {
                expect(limited.map { CFEqual($0, element) } == true, "Delayed child has its own timeout")
                // Simulate the OS reply at the configured deadline, not a real app hang.
                Thread.sleep(forTimeInterval: 0.05)
                return .cannotComplete
            }
            return client.copyAttribute(element, name, value)
        }
        let result = Agent(locations: Locations(), accessibility: delayedClient).readFocus(app)
        expect(result.role == nil && !result.allowsShortcuts, "Child IPC timeout denies shortcuts")
        expect(calls == (delayed == kAXRoleAttribute ? 2 : 4), "Stops querying after timeout")
    }

    var addCalls = 0
    var invalid = AccessibilityClient()
    invalid.setTimeout = { _, _ in .invalidUIElement }
    invalid.addNotification = { _, _, _, _ in addCalls += 1; return .success }
    let agent = Agent(locations: Locations(), accessibility: invalid)
    expect(!agent.observe(getpid()) && addCalls == 0, "Observer setup fails closed without a timeout")
}
