package dev.forme.video.ui

import android.content.pm.ActivityInfo
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.video.R
import dev.forme.video.VideoViewModel
import java.util.Locale

/**
 * [closeApp]이 있으면 다른 앱에서 연 영상만 보여 주는 화면이다. 영상을 닫으면 보관함 대신 [closeApp]을 부른다.
 */
@Composable
fun VideoApp(model: VideoViewModel, closeApp: (() -> Unit)? = null) {
    val selection by model.selection.collectAsStateWithLifecycle()
    val notice by model.notice.collectAsStateWithLifecycle()
    val saveFailed by model.repository.saveFailed.collectAsStateWithLifecycle()
    val libraryState = rememberSaveableStateHolder()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let { model.select(it, fromPicker = true) }
    }
    val openFile = { picker.launch(arrayOf("video/*", "application/octet-stream", "application/x-matroska")) }
    BackHandler(enabled = selection != null) { model.closeVideo() }
    val activity = LocalActivity.current
    val view = LocalView.current
    val watching = selection != null
    DisposableEffect(activity, view, watching) {
        // 재생하는 동안 상태줄과 하단바를 숨긴다. 가장자리를 쓸어 넘기면 잠깐 나타났다가 다시 숨는다.
        val bars = activity?.window?.let { WindowCompat.getInsetsController(it, view) }
        if (watching) bars?.run {
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.systemBars())
        }
        // 목록으로 돌아오면 막대를 다시 보이고, 재생 화면이 고정한 방향도 앱 기본값으로 되돌린다.
        // 다음 영상으로 넘어가는 동안에는 유지한다.
        onDispose {
            if (watching) {
                bars?.show(WindowInsetsCompat.Type.systemBars())
                activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            }
        }
    }

    Surface(Modifier.fillMaxSize()) {
        // 재생 화면은 영상을 화면 끝까지 그리고 조작만 화면 잘림 부분을 피하므로 바깥 여백을 두지 않는다.
        Column(if (watching) Modifier else Modifier.safeDrawingPadding()) {
            val message = if (saveFailed) R.string.storage_failed else notice
            message?.let {
                Text(stringResource(it), color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.fillMaxWidth().then(if (watching) Modifier.safeDrawingPadding() else Modifier)
                        .padding(horizontal = 24.dp, vertical = 8.dp)
                        .semantics { liveRegion = LiveRegionMode.Polite })
            }
            val current = selection
            if (current != null) {
                // 재생 화면을 교차 전환하면 두 재생기가 동시에 열리므로 한 인스턴스만 유지한다.
                key(current.sequence) {
                    PlayerScreen(current, model, current.savedTitle,
                        openFile, Modifier.weight(1f),
                        closeLabel = if (closeApp != null) R.string.close_video else R.string.back_to_list)
                }
            } else if (closeApp != null) {
                LaunchedEffect(Unit) { closeApp() }
            } else {
                val recent by model.recent.collectAsStateWithLifecycle()
                libraryState.SaveableStateProvider("library") {
                    LibraryScreen(recent, openFile, model.folders, model::findFolderRecord, model::playFromFolder, Modifier.weight(1f)) { record ->
                        model.select(record.uri.toUri(), fromPicker = false)
                    }
                }
            }
        }
    }
}

internal fun formatTime(milliseconds: Long): String {
    val seconds = milliseconds.coerceAtLeast(0) / 1_000
    return if (seconds >= 3_600) String.format(Locale.ROOT, "%d:%02d:%02d", seconds / 3_600, seconds / 60 % 60, seconds % 60)
    else String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60)
}
