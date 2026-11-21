package dev.forme.video.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.forme.video.R
import dev.forme.video.player.SubtitleControls
import dev.forme.video.player.VlcPlayback
import kotlinx.coroutines.delay

@Composable
internal fun ExternalSubtitle(playback: VlcPlayback, controlsVisible: Boolean, modifier: Modifier) {
    val controls = playback.subtitles
    val cues = controls.external ?: return
    if (!controls.usingExternal) return
    val state = playback.state
    var text by remember(cues) { mutableStateOf("") }
    LaunchedEffect(cues, controls.delayMs, state.playing, if (state.playing) null else state.positionMs) {
        do {
            text = cues.textAt(playback.subtitleTimeMs() - controls.delayMs)
            if (state.playing) delay(50)
        } while (state.playing)
    }
    if (text.isNotEmpty()) {
        Text(text, modifier.padding(start = 16.dp, end = 16.dp, bottom = if (controlsVisible) 120.dp else 24.dp)
            .background(Color.Black.copy(alpha = 0.72f)).padding(horizontal = 6.dp),
            textAlign = TextAlign.Center, color = Color.White, fontSize = controls.fontSize.sp,
            lineHeight = (controls.fontSize + 4).sp)
    }
}

@Composable
internal fun SubtitleDialog(controls: SubtitleControls, close: () -> Unit) {
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) controls.load(uri)
    }
    AlertDialog(onDismissRequest = close, title = { Text(stringResource(R.string.subtitles)) },
        confirmButton = { TextButton(onClick = close) { Text(stringResource(R.string.subtitle_close)) } },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                SubtitleOption(stringResource(R.string.subtitle_off), !controls.usingExternal && controls.selected < 0) {
                    controls.select(-1)
                }
                controls.tracks.forEach { track ->
                    SubtitleOption(track.name.ifBlank { stringResource(R.string.subtitle_track, track.id) },
                        !controls.usingExternal && controls.selected == track.id) { controls.select(track.id) }
                }
                if (controls.hasExternal) {
                    val label = controls.externalName?.let { stringResource(R.string.loaded_subtitle_named, it) }
                        ?: stringResource(R.string.loaded_subtitle)
                    SubtitleOption(label, controls.usingExternal, controls::selectExternal)
                }
                TextButton(onClick = { picker.launch(arrayOf("*/*")) }) { Text(stringResource(R.string.external_subtitle_open)) }
                if (controls.loading) Text(stringResource(R.string.subtitle_loading))
                controls.notice?.let { Text(stringResource(it), color = MaterialTheme.colorScheme.error) }
                if (controls.usingExternal || controls.selected >= 0) {
                    HorizontalDivider()
                    Text(stringResource(R.string.subtitle_delay, controls.delayMs / 1000.0))
                    Row {
                        TextButton(onClick = { controls.setDelay(controls.delayMs - 100) }) { Text(stringResource(R.string.subtitle_earlier)) }
                        TextButton(onClick = { controls.setDelay(controls.delayMs + 100) }) { Text(stringResource(R.string.subtitle_later)) }
                        TextButton(onClick = { controls.setDelay(0) }) { Text(stringResource(R.string.subtitle_reset)) }
                    }
                }
                if (controls.usingExternal) {
                    Text(stringResource(R.string.subtitle_size, controls.fontSize))
                    Row {
                        TextButton(onClick = { controls.setSize(controls.fontSize - 2) }, enabled = controls.fontSize > 12) { Text(stringResource(R.string.subtitle_smaller)) }
                        TextButton(onClick = { controls.setSize(controls.fontSize + 2) }, enabled = controls.fontSize < 40) { Text(stringResource(R.string.subtitle_larger)) }
                    }
                }
            }
        })
}

@Composable
private fun SubtitleOption(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp)
        .selectable(selected, role = Role.RadioButton, onClick = onClick),
        verticalAlignment = Alignment.CenterVertically) {
        RadioButton(selected, onClick = null)
        Text(label, Modifier.padding(start = 12.dp))
    }
}
