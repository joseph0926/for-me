package dev.forme.video.player

import android.annotation.SuppressLint
import android.content.Context
import android.system.ErrnoException
import android.system.Os
import dev.forme.video.R
import java.io.File
import java.io.IOException

private const val CONFIG_ENV = "FONTCONFIG_FILE"
private const val SYSTEM_FONTS = "/system/fonts"

// 앱 화면에 쓰는 Pretendard를 libVLC에도 준다. 리소스의 글꼴을 바꾸면 이 이름도 바꿔야 새 파일을 복사한다.
private const val KOREAN_FONT = "PretendardVariable-1.3.9.ttf"

// 한중일 글꼴 묶음(NotoSansCJK, NotoSerifCJK 등). 파일 하나가 수십 MB이고 여러 벌이 들어 있어 캐시 시간 대부분을 차지한다.
private fun isCjkCollection(name: String) = name.contains("CJK", ignoreCase = true)

/**
 * libVLC 안의 fontconfig가 기기의 한중일 글꼴 묶음 대신 앱의 한국어 글꼴을 읽게 한다.
 *
 * 내장 자막을 그리기 전에 fontconfig가 글꼴 캐시를 만드는데, 그 시간 대부분은 기기의 한중일 글꼴 묶음
 * `NotoSansCJK-Regular.ttc`(32MB) 하나에서 나온다. 그 묶음만 빼고 나머지 기기 글꼴과 앱 화면의 Pretendard를 읽게 한다.
 * 대신 영상에 든 자막의 한자(일본어, 중국어)는 그리지 못한다(2026-11-27 검증 기록, QA-028).
 * `rejectfont`로 빼는 방법은 거절한 파일도 읽어 시간이 줄지 않았으므로, 기기 글꼴의 링크와 앱 글꼴을 둔 폴더를 따로 만든다.
 * 이미 있는 링크는 다시 만들지 않는다. 폴더가 바뀌면 fontconfig가 캐시를 다시 만들기 때문이다.
 *
 * fontconfig는 `FONTCONFIG_FILE`의 설정 파일을 LibVLC를 처음 만들 때 읽는다. 그래서 [select]는 LibVLC를 만들기 전
 * 메인 스레드에서 부르고, 준비가 실패하면 [unselect]로 되돌려 기기 글꼴 전체를 쓰는 기존 동작으로 남긴다.
 */
internal object VlcFontScope {
    fun select(context: Context) {
        try {
            Os.setenv(CONFIG_ENV, configFile(context).absolutePath, true)
        } catch (_: ErrnoException) {
        }
    }

    fun unselect() {
        try {
            Os.unsetenv(CONFIG_ENV)
        } catch (_: ErrnoException) {
        }
    }

    /** 설정 파일은 글꼴을 다 둔 뒤 마지막에 쓰므로, 있으면 이전 실행에서 준비를 마친 것이다. */
    fun isPrepared(context: Context): Boolean = configFile(context).isFile

    /** 글꼴 폴더와 설정 파일을 만든다. 앱 글꼴을 복사하므로 작업 스레드에서 부른다. */
    fun prepare(context: Context): Boolean = try {
        val fontDir = File(context.noBackupFilesDir, "vlc-fonts")
        if (!fontDir.isDirectory && !fontDir.mkdirs()) throw IOException("Cannot create $fontDir")
        copyKoreanFont(context, File(fontDir, KOREAN_FONT))
        File(SYSTEM_FONTS).list().orEmpty().filterNot(::isCjkCollection).forEach { linkSystemFont(it, fontDir) }
        // libVLC가 기본 설정에서 캐시를 두는 곳과 같게 둔다.
        val cacheDir = File(context.getDir("vlc", Context.MODE_PRIVATE), ".cache/fontconfig")
        writeReplacing(context, configFile(context)) { it.writeText(fontsConf(fontDir, cacheDir)) }
        true
    } catch (_: IOException) {
        false
    }

    private fun configFile(context: Context) = File(context.noBackupFilesDir, "vlc-fonts.conf")

    // 화면 테마와 같은 글꼴 파일을 쓰려고 font 리소스를 그대로 읽는다. raw로 한 벌 더 넣으면 APK가 6.7MB 커진다.
    // 글꼴 리소스도 파일 하나라 openRawResource로 원본 그대로 읽힌다(2026-11-27 가상 기기에서 크기 일치 확인).
    @SuppressLint("ResourceType")
    private fun copyKoreanFont(context: Context, target: File) {
        if (target.isFile) return
        writeReplacing(context, target) { temp ->
            context.resources.openRawResource(R.font.pretendard_variable).use { input ->
                temp.outputStream().use { input.copyTo(it) }
            }
        }
    }

    private fun linkSystemFont(name: String, fontDir: File) {
        val target = File(SYSTEM_FONTS, name)
        val link = File(fontDir, name)
        if (link.exists()) return
        try {
            Os.symlink(target.path, link.path)
        } catch (_: ErrnoException) {
            // 시스템 업데이트로 대상이 사라진 끊긴 링크가 남은 경우 등. 한 글꼴이 빠져도 나머지로 그린다.
        }
    }
}

// fontconfig가 쓰다 만 파일을 읽지 않도록 다른 이름으로 다 쓴 뒤 바꾼다. 임시 파일은 글꼴 폴더 밖에 둔다.
private fun writeReplacing(context: Context, target: File, write: (File) -> Unit) {
    val temp = File(context.noBackupFilesDir, "${target.name}.tmp")
    write(temp)
    if (!temp.renameTo(target)) {
        temp.delete()
        throw IOException("Cannot replace $target")
    }
}

private fun fontsConf(fontDir: File, cacheDir: File): String = """
    <?xml version="1.0"?>
    <fontconfig>
      <dir>${fontDir.absolutePath}</dir>
      <cachedir>${cacheDir.absolutePath}</cachedir>
    </fontconfig>
""".trimIndent()
