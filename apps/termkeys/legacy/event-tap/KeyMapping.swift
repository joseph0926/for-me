import CoreGraphics

/// Tracks the matching release even when Command is released before the arrow.
struct KeyMapping {
    private var pressed: [CGKeyCode: CGKeyCode] = [:]

    func needsFocusCheck(key: CGKeyCode, flags: CGEventFlags, isDown: Bool) -> Bool {
        pressed[key] != nil || (isDown && Self.destination(for: key, flags: flags) != nil)
    }

    static func destination(for key: CGKeyCode, flags: CGEventFlags) -> CGKeyCode? {
        let modifiers: CGEventFlags = [.maskCommand, .maskControl, .maskAlternate, .maskShift]
        guard flags.intersection(modifiers) == .maskCommand else { return nil }
        switch key {
        case 123: return 0 // Left -> A
        case 124: return 14 // Right -> E
        default: return nil
        }
    }

    mutating func translate(
        key: CGKeyCode, flags: CGEventFlags, isDown: Bool, eligible: Bool
    ) -> CGKeyCode? {
        if !isDown {
            let destination = pressed.removeValue(forKey: key)
            return eligible ? destination : nil
        }
        guard eligible else {
            pressed.removeValue(forKey: key)
            return nil
        }
        if let destination = pressed[key] { return destination }
        guard let destination = Self.destination(for: key, flags: flags) else { return nil }
        pressed[key] = destination
        return destination
    }

    mutating func reset() { pressed.removeAll() }
}
