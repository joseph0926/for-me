import AppKit
import ApplicationServices
import Foundation

enum WebAddress {
    // AX indices and NSString ranges are both UTF-16 offsets.
    static let radius = 2048

    static func at(_ index: Int, characterCount: Int, read: (NSRange) -> String?) -> URL? {
        guard index >= 0, index < characterCount else { return nil }
        var distance = 32
        var lo = index - min(index, distance)
        var hi = index + min(characterCount - index, distance)
        while true {
            let range = NSRange(location: lo, length: hi - lo)
            guard let slice = read(range) as NSString?, slice.length == range.length else { return nil }
            let click = index - lo
            let delimiters = CharacterSet.newlines
            let before = slice.rangeOfCharacter(from: delimiters, options: .backwards, range: NSRange(location: 0, length: click + 1))
            let after = slice.rangeOfCharacter(from: delimiters, options: [], range: NSRange(location: click, length: slice.length - click))
            let start = before.location == NSNotFound ? 0 : NSMaxRange(before)
            let end = after.location == NSNotFound ? slice.length : after.location
            guard start <= click, click < end else { return nil }
            let left = slice.rangeOfCharacter(from: .whitespaces, options: .backwards,
                                              range: NSRange(location: start, length: click - start + 1))
            let wordStart = left.location == NSNotFound ? start : NSMaxRange(left)
            guard wordStart <= click else { return nil }
            if wordStart > 0 || lo == 0 {
                if slice.character(at: wordStart) == 0x28 { // (
                    let right = slice.rangeOfCharacter(from: .whitespaces, options: [],
                                                       range: NSRange(location: click, length: end - click))
                    let wordEnd = right.location == NSNotFound ? end : right.location
                    let word = slice.substring(with: NSRange(location: wordStart, length: wordEnd - wordStart))
                    if let close = closingParenthesis(in: word) {
                        let first = word.unicodeScalars.index(after: word.startIndex)
                        let address = word[first..<close]
                        let offset = click - wordStart - 1
                        guard offset >= 0, offset < address.utf16.count else { return nil }
                        return printedURL(String(address))
                    }
                    if wordEnd < slice.length || hi == characterCount { return nil }
                } else {
                    let line = slice.substring(with: NSRange(location: start, length: end - start))
                    let content = line.trimmingCharacters(in: .whitespaces)
                    guard content.rangeOfCharacter(from: .whitespacesAndNewlines) == nil else { return nil }
                    if (start > 0 || lo == 0) && (end < slice.length || hi == characterCount) {
                        return printedURL(content)
                    }
                }
            }
            guard distance < radius else { return nil }
            distance *= 2
            lo = before.location == NSNotFound ? index - min(index, distance) : lo + before.location
            hi = after.location == NSNotFound ? index + min(characterCount - index, distance) : range.location + NSMaxRange(after)
        }
    }

    private static func closingParenthesis(in word: String) -> String.Index? {
        var depth = 0
        for index in word.unicodeScalars.indices {
            switch word.unicodeScalars[index] {
            case "(": depth += 1
            case ")":
                depth -= 1
                if depth == 0 { return index }
            default: break
            }
        }
        return nil
    }

    private static func printedURL(_ address: String) -> URL? {
        httpURL(address.lowercased().hasPrefix("www.") ? "https://" + address : address)
    }

    static func httpURL(_ value: String) -> URL? {
        guard value.rangeOfCharacter(from: .controlCharacters) == nil,
              value.rangeOfCharacter(from: CharacterSet(charactersIn: "<>\"")) == nil,
              let parts = URLComponents(string: value), let scheme = parts.scheme?.lowercased(),
              ["http", "https"].contains(scheme), let host = parts.host, !host.isEmpty else { return nil }
        return parts.url
    }
}

extension AccessibilityClient {
    private func destination(_ value: Any?) -> URL? {
        if let url = value as? URL { return WebAddress.httpURL(url.absoluteString) }
        if let string = value as? String { return WebAddress.httpURL(string) }
        return nil
    }

    // A hit may be a link (or its label) inside the focused terminal text area.
    func webAddress(at point: CGPoint, in input: AXUIElement, hit: AXUIElement) -> URL? {
        if !CFEqual(input, hit) {
            var node = hit
            var link: AXUIElement?
            for _ in 0..<16 {
                if CFEqual(node, input) {
                    guard let link else { return nil }
                    return destination(attribute(link, kAXURLAttribute))
                }
                if attribute(node, kAXRoleAttribute) as? String == NSAccessibility.Role.link.rawValue {
                    link = node
                }
                guard let parent = attribute(node, kAXParentAttribute),
                      CFGetTypeID(parent) == AXUIElementGetTypeID() else { return nil }
                node = parent as! AXUIElement
            }
            return nil
        }
        var position = point
        guard let pointValue = AXValueCreate(.cgPoint, &position),
              let glyph = parameter(input, kAXRangeForPositionParameterizedAttribute, pointValue),
              CFGetTypeID(glyph) == AXValueGetTypeID() else { return nil }
        var range = CFRange()
        guard AXValueGetValue(glyph as! AXValue, .cfRange, &range), range.length > 0,
              let bounds = parameter(input, kAXBoundsForRangeParameterizedAttribute, glyph),
              CFGetTypeID(bounds) == AXValueGetTypeID() else { return nil }
        var rect = CGRect.zero
        guard AXValueGetValue(bounds as! AXValue, .cgRect, &rect), rect.contains(point),
              setTimeout(input, 0.05) == .success else { return nil }

        var value: CFTypeRef?
        let result = copyParameter(input, kAXAttributedStringForRangeParameterizedAttribute as CFString, glyph, &value)
        switch result {
        case .success:
            guard let styled = value as? NSAttributedString, styled.length == range.length else { return nil }
            let attributes = styled.attributes(at: 0, effectiveRange: nil)
            if let target = attributes[.accessibilityLink] ?? attributes[.link] {
                let object = target as CFTypeRef
                if CFGetTypeID(object) == AXUIElementGetTypeID() {
                    return destination(attribute(object as! AXUIElement, kAXURLAttribute))
                }
                return destination(target)
            }
        case .parameterizedAttributeUnsupported, .attributeUnsupported, .noValue, .notImplemented:
            break
        default:
            return nil
        }
        guard let count = attribute(input, kAXNumberOfCharactersAttribute) as? NSNumber else { return nil }
        return WebAddress.at(range.location, characterCount: count.intValue) { requested in
            var characters = CFRange(location: requested.location, length: requested.length)
            guard let value = AXValueCreate(.cfRange, &characters) else { return nil }
            return parameter(input, kAXStringForRangeParameterizedAttribute, value) as? String
        }
    }
}
