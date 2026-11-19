import AppKit
import Foundation

@main
struct TermKeys {
    static func main() {
        umask(0o077)
        do {
            let arguments = Array(CommandLine.arguments.dropFirst())
            guard arguments.count <= 1 else { throw TermKeysError("명령어는 하나만 지정하세요. termkeys help") }
            let command = arguments.first ?? "help"
            let locations = Locations()
            switch command {
            case "help", "--help", "-h":
                print("""
                termkeys \(appVersion) — 기본 터미널에서 ⌘←/⌘→로 줄 이동, ⌘ 클릭으로 웹 주소 열기

                  install   현재 빌드를 ~/Applications와 ~/.local/bin에 설치
                  on        켜기 + 다음 로그인부터 자동 실행
                  off       끄기 + 자동 실행 해제
                  status    실행 상태와 권한, 마지막 링크 클릭 결과 확인
                  version   버전 출력

                최초 실행에는 TermKeys의 손쉬운 사용 권한이 필요합니다.
                웹 주소를 판별할 때 클릭 주변의 글자를 잠시 읽으며 내용은 저장하지 않습니다.
                Vim, tmux 등에서는 Ctrl+A/E가 다른 동작일 수 있습니다.
                """)
            case "version", "--version": print(appVersion)
            case "status": try showStatus(locations)
            case "on", "off", "install":
                guard getuid() != 0 else { throw TermKeysError("sudo 없이 로그인한 사용자로 실행하세요.") }
                try privateDirectory(locations.data)
                let lock = try FileLock(locations.data.appendingPathComponent("control.lock"))
                try withExtendedLifetime(lock) {
                    switch command {
                    case "install": try install(locations)
                    case "on": try turnOn(locations)
                    default: try turnOff(locations)
                    }
                }
            case "agent":
                guard getuid() != 0 else { throw TermKeysError("사용자 로그인 세션에서만 실행할 수 있습니다.") }
                try privateDirectory(locations.data)
                let lock = try FileLock(locations.data.appendingPathComponent("agent.lock"))
                NSApplication.shared.setActivationPolicy(.accessory)
                let agent = Agent(locations: locations)
                withExtendedLifetime((lock, agent)) { agent.start() }
            default: throw TermKeysError("알 수 없는 명령어입니다: \(command). termkeys help를 확인하세요.")
            }
        } catch {
            FileHandle.standardError.write(Data(("termkeys: \(error.localizedDescription)\n").utf8))
            exit(1)
        }
    }

    private static func assertOwnedAgent(_ locations: Locations) throws {
        guard FileManager.default.fileExists(atPath: locations.agent.path) else { return }
        let data = try Data(contentsOf: locations.agent)
        let plist = try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any]
        guard plist?["Label"] as? String == serviceID,
              plist?["ProgramArguments"] as? [String] == [locations.executable.path, "agent"] else {
            throw TermKeysError("같은 이름의 다른 자동 실행 설정이 있습니다. 덮어쓰지 않았습니다: \(locations.agent.path)")
        }
    }

    private static func turnOn(_ locations: Locations) throws {
        guard Bundle(url: locations.app)?.bundleIdentifier == serviceID,
              FileManager.default.isExecutableFile(atPath: locations.executable.path) else {
            throw TermKeysError("먼저 빌드한 앱에서 install을 실행하세요.")
        }
        try assertOwnedAgent(locations)
        try FileManager.default.createDirectory(at: locations.agent.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try PropertyListSerialization.data(fromPropertyList: locations.agentDefinition, format: .xml, options: 0)
        try data.write(to: locations.agent, options: .atomic)
        try launchctl(["enable", locations.target])
        let started = Date()
        if try !isLoaded(locations.target) {
            try launchctl(["bootstrap", "gui/\(getuid())", locations.agent.path])
        }
        try launchctl(["kickstart", locations.target])
        print("자동 실행을 켰습니다. 다음 로그인부터도 실행합니다.")
        // Wait for a new heartbeat, not just successful launchd registration.
        for _ in 0..<20 {
            if let snapshot = readStatus(locations), snapshot.updated >= started { break }
            Thread.sleep(forTimeInterval: 0.2)
        }
        try showStatus(locations)
    }

    private static func turnOff(_ locations: Locations) throws {
        try assertOwnedAgent(locations)
        try launchctl(["disable", locations.target])
        if try isLoaded(locations.target) { try launchctl(["bootout", locations.target]) }
        guard try !isLoaded(locations.target) else { throw TermKeysError("종료가 확인되지 않았습니다. status로 확인하세요.") }
        print("꺼짐. 다음 로그인에서도 자동 실행하지 않습니다.")
    }

    private static func readStatus(_ locations: Locations) -> AgentStatus? {
        guard let data = try? Data(contentsOf: locations.status) else { return nil }
        return try? JSONDecoder().decode(AgentStatus.self, from: data)
    }

    private static func showStatus(_ locations: Locations) throws {
        guard try isLoaded(locations.target) else {
            print("꺼짐 또는 미등록. 켜려면 termkeys on을 실행하세요.")
            return
        }
        guard let snapshot = readStatus(locations), snapshot.isFresh(), kill(snapshot.pid, 0) == 0 else {
            print("등록됨. 실행 상태를 확인하지 못했습니다. 잠시 뒤 status를 다시 실행하세요.")
            return
        }
        print("\(snapshot.detail) [\(snapshot.state)]")
        print("버전 \(snapshot.version), PID \(snapshot.pid)")
        if let result = snapshot.lastLinkResult {
            print("마지막 ⌘ 클릭: \(result)")
        } else if snapshot.version == appVersion {
            print("이번 실행에서 받은 ⌘ 클릭이 없습니다.")
        }
        if let secure = snapshot.secureInput, let received = snapshot.hotKeyEvents, let sent = snapshot.sentPairs {
            print("보안 입력: \(secure ? "켜짐" : "꺼짐"), 단축키 통지: \(received)회, 이동 키 전송 요청: \(sent)회")
        }
    }

    private static func install(_ locations: Locations) throws {
        let manager = FileManager.default
        let source = Bundle.main.bundleURL.resolvingSymlinksInPath()
        guard source.pathExtension == "app", Bundle.main.bundleIdentifier == serviceID else {
            throw TermKeysError("build/TermKeys.app/Contents/MacOS/termkeys install로 실행하세요.")
        }
        guard source != locations.app.resolvingSymlinksInPath() else {
            print("이미 설치된 앱입니다.")
            return
        }
        guard try !isLoaded(locations.target) else {
            throw TermKeysError("업데이트 전에 termkeys off로 실행 중인 앱을 꺼 주세요.")
        }
        let appExists = manager.fileExists(atPath: locations.app.path)
        if appExists && Bundle(url: locations.app)?.bundleIdentifier != serviceID {
            throw TermKeysError("같은 이름의 다른 앱이 있어 설치를 중단했습니다.")
        }
        let linkDestination = try? manager.destinationOfSymbolicLink(atPath: locations.command.path)
        if let linkDestination {
            guard linkDestination == locations.executable.path else {
                throw TermKeysError("~/.local/bin/termkeys가 다른 대상을 가리킵니다. 변경하지 않았습니다.")
            }
        } else if manager.fileExists(atPath: locations.command.path) {
            throw TermKeysError("~/.local/bin/termkeys에 다른 파일이 있습니다. 변경하지 않았습니다.")
        }
        try manager.createDirectory(at: locations.app.deletingLastPathComponent(), withIntermediateDirectories: true)
        try manager.createDirectory(at: locations.command.deletingLastPathComponent(), withIntermediateDirectories: true)
        let staged = locations.app.deletingLastPathComponent().appendingPathComponent(".TermKeys-\(UUID().uuidString).app")
        try manager.copyItem(at: source, to: staged)
        let signature = try run("/usr/bin/codesign", ["--verify", "--deep", "--strict", staged.path])
        guard signature.code == 0 else {
            try manager.removeItem(at: staged) // Only the copy created above.
            throw TermKeysError("앱 서명 검사가 실패했습니다. 기존 앱은 변경하지 않았습니다.")
        }
        var backup: URL?
        do {
            if appExists {
                let backups = locations.data.appendingPathComponent("backups.noindex")
                try privateDirectory(backups)
                let destination = backups.appendingPathComponent("TermKeys-\(UUID().uuidString).app-backup")
                try manager.moveItem(at: locations.app, to: destination)
                backup = destination
            }
            try manager.moveItem(at: staged, to: locations.app)
        } catch {
            if let backup, !manager.fileExists(atPath: locations.app.path) {
                try manager.moveItem(at: backup, to: locations.app)
            }
            throw error
        }
        if linkDestination == nil {
            try manager.createSymbolicLink(atPath: locations.command.path, withDestinationPath: locations.executable.path)
        }
        print("설치됨: \(locations.app.path)")
        if let backup { print("이전 앱 보관: \(backup.path)") }
        print("켜기: \(locations.command.path) on")
        print("PATH에 ~/.local/bin이 있으면 termkeys로 실행할 수 있습니다. 셸 설정은 수정하지 않았습니다.")
    }
}
