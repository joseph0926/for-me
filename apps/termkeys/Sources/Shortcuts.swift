import CoreGraphics

enum LineShortcut: UInt32, CaseIterable {
    case beginning = 1
    case end = 2

    var arrow: CGKeyCode { self == .beginning ? 123 : 124 }
    var controlKey: CGKeyCode { self == .beginning ? 0 : 14 }
    var controlCharacter: UniChar { self == .beginning ? 1 : 5 }
}

struct InputFocus {
    let pid: Int32
    let bundle: String?
    let role: String?
    let windowSubrole: String?
    let menuOpen: Bool

    var allowsShortcuts: Bool {
        bundle == "com.apple.Terminal" && role == "AXTextArea"
            && windowSubrole == "AXStandardWindow" && !menuOpen
    }
}

/// A failed second registration must release the first shortcut too.
final class ShortcutRegistration<Handle> {
    private(set) var handles: [Handle] = []
    private(set) var pid: Int32?
    let register: (LineShortcut) throws -> Handle
    let unregister: (Handle) -> Void

    init(register: @escaping (LineShortcut) throws -> Handle, unregister: @escaping (Handle) -> Void) {
        self.register = register
        self.unregister = unregister
    }

    func update(target: Int32?) throws {
        guard target != pid else { return }
        clear()
        guard let target else { return }
        do {
            for shortcut in LineShortcut.allCases { handles.append(try register(shortcut)) }
            pid = target
        } catch {
            clear()
            throw error
        }
    }

    func clear() {
        for handle in handles { unregister(handle) }
        handles.removeAll()
        pid = nil
    }
}

func keyPair(key: CGKeyCode, flags: CGEventFlags, character: UniChar? = nil) -> [CGEvent]? {
    guard let down = CGEvent(keyboardEventSource: nil, virtualKey: key, keyDown: true),
          let up = CGEvent(keyboardEventSource: nil, virtualKey: key, keyDown: false) else { return nil }
    for event in [down, up] {
        event.flags = flags
        if var character { event.keyboardSetUnicodeString(stringLength: 1, unicodeString: &character) }
    }
    return [down, up]
}
