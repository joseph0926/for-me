package dev.forme.video.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.selection.selectable
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.net.Uri
import dev.forme.video.data.FolderQueue
import dev.forme.video.data.VideoFolders
import dev.forme.video.BuildConfig
import dev.forme.video.R
import dev.forme.video.data.PlaybackRecord

@Composable
internal fun LibraryScreen(records: List<PlaybackRecord>, openFile: () -> Unit,
    folders: VideoFolders, findRecord: suspend (String) -> PlaybackRecord?,
    playFromFolder: (Uri, FolderQueue) -> Unit, modifier: Modifier = Modifier, play: (PlaybackRecord) -> Unit) {
    var library by rememberSaveable { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var openTree by rememberSaveable { mutableStateOf<Uri?>(null) }
    val folderPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            folders.add(uri)
            openTree = uri
        }
    }
    var detailUri by rememberSaveable { mutableStateOf<String?>(null) }
    // 상세나 폴더 화면을 띄우는 동안 목록이 구성에서 빠져도 돌아왔을 때 보던 위치를 지키도록 여기서 만든다.
    val listState = rememberLazyListState()
    val continueWatchingState = rememberLazyListState()
    openTree?.let { tree ->
        key(tree) { FolderBrowser(folders, tree, findRecord, playFromFolder, { openTree = null }, modifier) }
        return
    }
    // 재생을 닫으면 저장된 이 상태로 상세에 돌아온다. 기록이 최근 목록에서 빠지면 목록을 보여 준다.
    val detail = records.firstOrNull { it.uri == detailUri }
    if (detail != null) {
        VideoDetail(detail, { play(detail) }, { detailUri = null }, modifier)
        return
    }
    val openDetail = { record: PlaybackRecord -> detailUri = record.uri }
    Column(modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.app_name), style = MaterialTheme.typography.titleLarge.copy(letterSpacing = 3.sp),
                modifier = Modifier.weight(1f))
            VideoIconButton(openFile, Modifier.size(48.dp)) {
                Icon(painterResource(R.drawable.ic_add), stringResource(R.string.open_video))
            }
        }
        LazyColumn(Modifier.weight(1f), state = listState, contentPadding = PaddingValues(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)) {
            if (library) {
                item {
                    Text(stringResource(R.string.library), Modifier.padding(horizontal = 24.dp),
                        style = MaterialTheme.typography.headlineLarge)
                }
                item {
                    LibraryFolders(folders.sortedRoots(), open = { openTree = it }, add = { folderPicker.launch(null) })
                }
                item {
                    Column(Modifier.padding(horizontal = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(stringResource(R.string.library_count, records.size), style = MaterialTheme.typography.titleLarge)
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
                    VideoRow(record, { play(record) }) { openDetail(record) }
                }
                // 문제를 알릴 때 어느 빌드였는지 기록할 수 있게 보관함 끝에 둔다.
                item {
                    Text(stringResource(R.string.app_version, BuildConfig.VERSION_NAME),
                        Modifier.padding(horizontal = 24.dp), style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                item {
                    val latest = records.firstOrNull()
                    if (latest != null) FeaturedVideo(latest, { play(latest) }) { openDetail(latest) }
                    else EmptyCollection(true, openFile)
                }
                if (records.isNotEmpty()) {
                    item {
                        SectionTitle(stringResource(R.string.continue_watching)) { library = true }
                        Spacer(Modifier.height(14.dp))
                        LazyRow(state = continueWatchingState, contentPadding = PaddingValues(horizontal = 24.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(records, key = { it.uri }) { record ->
                                Column(Modifier.width(240.dp).clickable { play(record) }) {
                                    Box(Modifier.fillMaxWidth().height(138.dp).clip(MaterialTheme.shapes.medium)) {
                                        VideoArtwork(record.uri, Modifier.fillMaxSize())
                                        DetailsButton(Modifier.align(Alignment.TopEnd), onArtwork = true) { openDetail(record) }
                                        Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(3.dp)
                                            .background(Color.White.copy(alpha = 0.2f))) {
                                            Box(Modifier.fillMaxWidth(progress(record)).fillMaxHeight().background(Color.White))
                                        }
                                    }
                                    Spacer(Modifier.height(10.dp))
                                    Text(record.title, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                        style = MaterialTheme.typography.titleMedium)
                                    Text(remainingSummary(record), style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
                val shortcuts = folders.sortedRoots()
                if (shortcuts.isNotEmpty()) {
                    item {
                        SectionTitle(stringResource(R.string.folder_videos)) { library = true }
                        Spacer(Modifier.height(14.dp))
                        LazyRow(contentPadding = PaddingValues(horizontal = 24.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(shortcuts, key = { "folder:" + it.first }) { (tree, title) ->
                                FolderShortcut(title, folders.latestVideoIn(tree, records)) { openTree = tree }
                            }
                        }
                    }
                }
                if (records.isNotEmpty()) {
                    item { SectionTitle(stringResource(R.string.recent_videos)) { library = true } }
                    items(records.take(4), key = { "recent:" + it.uri }) { record ->
                        VideoRow(record, { play(record) }) { openDetail(record) }
                    }
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
private fun FeaturedVideo(record: PlaybackRecord, play: () -> Unit, open: () -> Unit) {
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
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                VideoButton(stringResource(R.string.resume_video), play, progress = progress(record))
                DetailsButton(Modifier, onArtwork = false, open = open)
            }
        }
    }
}

/**
 * 보관함의 폴더 묶음. 폴더 행을 누르면 그 폴더가 바로 열린다.
 * 폴더가 없으면 추가 행 하나만 두고, 있으면 추가는 제목 오른쪽의 밑줄 글자로 둔다.
 */
@Composable
private fun LibraryFolders(roots: List<Pair<Uri, String>>, open: (Uri) -> Unit, add: () -> Unit) {
    Column {
        Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp).heightIn(min = 48.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.folder), Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
            if (roots.isNotEmpty()) {
                Text(stringResource(R.string.add_folder),
                    Modifier.clickable(role = Role.Button, onClick = add).padding(horizontal = 12.dp, vertical = 14.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelLarge.copy(textDecoration = TextDecoration.Underline))
            }
        }
        if (roots.isEmpty()) {
            Row(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = add).heightIn(min = 56.dp)
                .padding(horizontal = 24.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Icon(painterResource(R.drawable.ic_add), null, Modifier.size(24.dp))
                Text(stringResource(R.string.add_folder))
            }
        }
        roots.forEach { (tree, title) -> FolderRow(title, isFolder = true) { open(tree) } }
    }
}

/** 홈의 폴더 바로가기. 그 폴더에서 최근에 연 영상이 있으면 장면을 흐리게 깔고, 없으면 폴더 아이콘만 둔다. */
@Composable
private fun FolderShortcut(title: String, coverUri: String?, open: () -> Unit) {
    Column(Modifier.width(136.dp).clip(MaterialTheme.shapes.medium)
        .background(MaterialTheme.colorScheme.surfaceVariant)
        .clickable(role = Role.Button, onClick = open)) {
        Box(Modifier.fillMaxWidth().height(76.dp)) {
            if (coverUri != null) VideoArtwork(coverUri, Modifier.fillMaxSize().alpha(0.45f))
            Icon(painterResource(R.drawable.ic_folder), null, Modifier.padding(start = 12.dp, top = 10.dp).size(18.dp))
        }
        Text(title, Modifier.padding(start = 12.dp, end = 12.dp, top = 8.dp, bottom = 10.dp),
            maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleSmall)
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
private fun VideoRow(record: PlaybackRecord, play: () -> Unit, open: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = play).padding(start = 24.dp, end = 12.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        VideoArtwork(record.uri, Modifier.width(104.dp).height(64.dp).clip(MaterialTheme.shapes.medium))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(record.title, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleMedium)
            Text(timeSummary(record), style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        ProgressPlayMark(progress(record))
        DetailsButton(Modifier, onArtwork = false, open = open)
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

/** 재생 표시 둘레를 본 만큼 채운다. 행 전체가 재생 버튼이라 읽기 도구에는 알리지 않는다. */
@Composable
internal fun ProgressPlayMark(watched: Float) {
    Box(Modifier.size(30.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            val stroke = 2.dp.toPx()
            val inset = stroke / 2
            val arcSize = Size(size.width - stroke, size.height - stroke)
            drawCircle(Color.White.copy(alpha = 0.3f), radius = (size.minDimension - stroke) / 2, style = Stroke(stroke))
            if (watched > 0f) drawArc(Color.White, startAngle = -90f, sweepAngle = 360f * watched, useCenter = false,
                topLeft = Offset(inset, inset), size = arcSize, style = Stroke(stroke, cap = StrokeCap.Round))
        }
        Icon(painterResource(R.drawable.ic_play), null, Modifier.size(14.dp))
    }
}

/** 카드와 행은 누르면 바로 재생하므로 상세는 이 버튼으로만 연다. 장면 위에서는 반투명 원으로 받친다. */
@Composable
private fun DetailsButton(modifier: Modifier, onArtwork: Boolean, open: () -> Unit) {
    VideoIconButton(open, modifier.size(48.dp)) {
        Box(Modifier.size(32.dp).then(if (onArtwork) Modifier.background(Color.Black.copy(alpha = 0.45f), CircleShape)
            else Modifier), contentAlignment = Alignment.Center) {
            Icon(painterResource(R.drawable.ic_info), stringResource(R.string.video_details), Modifier.size(20.dp))
        }
    }
}

internal fun progress(record: PlaybackRecord): Float =
    if (record.durationMs > 0) (record.positionMs.toFloat() / record.durationMs).coerceIn(0f, 1f) else 0f

@Composable
private fun remainingSummary(record: PlaybackRecord): String {
    if (record.durationMs <= 0) return formatTime(record.positionMs)
    val remainingMs = (record.durationMs - record.positionMs).coerceAtLeast(0)
    if (remainingMs < 60_000) return stringResource(R.string.remaining_under_minute)
    val minutes = ((remainingMs + 30_000) / 60_000).toInt()
    return when {
        minutes < 60 -> stringResource(R.string.remaining_minutes, minutes)
        minutes % 60 == 0 -> stringResource(R.string.remaining_hours, minutes / 60)
        else -> stringResource(R.string.remaining_hours_minutes, minutes / 60, minutes % 60)
    }
}

internal fun timeSummary(record: PlaybackRecord): String =
    if (record.durationMs > 0) "${formatTime(record.positionMs)} / ${formatTime(record.durationMs)}"
    else formatTime(record.positionMs)
