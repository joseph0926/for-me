import Foundation
import CoreGraphics

@main
struct Tests {
    static func main() throws {
        var checks = 0
        func expect(_ condition: Bool, _ name: String) {
            guard condition else {
                FileHandle.standardError.write(Data("FAIL: \(name)\n".utf8))
                exit(1)
            }
            checks += 1
        }
        let terminal = InputFocus(pid: 10, bundle: "com.apple.Terminal", role: "AXTextArea", windowSubrole: "AXStandardWindow", menuOpen: false)
        expect(terminal.allowsShortcuts, "Terminal input allowed")
        for focus in [
            InputFocus(pid: 10, bundle: "com.apple.TextEdit", role: "AXTextArea", windowSubrole: "AXStandardWindow", menuOpen: false),
            InputFocus(pid: 10, bundle: "com.apple.Terminal", role: "AXTextField", windowSubrole: "AXStandardWindow", menuOpen: false),
            InputFocus(pid: 10, bundle: "com.apple.Terminal", role: "AXTextArea", windowSubrole: "AXDialog", menuOpen: false),
            InputFocus(pid: 10, bundle: "com.apple.Terminal", role: nil, windowSubrole: nil, menuOpen: false),
            InputFocus(pid: 10, bundle: "com.apple.Terminal", role: "AXTextArea", windowSubrole: "AXStandardWindow", menuOpen: true)
        ] { expect(!focus.allowsShortcuts, "Other app, search, dialog, unknown focus or menu excluded") }

        var registered: [LineShortcut] = []
        var released: [UInt32] = []
        var failOnEnd = false
        let registration = ShortcutRegistration<UInt32>(register: { shortcut in
            if failOnEnd && shortcut == .end { throw TermKeysError("registration conflict") }
            registered.append(shortcut)
            return shortcut.rawValue
        }, unregister: { released.append($0) })
        try registration.update(target: 10, canPost: true)
        expect(registered == [.beginning, .end], "Only two shortcuts registered")
        try registration.update(target: 10, canPost: true)
        expect(registered.count == 2, "Same target does not re-register")
        try registration.update(target: nil, canPost: true)
        expect(released == [1, 2] && registration.pid == nil, "Leaving terminal releases both")
        try registration.update(target: nil, canPost: true)
        expect(released.count == 2, "Repeated unregister is harmless")
        failOnEnd = true
        do {
            try registration.update(target: 10, canPost: true)
            expect(false, "Conflict should throw")
        } catch {
            expect(registration.pid == nil && registration.handles.isEmpty, "Conflict leaves no partial registration")
            expect(released == [1, 2, 1], "First key released if second fails")
        }
        failOnEnd = false
        try registration.update(target: 10, canPost: true)
        try registration.update(target: 20, canPost: true)
        expect(registration.pid == 20 && released.suffix(2) == [1, 2], "New terminal process replaces reservations")
        registration.clear()

        try registration.update(target: 10, canPost: true)
        var posted: [(CGEvent, Int32)] = []
        func capture(_ event: CGEvent, _ target: Int32) { posted.append((event, target)) }
        let switched = registration.deliver(.beginning, focus: terminal, canPost: true, frontmostPID: { 20 }, post: capture)
        expect(switched == .focusChanged && registration.handles.isEmpty, "Release both reservations when focus changes after the AX query")
        expect(posted.map { $0.1 } == [20, 20] && posted.map { $0.0.type } == [.keyDown, .keyUp] &&
               posted.allSatisfy { $0.0.flags == .maskCommand && $0.0.getIntegerValueField(.keyboardEventKeycode) == 123 },
               "The new frontmost app receives the original Command-left exactly once")

        posted.removeAll()
        try registration.update(target: 10, canPost: true)
        let denied = registration.deliver(.end, focus: terminal, canPost: false, frontmostPID: { 10 }, post: capture)
        expect(denied == .postUnavailable && registration.handles.isEmpty && posted.isEmpty,
               "Revocation during delivery releases shortcuts without sending keys")
        let registrationsBeforeDenial = registered.count
        for _ in 0..<3 {
            let ready = try registration.update(target: 10, canPost: false)
            expect(!ready && registered.count == registrationsBeforeDenial && registration.pid == nil,
                   "Refresh must leave the original shortcuts available while permission is denied")
        }
        let restored = try registration.update(target: 10, canPost: true)
        let moved = registration.deliver(.end, focus: terminal, canPost: true, frontmostPID: { 10 }, post: capture)
        expect(restored && registered.count == registrationsBeforeDenial + 2 && moved == .movementRequested &&
               posted.map { $0.1 } == [10, 10] && posted.allSatisfy { $0.0.flags == .maskControl },
               "Restoring permission enables movement again in the same Terminal")
        let readyAfterRevocation = try registration.update(target: 10, canPost: false)
        expect(!readyAfterRevocation && registration.handles.isEmpty, "Periodic refresh releases shortcuts before another press")
        posted.removeAll()
        _ = registration.deliver(.end, focus: nil, canPost: true, frontmostPID: { nil }, post: capture)
        expect(posted.isEmpty, "No replay to a stale process when there is no frontmost app")

        for (shortcut, key, character) in [(LineShortcut.beginning, 0, 1), (.end, 14, 5)] {
            guard let events = keyPair(key: shortcut.controlKey, flags: .maskControl, character: shortcut.controlCharacter) else {
                throw TermKeysError("Cannot construct keyboard event")
            }
            expect(events.count == 2 && events[0].type == .keyDown && events[1].type == .keyUp, "Complete press and release")
            for event in events {
                expect(event.getIntegerValueField(.keyboardEventKeycode) == key, "Control A/E key code")
                expect(event.flags == .maskControl, "Command does not leak into output")
                var length = 0
                var text: UniChar = 0
                event.keyboardGetUnicodeString(maxStringLength: 1, actualStringLength: &length, unicodeString: &text)
                expect(length == 1 && text == character, "Control character is explicit")
            }
        }
        guard let original = keyPair(key: 123, flags: .maskCommand) else { throw TermKeysError("Cannot construct fallback") }
        expect(original[0].flags == .maskCommand && original[0].getIntegerValueField(.keyboardEventKeycode) == 123, "Raced focus can return original shortcut")

        let now = Date()
        let snapshot = AgentStatus(version: "test", pid: 1, updated: now, state: "permission-required", detail: "test")
        expect(snapshot.isFresh(at: now.addingTimeInterval(2)), "Fresh status")
        expect(!snapshot.isFresh(at: now.addingTimeInterval(9)), "Stale status never reported ready")
        expect(!snapshot.isFresh(at: now.addingTimeInterval(-1)), "Clock rollback detected")
        let roundTrip = try JSONDecoder().decode(AgentStatus.self, from: JSONEncoder().encode(snapshot))
        expect(roundTrip.state == "permission-required", "Permission state survives serialization")
        expect(roundTrip.lastLinkResult == nil, "Status files without a click result can still be read")
        var clicked = snapshot
        clicked.lastLinkResult = LinkClickResult.noTarget.rawValue
        let encoded = try JSONEncoder().encode(clicked)
        let decoded = try JSONDecoder().decode(AgentStatus.self, from: encoded)
        expect(decoded.lastLinkResult == LinkClickResult.noTarget.rawValue, "Latest click result survives serialization")

        let locations = Locations(home: URL(fileURLWithPath: "/tmp/Test User"))
        let bytes = try PropertyListSerialization.data(fromPropertyList: locations.agentDefinition, format: .xml, options: 0)
        let plist = try PropertyListSerialization.propertyList(from: bytes, format: nil) as! [String: Any]
        expect(plist["ProgramArguments"] as? [String] == ["/tmp/Test User/Applications/TermKeys.app/Contents/MacOS/termkeys", "agent"], "Path with spaces remains one argument")
        expect(plist["KeepAlive"] as? Bool == true, "Agent restarts after exit")
        expect(plist["LimitLoadToSessionType"] as? String == "Aqua", "Only graphical login session")
        let missingService = "dev.for-me.termkeys.test-" + UUID().uuidString
        let exists = try isLoaded("system/" + missingService)
        expect(!exists, "A missing service in an existing domain is unregistered")
        do {
            _ = try isLoaded("gui/4294967294/" + missingService)
            expect(false, "A domain lookup error must not confirm shutdown")
        } catch let error as TermKeysError {
            expect(error.message.contains("112"), "Report the domain lookup failure with its exit code")
        }
        try checkLinkClicks(expect: expect)
        try checkAccessibility(expect: expect)
        print("PASS: \(checks) checks")
    }
}
