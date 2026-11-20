package dev.forme.video.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.selection.selectable
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.net.Uri
import dev.forme.video.data.VideoFolders
import dev.forme.video.R
import dev.forme.video.data.PlaybackRecord

@Composable
internal fun LibraryScreen(records: List<PlaybackRecord>, openFile: () -> Unit,
    folders: VideoFolders, playFromFolder: (Uri) -> Unit, modifier: Modifier = Modifier, play: (PlaybackRecord) -> Unit) {
    var library by rememberSaveable { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var browsingFolders by rememberSaveable { mutableStateOf(false) }
    if (browsingFolders) {
        FolderBrowser(folders, playFromFolder, { browsingFolders = false }, modifier)
        return
    }
    Column(modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Text("for me", style = MaterialTheme.typography.titleLarge.copy(letterSpacing = 3.sp),
                modifier = Modifier.weight(1f))
            VideoIconButton(openFile, Modifier.size(48.dp)) {
                Icon(painterResource(R.drawable.ic_add), stringResource(R.string.open_video))
            }
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)) {
            if (library) {
                item {
                    Column(Modifier.padding(horizontal = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(stringResource(R.string.library), style = MaterialTheme.typography.headlineLarge)
                        VideoButton(stringResource(R.string.folder_videos), { browsingFolders = true }, secondary = true)
                        Text(stringResource(R.string.library_count, records.size), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(query, { query = it }, Modifier.fillMaxWidth(), singleLine = true,
                            label = { Text(stringResource(R.string.search_videos)) },
                            shape = MaterialTheme.shapes.small)
                    }
                }
                val visible = records.filter { it.title.contains(query, ignoreCase = true) }
                if (visible.isEmpty()) item {
                    EmptyCollection(records.isEmpty(), openFile)
                }
                items(visible, key = { it.uri }) { record ->
                    VideoRow(record) { play(record) }
                }
            } else {
                item {
                    val latest = records.firstOrNull()
                    if (latest != null) FeaturedVideo(latest) { play(latest) }
                    else EmptyCollection(true, openFile)
                }
                if (records.isNotEmpty()) {
                    item {
                        SectionTitle(stringResource(R.string.continue_watching)) { library = true }
                        Spacer(Modifier.height(14.dp))
                        LazyRow(contentPadding = PaddingValues(horizontal = 24.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(records, key = { it.uri }) { record ->
                                Column(Modifier.width(240.dp).clickable { play(record) }) {
                                    Box(Modifier.fillMaxWidth().height(138.dp).clip(MaterialTheme.shapes.medium)) {
                                        VideoArtwork(record.uri, Modifier.fillMaxSize())
                                        Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(3.dp)
                                            .background(Color.White.copy(alpha = 0.2f))) {
                                            Box(Modifier.fillMaxWidth(progress(record)).fillMaxHeight().background(Color.White))
                                        }
                                    }
                                    Spacer(Modifier.height(10.dp))
                                    Text(record.title, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                        style = MaterialTheme.typography.titleMedium)
                                    Text(timeSummary(record), style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                    item { SectionTitle(stringResource(R.string.recent_videos)) { library = true } }
                    items(records.take(4), key = { "recent:" + it.uri }) { record -> VideoRow(record) { play(record) } }
                }
            }
        }
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
            NavigationItem(R.drawable.ic_home, R.string.home, !library) { library = false }
            NavigationItem(R.drawable.ic_library, R.string.library, library) { library = true }
            NavigationItem(R.drawable.ic_folder, R.string.open_video, false, openFile)
        }
    }
}

@Composable
private fun FeaturedVideo(record: PlaybackRecord, play: () -> Unit) {
    val windowSize = LocalWindowInfo.current.containerSize
    val heroHeight = if (windowSize.width > windowSize.height) 220.dp else 380.dp
    Box(Modifier.fillMaxWidth().height(heroHeight)) {
        VideoArtwork(record.uri, Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(
            Color.Black.copy(alpha = 0.05f), Color(0xFF0B1016).copy(alpha = 0.35f), Color(0xFF0B1016)))))
        Column(Modifier.align(Alignment.BottomStart).padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.your_last_scene), style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.8f))
            Text(record.title, maxLines = 2, overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.headlineLarge)
            Text(timeSummary(record), color = MaterialTheme.colorScheme.onSurfaceVariant)
            VideoButton(stringResource(R.string.resume_video), play)
        }
    }
}

@Composable
private fun EmptyCollection(empty: Boolean, openFile: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 48.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Icon(painterResource(R.drawable.ic_library), null, Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(stringResource(if (empty) R.string.empty_title else R.string.no_search_results),
            style = MaterialTheme.typography.headlineLarge)
        Text(stringResource(if (empty) R.string.empty_description else R.string.try_another_title),
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (empty) VideoButton(stringResource(R.string.open_video), openFile)
    }
}

@Composable
private fun SectionTitle(title: String, open: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = open).padding(horizontal = 24.dp).heightIn(min = 48.dp),
        verticalAlignment = Alignment.CenterVertically) {
        Text(title, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
        Icon(painterResource(R.drawable.ic_chevron), null, Modifier.size(20.dp))
    }
}

@Composable
private fun VideoRow(record: PlaybackRecord, play: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = play).padding(horizontal = 24.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        VideoArtwork(record.uri, Modifier.width(104.dp).height(64.dp).clip(MaterialTheme.shapes.medium))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(record.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleMedium)
            Text(timeSummary(record), style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Box(Modifier.size(30.dp).border(1.dp, Color.White.copy(alpha = 0.7f), CircleShape),
            contentAlignment = Alignment.Center) {
            Icon(painterResource(R.drawable.ic_play), null, Modifier.size(16.dp))
        }
    }
}

@Composable
private fun NavigationItem(icon: Int, label: Int, selected: Boolean, onClick: () -> Unit) {
    val color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
    Column(Modifier.widthIn(min = 80.dp).selectable(selected = selected, role = Role.Tab, onClick = onClick).padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(painterResource(icon), null, Modifier.size(24.dp), tint = color)
        Text(stringResource(label), style = MaterialTheme.typography.labelSmall, color = color)
    }
}

private fun progress(record: PlaybackRecord): Float =
    if (record.durationMs > 0) (record.positionMs.toFloat() / record.durationMs).coerceIn(0f, 1f) else 0f

private fun timeSummary(record: PlaybackRecord): String =
    if (record.durationMs > 0) "${formatTime(record.positionMs)} / ${formatTime(record.durationMs)}"
    else formatTime(record.positionMs)
