package dev.forme.music.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.music.R
import dev.forme.music.data.PlaylistRecord
import dev.forme.music.data.PlaylistSummary
import dev.forme.music.data.Track

@Composable
fun PlaylistsScreen(
    playlists: List<PlaylistSummary>,
    onOpen: (Long) -> Unit,
    onCreate: (String) -> Unit,
) {
    var creating by rememberSaveable { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ScreenTitle("재생 목록", "${playlists.size}개", Modifier.weight(1f))
                TextButton(onClick = { creating = true }, modifier = Modifier.padding(end = 8.dp, top = 12.dp)) {
                    Text("새 재생 목록")
                }
            }
        }
        if (playlists.isEmpty()) item { EmptyNote("재생 목록이 없습니다. 곡의 메뉴에서 재생 목록에 추가하거나 새로 만들 수 있습니다.") }
        items(playlists, key = { it.playlist.id }) { summary ->
            Column(
                Modifier
                    .fillMaxWidth()
                    .clickable { onOpen(summary.playlist.id) }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                Text(
                    summary.playlist.name,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text("${summary.trackCount}곡", style = MaterialTheme.typography.bodySmall, color = MusicColors.SubText)
            }
        }
    }
    if (creating) {
        NameDialog(
            title = "새 재생 목록",
            initial = "",
            confirmLabel = "만들기",
            onConfirm = { onCreate(it); creating = false },
            onDismiss = { creating = false },
        )
    }
}

@Composable
fun PlaylistDetail(
    summary: PlaylistSummary,
    viewModel: MusicViewModel,
    tracks: List<Track>,
    currentUri: String?,
    onBack: () -> Unit,
) {
    val playlist = summary.playlist
    val records by remember(playlist.id) { viewModel.playlistLines(playlist.id) }
        .collectAsStateWithLifecycle(emptyList())
    val lines = remember(records, tracks) { viewModel.linesOf(records, tracks) }
    var renaming by rememberSaveable { mutableStateOf(false) }
    var deleting by rememberSaveable { mutableStateOf(false) }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp)) {
        item {
            Row(Modifier.padding(start = 4.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(painterResource(R.drawable.ic_back), contentDescription = "뒤로") }
            }
            Text(
                playlist.name,
                modifier = Modifier.padding(horizontal = 16.dp),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
            val unavailable = lines.count { it.track == null }
            Text(
                if (unavailable > 0) "${lines.size}곡, 재생할 수 없는 곡 ${unavailable}곡" else "${lines.size}곡",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = MusicColors.SubText,
            )
            Row(Modifier.padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { viewModel.playPlaylist(lines, 0) }, enabled = lines.isNotEmpty()) { Text("재생") }
                TextButton(onClick = { viewModel.playPlaylist(lines, 0, shuffle = true) }, enabled = lines.isNotEmpty()) {
                    Text("셔플 재생")
                }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = { renaming = true }) { Text("이름 바꾸기", color = MusicColors.SubText) }
                TextButton(onClick = { deleting = true }) { Text("삭제", color = MusicColors.SubText) }
            }
        }
        if (lines.isEmpty()) item { EmptyNote("곡이 없습니다. 곡 목록의 메뉴에서 이 재생 목록에 추가할 수 있습니다.") }
        itemsIndexed(lines) { index, line ->
            TrackRow(
                name = line.record.name,
                detail = if (line.track == null) "재생할 수 없음: 파일이 옮겨졌거나 지워졌거나 접근 권한이 없습니다" else null,
                isCurrent = line.track != null && line.record.uri == currentUri,
                enabled = line.track != null,
                onClick = { viewModel.playPlaylist(lines, index) },
            ) { close ->
                if (index > 0) {
                    DropdownMenuItem(text = { Text("위로") }, onClick = { viewModel.moveInPlaylist(playlist.id, index, index - 1); close() })
                }
                if (index < lines.lastIndex) {
                    DropdownMenuItem(text = { Text("아래로") }, onClick = { viewModel.moveInPlaylist(playlist.id, index, index + 1); close() })
                }
                DropdownMenuItem(text = { Text("재생 목록에서 빼기") }, onClick = { viewModel.removeFromPlaylist(playlist.id, index); close() })
            }
        }
    }

    if (renaming) {
        NameDialog(
            title = "이름 바꾸기",
            initial = playlist.name,
            confirmLabel = "바꾸기",
            onConfirm = { viewModel.renamePlaylist(playlist.id, it); renaming = false },
            onDismiss = { renaming = false },
        )
    }
    if (deleting) {
        AlertDialog(
            onDismissRequest = { deleting = false },
            title = { Text("재생 목록 삭제") },
            text = { Text("${playlist.name}을 삭제합니다. 재생 목록만 지우고 음악 파일은 그대로 둡니다.") },
            confirmButton = {
                TextButton(onClick = { deleting = false; viewModel.deletePlaylist(playlist.id); onBack() }) { Text("삭제") }
            },
            dismissButton = { TextButton(onClick = { deleting = false }) { Text("취소") } },
        )
    }
}

@Composable
fun NameDialog(
    title: String,
    initial: String,
    confirmLabel: String,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var name by rememberSaveable { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            OutlinedTextField(value = name, onValueChange = { name = it }, singleLine = true, placeholder = { Text("이름") })
        },
        confirmButton = { TextButton(onClick = { onConfirm(name) }, enabled = name.isNotBlank()) { Text(confirmLabel) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } },
    )
}

@Composable
fun AddToPlaylistDialog(
    track: Track,
    playlists: List<PlaylistSummary>,
    onAdd: (PlaylistRecord) -> Unit,
    onCreate: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var creating by rememberSaveable { mutableStateOf(false) }
    if (creating) {
        NameDialog(
            title = "새 재생 목록",
            initial = "",
            confirmLabel = "만들고 추가",
            onConfirm = { onCreate(it); onDismiss() },
            onDismiss = onDismiss,
        )
        return
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("재생 목록에 추가") },
        text = {
            Column {
                Text(track.name, style = MaterialTheme.typography.bodySmall, color = MusicColors.SubText, maxLines = 2)
                LazyColumn {
                    items(playlists, key = { it.playlist.id }) { summary ->
                        Text(
                            summary.playlist.name,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onAdd(summary.playlist); onDismiss() }
                                .padding(vertical = 12.dp),
                            style = MaterialTheme.typography.bodyLarge,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { creating = true }) { Text("새 재생 목록") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } },
    )
}
