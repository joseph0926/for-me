package dev.forme.music.playback

import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionError
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import dev.forme.music.MainActivity
import dev.forme.music.data.MusicDatabase
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * 재생기와 미디어 세션을 갖는 서비스. 화면, 알림, 잠금 화면, 블루투스 조작이 모두 이 세션으로 들어온다.
 * Android 17의 백그라운드 오디오 제한은 이 구조(포그라운드 서비스 안의 세션)로 통과한다(research.md).
 */
class PlaybackService : MediaSessionService() {
    private var session: MediaSession? = null
    private val scope = MainScope()
    private lateinit var queueStore: QueueStore

    /** 저장된 대기열을 되살리기 전에는 저장하지 않는다. 비어 있는 재생기 상태로 기록을 덮어쓰지 않기 위해서다. */
    private var restored = false

    /** 재생하지 못한 곡을 연달아 건너뛴 횟수. 대기열 전체가 재생되지 않을 때 끝없이 넘기지 않게 한다. */
    private var consecutiveErrors = 0

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()
        val player = ExoPlayer.Builder(this, DefaultMediaSourceFactory(this, TruncatedFileExtractorsFactory()))
            .setAudioAttributes(
                AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(),
                /* handleAudioFocus= */ true,
            )
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_LOCAL)
            .build()
        player.addListener(PlayerEvents(player))
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        session = MediaSession.Builder(this, player)
            .setCallback(SessionCallback)
            .setSessionActivity(openApp)
            .build()
        queueStore = QueueStore(MusicDatabase.get(this).queue())
        scope.launch { restoreQueue(player) }
        scope.launch {
            while (isActive) {
                delay(POSITION_SAVE_INTERVAL_MS)
                if (player.isPlaying) savePosition(player)
            }
        }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

    override fun onTaskRemoved(rootIntent: Intent?) {
        session?.player?.let(::savePosition)
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        session?.run {
            savePosition(player)
            player.release()
            release()
        }
        session = null
        scope.cancel()
        super.onDestroy()
    }

    private suspend fun restoreQueue(player: Player) {
        val saved = try {
            queueStore.restore()
        } catch (error: Exception) {
            // 기록을 읽지 못해도 재생은 할 수 있게 둔다. 기록은 지우지 않는다.
            Log.e(TAG, "대기열 복원 실패", error)
            null
        }
        // 복원을 기다리는 동안 사용자가 이미 곡을 골랐다면 그 선택을 남긴다.
        if (saved != null && player.mediaItemCount == 0) {
            player.shuffleModeEnabled = saved.shuffle
            player.repeatMode = saved.repeatMode
            player.setMediaItems(saved.items.map { it.toMediaItem() }, saved.currentIndex, saved.positionMs)
            player.prepare()
        }
        restored = true
        if (player.mediaItemCount > 0 && saved == null) saveQueue(player)
    }

    private fun snapshotOf(player: Player) = QueueSnapshot(
        items = (0 until player.mediaItemCount).map { player.getMediaItemAt(it).toQueueItem(it) },
        currentIndex = player.currentMediaItemIndex,
        positionMs = player.currentPosition,
        shuffle = player.shuffleModeEnabled,
        repeatMode = player.repeatMode,
    )

    private fun saveQueue(player: Player) {
        if (restored) queueStore.saveQueue(snapshotOf(player))
    }

    private fun savePosition(player: Player) {
        if (restored && player.mediaItemCount > 0) queueStore.savePosition(snapshotOf(player))
    }

    private inner class PlayerEvents(private val player: Player) : Player.Listener {
        override fun onTimelineChanged(timeline: Timeline, reason: Int) {
            if (reason == Player.TIMELINE_CHANGE_REASON_PLAYLIST_CHANGED) saveQueue(player)
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) = savePosition(player)

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            if (isPlaying) consecutiveErrors = 0 else savePosition(player)
        }

        override fun onPositionDiscontinuity(
            oldPosition: Player.PositionInfo,
            newPosition: Player.PositionInfo,
            reason: Int,
        ) {
            if (reason == Player.DISCONTINUITY_REASON_SEEK) savePosition(player)
        }

        override fun onShuffleModeEnabledChanged(shuffleModeEnabled: Boolean) = savePosition(player)

        override fun onRepeatModeChanged(repeatMode: Int) = savePosition(player)

        /**
         * 지워지거나 옮겨진 곡은 건너뛰고 다음 곡을 재생한다. 곧바로 다음 곡으로 넘어가 화면이 오류 상태를 못 볼 수 있으므로
         * 이유는 세션 오류로 따로 보낸다.
         */
        @OptIn(UnstableApi::class)
        override fun onPlayerError(error: PlaybackException) {
            val name = player.currentMediaItem?.mediaMetadata?.title ?: "곡"
            Log.w(TAG, "재생 오류: ${player.currentMediaItem?.mediaId}", error)
            session?.sendError(
                SessionError(SessionError.ERROR_IO, "재생할 수 없는 곡입니다: $name. 파일이 옮겨지거나 지워졌을 수 있습니다."),
            )
            consecutiveErrors += 1
            if (consecutiveErrors < player.mediaItemCount && player.hasNextMediaItem()) {
                player.seekToNextMediaItem()
                player.prepare()
            }
        }
    }

    /** 화면 쪽 MediaController가 보낸 항목은 주소가 빠질 수 있어 mediaId로 다시 채운다. */
    private object SessionCallback : MediaSession.Callback {
        override fun onAddMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>,
        ): ListenableFuture<MutableList<MediaItem>> = Futures.immediateFuture(
            mediaItems.map { it.buildUpon().setUri(it.mediaId).build() }.toMutableList(),
        )
    }

    private companion object {
        const val TAG = "PlaybackService"
        const val POSITION_SAVE_INTERVAL_MS = 5_000L
    }
}
