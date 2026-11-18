package dev.forme.video.player

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.sqlite.SQLiteException
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import android.system.ErrnoException
import android.system.Os
import android.system.OsConstants
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import dev.forme.video.R
import dev.forme.video.data.PlaybackRecord
import dev.forme.video.data.PlaybackRepository
import dev.forme.video.data.VideoDocument
import dev.forme.video.data.openVideoDocument
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.videolan.libvlc.LibVLC
import org.videolan.libvlc.Media
import org.videolan.libvlc.MediaPlayer
import org.videolan.libvlc.util.VLCVideoLayout
import java.io.IOException

data class PlaybackUiState(
    val title: String = "",
    val loading: Boolean = true,
    val playing: Boolean = false,
    val positionMs: Long = 0,
    val durationMs: Long = 0,
    val seekable: Boolean = false,
    val error: Int? = null,
)

class VlcPlayback(
    private val context: Context,
    private val repository: PlaybackRepository,
    private val uri: Uri,
    private val wantsToPlay: () -> Boolean,
    private val changePlayIntent: (Boolean) -> Unit,
) {
    var state by mutableStateOf(PlaybackUiState())
        private set
    private var lib: LibVLC? = null
    private var player: MediaPlayer? = null
    private var descriptor: ParcelFileDescriptor? = null
    private var layout: VLCVideoLayout? = null
    private var progress = PlaybackProgress(0)
    private var visible = false
    private var closed = false
    private var needsInitialStart = true
    private var playRequestedAtMs = 0L
    private var ended = false
    private var lastSaveAtMs = 0L
    private var seekIssuedFor: Long? = null
    private var scrubbing = false
    private var previewScheduled = false
    private val handler = Handler(Looper.getMainLooper())
    private val previewSeek = Runnable {
        previewScheduled = false
        applySeek()
    }
    private var receiverRegistered = false
    private val audio = context.getSystemService(AudioManager::class.java)
    private val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE).build())
        .setOnAudioFocusChangeListener { focus ->
            if (focus < 0) pauseByUser()
        }.build()
    private val noisyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) pauseByUser()
        }
    }

    suspend fun open() {
        var opened: VideoDocument? = null
        try {
            if (closed) return
            ContextCompat.registerReceiver(context, noisyReceiver,
                IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY), ContextCompat.RECEIVER_NOT_EXPORTED)
            receiverRegistered = true
            val saved = repository.find(uri.toString())
            val document = withContext(Dispatchers.IO) {
                openVideoDocument(context.contentResolver, uri,
                    saved?.title ?: context.getString(R.string.app_name)).also { opened = it }
            }
            if (closed) return
            descriptor = document.descriptor
            opened = null
            progress = PlaybackProgress(saved?.positionMs ?: 0)
            state = state.copy(title = document.title, positionMs = progress.positionMs)
            val engine = LibVLC(context, arrayListOf("--no-video-title-show"))
            lib = engine
            val mediaPlayer = MediaPlayer(engine)
            player = mediaPlayer
            mediaPlayer.setEventListener { event -> if (!closed) handleEvent(event) }
            layout?.let(::attachPlayerViews)
            state = state.copy(loading = false)
            playIfRequested()
        } catch (error: CancellationException) {
            throw error
        } catch (_: SQLiteException) {
            fail(R.string.storage_failed)
        } catch (_: SecurityException) {
            fail(R.string.file_unavailable)
        } catch (_: IOException) {
            fail(R.string.file_unavailable)
        } catch (_: RuntimeException) {
            fail(R.string.playback_failed)
        } finally {
            opened?.close()
        }
    }

    fun attach(view: VLCVideoLayout) {
        layout = view
        attachPlayerViews(view)
        playIfRequested()
    }

    private fun attachPlayerViews(view: VLCVideoLayout) {
        // 일시정지 중 회전해도 마지막 영상 버퍼를 새 화면 크기에 맞춰 표시한다.
        player?.attachViews(view, null, true, true)
    }

    fun setVisible(visible: Boolean) {
        this.visible = visible
        if (visible) playIfRequested() else {
            handler.removeCallbacks(previewSeek)
            previewScheduled = false
            scrubbing = false
            save()
            player?.pause()
            state = state.copy(playing = false)
            audio.abandonAudioFocusRequest(focusRequest)
        }
    }

    fun togglePlayback() {
        // 탐색 직후 엔진이 아직 멈춰 있어도 화면에 표시한 재생 의도를 전환한다.
        if (wantsToPlay() && state.error == null) pauseByUser() else {
            changePlayIntent(true)
            playIfRequested()
        }
    }

    private fun pauseByUser() {
        if (closed) return
        changePlayIntent(false)
        player?.pause()
        state = state.copy(playing = false)
        save()
        audio.abandonAudioFocusRequest(focusRequest)
    }

    private fun playIfRequested() {
        if (closed || !visible || layout == null || state.loading || scrubbing) return
        val active = player ?: return
        if (state.error != null && state.error != R.string.audio_focus_failed) return
        if (!wantsToPlay() && !needsInitialStart) return
        if (wantsToPlay() && audio.requestAudioFocus(focusRequest) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            state = state.copy(error = R.string.audio_focus_failed)
            return
        }
        state = state.copy(error = null)
        if (needsInitialStart) {
            // 멈춘 화면을 복원할 때도 start-paused 입력을 열어 첫 장면과 길이를 준비한다.
            setMedia(active)
            needsInitialStart = false
        }
        playRequestedAtMs = SystemClock.elapsedRealtime()
        if (ended) {
            restartMedia(active)
        } else {
            restorePosition()
            active.play()
        }
    }

    fun previewSeek(positionMs: Long) {
        if (!state.seekable || closed || state.error != null) return
        if (!scrubbing) {
            scrubbing = true
            player?.pause()
            state = state.copy(playing = false)
        }
        progress.seek(positionMs)
        seekIssuedFor = null
        state = state.copy(positionMs = progress.positionMs)
        // 빠른 드래그는 최신 위치로 합치되, 손을 놓을 때는 마지막 위치를 바로 적용한다.
        if (!previewScheduled) {
            previewScheduled = true
            handler.postDelayed(previewSeek, 100)
        }
    }

    fun finishSeek() {
        if (closed || !scrubbing) return
        handler.removeCallbacks(previewSeek)
        previewScheduled = false
        applySeek()
        scrubbing = false
        save()
        playIfRequested()
    }

    private fun applySeek() {
        if (closed || !visible || progress.pendingSeekMs == null) return
        val active = player ?: return
        if (ended) restartMedia(active) else restorePosition()
    }

    private fun setMedia(active: MediaPlayer) {
        val media = Media(checkNotNull(lib), checkNotNull(descriptor).fileDescriptor)
        try {
            media.setHWDecoderEnabled(true, false)
            // 기본 MP4 demux에서 탐색 후 참조 프레임이 누락된 샘플을 avformat으로 처리한다.
            // avformat이 읽지 못하는 형식은 다른 libVLC demux로 넘긴다.
            media.addOption(":demux=avformat,any")
            media.addOption(":start-time=${progress.positionMs / 1000.0}")
            if (!wantsToPlay() || scrubbing) media.addOption(":start-paused")
            active.media = media
        } finally {
            media.release()
        }
    }

    private fun restartMedia(active: MediaPlayer) {
        // 종료된 입력과 출력 화면을 다시 연결하되 사용자가 고른 위치는 유지한다.
        active.setEventListener(null)
        active.stop()
        active.detachViews()
        try {
            // fd 입력은 다시 열 때 현재 파일 오프셋을 시작점으로 삼는다.
            Os.lseek(checkNotNull(descriptor).fileDescriptor, 0, OsConstants.SEEK_SET)
        } catch (_: ErrnoException) {
            fail(R.string.file_unavailable)
            return
        }
        ended = false
        seekIssuedFor = null
        setMedia(active)
        layout?.let(::attachPlayerViews)
        active.setEventListener { event -> if (!closed) handleEvent(event) }
        active.play()
    }

    private fun restorePosition() {
        val target = progress.pendingSeekMs ?: return
        val active = player ?: return
        if (active.isSeekable && seekIssuedFor != target) {
            if (active.setTime(target) >= 0) seekIssuedFor = target
        }
    }

    private fun handleEvent(event: MediaPlayer.Event) {
        val active = player ?: return
        when (event.type) {
            MediaPlayer.Event.Playing -> {
                progress.updateDuration(active.length)
                state = state.copy(durationMs = progress.durationMs, seekable = active.isSeekable)
                restorePosition()
                if (!visible || !wantsToPlay() || scrubbing) {
                    active.pause()
                    return
                }
                state = state.copy(playing = true, seekable = active.isSeekable)
            }
            MediaPlayer.Event.Paused -> {
                progress.updateDuration(active.length)
                state = state.copy(playing = false, durationMs = progress.durationMs,
                    seekable = active.isSeekable)
                restorePosition()
                playIfRequested()
            }
            MediaPlayer.Event.LengthChanged -> {
                progress.updateDuration(event.lengthChanged)
                state = state.copy(durationMs = progress.durationMs)
                restorePosition()
            }
            MediaPlayer.Event.SeekableChanged -> {
                state = state.copy(seekable = active.isSeekable)
                restorePosition()
            }
            MediaPlayer.Event.TimeChanged -> {
                if (ended || scrubbing || !visible || !wantsToPlay()) return
                val now = SystemClock.elapsedRealtime()
                if (progress.acceptTime(event.timeChanged, elapsedPlayingMs = now - playRequestedAtMs)) {
                    state = state.copy(positionMs = progress.positionMs, durationMs = progress.durationMs)
                    if (now - lastSaveAtMs >= 2_000) {
                        save()
                        lastSaveAtMs = now
                    }
                }
            }
            MediaPlayer.Event.EndReached -> {
                progress.finish()
                ended = true
                changePlayIntent(false)
                state = state.copy(playing = false, positionMs = 0)
                save()
                audio.abandonAudioFocusRequest(focusRequest)
            }
            MediaPlayer.Event.EncounteredError -> fail(R.string.playback_failed)
        }
    }

    private fun save() {
        val snapshot = progress.snapshot() ?: return
        repository.save(PlaybackRecord(uri.toString(), state.title, snapshot.positionMs,
            snapshot.durationMs, System.currentTimeMillis()))
    }

    private fun fail(message: Int) {
        if (closed) return
        save()
        changePlayIntent(false)
        state = state.copy(loading = false, playing = false, error = message)
        releasePlayer()
    }

    private fun releasePlayer() {
        handler.removeCallbacks(previewSeek)
        previewScheduled = false
        player?.let {
            it.setEventListener(null)
            it.stop()
            it.detachViews()
            it.release()
        }
        player = null
        lib?.release()
        lib = null
        descriptor?.close()
        descriptor = null
        audio.abandonAudioFocusRequest(focusRequest)
    }

    fun close() {
        if (closed) return
        closed = true
        save()
        releasePlayer()
        layout = null
        if (receiverRegistered) context.unregisterReceiver(noisyReceiver)
    }
}
