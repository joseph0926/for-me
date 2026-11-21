package dev.forme.video.player

import android.content.Context
import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import androidx.core.content.edit
import androidx.core.graphics.createBitmap
import org.videolan.libvlc.LibVLC
import org.videolan.libvlc.Media
import org.videolan.libvlc.MediaPlayer
import java.io.File
import java.io.IOException

private const val PREFERENCES = "vlc_warmup"
private const val READY_KEY = "font_cache_ready"
private const val GIVE_UP_MS = 120_000L

/**
 * libVLC는 자막 글꼴을 처음 준비할 때 기기 글꼴을 모두 읽어 앱 데이터에 캐시를 만든다.
 * 설치 직후 첫 영상이 그동안 0초에서 멈춰 있지 않도록, 앱을 켜면 화면 없이 작은 이미지를 열어 캐시를 미리 만든다.
 * 끝까지 마친 기록이 남으면 다음 실행부터는 하지 않는다. 도중에 앱이 종료되면 다음 실행 때 다시 시도한다.
 */
internal object FontCacheWarmup {
    private var started = false

    fun startIfNeeded(context: Context) {
        val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        // 화면이 다시 만들어져도 한 프로세스에서는 한 번만 시작한다. 화면 생성은 메인 스레드에서만 부른다.
        if (started || preferences.getBoolean(READY_KEY, false)) return
        started = true
        Thread({ run(context.applicationContext) { preferences.edit { putBoolean(READY_KEY, true) } } },
            "vlc-font-warmup").start()
    }

    private fun run(context: Context, markReady: () -> Unit) {
        val image = File(context.cacheDir, "vlc-font-warmup.png")
        try {
            image.outputStream().use { createBitmap(16, 16).compress(Bitmap.CompressFormat.PNG, 100, it) }
        } catch (_: IOException) {
            return
        }
        val main = Handler(Looper.getMainLooper())
        main.post {
            val engine = LibVLC(context, arrayListOf("--no-video-title-show", "--no-audio", "--image-duration=1"))
            val player = MediaPlayer(engine)
            var released = false
            val release = {
                if (!released) {
                    released = true
                    player.setEventListener(null)
                    player.stop()
                    player.release()
                    engine.release()
                    image.delete()
                }
            }
            player.setEventListener { event ->
                when (event.type) {
                    MediaPlayer.Event.EndReached -> {
                        markReady()
                        release()
                    }
                    MediaPlayer.Event.EncounteredError -> release()
                }
            }
            val media = Media(engine, image.path)
            player.media = media
            media.release()
            player.play()
            main.postDelayed(release, GIVE_UP_MS)
        }
    }
}
