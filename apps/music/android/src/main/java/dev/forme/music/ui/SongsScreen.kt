package dev.forme.music.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.DropdownMenu
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
import dev.forme.music.R
import dev.forme.music.data.Track
import dev.forme.music.data.TrackOrder
import dev.forme.music.data.matching
import dev.forme.music.data.sortedFor

@Composable
fun SongsScreen(
    libraryState: LibraryState,
    audioAccess: AudioAccess,
    currentUri: String?,
    onRequestAudio: () -> Unit,
    onPickFiles: () -> Unit,
    onPlay: (List<Track>, Int, Boolean) -> Unit,
    onPlayNext: (Track) -> Unit,
    onAddToQueue: (Track) -> Unit,
    onAddToPlaylist: (Track) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    var order by rememberSaveable { mutableStateOf(TrackOrder.NAME) }
    val all = (libraryState as? LibraryState.Loaded)?.tracks.orEmpty()
    val shown = remember(all, query, order) { all.matching(query).sortedFor(order) }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp)) {
        item {
            ScreenTitle("곡", if (libraryState is LibraryState.Loaded) "${all.size}곡" else null)
        }
        if (audioAccess != AudioAccess.GRANTED) {
            item { AudioAccessNotice(audioAccess, onRequestAudio) }
        }
        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                placeholder = { Text("곡 이름으로 찾기") },
                leadingIcon = { Icon(painterResource(R.drawable.ic_search), contentDescription = null) },
                singleLine = true,
            )
        }
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OrderButton("이름순", order == TrackOrder.NAME) { order = TrackOrder.NAME }
                OrderButton("추가한 순", order == TrackOrder.RECENTLY_ADDED) { order = TrackOrder.RECENTLY_ADDED }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onPickFiles) { Text("파일에서 추가") }
            }
        }
        when {
            libraryState is LibraryState.Loading -> item { EmptyNote("곡을 불러오는 중입니다.") }
            all.isEmpty() -> item { EmptyNote("곡이 없습니다. 파일에서 추가할 수 있습니다.") }
            shown.isEmpty() -> item { EmptyNote("찾는 곡이 없습니다.") }
        }
        itemsIndexed(shown, key = { _, track -> track.uri }) { index, track ->
            TrackRow(
                name = track.name,
                detail = track.durationMs.takeIf { it > 0 }?.let(::formatTime),
                isCurrent = track.uri == currentUri,
                onClick = { onPlay(shown, index, false) },
            ) { close ->
                DropdownMenuItem(text = { Text("다음에 재생") }, onClick = { onPlayNext(track); close() })
                DropdownMenuItem(text = { Text("대기열에 추가") }, onClick = { onAddToQueue(track); close() })
                DropdownMenuItem(text = { Text("재생 목록에 추가") }, onClick = { onAddToPlaylist(track); close() })
            }
        }
    }
}

@Composable
private fun AudioAccessNotice(access: AudioAccess, onRequestAudio: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text(
            if (access == AudioAccess.BLOCKED) {
                "음악 접근이 거절돼 휴대폰의 곡을 볼 수 없습니다. 설정의 권한에서 음악과 오디오를 허용해 주세요. 파일에서 직접 추가한 곡은 재생됩니다."
            } else {
                "휴대폰의 곡을 보려면 음악 접근을 허용해 주세요. 허용하지 않아도 파일에서 직접 추가한 곡은 재생됩니다."
            },
            style = MaterialTheme.typography.bodyMedium,
        )
        TextButton(onClick = onRequestAudio, contentPadding = PaddingValues(0.dp)) {
            Text(if (access == AudioAccess.BLOCKED) "설정 열기" else "음악 접근 허용")
        }
    }
}

@Composable
private fun OrderButton(label: String, selected: Boolean, onClick: () -> Unit) {
    TextButton(onClick = onClick) {
        Text(
            label,
            color = if (selected) MusicColors.Accent else MusicColors.SubText,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

@Composable
fun ScreenTitle(title: String, detail: String?, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 12.dp),
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        if (detail != null) {
            Text(detail, style = MaterialTheme.typography.bodyMedium, color = MusicColors.SubText)
        }
    }
}

@Composable
fun EmptyNote(text: String) {
    Text(
        text,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 24.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = MusicColors.SubText,
    )
}

/** 곡 한 줄. 지금 재생 중인 곡은 강조색으로, 재생할 수 없는 곡은 흐리게 보인다. 오른쪽 메뉴의 항목은 [menu]가 채운다. */
@Composable
fun TrackRow(
    name: String,
    detail: String?,
    isCurrent: Boolean,
    onClick: (() -> Unit)?,
    enabled: Boolean = true,
    menu: @Composable (close: () -> Unit) -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    Row(
        Modifier
            .fillMaxWidth()
            .let { if (onClick != null && enabled) it.clickable(onClick = onClick) else it }
            .padding(start = 16.dp, top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(vertical = 8.dp)) {
            Text(
                name,
                style = MaterialTheme.typography.bodyLarge,
                color = when {
                    !enabled -> MusicColors.Faint
                    isCurrent -> MusicColors.Accent
                    else -> MusicColors.Text
                },
                fontWeight = if (isCurrent) FontWeight.SemiBold else FontWeight.Normal,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (detail != null) {
                Text(detail, style = MaterialTheme.typography.bodySmall, color = MusicColors.SubText, maxLines = 1)
            }
        }
        Spacer(Modifier.width(4.dp))
        Box {
            IconButton(onClick = { menuOpen = true }) {
                Icon(painterResource(R.drawable.ic_more_vert), contentDescription = "$name 메뉴", tint = MusicColors.SubText)
            }
            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                menu { menuOpen = false }
            }
        }
    }
}
