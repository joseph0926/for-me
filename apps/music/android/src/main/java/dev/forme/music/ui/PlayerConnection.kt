package dev.forme.music.ui

import android.content.ComponentName
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.annotation.OptIn
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaController
import androidx.media3.session.SessionError
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import dev.forme.music.data.Track
import dev.forme.music.playback.PlaybackService
import dev.forme.music.playback.toMediaItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class QueueEntry(val uri: String, val name: String)

/** 화면이 그리는 재생 상태. 재생 위치는 자주 바뀌어 여기 두지 않고 [PlayerConnection.positionMs]로 읽는다. */
data class PlayerUiState(
    val queue: List<QueueEntry> = emptyList(),
    val currentIndex: Int = -1,
    val isPlaying: Boolean = false,
    val durationMs: Long = 0,
    val shuffle: Boolean = false,
    val repeatMode: Int = Player.REPEAT_MODE_OFF,
    val tagTitle: String? = null,
    val artwork: Bitmap? = null,
) {
    val current: QueueEntry? get() = queue.getOrNull(currentIndex)
}

/**
 * 재생 서비스의 세션에 붙는 MediaController를 감싼다. 화면이 보이는 동안만 연결한다.
 * 연결 전에 받은 명령은 버리지 않고 연결되면 실행한다.
 */
class PlayerConnection(private val context: Context, private val onMessage: (String) -> Unit) {
    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    private var future: ListenableFuture<MediaController>? = null
    private var controller: MediaController? = null
    private val pending = mutableListOf<(MediaController) -> Unit>()
    private var artworkSource: ByteArray? = null

    @OptIn(UnstableApi::class)
    fun connect() {
        if (future != null) return
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val request = MediaController.Builder(context, token)
            .setListener(
                object : MediaController.Listener {
                    override fun onError(controller: MediaController, sessionError: SessionError) {
                        onMessage(sessionError.message)
                    }
                },
            )
            .buildAsync()
        future = request
        request.addListener({
            // 연결을 끊은 뒤 늦게 끝난 요청은 쓰지 않는다.
            if (future !== request) return@addListener
            val connected = runCatching { request.get() }.getOrNull() ?: return@addListener
            controller = connected
            connected.addListener(Events())
            refresh(connected)
            pending.forEach { it(connected) }
            pending.clear()
        }, ContextCompat.getMainExecutor(context))
    }

    fun release() {
        future?.let(MediaController::releaseFuture)
        future = null
        controller = null
        pending.clear()
    }

    fun positionMs(): Long = controller?.currentPosition ?: 0

    /** [tracks]를 대기열로 바꾸고 [startIndex]의 곡부터 재생한다. */
    fun play(tracks: List<Track>, startIndex: Int, shuffle: Boolean = false) = send {
        it.shuffleModeEnabled = shuffle
        it.setMediaItems(tracks.map(Track::toMediaItem), startIndex.coerceAtLeast(0), 0)
        it.prepare()
        it.play()
    }

    fun playNext(track: Track) = send {
        val at = if (it.mediaItemCount == 0) 0 else it.currentMediaItemIndex + 1
        it.addMediaItem(at, track.toMediaItem())
        if (it.mediaItemCount == 1) it.prepare()
    }

    fun addToQueue(track: Track) = send {
        it.addMediaItem(track.toMediaItem())
        if (it.mediaItemCount == 1) it.prepare()
    }

    fun togglePlay() = send {
        if (it.isPlaying) {
            it.pause()
        } else {
            if (it.playbackState == Player.STATE_IDLE) it.prepare()
            if (it.playbackState == Player.STATE_ENDED) it.seekToDefaultPosition()
            it.play()
        }
    }

    fun next() = send { it.seekToNext() }
    fun previous() = send { it.seekToPrevious() }
    fun seekTo(positionMs: Long) = send { it.seekTo(positionMs) }
    fun jumpTo(index: Int) = send {
        it.seekToDefaultPosition(index)
        it.play()
    }
    fun toggleShuffle() = send { it.shuffleModeEnabled = !it.shuffleModeEnabled }
    fun cycleRepeat() = send {
        it.repeatMode = when (it.repeatMode) {
            Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL
            Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE
            else -> Player.REPEAT_MODE_OFF
        }
    }
    fun move(from: Int, to: Int) = send { if (to in 0 until it.mediaItemCount) it.moveMediaItem(from, to) }
    fun remove(index: Int) = send { it.removeMediaItem(index) }
    fun clearQueue() = send { it.clearMediaItems() }

    private fun send(command: (MediaController) -> Unit) {
        val connected = controller
        if (connected != null) command(connected) else pending += command
    }

    private fun refresh(player: Player) {
        val metadata = player.mediaMetadata
        val artworkData = metadata.artworkData
        val artwork = if (artworkData === artworkSource) {
            _state.value.artwork
        } else {
            artworkSource = artworkData
            artworkData?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
        }
        _state.update {
            PlayerUiState(
                queue = (0 until player.mediaItemCount).map { index -> entryOf(player.getMediaItemAt(index)) },
                currentIndex = if (player.mediaItemCount == 0) -1 else player.currentMediaItemIndex,
                isPlaying = player.isPlaying,
                durationMs = player.duration.coerceAtLeast(0),
                shuffle = player.shuffleModeEnabled,
                repeatMode = player.repeatMode,
                tagTitle = player.currentMediaItem?.mediaMetadata?.subtitle?.toString(),
                artwork = artwork,
            )
        }
    }

    private fun entryOf(item: MediaItem) = QueueEntry(item.mediaId, item.mediaMetadata.title?.toString() ?: item.mediaId)

    private inner class Events : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) = refresh(player)
    }
}
