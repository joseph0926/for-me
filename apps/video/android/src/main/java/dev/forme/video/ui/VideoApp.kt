package dev.forme.video.ui

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.video.R
import dev.forme.video.VideoViewModel
import java.util.Locale

@Composable
fun VideoApp(model: VideoViewModel) {
    val selection by model.selection.collectAsStateWithLifecycle()
    val recent by model.recent.collectAsStateWithLifecycle()
    val notice by model.notice.collectAsStateWithLifecycle()
    val saveFailed by model.repository.saveFailed.collectAsStateWithLifecycle()
    val libraryState = rememberSaveableStateHolder()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let { model.select(it, fromPicker = true) }
    }
    val openFile = { picker.launch(arrayOf("video/*", "application/octet-stream", "application/x-matroska")) }
    BackHandler(enabled = selection != null) { model.closeVideo() }

    Surface(Modifier.fillMaxSize()) {
        Column(Modifier.safeDrawingPadding()) {
            val message = if (saveFailed) R.string.storage_failed else notice
            message?.let {
                Text(stringResource(it), color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp)
                        .semantics { liveRegion = LiveRegionMode.Polite })
            }
            val current = selection
            if (current != null) {
                // 재생 화면을 교차 전환하면 두 재생기가 동시에 열리므로 한 인스턴스만 유지한다.
                key(current.sequence) {
                    PlayerScreen(current, model, recent.firstOrNull { it.uri == current.uri.toString() }?.title,
                        openFile, Modifier.weight(1f))
                }
            } else {
                libraryState.SaveableStateProvider("library") {
                    LibraryScreen(recent, openFile, model.folders, model::playFromFolder, Modifier.weight(1f)) { record ->
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
