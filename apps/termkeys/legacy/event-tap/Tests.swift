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
        expect(KeyMapping.destination(for: 123, flags: .maskCommand) == 0, "Command Left -> Control A")
        expect(KeyMapping.destination(for: 124, flags: .maskCommand) == 14, "Command Right -> Control E")
        for extra: CGEventFlags in [.maskShift, .maskAlternate, .maskControl] {
            expect(KeyMapping.destination(for: 123, flags: [.maskCommand, extra]) == nil, "Extra modifiers unchanged")
        }
        expect(KeyMapping.destination(for: 123, flags: []) == nil, "Plain arrow unchanged")
        expect(KeyMapping.destination(for: 125, flags: .maskCommand) == nil, "Command Down unchanged")
        expect(KeyMapping.destination(for: 124, flags: [.maskCommand, .maskNumericPad, .maskSecondaryFn]) == 14, "Arrow flags accepted")
        var mapping = KeyMapping()
        expect(!mapping.needsFocusCheck(key: 123, flags: [], isDown: true), "Plain arrows do not query accessibility")
        expect(!mapping.needsFocusCheck(key: 123, flags: .maskCommand, isDown: false), "Untracked releases do not query accessibility")
        expect(mapping.translate(key: 123, flags: .maskCommand, isDown: true, eligible: false) == nil, "Other app or field unchanged")
        expect(mapping.translate(key: 123, flags: .maskCommand, isDown: true, eligible: true) == 0, "Press")
        expect(mapping.needsFocusCheck(key: 123, flags: [], isDown: false), "Tracked release checks focus")
        expect(mapping.translate(key: 123, flags: .maskCommand, isDown: true, eligible: true) == 0, "Repeat")
        expect(mapping.translate(key: 123, flags: [], isDown: false, eligible: true) == 0, "Release after Command released")
        expect(mapping.translate(key: 123, flags: [], isDown: false, eligible: true) == nil, "No duplicate release")
        _ = mapping.translate(key: 124, flags: .maskCommand, isDown: true, eligible: true)
        expect(mapping.translate(key: 124, flags: .maskCommand, isDown: true, eligible: false) == nil, "Focus change stops repeats")
        expect(mapping.translate(key: 124, flags: [], isDown: false, eligible: true) == nil, "Focus change clears pending key")
        _ = mapping.translate(key: 123, flags: .maskCommand, isDown: true, eligible: true)
        mapping.reset()
        expect(mapping.translate(key: 123, flags: [], isDown: false, eligible: true) == nil, "Reset clears pending key")

        let now = Date()
        let snapshot = AgentStatus(version: "test", pid: 1, updated: now, state: "permission-required", detail: "test")
        expect(snapshot.isFresh(at: now.addingTimeInterval(2)), "Fresh status")
        expect(!snapshot.isFresh(at: now.addingTimeInterval(9)), "Stale status never reported ready")
        expect(!snapshot.isFresh(at: now.addingTimeInterval(-1)), "Clock rollback detected")
        let roundTrip = try JSONDecoder().decode(AgentStatus.self, from: JSONEncoder().encode(snapshot))
        expect(roundTrip.state == "permission-required", "Permission state survives serialization")

        let locations = Locations(home: URL(fileURLWithPath: "/tmp/Test User"))
        let bytes = try PropertyListSerialization.data(fromPropertyList: locations.agentDefinition, format: .xml, options: 0)
        let plist = try PropertyListSerialization.propertyList(from: bytes, format: nil) as! [String: Any]
        expect(plist["ProgramArguments"] as? [String] == ["/tmp/Test User/Applications/TermKeys.app/Contents/MacOS/termkeys", "agent"], "Path with spaces remains one argument")
        expect(plist["KeepAlive"] as? Bool == true, "Agent restarts after exit")
        expect(plist["LimitLoadToSessionType"] as? String == "Aqua", "Only graphical login session")
        print("PASS: \(checks) checks")
    }
}
