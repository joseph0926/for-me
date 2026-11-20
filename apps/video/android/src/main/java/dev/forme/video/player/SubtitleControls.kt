package dev.forme.video.player

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dev.forme.video.R
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.videolan.libvlc.MediaPlayer
import java.io.FileNotFoundException
import java.io.IOException
import java.nio.charset.CharacterCodingException

internal data class SubtitleTrack(val id: Int, val name: String)

internal class SubtitleControls(
    context: Context,
    private val video: Uri,
    private val player: () -> MediaPlayer?,
) {
    private val resolver = context.contentResolver
    private val prefs = context.getSharedPreferences("video_subtitles", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var reading: Job? = null
    private var desiredTrack = prefs.getString("track:$video", null)
    private var externalUri = prefs.getString("external:$video", null)
    var tracks by mutableStateOf(emptyList<SubtitleTrack>())
        private set
    var selected by mutableStateOf(-1)
        private set
    var external by mutableStateOf<SrtSubtitles?>(null)
        private set
    var usingExternal by mutableStateOf(false)
        private set
    var delayMs by mutableStateOf(prefs.getInt("delay:$video", 0))
        private set
    var fontSize by mutableStateOf(prefs.getInt("size:$video", 20))
        private set
    var notice by mutableStateOf<Int?>(null)
        private set
    var loading by mutableStateOf(false)
        private set

    fun restore() {
        if (desiredTrack == "external") externalUri?.let { load(it.toUri(), restoring = true) }
    }

    fun refresh() {
        val active = player() ?: return
        tracks = active.spuTracks.orEmpty().filter { it.id >= 0 }.map { SubtitleTrack(it.id, it.name.orEmpty()) }
        val target = if (desiredTrack == "external") -1 else desiredTrack?.toIntOrNull()
        if (target != null && active.spuTrack != target && (target == -1 || tracks.any { it.id == target })) {
            active.setSpuTrack(target)
        }
        selected = active.spuTrack
        if (active.spuDelay != delayMs * 1000L) active.setSpuDelay(delayMs * 1000L)
    }

    fun select(id: Int) {
        val active = player() ?: return
        if (active.spuTrack != id && !active.setSpuTrack(id)) {
            notice = R.string.subtitle_select_failed
            return
        }
        reading?.cancel()
        loading = false
        usingExternal = false
        desiredTrack = id.toString()
        selected = id
        notice = null
        prefs.edit { putString("track:$video", desiredTrack) }
    }

    val hasExternal: Boolean get() = external != null || externalUri != null

    fun selectExternal() {
        if (external == null) {
            externalUri?.let { load(it.toUri(), restoring = true) }
            return
        }
        reading?.cancel()
        loading = false
        notice = null
        activateExternal(external ?: return, externalUri)
    }

    private fun activateExternal(subtitles: SrtSubtitles, savedUri: String?) {
        val active = player() ?: return
        if (active.spuTrack >= 0 && !active.setSpuTrack(-1)) {
            notice = R.string.subtitle_select_failed
            return
        }
        external = subtitles
        externalUri = savedUri
        desiredTrack = "external"
        usingExternal = true
        selected = -1
        prefs.edit {
            putString("external:$video", savedUri)
            putString("track:$video", if (savedUri == null) "-1" else "external")
        }
    }

    fun load(uri: Uri, restoring: Boolean = false) {
        reading?.cancel()
        notice = null
        loading = true
        reading = scope.launch {
            try {
                val subtitles = withContext(Dispatchers.IO) {
                    require(uri.scheme == "content")
                    resolver.openInputStream(uri)?.use(SrtSubtitles::read) ?: throw FileNotFoundException()
                }
                var savedUri: String? = uri.toString()
                if (!restoring) {
                    try {
                        resolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    } catch (_: SecurityException) {
                        savedUri = null
                        notice = R.string.temporary_access
                    }
                }
                activateExternal(subtitles, savedUri)
            } catch (error: CancellationException) {
                throw error
            } catch (_: CharacterCodingException) {
                notice = R.string.subtitle_invalid
            } catch (_: IllegalArgumentException) {
                notice = R.string.subtitle_invalid
            } catch (_: SecurityException) {
                notice = R.string.subtitle_unavailable
            } catch (_: IOException) {
                notice = R.string.subtitle_unavailable
            } finally {
                if (isActive) loading = false
            }
        }
    }

    fun setDelay(value: Int) {
        val next = value.coerceIn(-60_000, 60_000)
        if (!usingExternal && selected >= 0 && player()?.setSpuDelay(next * 1000L) != true) {
            notice = R.string.subtitle_select_failed
            return
        }
        delayMs = next
        prefs.edit { putInt("delay:$video", next) }
    }

    fun setSize(value: Int) {
        fontSize = value.coerceIn(12, 40)
        prefs.edit { putInt("size:$video", fontSize) }
    }

    fun close() = scope.cancel()
}
