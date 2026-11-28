package dev.forme.music.redesign

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.music.R
import dev.forme.music.data.GroupKind
import dev.forme.music.data.PlaylistSummary
import dev.forme.music.data.Track
import dev.forme.music.data.TrackGroup
import dev.forme.music.data.groupOf
import dev.forme.music.data.groupsOf
import dev.forme.music.ui.MusicViewModel
import dev.forme.music.ui.formatTime

@Composable
fun LibraryPages(
    page: Page,
    viewModel: MusicViewModel,
    tracks: List<Track>,
    libraryLoaded: Boolean,
    playlists: List<PlaylistSummary>,
    currentUri: String?,
    selection: SelectionHandle,
    onOpen: (Page) -> Unit,
    onBack: () -> Unit,
    onAdd: (AddRequest) -> Unit,
) {
    Box(Modifier.fillMaxSize().background(Sokji.Surface)) {
        when (page) {
            Page.Home -> LibraryHome(viewModel, playlists, onOpen)
            is Page.Groups -> GroupList(page.kind, tracks, libraryLoaded, onOpen, onBack)
            is Page.Group -> GroupDetail(page, viewModel, tracks, libraryLoaded, currentUri, selection, onBack, onAdd)
            is Page.Playlist -> {
                val summary = playlists.firstOrNull { it.playlist.id == page.id }
                if (summary == null) {
                    // 지웠거나 아직 목록을 읽기 전이다.
                    DetailTopBar(onBack)
                } else {
                    PlaylistDetail(summary, viewModel, tracks, currentUri, onBack)
                }
            }
        }
    }
}

/** 묶음 기준의 이름. 보관함 바로가기와 묶음 목록 제목에 쓴다. */
fun kindLabel(kind: GroupKind) = when (kind) {
    GroupKind.FOLDER -> "폴더"
    GroupKind.SINGER -> "가수"
    GroupKind.CHANNEL -> "채널"
    GroupKind.MONTH -> "추가한 달"
}

private fun kindIcon(kind: GroupKind) = when (kind) {
    GroupKind.FOLDER -> R.drawable.ic_folder
    GroupKind.SINGER -> R.drawable.ic_person
    GroupKind.CHANNEL -> R.drawable.ic_channel
    GroupKind.MONTH -> R.drawable.ic_calendar
}

/** 묶음 이름. 기준 정보가 없는 곡끼리 모인 묶음은 무엇이 없는지 말한다. */
fun groupTitle(kind: GroupKind, key: String?): String = when (kind) {
    GroupKind.FOLDER -> key?.substringAfterLast('/') ?: "직접 추가한 곡"
    GroupKind.SINGER -> key ?: "가수를 모르는 곡"
    GroupKind.CHANNEL -> key ?: "채널 정보가 없는 곡"
    GroupKind.MONTH -> key?.let { "${it.take(4)}년 ${it.drop(5).trimStart('0')}월" } ?: "날짜를 모르는 곡"
}

private fun totalLength(tracks: List<Track>): String? {
    val total = tracks.sumOf { it.durationMs.coerceAtLeast(0) }
    if (total <= 0) return null
    val minutes = total / 60_000
    return when {
        minutes >= 60 -> "${minutes / 60}시간 ${minutes % 60}분"
        minutes >= 1 -> "${minutes}분"
        else -> "${total / 1000}초"
    }
}

@Composable
private fun LibraryHome(viewModel: MusicViewModel, playlists: List<PlaylistSummary>, onOpen: (Page) -> Unit) {
    var creating by rememberSaveable { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp)) {
        item(key = "header") { ScreenHeader("보관함", null) }
        item(key = "shortcuts") {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
                GroupKind.entries.forEach { kind -> Shortcut(kindIcon(kind), kindLabel(kind)) { onOpen(Page.Groups(kind)) } }
            }
        }
        item(key = "playlists") {
            SectionHeader("내 재생 목록")
            Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("전체 ${playlists.size}", style = MaterialTheme.typography.bodyMedium, color = Sokji.Muted, modifier = Modifier.weight(1f))
                Row(
                    Modifier
                        .clickable(role = Role.Button) { creating = true }
                        .padding(horizontal = 8.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(painterResource(R.drawable.ic_add), contentDescription = null, tint = Sokji.Ink, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("새로 만들기", style = MaterialTheme.typography.labelLarge)
                }
            }
        }
        if (playlists.isEmpty()) {
            item(key = "empty") { EmptyLine("곡을 길게 눌러 여러 곡을 고른 뒤 재생 목록에 담을 수 있습니다.") }
        }
        items(playlists, key = { it.playlist.id }) { summary ->
            val lines by remember(summary.playlist.id) { viewModel.playlistLines(summary.playlist.id) }
                .collectAsStateWithLifecycle(emptyList())
            CollectionRow(
                title = summary.playlist.name,
                detail = "${summary.trackCount}곡",
                covers = lines.take(8).map { it.uri to it.name },
                onClick = { onOpen(Page.Playlist(summary.playlist.id)) },
            )
        }
    }
    if (creating) {
        NameDialog("새 재생 목록", "", "만들기", onConfirm = { viewModel.createPlaylist(it); creating = false }, onDismiss = { creating = false })
    }
}

/** 재생 목록이나 묶음 한 줄: 묶음 커버 56dp, 이름, 곡 수. */
@Composable
private fun CollectionRow(title: String, detail: String, covers: List<Pair<String, String>>, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MosaicCover(covers, 56.dp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(detail, style = MaterialTheme.typography.bodyMedium, color = Sokji.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun DetailTopBar(onBack: () -> Unit, trailing: @Composable () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack) { Icon(painterResource(R.drawable.ic_back), contentDescription = "뒤로", tint = Sokji.Ink) }
        Spacer(Modifier.weight(1f))
        trailing()
    }
}

/** 한 기준의 묶음 목록. 맨 위에서 기준을 바로 바꿀 수 있다. */
@Composable
private fun GroupList(kind: GroupKind, tracks: List<Track>, libraryLoaded: Boolean, onOpen: (Page) -> Unit, onBack: () -> Unit) {
    var shownKind by rememberSaveable(kind) { mutableStateOf(kind) }
    val groups = remember(tracks, shownKind) { groupsOf(tracks, shownKind) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp)) {
        item(key = "top") { DetailTopBar(onBack) }
        item(key = "header") {
            Text(kindLabel(shownKind), style = MaterialTheme.typography.headlineLarge, modifier = Modifier.padding(horizontal = 20.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp)) {
                GroupKind.entries.forEach { other -> ChoiceText(kindLabel(other), other == shownKind) { shownKind = other } }
            }
        }
        when {
            !libraryLoaded -> item(key = "empty") { EmptyLine("곡을 불러오는 중입니다.") }
            groups.isEmpty() -> item(key = "empty") { EmptyLine("곡이 없습니다.") }
        }
        items(groups, key = { "${it.kind}|${it.key}" }) { group ->
            CollectionRow(
                title = groupTitle(group.kind, group.key),
                detail = groupDetail(group),
                covers = group.tracks.take(8).map { it.uri to it.name },
                onClick = { onOpen(Page.Group(group.kind, group.key)) },
            )
        }
    }
}

/** 묶음 줄의 보조 줄. 폴더는 같은 이름의 다른 폴더와 헷갈리지 않게 경로를 붙인다. */
private fun groupDetail(group: TrackGroup): String {
    val count = "${group.tracks.size}곡"
    val path = group.key?.takeIf { group.kind == GroupKind.FOLDER && it.contains('/') }
    return if (path != null) "$count, $path" else count
}

/** 묶음 상세: 큰 묶음 커버, 이름, 곡 수와 길이, 묶음째 담기와 셔플과 재생, 그 아래 곡들. */
@Composable
private fun GroupDetail(
    page: Page.Group,
    viewModel: MusicViewModel,
    tracks: List<Track>,
    libraryLoaded: Boolean,
    currentUri: String?,
    selection: SelectionHandle,
    onBack: () -> Unit,
    onAdd: (AddRequest) -> Unit,
) {
    val group = remember(tracks, page) { groupOf(tracks, page.kind, page.key) }
    val members = group?.tracks.orEmpty()
    val memberUris = remember(members) { members.map { it.uri } }
    val title = groupTitle(page.kind, page.key)
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp)) {
        item(key = "top") {
            if (selection.active) SelectionHeader(selection, memberUris) else DetailTopBar(onBack)
        }
        item(key = "header") {
            CollectionHeader(
                title = title,
                info = listOfNotNull("${members.size}곡", totalLength(members)).joinToString(", "),
                covers = members.take(8).map { it.uri to it.name },
                playable = members.isNotEmpty(),
                onPlay = { viewModel.player.play(members, 0) },
                onShuffle = { viewModel.player.play(members, 0, shuffle = true) },
                onAddAll = { onAdd(AddRequest(members, title)) },
            )
        }
        if (members.isEmpty()) {
            item(key = "empty") { EmptyLine(if (libraryLoaded) "이 묶음에 남은 곡이 없습니다." else "곡을 불러오는 중입니다.") }
        }
        items(members, key = { it.uri }) { track ->
            TrackLine(
                track = track,
                isCurrent = track.uri == currentUri,
                selection = selection,
                onPlay = { viewModel.player.play(members, members.indexOf(track)) },
                onPlayNext = viewModel.player::playNext,
                onAddToQueue = viewModel.player::addToQueue,
                onAddToPlaylist = { onAdd(AddRequest(listOf(it), "")) },
            )
        }
    }
}

/**
 * 상세 머리: 가운데 큰 커버(화면 너비의 60%), 제목 26, 정보 줄, 오른쪽에 담기, 셔플, 큰 재생 원을 한 줄에 둔다.
 * 재생 목록 상세와 묶음 상세가 같이 쓴다. [onAddAll]이 없으면 담기 단추를 두지 않는다.
 */
@Composable
private fun CollectionHeader(
    title: String,
    info: String,
    covers: List<Pair<String, String>>,
    playable: Boolean,
    onPlay: () -> Unit,
    onShuffle: () -> Unit,
    onAddAll: (() -> Unit)?,
) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        Box(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 20.dp), contentAlignment = Alignment.Center) {
            MosaicCover(covers, 216.dp)
        }
        Text(title, style = MaterialTheme.typography.headlineMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
        Row(Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(info, style = MaterialTheme.typography.bodyMedium, color = Sokji.Muted, modifier = Modifier.weight(1f))
            if (onAddAll != null) {
                IconButton(onClick = onAddAll, enabled = playable) {
                    Icon(painterResource(R.drawable.ic_playlist_add), contentDescription = "모두 재생 목록에 담기", tint = if (playable) Sokji.Ink else Sokji.Faint)
                }
            }
            IconButton(onClick = onShuffle, enabled = playable) {
                Icon(painterResource(R.drawable.ic_shuffle), contentDescription = "셔플 재생", tint = if (playable) Sokji.Ink else Sokji.Faint)
            }
            Spacer(Modifier.width(8.dp))
            PlayCircle(onPlay, enabled = playable)
        }
    }
}

/** 재생 목록 상세. 곡 줄 오른쪽 손잡이를 잡고 끌어 순서를 바꾸고, 메뉴로 한 칸씩 옮기거나 뺀다. */
@Composable
private fun PlaylistDetail(
    summary: PlaylistSummary,
    viewModel: MusicViewModel,
    tracks: List<Track>,
    currentUri: String?,
    onBack: () -> Unit,
) {
    val playlist = summary.playlist
    val records by remember(playlist.id) { viewModel.playlistLines(playlist.id) }.collectAsStateWithLifecycle(emptyList())
    val lines = remember(records, tracks) { viewModel.linesOf(records, tracks) }
    val keys = remember(lines) { occurrenceKeys(lines.map { it.record.uri }) }
    val lineByKey = remember(lines, keys) { keys.zip(lines).toMap() }
    var renaming by rememberSaveable { mutableStateOf(false) }
    var deleting by rememberSaveable { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val reorder = rememberReorderState(listState)
    val shownKeys = reorder.shown(keys)
    val unavailable = lines.count { it.track == null }
    val playableTracks = lines.mapNotNull { it.track }

    LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 16.dp)) {
        item(key = "top") {
            DetailTopBar(onBack) {
                MoreMenu(playlist.name, tint = Sokji.Ink) { close ->
                    DropdownMenuItem(text = { Text("이름 바꾸기") }, onClick = { renaming = true; close() })
                    DropdownMenuItem(text = { Text("삭제") }, onClick = { deleting = true; close() })
                }
            }
        }
        item(key = "header") {
            val info = buildList {
                add("${lines.size}곡")
                totalLength(playableTracks)?.let(::add)
                if (unavailable > 0) add("재생할 수 없는 곡 ${unavailable}곡")
            }.joinToString(", ")
            CollectionHeader(
                title = playlist.name,
                info = info,
                covers = lines.take(8).map { it.record.uri to it.record.name },
                playable = playableTracks.isNotEmpty(),
                onPlay = { viewModel.playPlaylist(lines, 0) },
                onShuffle = { viewModel.playPlaylist(lines, 0, shuffle = true) },
                onAddAll = null,
            )
        }
        if (lines.isEmpty()) {
            item(key = "empty") { EmptyLine("곡이 없습니다. 곡을 길게 눌러 고른 뒤 이 재생 목록에 담을 수 있습니다.") }
        }
        items(shownKeys, key = { it }) { key ->
            val line = lineByKey[key] ?: return@items
            val index = keys.indexOf(key)
            val dragging = reorder.draggingKey == key
            SongRow(
                uri = line.record.uri,
                title = line.record.name,
                detail = if (line.track == null) "재생할 수 없음: 파일이 옮겨졌거나 지워졌거나 접근 권한이 없습니다" else detailOf(line.track),
                isCurrent = line.track != null && line.record.uri == currentUri,
                enabled = line.track != null,
                onClick = { viewModel.playPlaylist(lines, index) },
                modifier = Modifier
                    .zIndex(if (dragging) 1f else 0f)
                    .graphicsLayer { translationY = if (dragging) reorder.dragOffset else 0f }
                    .background(if (dragging) Sokji.Raised else Sokji.Surface),
            ) {
                MoreMenu(line.record.name) { close ->
                    if (index > 0) {
                        DropdownMenuItem(text = { Text("위로") }, onClick = { viewModel.moveInPlaylist(playlist.id, index, index - 1); close() })
                    }
                    if (index < lines.lastIndex) {
                        DropdownMenuItem(text = { Text("아래로") }, onClick = { viewModel.moveInPlaylist(playlist.id, index, index + 1); close() })
                    }
                    DropdownMenuItem(text = { Text("재생 목록에서 빼기") }, onClick = { viewModel.removeFromPlaylist(playlist.id, index); close() })
                }
                Box(
                    Modifier
                        .size(44.dp)
                        .reorderHandle(reorder, key, keys) { from, to -> viewModel.moveInPlaylist(playlist.id, from, to) }
                        .semantics { contentDescription = "${line.record.name} 끌어서 순서 바꾸기" },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(painterResource(R.drawable.ic_drag_handle), contentDescription = null, tint = Sokji.Muted)
                }
            }
        }
    }

    if (renaming) {
        NameDialog("이름 바꾸기", playlist.name, "바꾸기", onConfirm = { viewModel.renamePlaylist(playlist.id, it); renaming = false }, onDismiss = { renaming = false })
    }
    if (deleting) {
        AlertDialog(
            onDismissRequest = { deleting = false },
            containerColor = Sokji.Raised,
            title = { Text("재생 목록 삭제") },
            text = { Text("${playlist.name}을 삭제합니다. 재생 목록만 지우고 음악 파일은 그대로 둡니다.") },
            confirmButton = { TextAction("삭제", onClick = { deleting = false; viewModel.deletePlaylist(playlist.id); onBack() }, color = Sokji.AccentText) },
            dismissButton = { TextAction("취소", onClick = { deleting = false }) },
        )
    }
}

/** 재생 목록 이름을 받는 창. 빈 이름으로는 만들 수 없다. */
@Composable
fun NameDialog(title: String, initial: String, confirmLabel: String, onConfirm: (String) -> Unit, onDismiss: () -> Unit) {
    var name by rememberSaveable { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Sokji.Raised,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("이름", style = MaterialTheme.typography.labelLarge)
                NameField(name) { name = it }
            }
        },
        confirmButton = { TextAction(confirmLabel, onClick = { onConfirm(name) }, color = Sokji.AccentText, enabled = name.isNotBlank()) },
        dismissButton = { TextAction("취소", onClick = onDismiss) },
    )
}
