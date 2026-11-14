package dev.forme.video.ui

import android.view.View
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.net.toUri
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.video.R
import dev.forme.video.VideoSelection
import dev.forme.video.VideoViewModel
import dev.forme.video.player.VlcPlayback
import org.videolan.libvlc.util.VLCVideoLayout
import java.util.Locale

@Composable
fun VideoApp(model: VideoViewModel) {
    val selection by model.selection.collectAsStateWithLifecycle()
    val recent by model.recent.collectAsStateWithLifecycle()
    val notice by model.notice.collectAsStateWithLifecycle()
    val saveFailed by model.repository.saveFailed.collectAsStateWithLifecycle()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let { model.select(it, fromPicker = true) }
    }
    val openFile = { picker.launch(arrayOf("video/*", "application/octet-stream", "application/x-matroska")) }
    BackHandler(enabled = selection != null) { model.closeVideo() }

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(Modifier.safeDrawingPadding().padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween) {
                Text(stringResource(R.string.app_name), style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f))
                Button(onClick = openFile) { Text(stringResource(R.string.open_video)) }
            }
            val message = if (saveFailed) R.string.storage_failed else notice
            message?.let {
                Text(stringResource(it), Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.error)
            }
            val current = selection
            if (current != null) {
                key(current.sequence) { PlayerScreen(current, model, Modifier.weight(1f)) }
            } else if (recent.isNotEmpty()) {
                Text(stringResource(R.string.recent_videos), Modifier.padding(top = 24.dp, bottom = 8.dp),
                    style = MaterialTheme.typography.titleMedium)
                LazyColumn {
                    items(recent, key = { it.uri }) { record ->
                        ListItem(
                            headlineContent = { Text(record.title, maxLines = 2, overflow = TextOverflow.Ellipsis) },
                            supportingContent = { Text(formatTime(record.positionMs)) },
                            modifier = Modifier.clickable { model.select(record.uri.toUri(), fromPicker = false) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PlayerScreen(selection: VideoSelection, model: VideoViewModel, modifier: Modifier) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val playback = remember(selection.sequence) {
        VlcPlayback(context, model.repository, selection.uri,
            wantsToPlay = { selection.wantsToPlay }, changePlayIntent = { selection.wantsToPlay = it })
    }
    val state = playback.state
    LaunchedEffect(playback) { playback.open() }
    DisposableEffect(playback, lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> playback.setVisible(true)
                Lifecycle.Event.ON_STOP -> playback.setVisible(false)
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        playback.setVisible(lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED))
        onDispose {
            lifecycle.removeObserver(observer)
            playback.close()
        }
    }
    Column(modifier.padding(top = 12.dp)) {
        Text(state.title, maxLines = 2, overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.titleMedium)
        Box(Modifier.weight(1f).fillMaxWidth().padding(vertical = 12.dp).background(Color.Black),
            contentAlignment = Alignment.Center) {
            AndroidView(
                factory = { viewContext -> VLCVideoLayout(viewContext).also(playback::attach) },
                modifier = Modifier.fillMaxSize(),
                update = { view ->
                    view.keepScreenOn = state.playing
                    view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
                },
            )
            if (state.loading) CircularProgressIndicator(
                modifier = Modifier.semantics { contentDescription = context.getString(R.string.loading) })
        }
        state.error?.let {
            Text(stringResource(it), color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(bottom = 8.dp))
        }
        var dragging by remember { mutableStateOf<Float?>(null) }
        val maximum = state.durationMs.toFloat().coerceAtLeast(1f)
        val seekLabel = stringResource(R.string.seek)
        Slider(
            value = (dragging ?: state.positionMs.toFloat()).coerceIn(0f, maximum),
            onValueChange = { dragging = it },
            onValueChangeFinished = {
                dragging?.let { playback.seek(it.toLong()) }
                dragging = null
            },
            valueRange = 0f..maximum,
            enabled = state.seekable && state.durationMs > 0 && state.error == null,
            modifier = Modifier.semantics { contentDescription = seekLabel },
        )
        Text("${formatTime((dragging ?: state.positionMs.toFloat()).toLong())} / ${formatTime(state.durationMs)}")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = model::closeVideo) { Text(stringResource(R.string.close_video)) }
            Button(onClick = playback::togglePlayback,
                enabled = !state.loading && (state.error == null || state.error == R.string.audio_focus_failed)) {
                Text(stringResource(if (state.playing) R.string.pause else R.string.play))
            }
        }
    }
}

private fun formatTime(milliseconds: Long): String {
    val seconds = milliseconds.coerceAtLeast(0) / 1_000
    return if (seconds >= 3_600) String.format(Locale.ROOT, "%d:%02d:%02d", seconds / 3_600, seconds / 60 % 60, seconds % 60)
    else String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60)
}
