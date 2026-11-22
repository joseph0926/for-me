package dev.forme.video.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.BasicTextField
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
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
    // 홈에 다녀와도 보관함에서 보던 탭으로 돌아오도록 보관함 표시 여부와 따로 기억한다.
    var libraryTab by rememberSaveable { mutableStateOf(LibraryTab.Folders) }
    val openLibrary = { tab: LibraryTab ->
        libraryTab = tab
        library = true
    }
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
    // 탭마다 목록 길이가 달라 한 스크롤 위치를 함께 쓰면 탭을 바꿀 때 엉뚱한 곳이 보인다.
    val folderTabState = rememberLazyListState()
    val recentTabState = rememberLazyListState()
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
        // 버튼이 없는 보관함에서도 홈과 머리 줄 높이를 맞춰 탭을 바꿀 때 목록이 움직이지 않게 한다.
        Row(Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp, top = 8.dp, bottom = 8.dp).heightIn(min = 48.dp),
            verticalAlignment = Alignment.CenterVertically) {
            // 보관함에서는 따로 큰 제목 줄을 두지 않고 이 줄이 화면 이름을 맡는다.
            // 영상 열기는 아래 탭이 맡으므로, 폴더 추가와 헷갈리는 + 버튼을 보관함 머리 줄에는 두지 않는다.
            if (library) {
                Text(stringResource(R.string.library), style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f))
            } else {
                Text(stringResource(R.string.app_name), style = MaterialTheme.typography.titleLarge.copy(letterSpacing = 3.sp),
                    modifier = Modifier.weight(1f))
                VideoIconButton(openFile, Modifier.size(48.dp)) {
                    Icon(painterResource(R.drawable.ic_add), stringResource(R.string.open_video))
                }
            }
        }
        if (library) LibraryTabs(libraryTab, records.size) { libraryTab = it }
        val listStateForScreen = when {
            !library -> listState
            libraryTab == LibraryTab.Folders -> folderTabState
            else -> recentTabState
        }
        // 보관함 행은 간격 없이 붙고 안쪽 여백으로 떨어진다. 홈은 묶음 사이에 같은 간격을 둔다.
        LazyColumn(Modifier.weight(1f), state = listStateForScreen, contentPadding = PaddingValues(bottom = 28.dp),
            verticalArrangement = if (library) Arrangement.Top else Arrangement.spacedBy(24.dp)) {
            if (library) {
                when (libraryTab) {
                    LibraryTab.Folders -> item {
                        LibraryFolders(folders.sortedRoots(), open = { openTree = it }, add = { folderPicker.launch(null) })
                    }
                    LibraryTab.Recent -> {
                        // 검색은 최근 본 영상만 거르므로 이 탭에만 둔다.
                        item {
                            SearchField(query, Modifier.padding(start = 24.dp, end = 24.dp, top = 12.dp, bottom = 8.dp)) {
                                query = it
                            }
                        }
                        val visible = records.filter { it.title.contains(query, ignoreCase = true) }
                        if (visible.isEmpty()) item {
                            EmptyCollection(records.isEmpty(), openFile)
                        }
                        items(visible, key = { it.uri }) { record ->
                            VideoRow(record, { play(record) }, verticalPadding = LIBRARY_ROW_PADDING) { openDetail(record) }
                        }
                    }
                }
                // 문제를 알릴 때 어느 빌드였는지 기록할 수 있게 두 탭 모두 끝에 둔다.
                item {
                    Text(stringResource(R.string.app_version, BuildConfig.VERSION_NAME),
                        Modifier.padding(start = 24.dp, end = 24.dp, top = LIBRARY_GROUP_GAP),
                        style = MaterialTheme.typography.bodySmall,
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
                        SectionTitle(stringResource(R.string.continue_watching)) { openLibrary(LibraryTab.Recent) }
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
                        SectionTitle(stringResource(R.string.folder_videos)) { openLibrary(LibraryTab.Folders) }
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
                    item { SectionTitle(stringResource(R.string.recent_videos)) { openLibrary(LibraryTab.Recent) } }
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

/** 보관함 안의 탭. 홈의 묶음 제목은 해당 탭을 골라 보관함을 연다. */
internal enum class LibraryTab { Folders, Recent }

/**
 * 머리 줄 아래 글자 탭. 고른 탭은 흰 글자와 밑줄, 나머지는 흐린 글자로 둔다.
 * 최근 본 영상 탭에는 기록 수를 흐리게 붙인다.
 */
@Composable
private fun LibraryTabs(selected: LibraryTab, recentCount: Int, select: (LibraryTab) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
        LibraryTabItem(stringResource(R.string.folder), null, selected == LibraryTab.Folders) {
            select(LibraryTab.Folders)
        }
        LibraryTabItem(stringResource(R.string.recently_watched), stringResource(R.string.library_count, recentCount),
            selected == LibraryTab.Recent) {
            select(LibraryTab.Recent)
        }
    }
}

@Composable
private fun LibraryTabItem(label: String, count: String?, selected: Boolean, onClick: () -> Unit) {
    val color = if (selected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
    Column(Modifier.selectable(selected = selected, role = Role.Tab, onClick = onClick)
        .padding(horizontal = 12.dp).width(IntrinsicSize.Max).heightIn(min = 48.dp),
        verticalArrangement = Arrangement.Bottom) {
        Row(Modifier.padding(bottom = 10.dp), verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(label, style = MaterialTheme.typography.titleMedium, color = color)
            if (count != null) Text(count, style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        // 글자 폭만큼 밑줄을 그어 어느 탭인지 색에만 기대지 않게 한다.
        Box(Modifier.fillMaxWidth().height(2.dp)
            .background(if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent))
    }
}

/**
 * 폴더 탭의 내용. 폴더 행을 누르면 그 폴더가 바로 열린다.
 * 추가 행은 폴더가 있든 없든 목록 끝의 같은 자리에 둔다.
 */
@Composable
private fun LibraryFolders(roots: List<Pair<Uri, String>>, open: (Uri) -> Unit, add: () -> Unit) {
    Column(Modifier.padding(top = 8.dp)) {
        roots.forEach { (tree, title) -> FolderRow(title, isFolder = true) { open(tree) } }
        // 폴더 행과 같은 자리와 모양에 폴더 모양 아이콘을 두어, 영상 열기와 다른 동작으로 읽히게 한다.
        Row(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = add).heightIn(min = 56.dp)
            .padding(horizontal = 24.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Icon(painterResource(R.drawable.ic_folder_add), null, Modifier.size(24.dp))
            Text(stringResource(R.string.add_folder))
        }
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

/** 보관함 목록 행의 위아래 안쪽 여백. 행끼리는 간격 없이 붙고 이 여백으로 떨어진다. */
private val LIBRARY_ROW_PADDING = 11.dp

/** 목록 마지막 행과 버전 표시 사이 여백. 행 사이(안쪽 여백 두 번)보다 넓어야 목록과 나뉘어 보인다. */
private val LIBRARY_GROUP_GAP = 28.dp

/** 떠오르는 라벨 없이 안내 글자만 두어 기본 입력란보다 낮게 만든다. */
@Composable
private fun SearchField(query: String, modifier: Modifier, changeQuery: (String) -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val colors = OutlinedTextFieldDefaults.colors()
    val shape = MaterialTheme.shapes.small
    val label = stringResource(R.string.search_videos)
    BasicTextField(
        value = query,
        onValueChange = changeQuery,
        modifier = modifier.fillMaxWidth().semantics { contentDescription = label },
        singleLine = true,
        textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
        cursorBrush = SolidColor(MaterialTheme.colorScheme.onSurface),
        interactionSource = interactionSource,
    ) { innerTextField ->
        OutlinedTextFieldDefaults.DecorationBox(
            value = query,
            innerTextField = innerTextField,
            enabled = true,
            singleLine = true,
            visualTransformation = VisualTransformation.None,
            interactionSource = interactionSource,
            // 입력란 이름은 위 설명으로 전하므로, 입력하면 사라지는 안내 글자는 읽기 도구에 다시 알리지 않는다.
            placeholder = { Text(label, Modifier.clearAndSetSemantics { }) },
            colors = colors,
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            container = {
                OutlinedTextFieldDefaults.Container(
                    enabled = true,
                    isError = false,
                    interactionSource = interactionSource,
                    colors = colors,
                    shape = shape,
                )
            },
        )
    }
}

@Composable
private fun VideoRow(record: PlaybackRecord, play: () -> Unit, verticalPadding: Dp = 0.dp, open: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = play)
        .padding(start = 24.dp, end = 12.dp, top = verticalPadding, bottom = verticalPadding),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        VideoArtwork(record.uri, Modifier.width(104.dp).height(64.dp).clip(MaterialTheme.shapes.medium))
        // 행 제목은 묶음 소제목(16sp 650)보다 한 단계 낮게 두고, 긴 파일 이름은 한 줄로 잘라 행 높이를 맞춘다.
        // 잘린 이름은 상세에서 세 줄까지 보여 준다.
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(record.title, maxLines = 1, overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium))
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
