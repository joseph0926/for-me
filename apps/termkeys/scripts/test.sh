#!/bin/bash
set -euo pipefail

app_root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$app_root/build/modules"
xcrun swiftc -swift-version 5 -warnings-as-errors \
    -module-cache-path "$app_root/build/modules" \
    "$app_root/Sources/Shortcuts.swift" "$app_root/Sources/Support.swift" \
    "$app_root/Sources/Agent.swift" "$app_root/Sources/AccessibilityClient.swift" \
    "$app_root"/Tests/*.swift -o "$app_root/build/termkeys-tests"
"$app_root/build/termkeys-tests"
