#!/bin/bash
set -euo pipefail

app_root="$(cd "$(dirname "$0")/.." && pwd)"
build_dir="$app_root/build"
app_bundle="$build_dir/TermKeys.app"
mkdir -p "$app_bundle/Contents/MacOS" "$build_dir/modules"
xcrun swiftc -swift-version 5 -O -warnings-as-errors \
    -target "$(uname -m)-apple-macosx13.0" \
    -module-cache-path "$build_dir/modules" \
    "$app_root"/Sources/*.swift \
    -o "$app_bundle/Contents/MacOS/termkeys"
cp "$app_root/Info.plist" "$app_bundle/Contents/Info.plist"
codesign --force --sign - --identifier dev.for-me.termkeys "$app_bundle"
codesign --verify --deep --strict "$app_bundle"
printf '빌드 완료: %s\n' "$app_bundle"
