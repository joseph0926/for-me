import ApplicationServices

/// The injectable boundary is limited to accessibility calls, not agent decisions.
struct AccessibilityClient {
    var setTimeout: (AXUIElement, Float) -> AXError = AXUIElementSetMessagingTimeout
    var copyAttribute: (AXUIElement, CFString, UnsafeMutablePointer<CFTypeRef?>) -> AXError = AXUIElementCopyAttributeValue
    var createObserver: (pid_t, AXObserverCallback, UnsafeMutablePointer<AXObserver?>) -> AXError = AXObserverCreate
    var addNotification: (AXObserver, AXUIElement, CFString, UnsafeMutableRawPointer?) -> AXError = AXObserverAddNotification
    var removeNotification: (AXObserver, AXUIElement, CFString) -> AXError = AXObserverRemoveNotification

    func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
        // Timeouts do not propagate from an application to its returned elements.
        guard setTimeout(element, 0.05) == .success else { return nil }
        var value: CFTypeRef?
        guard copyAttribute(element, name as CFString, &value) == .success else { return nil }
        return value
    }

    func subscribe(_ observer: AXObserver, application: AXUIElement, context: UnsafeMutableRawPointer) -> Bool {
        guard setTimeout(application, 0.05) == .success else { return false }
        let required = [kAXFocusedUIElementChangedNotification, kAXFocusedWindowChangedNotification,
                        kAXMenuOpenedNotification, kAXMenuClosedNotification]
        var registered: [String] = []
        for name in required {
            guard addNotification(observer, application, name as CFString, context) == .success else {
                // The observer is not attached to the run loop until all four succeed.
                for previous in registered.reversed() {
                    _ = removeNotification(observer, application, previous as CFString)
                }
                return false
            }
            registered.append(name)
        }
        return true
    }
}
