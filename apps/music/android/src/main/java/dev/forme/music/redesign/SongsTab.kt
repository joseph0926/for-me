package dev.forme.music.redesign

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.unit.dp
import dev.forme.music.data.Track
import dev.forme.music.data.TrackOrder
import dev.forme.music.data.matching
import dev.forme.music.data.sortedFor
import dev.forme.music.ui.AudioAccess
import dev.forme.music.ui.LibraryState

/** 곡 탭: 모든 곡을 이름으로 찾고, 정렬하고, 누르면 재생하고, 길게 누르거나 '고르기'로 여러 곡을 고른다. */
@Composable
fun SongsTab(
    libraryState: LibraryState,
    audioAccess: AudioAccess,
    currentUri: String?,
    selection: SelectionHandle,
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
    val shownUris = remember(shown) { shown.map { it.uri } }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 16.dp)) {
        item(key = "header") {
            if (selection.active) {
                SelectionHeader(selection, shownUris)
            } else {
                ScreenHeader("곡", if (libraryState is LibraryState.Loaded) "${all.size}곡" else null)
            }
        }
        if (audioAccess != AudioAccess.GRANTED) {
            item(key = "access") { AudioAccessNotice(audioAccess, onRequestAudio) }
        }
        item(key = "search") {
            SearchField(query, { query = it }, "곡 이름이나 가수로 찾기", Modifier.fillMaxWidth().padding(horizontal = 20.dp))
        }
        item(key = "tools") {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                ChoiceText("이름순", order == TrackOrder.NAME) { order = TrackOrder.NAME }
                ChoiceText("추가한 순", order == TrackOrder.RECENTLY_ADDED) { order = TrackOrder.RECENTLY_ADDED }
                Spacer(Modifier.weight(1f))
                if (!selection.active) {
                    TextAction("고르기", onClick = { selection.onStart(null) }, enabled = shown.isNotEmpty())
                    TextAction("파일에서 추가", onClick = onPickFiles)
                }
            }
        }
        when {
            libraryState is LibraryState.Loading -> item(key = "empty") { EmptyLine("곡을 불러오는 중입니다.") }
            all.isEmpty() -> item(key = "empty") { EmptyLine("곡이 없습니다. 파일에서 추가할 수 있습니다.") }
            shown.isEmpty() -> item(key = "empty") { EmptyLine("찾는 곡이 없습니다.") }
        }
        itemsIndexed(shown, key = { _, track -> track.uri }) { index, track ->
            TrackLine(
                track = track,
                isCurrent = track.uri == currentUri,
                selection = selection,
                onPlay = { onPlay(shown, index, false) },
                onPlayNext = onPlayNext,
                onAddToQueue = onAddToQueue,
                onAddToPlaylist = onAddToPlaylist,
            )
        }
    }
}

/** 곡 탭과 묶음 상세가 같이 쓰는 곡 줄. 고르는 중이면 누를 때 고름이 바뀌고 메뉴는 숨긴다. */
@Composable
fun TrackLine(
    track: Track,
    isCurrent: Boolean,
    selection: SelectionHandle,
    onPlay: () -> Unit,
    onPlayNext: (Track) -> Unit,
    onAddToQueue: (Track) -> Unit,
    onAddToPlaylist: (Track) -> Unit,
) {
    SongRow(
        uri = track.uri,
        title = track.name,
        detail = detailOf(track),
        isCurrent = isCurrent,
        selection = if (selection.active) selection.isSelected(track.uri) else null,
        onClick = { if (selection.active) selection.onToggle(track.uri) else onPlay() },
        onLongClick = { if (selection.active) selection.onToggle(track.uri) else selection.onStart(track.uri) },
    ) {
        if (!selection.active) {
            MoreMenu(track.name) { close ->
                DropdownMenuItem(text = { Text("다음에 재생") }, onClick = { onPlayNext(track); close() })
                DropdownMenuItem(text = { Text("대기열에 추가") }, onClick = { onAddToQueue(track); close() })
                DropdownMenuItem(text = { Text("재생 목록에 추가") }, onClick = { onAddToPlaylist(track); close() })
            }
        }
    }
}

@Composable
private fun AudioAccessNotice(access: AudioAccess, onRequestAudio: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)) {
        Text(
            if (access == AudioAccess.BLOCKED) {
                "음악 접근이 거절돼 휴대폰의 곡을 볼 수 없습니다. 설정의 권한에서 음악과 오디오를 허용해 주세요. 파일에서 직접 추가한 곡은 재생됩니다."
            } else {
                "휴대폰의 곡을 보려면 음악 접근을 허용해 주세요. 허용하지 않아도 파일에서 직접 추가한 곡은 재생됩니다."
            },
            style = MaterialTheme.typography.bodyMedium,
        )
        TextAction(if (access == AudioAccess.BLOCKED) "설정 열기" else "음악 접근 허용", onClick = onRequestAudio, color = Sokji.AccentText)
    }
}
