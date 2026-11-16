package dev.forme.video.ui

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.video.R
import dev.forme.video.VideoViewModel
import dev.forme.video.data.PlaybackRecord
import kotlinx.coroutines.delay
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

@Composable
fun VideoApp(model: VideoViewModel) {
    val selection by model.selection.collectAsStateWithLifecycle()
    val recent by model.recent.collectAsStateWithLifecycle()
    val notice by model.notice.collectAsStateWithLifecycle()
    val saveFailed by model.repository.saveFailed.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()
    var lastOpened by remember { mutableStateOf<String?>(null) }
    var highlighted by remember { mutableStateOf<String?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let { model.select(it, fromPicker = true) }
    }
    val openFile = { picker.launch(arrayOf("video/*", "application/octet-stream", "application/x-matroska")) }
    BackHandler(enabled = selection != null) { model.closeVideo() }
    LaunchedEffect(selection?.sequence) {
        val current = selection
        if (current != null) {
            lastOpened = current.uri.toString()
        } else {
            highlighted = lastOpened
            delay(1_000)
            highlighted = null
        }
    }

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
            } else if (recent.isEmpty()) {
                EmptyLibrary(openFile, Modifier.weight(1f))
            } else {
                Row(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    Text(stringResource(R.string.recent_videos), style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.weight(1f))
                    VideoButton(stringResource(R.string.open_video), openFile)
                }
                LazyColumn(state = listState, modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 28.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    items(recent, key = { it.uri }) { record ->
                        RecentVideo(record, record.uri == highlighted) {
                            model.select(record.uri.toUri(), fromPicker = false)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyLibrary(openFile: () -> Unit, modifier: Modifier) {
    Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Icon(painterResource(R.drawable.ic_folder), null, Modifier.size(32.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(stringResource(R.string.choose_first_video), textAlign = TextAlign.Center,
                style = MaterialTheme.typography.titleMedium)
            VideoButton(stringResource(R.string.open_video), openFile)
        }
    }
}

@Composable
private fun RecentVideo(record: PlaybackRecord, highlighted: Boolean, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Column(Modifier.fillMaxWidth().heightIn(min = 52.dp)
        .background(if (highlighted) colors.surfaceVariant else colors.surface, MaterialTheme.shapes.small)
        .clickable(onClick = onClick).padding(vertical = 8.dp)) {
        Text(record.title, maxLines = 2, overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(2.dp))
        Text(
            if (record.durationMs > 0) "${formatTime(record.positionMs)} / ${formatTime(record.durationMs)}"
            else formatTime(record.positionMs),
            style = MaterialTheme.typography.bodySmall, color = colors.onSurfaceVariant,
        )
        Text(watchedDate(record.updatedAt), style = MaterialTheme.typography.bodySmall,
            color = colors.onSurfaceVariant)
        if (record.positionMs > 0 && record.durationMs > 0) {
            Spacer(Modifier.height(8.dp))
            // 썸네일이 없는 목록은 행 아래에 본 비율을 표시한다.
            Box(Modifier.fillMaxWidth().height(2.dp).background(colors.surfaceVariant)) {
                Box(Modifier.fillMaxWidth((record.positionMs.toFloat() / record.durationMs).coerceIn(0f, 1f))
                    .fillMaxHeight().background(colors.primary))
            }
        }
    }
}

@Composable
private fun watchedDate(timestamp: Long): String {
    val date = Instant.ofEpochMilli(timestamp).atZone(ZoneId.systemDefault()).toLocalDate()
    val today = LocalDate.now()
    return when (date) {
        today -> stringResource(R.string.today)
        today.minusDays(1) -> stringResource(R.string.yesterday)
        else -> DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).format(date)
    }
}

internal fun formatTime(milliseconds: Long): String {
    val seconds = milliseconds.coerceAtLeast(0) / 1_000
    return if (seconds >= 3_600) String.format(Locale.ROOT, "%d:%02d:%02d", seconds / 3_600, seconds / 60 % 60, seconds % 60)
    else String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60)
}
