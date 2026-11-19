import AppKit
import ApplicationServices

func checkLinkClicks(expect: @escaping (Bool, String) -> Void) throws {
    func address(_ value: String, _ click: String) -> URL? {
        let text = value as NSString
        return WebAddress.at(text.range(of: click).location, characterCount: text.length, read: text.substring(with:))
    }
    let ambiguous = "수정 후에는 https://leetcode.com/problems/symmetric-tree/까지만 추출합니다."
    expect(address(ambiguous, "symmetric-tree") == nil && address(ambiguous, "까지만") == nil,
           "Do not guess the end of an inline URL followed by Korean text")
    let feedback = "이제 101번 Symmetric Tree (https://leetcode.com/problems/symmetric-tree/)를 이어서 풀어보세요."
    expect(address(feedback, "symmetric-tree")?.absoluteString == "https://leetcode.com/problems/symmetric-tree/",
           "Korean text after the closing parenthesis stays outside the address")
    let line = "앞 줄\n  http://localhost:3000/x?q=1&b=2  \r\n뒤 줄"
    expect(address(line, "3000")?.absoluteString == "http://localhost:3000/x?q=1&b=2", "Only the standalone URL is opened")
    expect(address(line, "  http") == nil && address(line, "뒤") == nil, "Padding and other lines do not activate URL")
    let mdn = "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide#microtasks"
    let printedMDN = "약 100단어입니다. MDN 원문 열기\n  (\(mdn))"
    for click in ["https", "HTML_DOM_API", "#", "microtasks"] {
        expect(address(printedMDN, click)?.absoluteString == mdn, "The standalone parenthesized MDN URL keeps its fragment")
    }
    for click in ["원문", "  (", "(", ")"] {
        expect(address(printedMDN, click) == nil, "The preceding label, padding and outer delimiters are not clickable")
    }
    expect(address("(https://example.com/wiki/Tree_(data_structure))", "Tree")?.absoluteString ==
           "https://example.com/wiki/Tree_(data_structure)", "Keep parentheses that belong to the URL")
    let sentence = "  MDN 지문 (\(mdn))을 다시 보며 세 질문에\n  답해 주세요."
    let source = sentence as NSString
    let urlRange = source.range(of: mdn)
    for index in 0..<source.length {
        let found = WebAddress.at(index, characterCount: source.length, read: source.substring(with:))
        expect(found?.absoluteString == (NSLocationInRange(index, urlRange) ? mdn : nil),
               "Only characters inside the MDN address activate its complete fragment")
    }
    let multiple = "🔗 첫째 (\(mdn))와 둘째 (www.example.org/wiki/한글_(예시))입니다."
    expect(address(multiple, "microtasks")?.absoluteString == mdn, "Select the first address in prose")
    expect(address(multiple, "예시") == URLComponents(string: "https://www.example.org/wiki/한글_(예시)")?.url,
           "Select the second address and preserve its Korean path and inner parentheses")
    let longLine = String(repeating: "설명 ", count: 1000) + "(\(mdn))을 " + String(repeating: "문장 ", count: 1000)
    expect(address(longLine, "microtasks")?.absoluteString == mdn, "A local pair identifies the URL on a long line")
    for invalid in ["설명 (\(mdn)", "(https://example.com/a_(b)", "(ssh://example.org)",
                    "설명 (https://example.com/a b)", "설명 (\(mdn)\n)을"] {
        expect(address(invalid, invalid.contains("ssh") ? "ssh" : "https") == nil,
               "Only a complete pair around a single web address is usable")
    }
    expect(address(" www.example.com ", "example")?.host == "www.example.com", "Standalone www address")
    let korean = "https://example.com/a_(b(c))/까지만?q=한글!"
    expect(address(korean, "까지만")?.absoluteString == URLComponents(string: korean)?.url?.absoluteString,
           "Keep Korean path, balanced parentheses and query punctuation exactly")
    expect(address("[문제](https://example.com)", "문제") == nil, "Literal markup is not a semantic link")
    expect(address("https://a.com/ https://b.com/", "a.com") == nil, "Two addresses are not a standalone URL")
    for token in ["file:///tmp/a", "ssh://example.com", "person@example.com", "ordinary", "mailto:me@example.com"] {
        expect(address(token, token) == nil, "Only printed web addresses allowed")
    }
    let prefix = "https://example.com/"
    let limit = WebAddress.radius
    let exact = prefix + String(repeating: "a", count: limit - prefix.count)
    expect(address(exact, "https")?.absoluteString == exact, "Complete URL at read limit")
    expect(address(exact + "z", "https") == nil, "Refuse a truncated URL instead of opening its prefix")
    var reads: [NSRange] = []
    let scrollback = (String(repeating: "old line\n", count: 3000) + exact + " end\n") as NSString
    let offset = scrollback.range(of: prefix).location
    _ = WebAddress.at(offset + 500, characterCount: scrollback.length) {
        reads.append($0)
        return scrollback.substring(with: $0)
    }
    expect(reads.allSatisfy { $0.length <= 2 * limit && $0.location > 0 }, "Bounded queries never request the scrollback")
    expect(WebAddress.at(10, characterCount: 40) { _ in "short" } == nil, "Truncated AX reply cancels lookup")

    let point = CGPoint(x: 26, y: 10)
    let url = URL(string: "https://example.com")!
    var candidate: URL? = url
    var lookups = 0
    var opened: [URL] = []
    var acceptOpen = true
    var attempts = 0
    var differentTarget: CGPoint?
    let monitor = LinkClicks(doubleClickInterval: 0.02, createTap: { pid, _, options, mask, _, _ in
        attempts += 1
        expect(pid == 42 && options == .listenOnly && (mask & (1 << CGEventType.keyDown.rawValue)) == 0, "Listener targets Terminal mouse events only")
        return nil
    }, resolve: { _, location in
        lookups += 1
        return location == differentTarget ? URL(string: "https://example.net") : candidate
    }, open: { opened.append($0); return acceptOpen })
    expect(!monitor.listen(to: 42) && !monitor.listen(to: 42) && attempts == 1, "Tap creation failure is reported and retries are bounded")

    func mouse(_ type: CGEventType, count: Int64 = 1, flags: CGEventFlags = .maskCommand, at location: CGPoint? = nil) throws {
        guard let event = CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: location ?? point, mouseButton: .left) else {
            throw TermKeysError("Cannot create test mouse event")
        }
        event.flags = flags
        event.setIntegerValueField(.mouseEventClickState, value: count)
        monitor.receive(type, event, for: 42)
        expect(event.type == type && event.flags == flags && event.getIntegerValueField(.mouseEventClickState) == count, "Original mouse event passes through")
    }
    func settle() { RunLoop.main.run(until: Date().addingTimeInterval(0.06)) }

    try mouse(.leftMouseDown)
    try mouse(.leftMouseUp)
    settle()
    expect(opened == [url] && lookups == 2, "Single click opens one revalidated address")
    expect(monitor.lastResult == .accepted, "Only OS acceptance is reported")
    opened.removeAll()
    lookups = 0
    for dx in [0.5, 1.0, 2.0] {
        let end = CGPoint(x: point.x + dx, y: point.y)
        try mouse(.leftMouseDown)
        try mouse(.leftMouseDragged, count: 0, at: end)
        try mouse(.leftMouseUp, at: end)
        settle()
        expect(opened == [url], "Small motion inside one link still opens exactly once")
        opened.removeAll()
    }
    differentTarget = CGPoint(x: point.x + 1, y: point.y)
    try mouse(.leftMouseDown)
    try mouse(.leftMouseUp, at: differentTarget)
    settle()
    expect(opened.isEmpty, "Small motion crossing a link boundary is not an activation")
    expect(monitor.lastResult == .differentTarget, "Crossing link boundaries is distinguishable")
    differentTarget = nil
    lookups = 0
    for flags: CGEventFlags in [[], [.maskCommand, .maskShift], [.maskCommand, .maskAlternate], [.maskCommand, .maskControl]] {
        try mouse(.leftMouseDown, flags: flags)
        try mouse(.leftMouseUp, flags: flags)
        settle()
        expect(opened.isEmpty && lookups == 0, "Unmodified click or extra modifier never reads text")
    }
    try mouse(.leftMouseDown)
    try mouse(.leftMouseDragged, at: CGPoint(x: point.x + 2.1, y: point.y))
    try mouse(.leftMouseUp)
    settle()
    expect(opened.isEmpty && lookups == 0, "Dragging back to the starting point never opens a link")
    expect(monitor.lastResult == .gestureCancelled, "A drag is diagnosed")
    try mouse(.leftMouseDown)
    try mouse(.leftMouseUp, at: CGPoint(x: point.x + 10, y: point.y))
    settle()
    expect(opened.isEmpty && lookups == 0, "Releasing at a different position does not read text")
    try mouse(.leftMouseDown)
    try mouse(.leftMouseUp)
    RunLoop.main.run(until: Date().addingTimeInterval(0.005))
    try mouse(.leftMouseDown, count: 2)
    try mouse(.leftMouseUp, count: 2)
    settle()
    expect(monitor.lastResult == .doubleClick, "Native double-click is identified")
    expect(opened.isEmpty, "Native double-click does not also open through TermKeys")
    try mouse(.leftMouseDown)
    try mouse(.leftMouseUp)
    RunLoop.main.run(until: Date().addingTimeInterval(0.005))
    candidate = URL(string: "https://example.org")
    settle()
    expect(monitor.lastResult == .revalidationFailed, "Failed revalidation is identified")
    expect(opened.isEmpty, "Changed address cancels deferred open")
    try mouse(.leftMouseDown)
    try mouse(.leftMouseUp)
    monitor.stop()
    settle()
    expect(opened.isEmpty, "Leaving Terminal cancels deferred open")

    expect(monitor.lastResult == .contextChanged, "Changing focus during pending click is identified")
    candidate = nil
    try mouse(.leftMouseDown)
    try mouse(.leftMouseUp)
    settle()
    expect(monitor.lastResult == .noTarget, "No readable destination is identified")
    candidate = url
    acceptOpen = false
    try mouse(.leftMouseDown)
    try mouse(.leftMouseUp)
    settle()
    expect(monitor.lastResult == .rejected, "OS rejection is separate from no target")
    try mouse(.leftMouseDown, flags: [])
    try mouse(.leftMouseUp, flags: [])
    expect(monitor.lastResult == .rejected, "Ordinary input cannot overwrite the last Command-click result")

    var client = AccessibilityClient()
    let element = AXUIElementCreateApplication(getpid())
    let printed = "https://example.org" as NSString
    var hitBox = CGRect(x: 24, y: 7, width: 8, height: 17)
    var timedOut = false
    var limited = false
    var textReads = 0
    var styledReply: NSAttributedString?
    var styleError = AXError.parameterizedAttributeUnsupported
    client.setTimeout = { receiver, seconds in
        limited = CFEqual(receiver, element) && seconds == 0.05
        return timedOut ? .cannotComplete : .success
    }
    client.copyAttribute = { _, name, output in
        guard limited && name as String == kAXNumberOfCharactersAttribute else { return .attributeUnsupported }
        limited = false
        output.pointee = printed.length as NSNumber
        return .success
    }
    client.copyParameter = { _, name, argument, output in
        guard limited else { return .cannotComplete }
        limited = false
        switch name as String {
        case kAXRangeForPositionParameterizedAttribute:
            var received = CGPoint.zero
            guard AXValueGetValue(argument as! AXValue, .cgPoint, &received), received == point else { return .illegalArgument }
            var glyph = CFRange(location: 6, length: 1)
            output.pointee = AXValueCreate(.cfRange, &glyph)
        case kAXBoundsForRangeParameterizedAttribute:
            output.pointee = AXValueCreate(.cgRect, &hitBox)
        case kAXAttributedStringForRangeParameterizedAttribute:
            output.pointee = styledReply
            return styleError
        case kAXStringForRangeParameterizedAttribute:
            var range = CFRange()
            guard AXValueGetValue(argument as! AXValue, .cfRange, &range) else { return .illegalArgument }
            textReads += 1
            output.pointee = printed.substring(with: NSRange(location: range.location, length: range.length)) as CFString
        default: return .attributeUnsupported
        }
        return .success
    }
    expect(client.webAddress(at: point, in: element, hit: element)?.host == "example.org" && textReads == 1, "Click coordinates resolve via bounded, time-limited AX calls")
    styleError = .success
    let target = URL(string: "https://example.com/target")!
    for key in [NSAttributedString.Key.link, .accessibilityLink] {
        styledReply = NSAttributedString(string: "제", attributes: [key: target])
        expect(client.webAddress(at: point, in: element, hit: element) == target && textReads == 1,
               "Explicit glyph destination wins without reading plaintext")
    }
    styledReply = NSAttributedString(string: "제", attributes: [.link: "file:///tmp/local"])
    expect(client.webAddress(at: point, in: element, hit: element) == nil && textReads == 1,
           "Non-web semantic target cannot fall back to visible URL")
    styleError = .cannotComplete
    expect(client.webAddress(at: point, in: element, hit: element) == nil && textReads == 1,
           "Unresponsive semantic query never opens a guessed address")
    styleError = .success
    styledReply = NSAttributedString(string: "x")
    expect(client.webAddress(at: point, in: element, hit: element)?.host == "example.org" && textReads == 2,
           "An unlinked glyph permits a standalone address")
    let readsBeforeMiss = textReads
    hitBox.origin.x += 100
    expect(client.webAddress(at: point, in: element, hit: element) == nil && textReads == readsBeforeMiss, "Nearest glyph outside click bounds does not read text")
    timedOut = true
    expect(client.webAddress(at: point, in: element, hit: element) == nil && textReads == readsBeforeMiss, "AX timeout fails without reading text")

    let link = AXUIElementCreateApplication(getpid() + 1)
    let label = AXUIElementCreateApplication(getpid() + 2)
    var parentOfLink: AXUIElement? = element
    var hierarchyClient = client
    hierarchyClient.setTimeout = { _, seconds in seconds == 0.05 ? .success : .cannotComplete }
    hierarchyClient.copyAttribute = { receiver, name, output in
        switch name as String {
        case kAXRoleAttribute:
            output.pointee = (CFEqual(receiver, link) ? "AXLink" : "AXStaticText") as CFString
        case kAXParentAttribute:
            output.pointee = CFEqual(receiver, label) ? link : parentOfLink
        case kAXURLAttribute:
            guard CFEqual(receiver, link) else { return .noValue }
            output.pointee = target as CFURL
        default: return .attributeUnsupported
        }
        return .success
    }
    for hit in [label, link] {
        expect(hierarchyClient.webAddress(at: point, in: element, hit: hit) == target,
               "Only a link within the focused Terminal body opens")
    }
    parentOfLink = nil
    expect(hierarchyClient.webAddress(at: point, in: element, hit: label) == nil,
           "Link outside focused body is ignored")

    styledReply = NSAttributedString(string: "제", attributes: [.accessibilityLink: link])
    timedOut = false
    hitBox.origin.x -= 100
    let previousAttribute = client.copyAttribute
    client.copyAttribute = { receiver, name, output in
        if CFEqual(receiver, link), name as String == kAXURLAttribute {
            output.pointee = target as CFURL
            return .success
        }
        return previousAttribute(receiver, name, output)
    }
    client.setTimeout = { _, seconds in
        limited = seconds == 0.05
        return limited ? .success : .cannotComplete
    }
    expect(client.webAddress(at: point, in: element, hit: element) == target && textReads == readsBeforeMiss,
           "AXLink text metadata can identify a separate accessibility element with an AXURL")

}
