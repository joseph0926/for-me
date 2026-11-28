package dev.forme.music.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import dev.forme.music.R
import kotlinx.coroutines.delay

@Composable
fun MiniPlayer(state: PlayerUiState, onOpen: () -> Unit, onTogglePlay: () -> Unit, onNext: () -> Unit) {
    val current = state.current ?: return
    Row(
        Modifier
            .fillMaxWidth()
            .background(Color.White)
            .clickable(onClick = onOpen)
            .padding(start = 12.dp, top = 8.dp, bottom = 8.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Artwork(state.artwork, 40.dp)
        Text(
            current.name,
            modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
            style = MaterialTheme.typography.bodyLarge,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        IconButton(onClick = onTogglePlay) {
            Icon(
                painterResource(if (state.isPlaying) R.drawable.ic_pause else R.drawable.ic_play),
                contentDescription = if (state.isPlaying) "일시정지" else "재생",
            )
        }
        IconButton(onClick = onNext) { Icon(painterResource(R.drawable.ic_skip_next), contentDescription = "다음 곡") }
    }
}

@Composable
fun NowPlayingScreen(state: PlayerUiState, connection: PlayerConnection, onClose: () -> Unit, onOpenQueue: () -> Unit) {
    val current = state.current ?: return
    // 재생 위치는 상태로 흘려보내지 않고 화면이 보이는 동안 재생기에서 읽는다.
    var positionMs by remember { mutableLongStateOf(connection.positionMs()) }
    var dragMs by remember { mutableStateOf<Long?>(null) }
    LaunchedEffect(connection) {
        while (true) {
            positionMs = connection.positionMs()
            delay(500)
        }
    }
    val durationMs = state.durationMs
    val shownMs = (dragMs ?: positionMs).coerceIn(0, durationMs.coerceAtLeast(0))

    Column(
        Modifier
            .fillMaxSize()
            .background(MusicColors.Background)
            .safeDrawingPadding()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(painterResource(R.drawable.ic_expand_more), contentDescription = "재생 화면 닫기") }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = onOpenQueue) { Icon(painterResource(R.drawable.ic_queue_music), contentDescription = "대기열") }
        }
        Spacer(Modifier.weight(1f))
        Box(Modifier.widthIn(max = 360.dp).fillMaxWidth().aspectRatio(1f)) {
            Artwork(state.artwork, null)
        }
        Spacer(Modifier.height(28.dp))
        Column(Modifier.fillMaxWidth()) {
            Text(
                current.name,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            val tagTitle = state.tagTitle
            if (tagTitle != null && tagTitle != current.name) {
                Text(
                    tagTitle,
                    modifier = Modifier.padding(top = 4.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = MusicColors.SubText,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Spacer(Modifier.height(16.dp))
        Slider(
            value = shownMs.toFloat(),
            onValueChange = { dragMs = it.toLong() },
            onValueChangeFinished = {
                dragMs?.let {
                    connection.seekTo(it)
                    positionMs = it
                }
                dragMs = null
            },
            valueRange = 0f..durationMs.coerceAtLeast(1).toFloat(),
            enabled = durationMs > 0,
            colors = SliderDefaults.colors(
                thumbColor = MusicColors.Text,
                activeTrackColor = MusicColors.Text,
                inactiveTrackColor = MusicColors.Faint,
            ),
        )
        Row(Modifier.fillMaxWidth()) {
            Text(formatTime(shownMs), style = MaterialTheme.typography.bodySmall, color = MusicColors.SubText)
            Spacer(Modifier.weight(1f))
            Text("-" + formatTime(durationMs - shownMs), style = MaterialTheme.typography.bodySmall, color = MusicColors.SubText)
        }
        Spacer(Modifier.height(16.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = connection::toggleShuffle) {
                Icon(
                    painterResource(R.drawable.ic_shuffle),
                    contentDescription = if (state.shuffle) "셔플 끄기" else "셔플 켜기",
                    tint = if (state.shuffle) MusicColors.Accent else MusicColors.SubText,
                )
            }
            IconButton(onClick = connection::previous, modifier = Modifier.size(56.dp)) {
                Icon(painterResource(R.drawable.ic_skip_previous), contentDescription = "이전 곡", modifier = Modifier.size(36.dp))
            }
            IconButton(onClick = connection::togglePlay, modifier = Modifier.size(72.dp)) {
                Icon(
                    painterResource(if (state.isPlaying) R.drawable.ic_pause else R.drawable.ic_play),
                    contentDescription = if (state.isPlaying) "일시정지" else "재생",
                    modifier = Modifier.size(56.dp),
                )
            }
            IconButton(onClick = connection::next, modifier = Modifier.size(56.dp)) {
                Icon(painterResource(R.drawable.ic_skip_next), contentDescription = "다음 곡", modifier = Modifier.size(36.dp))
            }
            IconButton(onClick = connection::cycleRepeat) {
                Icon(
                    painterResource(if (state.repeatMode == Player.REPEAT_MODE_ONE) R.drawable.ic_repeat_one else R.drawable.ic_repeat),
                    contentDescription = when (state.repeatMode) {
                        Player.REPEAT_MODE_ALL -> "전체 반복 중"
                        Player.REPEAT_MODE_ONE -> "한 곡 반복 중"
                        else -> "반복 끔"
                    },
                    tint = if (state.repeatMode == Player.REPEAT_MODE_OFF) MusicColors.SubText else MusicColors.Accent,
                )
            }
        }
        Spacer(Modifier.weight(1f))
    }
}

@Composable
fun QueueScreen(state: PlayerUiState, connection: PlayerConnection, onBack: () -> Unit) {
    val listState = rememberLazyListState(initialFirstVisibleItemIndex = state.currentIndex.coerceAtLeast(0))
    Column(Modifier.fillMaxSize().background(MusicColors.Background).safeDrawingPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 4.dp, top = 8.dp, end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(painterResource(R.drawable.ic_back), contentDescription = "재생 화면으로") }
            Text("대기열", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            TextButton(onClick = connection::clearQueue) { Text("지우기", color = MusicColors.SubText) }
        }
        LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 16.dp)) {
            itemsIndexed(state.queue) { index, entry ->
                TrackRow(
                    name = entry.name,
                    detail = null,
                    isCurrent = index == state.currentIndex,
                    onClick = { connection.jumpTo(index) },
                ) { close ->
                    if (index > 0) DropdownMenuItem(text = { Text("위로") }, onClick = { connection.move(index, index - 1); close() })
                    if (index < state.queue.lastIndex) {
                        DropdownMenuItem(text = { Text("아래로") }, onClick = { connection.move(index, index + 1); close() })
                    }
                    DropdownMenuItem(text = { Text("대기열에서 빼기") }, onClick = { connection.remove(index); close() })
                }
            }
        }
    }
}

/** 파일에 든 앨범 아트. 없으면 음표를 그린다. [size]가 null이면 주어진 공간을 채운다. */
@Composable
private fun Artwork(artwork: Bitmap?, size: Dp?) {
    val modifier = (if (size != null) Modifier.size(size) else Modifier.fillMaxSize())
        .clip(RoundedCornerShape(4.dp))
        .background(MusicColors.Faint)
    if (artwork != null) {
        Image(artwork.asImageBitmap(), contentDescription = null, modifier = modifier, contentScale = ContentScale.Crop)
    } else {
        Box(modifier, contentAlignment = Alignment.Center) {
            Icon(painterResource(R.drawable.ic_music_note), contentDescription = null, tint = MusicColors.SubText)
        }
    }
}
