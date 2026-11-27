package dev.forme.video.player

import android.content.Context
import androidx.core.content.edit
import kotlinx.coroutines.CompletableDeferred
import org.videolan.libvlc.LibVLC

private const val PREFERENCES = "vlc_warmup"
private const val READY_KEY = "font_cache_ready"

/**
 * libVLC는 자막 글꼴을 처음 준비할 때 글꼴을 읽어 앱 데이터에 캐시를 만들고, 그동안 영상을 출력하지 않는다.
 * 설치 직후 첫 영상이 검은 화면에서 멈춰 있지 않도록 앱을 켜면 읽을 글꼴을 줄이고([VlcFontScope]) libVLC의 캐시 생성 함수로 미리 만든다.
 * 재생기는 준비가 끝날 때까지 기다린다. 둘이 동시에 글꼴을 읽으면 같은 작업을 처음부터 두 번 하게 된다.
 * 끝까지 마친 기록이 남으면 다음 실행부터는 하지 않는다. 도중에 앱이 종료되면 다음 실행 때 다시 시도한다.
 * 0.6.1 이하에서 기기 글꼴로 캐시를 만든 기록이 있어도 앱 글꼴 폴더가 없으면 한 번 더 만든다.
 */
internal object FontCacheWarmup {
    // 시작과 확인은 메인 스레드에서만 한다. 완료는 작업 스레드가 알린다.
    private var started = false
    private val finished = CompletableDeferred<Unit>()

    val preparing: Boolean get() = started && !finished.isCompleted

    fun startIfNeeded(context: Context) {
        if (started) return
        started = true
        VlcFontScope.select(context)
        val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        if (preferences.getBoolean(READY_KEY, false) && VlcFontScope.isPrepared(context)) {
            finished.complete(Unit)
            return
        }
        val appContext = context.applicationContext
        Thread({
            try {
                if (!VlcFontScope.prepare(appContext)) VlcFontScope.unselect()
                val engine = LibVLC(appContext, arrayListOf("--no-audio"))
                try {
                    if (engine.buildFontCache()) preferences.edit { putBoolean(READY_KEY, true) }
                } finally {
                    engine.release()
                }
            } catch (_: RuntimeException) {
                // 미리 만들지 못해도 재생기가 첫 재생 때 직접 만든다.
            } finally {
                finished.complete(Unit)
            }
        }, "vlc-font-cache").start()
    }

    /** 미리 만들기가 끝날 때까지 기다린다. 시작하지 않았거나 이미 끝났으면 바로 돌아온다. */
    suspend fun awaitFinished() {
        if (started) finished.await()
    }
}
