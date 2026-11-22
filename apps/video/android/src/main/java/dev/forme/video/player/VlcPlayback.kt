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
import dev.forme.video.data.FolderQueue
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
import org.videolan.libvlc.interfaces.IMedia
import org.videolan.libvlc.util.VLCVideoLayout
import java.io.IOException

/** 영상을 고른 뒤 첫 장면이 보일 때까지의 단계. */
enum class PlaybackStartup {
    OpeningFile,
    /** 설치 직후 libVLC가 기기 글꼴 캐시를 만드는 중이다. */
    PreparingFonts,
    /** 재생기는 준비됐지만 아직 영상 출력이 시작되지 않아 화면이 검다. */
    WaitingForPicture,
    /** 첫 장면이 나왔거나, 멈춤, 종료, 오류로 더 기다리지 않는다. */
    Finished,
}

data class PlaybackUiState(
    val title: String = "",
    val startup: PlaybackStartup = PlaybackStartup.OpeningFile,
    val playing: Boolean = false,
    val positionMs: Long = 0,
    val durationMs: Long = 0,
    val seekable: Boolean = false,
    val error: Int? = null,
    val ended: Boolean = false,
    /** 화면에 보이는 영상의 가로 대 세로 비율. 영상 출력이 준비되기 전에는 null이다. */
    val videoAspect: Float? = null,
) {
    /** 재생기가 아직 없어 재생 조작을 받을 수 없는 동안이다. */
    val loading: Boolean
        get() = startup == PlaybackStartup.OpeningFile || startup == PlaybackStartup.PreparingFonts
}

class VlcPlayback(
    private val context: Context,
    private val repository: PlaybackRepository,
    private val uri: Uri,
    private val accessUri: Uri,
    folder: FolderQueue?,
    private val wantsToPlay: () -> Boolean,
    private val changePlayIntent: (Boolean) -> Unit,
    private var rate: Float = 1f,
    private var videoScale: VideoScale = VideoScale.Fit,
) {
    var state by mutableStateOf(PlaybackUiState())
        private set
    private var lib: LibVLC? = null
    private var player: MediaPlayer? = null
    internal val subtitles = SubtitleControls(context, uri, folder) { player }
    internal fun subtitleTimeMs(): Long = progress.pendingSeekMs ?: player?.time?.takeIf { it >= 0 } ?: state.positionMs

    private var descriptor: ParcelFileDescriptor? = null
    private var layout: VLCVideoLayout? = null
    private var progress = PlaybackProgress(0)
    private var visible = false
    private var closed = false
    private var needsInitialStart = true
    private val seekClock = SeekPlaybackClock(rate)
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
                try {
                    openVideoDocument(context.contentResolver, accessUri,
                        saved?.title ?: context.getString(R.string.app_name)).also { opened = it }
                } catch (error: IllegalArgumentException) {
                    // 폴더 아래의 문서가 이동하면 제공자가 파일 없음 대신 이 예외를 반환하기도 한다.
                    throw IOException("Cannot open video document", error)
                }
            }
            if (closed) return
            descriptor = document.descriptor
            opened = null
            progress = PlaybackProgress(saved?.positionMs ?: 0)
            state = state.copy(title = document.title, positionMs = progress.positionMs)
            if (FontCacheWarmup.preparing) {
                state = state.copy(startup = PlaybackStartup.PreparingFonts)
                FontCacheWarmup.awaitFinished()
                if (closed) return
            }
            val engine = LibVLC(context, arrayListOf("--no-video-title-show"))
            lib = engine
            val mediaPlayer = MediaPlayer(engine)
            player = mediaPlayer
            subtitles.restore()
            mediaPlayer.setEventListener { event -> if (!closed) handleEvent(event) }
            layout?.let(::attachPlayerViews)
            state = state.copy(startup = PlaybackStartup.WaitingForPicture)
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
        val active = player ?: return
        active.attachViews(view, null, true, true)
        // 끝난 영상을 다시 열 때도 출력 화면을 새로 붙이므로 고른 화면 모드를 함께 적용한다.
        active.videoScale = videoScale.vlcType
    }

    fun setVideoScale(scale: VideoScale) {
        videoScale = scale
        player?.videoScale = scale.vlcType
    }

    fun setVisible(visible: Boolean) {
        this.visible = visible
        if (visible) playIfRequested() else {
            seekClock.pause(SystemClock.elapsedRealtime())
            handler.removeCallbacks(previewSeek)
            previewScheduled = false
            scrubbing = false
            save()
            player?.pause()
            state = state.copy(playing = false)
            audio.abandonAudioFocusRequest(focusRequest)
        }
    }

    fun setRate(rate: Float) {
        seekClock.setRate(rate, SystemClock.elapsedRealtime())
        this.rate = rate
        player?.rate = rate
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
        seekClock.pause(SystemClock.elapsedRealtime())
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
        if (wantsToPlay()) seekClock.start(SystemClock.elapsedRealtime())
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
        seekClock.reset()
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
            // MKV의 내장 자막 형식은 전용 demux가 읽는다. MP4의 탐색에는 avformat을 유지한다.
            media.addOption(":demux=mkv,avformat,any")
            media.addOption(":start-time=${progress.positionMs / 1000.0}")
            if (!wantsToPlay() || scrubbing) media.addOption(":start-paused")
            active.media = media
        } finally {
            media.release()
        }
        // 끝난 영상을 다시 열 때도 영상 출력을 새로 만드므로 첫 장면을 다시 기다린다.
        state = state.copy(startup = PlaybackStartup.WaitingForPicture)
    }

    private fun finishWaitingForPicture() {
        if (state.startup == PlaybackStartup.WaitingForPicture) state = state.copy(startup = PlaybackStartup.Finished)
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
        state = state.copy(ended = false)
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
            MediaPlayer.Event.ESAdded, MediaPlayer.Event.ESDeleted, MediaPlayer.Event.ESSelected -> subtitles.refresh()
            MediaPlayer.Event.Vout -> {
                // 재생 시작 알림은 영상 출력보다 먼저 온다. 글꼴 준비처럼 출력이 늦어지는 동안에도 화면은 검다.
                if (event.voutCount > 0) finishWaitingForPicture()
                updateVideoAspect(active)
            }
            MediaPlayer.Event.Playing -> {
                subtitles.refresh()
                progress.updateDuration(active.length)
                state = state.copy(durationMs = progress.durationMs, seekable = active.isSeekable)
                // 새 입력을 열거나 끝난 뒤 다시 열어도 고른 속도를 유지한다.
                if (active.rate != rate) active.rate = rate
                updateVideoAspect(active)
                restorePosition()
                if (!visible || !wantsToPlay() || scrubbing) {
                    active.pause()
                    return
                }
                state = state.copy(playing = true, seekable = active.isSeekable)
            }
            MediaPlayer.Event.Paused -> {
                // 멈춘 동안에는 조작이 보이므로 첫 장면을 기다린다는 표시를 거둔다.
                finishWaitingForPicture()
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
                // 영상 트랙이 없는 파일은 출력 화면이 생기지 않으므로 시간이 흐르면 시작한 것으로 본다.
                if (active.videoTracksCount == 0) finishWaitingForPicture()
                if (ended || scrubbing || !visible || !wantsToPlay()) return
                val now = SystemClock.elapsedRealtime()
                val elapsedMediaMs = seekClock.elapsedMediaMs(now)
                if (progress.acceptTime(event.timeChanged, elapsedPlayingMs = elapsedMediaMs)) {
                    state = state.copy(positionMs = progress.positionMs, durationMs = progress.durationMs)
                    if (now - lastSaveAtMs >= 2_000) {
                        save()
                        lastSaveAtMs = now
                    }
                }
            }
            MediaPlayer.Event.EndReached -> {
                finishWaitingForPicture()
                seekClock.reset()
                progress.finish()
                ended = true
                changePlayIntent(false)
                state = state.copy(playing = false, positionMs = 0, ended = true)
                save()
                audio.abandonAudioFocusRequest(focusRequest)
            }
            MediaPlayer.Event.EncounteredError -> fail(R.string.playback_failed)
        }
    }

    private fun updateVideoAspect(active: MediaPlayer) {
        val track = active.currentVideoTrack ?: return
        if (track.width <= 0 || track.height <= 0) return
        val pixelAspect = if (track.sarNum > 0 && track.sarDen > 0) track.sarNum.toFloat() / track.sarDen else 1f
        val stored = track.width * pixelAspect / track.height
        // 방향 값 4~7은 90도 돌려 저장한 영상이라 화면에서는 가로와 세로가 바뀐다.
        val aspect = if (track.orientation >= IMedia.VideoTrack.Orientation.LeftTop) 1f / stored else stored
        if (state.videoAspect != aspect) state = state.copy(videoAspect = aspect)
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
        state = state.copy(startup = PlaybackStartup.Finished, playing = false, error = message)
        releasePlayer()
    }

    private fun releasePlayer() {
        subtitles.close()
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
