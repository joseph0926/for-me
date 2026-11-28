package dev.forme.music.redesign

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.media3.common.Player
import dev.forme.music.R
import dev.forme.music.ui.PlayerConnection
import dev.forme.music.ui.PlayerUiState
import dev.forme.music.ui.formatTime
import kotlinx.coroutines.delay

/** 재생 위치는 상태로 흘려보내지 않고 화면이 보이는 동안 재생기에서 읽는다. */
@Composable
private fun rememberPosition(connection: PlayerConnection, playing: Boolean): Long {
    var positionMs by remember { mutableLongStateOf(connection.positionMs()) }
    LaunchedEffect(connection, playing) {
        while (true) {
            positionMs = connection.positionMs()
            delay(if (playing) 250 else 1000)
        }
    }
    return positionMs
}

/** 탭 바로 위에 붙은 평평한 줄: 커버, 곡 이름, 태그 제목, 재생과 다음. 아래 가장자리에 얇은 진행선을 깐다. 누르거나 위로 끌면 재생 화면이 열린다. */
@Composable
fun MiniPlayer(state: PlayerUiState, connection: PlayerConnection, onOpen: () -> Unit) {
    val current = state.current ?: return
    val positionMs = rememberPosition(connection, state.isPlaying)
    val progress = if (state.durationMs > 0) (positionMs.toFloat() / state.durationMs).coerceIn(0f, 1f) else 0f
    var dragged by remember { mutableFloatStateOf(0f) }
    Column(
        Modifier
            .fillMaxWidth()
            .background(Sokji.Raised)
            .pointerInput(onOpen) {
                detectVerticalDragGestures(
                    onDragStart = { dragged = 0f },
                    onVerticalDrag = { _, amount -> dragged += amount },
                    onDragEnd = { if (dragged < -24.dp.toPx()) onOpen() },
                )
            }
            .clickable(onClickLabel = "재생 화면 열기", onClick = onOpen),
    ) {
        Row(Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            TrackCover(current.uri, current.name, 40.dp)
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(current.name, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                state.tagTitle?.takeIf { it != current.name }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = Sokji.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            IconButton(onClick = connection::togglePlay) {
                Icon(
                    painterResource(if (state.isPlaying) R.drawable.ic_pause else R.drawable.ic_play),
                    contentDescription = if (state.isPlaying) "일시정지" else "재생",
                    tint = Sokji.Ink,
                )
            }
            IconButton(onClick = connection::next) {
                Icon(painterResource(R.drawable.ic_skip_next), contentDescription = "다음 곡", tint = Sokji.Ink)
            }
        }
        Box(Modifier.fillMaxWidth().height(2.dp).background(Sokji.Sunken)) {
            Box(Modifier.fillMaxWidth(progress).height(2.dp).background(Sokji.Accent))
        }
    }
}

/**
 * 끌어 올리는 재생 화면. 커버 색을 화면 전체 배경으로 깔고, 곡이 바뀌면 배경이 0.6초에 걸쳐 바뀐다.
 * 아래 오른쪽 아이콘으로 같은 배경 위에서 대기열로 바꾼다. 셔플과 반복은 대기열 쪽에 둔다(속지).
 */
@Composable
fun PlayerSheet(
    state: PlayerUiState,
    connection: PlayerConnection,
    view: PlayerView,
    onClose: () -> Unit,
    onToggleQueue: () -> Unit,
) {
    val current = state.current ?: return
    val tone by animateColorAsState(playerTone(state.artwork, current.name), SokjiMotion.toneChange(), label = "재생 화면 배경")
    val closeDistance = with(LocalDensity.current) { 96.dp.toPx() }
    var pulled by remember { mutableFloatStateOf(0f) }

    Column(
        Modifier
            .fillMaxSize()
            .graphicsLayer { translationY = pulled.coerceAtLeast(0f) }
            .background(Brush.verticalGradient(listOf(tone, lerp(tone, Color.Black, 0.45f))))
            .clickable(enabled = false) {}
            .statusBarsPadding()
            .navigationBarsPadding(),
    ) {
        // 위쪽 머리를 잡고 아래로 끌어 닫는다.
        Box(
            Modifier
                .fillMaxWidth()
                .pointerInput(onClose) {
                    detectVerticalDragGestures(
                        onVerticalDrag = { _, amount -> pulled += amount },
                        onDragEnd = {
                            if (pulled > closeDistance) onClose()
                            pulled = 0f
                        },
                        onDragCancel = { pulled = 0f },
                    )
                },
        ) {
            Box(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 8.dp)
                    .size(width = 36.dp, height = 4.dp)
                    .background(Sokji.OnPlayer.copy(alpha = 0.35f), RoundedCornerShape(2.dp)),
            )
            IconButton(onClick = onClose, modifier = Modifier.padding(start = 8.dp, top = 12.dp)) {
                Icon(painterResource(R.drawable.ic_expand_more), contentDescription = "재생 화면 닫기", tint = Sokji.OnPlayer)
            }
        }
        AnimatedContent(
            targetState = view,
            transitionSpec = { fadeIn(SokjiMotion.quick()) togetherWith fadeOut(SokjiMotion.quick()) },
            modifier = Modifier.weight(1f),
            label = "재생 화면과 대기열",
        ) { shown ->
            if (shown == PlayerView.QUEUE) {
                // 대기열이 길어도 셔플과 반복이 밀려나지 않게 목록 밖 재생바 위에 고정한다.
                Column {
                    Box(Modifier.weight(1f)) { QueueBody(state, connection) }
                    PlaybackModes(state, connection)
                }
            } else {
                PlayerBody(state)
            }
        }
        Transport(state, connection, view, onToggleQueue)
    }
}

/** 커버와 곡 이름. 일시정지하면 커버가 조금 작아진다. */
@Composable
private fun PlayerBody(state: PlayerUiState) {
    val current = state.current ?: return
    val scale by animateFloatAsState(if (state.isPlaying) 1f else 0.92f, SokjiMotion.sheet(), label = "커버 크기")
    Column(Modifier.fillMaxSize().padding(horizontal = 28.dp)) {
        BoxWithConstraints(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            val side = minOf(maxWidth, maxHeight, 420.dp)
            Box(
                Modifier
                    .size(side)
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    }
                    .shadow(18.dp, Sokji.Corner),
            ) {
                val artwork = state.artwork
                if (artwork != null) {
                    Image(artwork.asImageBitmap(), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(Sokji.Corner))
                } else {
                    TrackCover(current.uri, current.name, side)
                }
            }
        }
        Text(
            current.name,
            style = MaterialTheme.typography.headlineSmall,
            color = Sokji.OnPlayer,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 20.dp),
        )
        state.tagTitle?.takeIf { it != current.name }?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodyMedium,
                color = Sokji.OnPlayerMuted,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

/**
 * 대기열: 맨 위 지금 곡 머리, '지금 재생 중', 실제로 나올 순서의 '다음 곡'과 지우기, 이미 지난 곡.
 * 다음 곡 줄은 오른쪽 손잡이를 잡고 끌어 순서를 바꾼다. 셔플 중에는 재생 순서와 목록 순서가 달라 끌기를 숨기고 메뉴만 둔다.
 */
@Composable
private fun QueueBody(state: PlayerUiState, connection: PlayerConnection) {
    val current = state.current ?: return
    val listState = rememberLazyListState()
    val reorder = rememberReorderState(listState)
    val upNextKeys = remember(state.queue, state.upNext) { state.upNext.map { "${state.queue[it].uri}@$it" } }
    val shownKeys = reorder.shown(upNextKeys)
    val earlier = remember(state.queue, state.upNext, state.currentIndex) {
        state.queue.indices.filter { it != state.currentIndex && it !in state.upNext }
    }
    val canDrag = !state.shuffle

    LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 8.dp)) {
        item(key = "head") {
            Row(Modifier.padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                TrackCover(current.uri, current.name, 48.dp)
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text(current.name, style = MaterialTheme.typography.titleMedium, color = Sokji.OnPlayer, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    state.tagTitle?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = Sokji.OnPlayerMuted, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                }
            }
        }
        item(key = "now-label") { QueueLabel("지금 재생 중") }
        item(key = "now") {
            QueueRow(current.uri, current.name, isCurrent = true, onClick = {}) {}
        }
        item(key = "next-label") {
            QueueLabel("다음 곡 ${state.upNext.size}") {
                TextAction("지우기", onClick = connection::clearQueue, color = Sokji.OnPlayerMuted)
            }
        }
        if (state.upNext.isEmpty()) {
            item(key = "next-empty") {
                Text("다음 곡이 없습니다.", style = MaterialTheme.typography.bodyMedium, color = Sokji.OnPlayerMuted, modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp))
            }
        }
        items(shownKeys, key = { it }) { key ->
            val index = key.substringAfterLast('@').toInt()
            val entry = state.queue.getOrNull(index) ?: return@items
            val dragging = reorder.draggingKey == key
            QueueRow(
                entry.uri,
                entry.name,
                isCurrent = false,
                onClick = { connection.jumpTo(index) },
                modifier = Modifier
                    .zIndex(if (dragging) 1f else 0f)
                    .graphicsLayer { translationY = if (dragging) reorder.dragOffset else 0f }
                    .background(if (dragging) Color.White.copy(alpha = 0.08f) else Color.Transparent),
            ) {
                MoreMenu(entry.name, tint = Sokji.OnPlayerMuted) { close ->
                    if (index > 0) DropdownMenuItem(text = { Text("위로") }, onClick = { connection.move(index, index - 1); close() })
                    if (index < state.queue.lastIndex) DropdownMenuItem(text = { Text("아래로") }, onClick = { connection.move(index, index + 1); close() })
                    DropdownMenuItem(text = { Text("대기열에서 빼기") }, onClick = { connection.remove(index); close() })
                }
                if (canDrag) {
                    Box(
                        Modifier
                            .size(44.dp)
                            .reorderHandle(reorder, key, upNextKeys) { from, to ->
                                // 셔플이 꺼져 있으면 다음 곡의 순서는 대기열 위치 순서와 같다.
                                connection.move(state.upNext[from], state.upNext[to])
                            }
                            .semantics { contentDescription = "${entry.name} 끌어서 순서 바꾸기" },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(painterResource(R.drawable.ic_drag_handle), contentDescription = null, tint = Sokji.OnPlayerMuted)
                    }
                }
            }
        }
        if (earlier.isNotEmpty()) {
            item(key = "earlier-label") { QueueLabel("지난 곡 ${earlier.size}") }
            items(earlier, key = { "earlier@$it" }) { index ->
                val entry = state.queue[index]
                QueueRow(entry.uri, entry.name, isCurrent = false, dim = true, onClick = { connection.jumpTo(index) }) {
                    MoreMenu(entry.name, tint = Sokji.OnPlayerMuted) { close ->
                        DropdownMenuItem(text = { Text("대기열에서 빼기") }, onClick = { connection.remove(index); close() })
                    }
                }
            }
        }
    }
}

@Composable
private fun QueueLabel(text: String, trailing: @Composable () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp, top = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = MaterialTheme.typography.bodyMedium, color = Sokji.OnPlayerMuted, modifier = Modifier.weight(1f))
        trailing()
    }
}

@Composable
private fun QueueRow(
    uri: String,
    name: String,
    isCurrent: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    dim: Boolean = false,
    trailing: @Composable () -> Unit,
) {
    Row(
        modifier
            .fillMaxWidth()
            .clickable(enabled = !isCurrent, onClick = onClick)
            .padding(start = 20.dp, end = 4.dp, top = 6.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TrackCover(uri, name, 40.dp)
        Text(
            name,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = if (isCurrent) FontWeight.SemiBold else FontWeight.Medium,
            color = when {
                isCurrent -> Sokji.AccentOnPlayer
                dim -> Sokji.OnPlayerMuted
                else -> Sokji.OnPlayer
            },
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
        )
        trailing()
    }
}

/** 셔플과 반복. 켜지면 글자와 아이콘만 밝은 강조색으로 바뀌고 채운 칸은 쓰지 않는다. */
@Composable
private fun PlaybackModes(state: PlayerUiState, connection: PlayerConnection) {
    val on = Sokji.AccentOnPlayer
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
        ModeToggle(
            icon = R.drawable.ic_shuffle,
            label = "셔플",
            description = if (state.shuffle) "셔플 끄기" else "셔플 켜기",
            color = if (state.shuffle) on else Sokji.OnPlayerMuted,
            onClick = connection::toggleShuffle,
        )
        ModeToggle(
            icon = if (state.repeatMode == Player.REPEAT_MODE_ONE) R.drawable.ic_repeat_one else R.drawable.ic_repeat,
            label = when (state.repeatMode) {
                Player.REPEAT_MODE_ALL -> "전체 반복"
                Player.REPEAT_MODE_ONE -> "한 곡 반복"
                else -> "반복"
            },
            description = when (state.repeatMode) {
                Player.REPEAT_MODE_ALL -> "전체 반복 중"
                Player.REPEAT_MODE_ONE -> "한 곡 반복 중"
                else -> "반복 끔"
            },
            color = if (state.repeatMode == Player.REPEAT_MODE_OFF) Sokji.OnPlayerMuted else on,
            onClick = connection::cycleRepeat,
        )
    }
}

@Composable
private fun ModeToggle(icon: Int, label: String, description: String, color: Color, onClick: () -> Unit) {
    Row(
        Modifier
            .clip(Sokji.Corner)
            .clickable(onClick = onClick)
            .semantics { contentDescription = description }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(icon), contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(6.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = color)
    }
}

/** 얇은 재생바와 양 끝 시간, 이전, 재생, 다음, 맨 아래 대기열 전환. 재생 화면과 대기열에서 같은 크기로 둔다. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Transport(state: PlayerUiState, connection: PlayerConnection, view: PlayerView, onToggleQueue: () -> Unit) {
    val positionMs = rememberPosition(connection, state.isPlaying)
    var dragMs by remember { mutableStateOf<Long?>(null) }
    val durationMs = state.durationMs
    val shownMs = (dragMs ?: positionMs).coerceIn(0, durationMs.coerceAtLeast(0))
    val sliderColors = SliderDefaults.colors(
        thumbColor = Sokji.OnPlayer,
        activeTrackColor = Sokji.OnPlayer,
        inactiveTrackColor = Sokji.OnPlayer.copy(alpha = 0.25f),
        disabledThumbColor = Sokji.OnPlayerMuted,
        disabledInactiveTrackColor = Sokji.OnPlayer.copy(alpha = 0.15f),
    )
    Column(Modifier.fillMaxWidth().padding(horizontal = 28.dp)) {
        Slider(
            value = shownMs.toFloat(),
            onValueChange = { dragMs = it.toLong() },
            onValueChangeFinished = {
                dragMs?.let(connection::seekTo)
                dragMs = null
            },
            valueRange = 0f..durationMs.coerceAtLeast(1).toFloat(),
            enabled = durationMs > 0,
            colors = sliderColors,
            thumb = { Box(Modifier.size(12.dp).background(Sokji.OnPlayer, CircleShape)) },
            track = { sliderState ->
                SliderDefaults.Track(
                    sliderState = sliderState,
                    modifier = Modifier.height(3.dp),
                    colors = sliderColors,
                    thumbTrackGapSize = 0.dp,
                    drawStopIndicator = null,
                    enabled = durationMs > 0,
                )
            },
            modifier = Modifier.semantics { contentDescription = "재생 위치" },
        )
        Row(Modifier.fillMaxWidth()) {
            Text(formatTime(shownMs), style = MaterialTheme.typography.bodySmall, color = Sokji.OnPlayerMuted)
            Spacer(Modifier.weight(1f))
            Text("-" + formatTime(durationMs - shownMs), style = MaterialTheme.typography.bodySmall, color = Sokji.OnPlayerMuted)
        }
        Row(
            Modifier.fillMaxWidth().padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = connection::previous, modifier = Modifier.size(64.dp)) {
                Icon(painterResource(R.drawable.ic_skip_previous), contentDescription = "이전 곡", tint = Sokji.OnPlayer, modifier = Modifier.size(40.dp))
            }
            IconButton(onClick = connection::togglePlay, modifier = Modifier.size(80.dp)) {
                Icon(
                    painterResource(if (state.isPlaying) R.drawable.ic_pause else R.drawable.ic_play),
                    contentDescription = if (state.isPlaying) "일시정지" else "재생",
                    tint = Sokji.OnPlayer,
                    modifier = Modifier.size(60.dp),
                )
            }
            IconButton(onClick = connection::next, modifier = Modifier.size(64.dp)) {
                Icon(painterResource(R.drawable.ic_skip_next), contentDescription = "다음 곡", tint = Sokji.OnPlayer, modifier = Modifier.size(40.dp))
            }
        }
        Row(Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
            Spacer(Modifier.weight(1f))
            IconButton(onClick = onToggleQueue) {
                Icon(
                    painterResource(R.drawable.ic_queue_music),
                    contentDescription = if (view == PlayerView.QUEUE) "재생 화면으로" else "대기열",
                    tint = if (view == PlayerView.QUEUE) Sokji.AccentOnPlayer else Sokji.OnPlayerMuted,
                )
            }
        }
    }
}
