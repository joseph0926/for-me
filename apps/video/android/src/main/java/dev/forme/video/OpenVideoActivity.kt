package dev.forme.video

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.viewModels
import dev.forme.video.ui.VideoApp

/**
 * 파일 관리자 같은 다른 앱이 연 영상을 재생한다. 영상을 닫으면 보관함으로 가지 않고 그 앱으로 돌아간다.
 * 다른 앱이 준 임시 읽기 권한은 이 화면이 끝날 때까지만 유지된다.
 */
class OpenVideoActivity : ComponentActivity() {
    private val model: VideoViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 회전처럼 화면만 다시 만들 때는 보던 영상을 유지한다. 프로세스가 다시 시작됐으면 받은 요청으로 다시 연다.
        if (model.selection.value == null) {
            val uri = videoUriFrom(intent) ?: return finish()
            model.openFromOtherApp(uri)
        }
        showVideoContent { VideoApp(model, closeApp = ::finish) }
    }

    // 이 화면이 맨 위에 있을 때 같은 앱이 다른 영상을 열면 재생기를 하나만 두도록 지금 화면에서 바꾼다.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        videoUriFrom(intent)?.let(model::openFromOtherApp)
    }
}

/** 영상 열기 요청이 가리키는 파일 주소. 열 파일이 없는 요청이면 null이다. */
internal fun videoUriFrom(intent: Intent): Uri? =
    intent.data?.takeIf { intent.action == Intent.ACTION_VIEW }
