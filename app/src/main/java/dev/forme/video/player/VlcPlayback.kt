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
import android.os.ParcelFileDescriptor
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
    private var ended = false
    private var lastSaveAtMs = 0L
    private var seekIssuedFor: Long? = null
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
            val media = Media(engine, descriptor!!.fileDescriptor)
            try {
                media.setHWDecoderEnabled(true, false)
                mediaPlayer.media = media
            } finally {
                media.release()
            }
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
            save()
            player?.pause()
            state = state.copy(playing = false)
            audio.abandonAudioFocusRequest(focusRequest)
        }
    }

    fun togglePlayback() {
        if (state.playing) pauseByUser() else {
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
        if (closed || !visible || layout == null || !wantsToPlay() || state.loading) return
        val active = player ?: return
        if (state.error != null && state.error != R.string.audio_focus_failed) return
        if (audio.requestAudioFocus(focusRequest) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            state = state.copy(error = R.string.audio_focus_failed)
            return
        }
        state = state.copy(error = null)
        if (ended) {
            ended = false
            progress.seek(0)
            seekIssuedFor = null
            active.stop()
        }
        active.play()
    }

    fun seek(positionMs: Long) {
        if (!state.seekable || closed) return
        progress.seek(positionMs)
        seekIssuedFor = null
        restorePosition()
        state = state.copy(positionMs = progress.positionMs)
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
                if (!visible || !wantsToPlay()) {
                    active.pause()
                    return
                }
                progress.updateDuration(active.length)
                state = state.copy(playing = true, seekable = active.isSeekable)
                restorePosition()
            }
            MediaPlayer.Event.Paused -> state = state.copy(playing = false)
            MediaPlayer.Event.LengthChanged -> {
                progress.updateDuration(event.lengthChanged)
                restorePosition()
            }
            MediaPlayer.Event.SeekableChanged -> {
                state = state.copy(seekable = active.isSeekable)
                restorePosition()
            }
            MediaPlayer.Event.TimeChanged -> {
                if (!ended && progress.acceptTime(event.timeChanged)) {
                    state = state.copy(positionMs = progress.positionMs, durationMs = progress.durationMs)
                    val now = android.os.SystemClock.elapsedRealtime()
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
