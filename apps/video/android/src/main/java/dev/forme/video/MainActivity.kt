package dev.forme.video

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.forme.video.player.FontCacheWarmup
import dev.forme.video.ui.VideoApp
import dev.forme.video.ui.VideoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 앱 객체가 아니라 화면에서 시작한다. 단위 테스트의 Robolectric 앱에는 libVLC 네이티브 라이브러리가 없어 프로세스가 종료된다.
        FontCacheWarmup.startIfNeeded(this)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        setContent {
            VideoTheme {
                VideoApp(viewModel())
            }
        }
    }
}
