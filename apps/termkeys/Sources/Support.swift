import Foundation
import Darwin

let serviceID = "dev.for-me.termkeys"
let appVersion = "0.2.1"

struct TermKeysError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}

struct Locations {
    let home: URL
    init(home: URL = FileManager.default.homeDirectoryForCurrentUser) { self.home = home }
    var app: URL { home.appendingPathComponent("Applications/TermKeys.app") }
    var executable: URL { app.appendingPathComponent("Contents/MacOS/termkeys") }
    var command: URL { home.appendingPathComponent(".local/bin/termkeys") }
    var data: URL { home.appendingPathComponent("Library/Application Support/TermKeys") }
    var status: URL { data.appendingPathComponent("status.json") }
    var agent: URL { home.appendingPathComponent("Library/LaunchAgents/\(serviceID).plist") }
    var target: String { "gui/\(getuid())/\(serviceID)" }

    var agentDefinition: [String: Any] {
        ["Label": serviceID, "ProgramArguments": [executable.path, "agent"],
         "RunAtLoad": true, "KeepAlive": true, "ThrottleInterval": 10,
         "LimitLoadToSessionType": "Aqua", "ProcessType": "Interactive",
         "AssociatedBundleIdentifiers": [serviceID]]
    }
}

struct AgentStatus: Codable {
    let version: String
    let pid: Int32
    let updated: Date
    let state: String
    let detail: String
    var secureInput: Bool? = nil
    var hotKeyEvents: Int? = nil
    var sentPairs: Int? = nil

    func isFresh(at date: Date = Date()) -> Bool {
        let age = date.timeIntervalSince(updated)
        return age >= 0 && age < 8
    }
}

func privateDirectory(_ url: URL) throws {
    try FileManager.default.createDirectory(
        at: url, withIntermediateDirectories: true,
        attributes: [.posixPermissions: 0o700]
    )
    let values = try url.resourceValues(forKeys: [.isSymbolicLinkKey, .isDirectoryKey])
    guard values.isDirectory == true, values.isSymbolicLink != true else {
        throw TermKeysError("일반 디렉터리가 아닙니다: \(url.path)")
    }
}

/// Serializes CLI changes, or holds the agent lock for its entire lifetime.
final class FileLock {
    private let descriptor: Int32
    init(_ url: URL) throws {
        descriptor = Darwin.open(url.path, O_CREAT | O_RDWR | O_NOFOLLOW, 0o600)
        guard descriptor >= 0 else { throw TermKeysError("잠금 파일을 열 수 없습니다.") }
        guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else {
            close(descriptor)
            throw TermKeysError("다른 termkeys 작업이 실행 중입니다.")
        }
    }
    deinit { flock(descriptor, LOCK_UN); close(descriptor) }
}

struct CommandResult {
    let code: Int32
    let output: String
}

func run(_ executable: String, _ arguments: [String]) throws -> CommandResult {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    let output = Pipe()
    process.standardOutput = output
    process.standardError = output
    try process.run()
    let bytes = output.fileHandleForReading.readDataToEndOfFile()
    process.waitUntilExit()
    return CommandResult(code: process.terminationStatus,
                         output: String(decoding: bytes, as: UTF8.self))
}

func launchctl(_ arguments: [String]) throws {
    let result = try run("/bin/launchctl", arguments)
    guard result.code == 0 else {
        throw TermKeysError("launchctl \(arguments.first ?? "") 실패 (\(result.code)): \(result.output)")
    }
}

func isLoaded(_ locations: Locations) throws -> Bool {
    // The text of `launchctl print` is explicitly not a stable API. Only use its exit status.
    try run("/bin/launchctl", ["print", locations.target]).code == 0
}
