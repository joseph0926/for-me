package dev.forme.video

import android.app.Application
import android.content.Intent
import android.database.sqlite.SQLiteException
import android.net.Uri
import android.provider.DocumentsContract
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import dev.forme.video.data.FolderQueue
import dev.forme.video.data.PlaybackRecord
import dev.forme.video.player.VideoScale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.stateIn

data class VideoSelection(
    val uri: Uri,
    val sequence: Long,
    val accessUri: Uri = uri,
    val queue: FolderQueue? = null,
    val savedTitle: String? = null,
) {
    var wantsToPlay by mutableStateOf(true)
}

class VideoViewModel(application: Application) : AndroidViewModel(application) {
    internal val folders = (application as VideoApplication).folders
    val repository = (application as VideoApplication).repository
    private val mutableSelection = MutableStateFlow<VideoSelection?>(null)
    val selection = mutableSelection.asStateFlow()
    private val mutableNotice = MutableStateFlow<Int?>(null)
    val notice = mutableNotice.asStateFlow()
    val recent = repository.recent.catch {
        mutableNotice.value = R.string.storage_failed
        emit(emptyList<PlaybackRecord>())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(), emptyList())
    private var sequence = 0L
    /** 앱을 쓰는 동안 다음 영상에도 이어지는 재생 속도. 앱을 다시 시작하면 1배로 돌아간다. */
    var playbackRate by mutableFloatStateOf(1f)
    private val playerSettings = application.getSharedPreferences("player_settings", Application.MODE_PRIVATE)
    /** 모든 영상에 쓰는 화면 모드. 앱을 다시 시작해도 유지한다. */
    var videoScale by mutableStateOf(VideoScale.fromStored(playerSettings.getString(VIDEO_SCALE_KEY, null)))
        private set

    fun changeVideoScale(scale: VideoScale) {
        videoScale = scale
        playerSettings.edit { putString(VIDEO_SCALE_KEY, scale.name) }
    }

    internal suspend fun findFolderRecord(uri: String): PlaybackRecord? = try {
        repository.find(uri)
    } catch (_: SQLiteException) {
        mutableNotice.value = R.string.storage_failed
        null
    }

    fun select(uri: Uri, fromPicker: Boolean) {
        mutableNotice.value = null
        if (fromPicker) {
            try {
                getApplication<Application>().contentResolver.takePersistableUriPermission(
                    uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (_: SecurityException) {
                mutableNotice.value = R.string.temporary_access
            }
        }
        val accessUri = if (fromPicker) uri else folders.readableUri(uri)
        selectVideo(uri, accessUri, null)
    }

    fun playFromFolder(access: Uri, queue: FolderQueue?) {
        mutableNotice.value = null
        selectVideo(folders.rememberVideo(access), access, queue)
    }

    private fun selectVideo(uri: Uri, access: Uri, queue: FolderQueue?) {
        val address = uri.toString()
        val title = recent.value.firstOrNull { it.uri == address }?.title ?: queue?.current?.title
        mutableSelection.value = VideoSelection(uri, ++sequence, access, queue, title)
    }

    /** 같은 폴더의 다음 영상을 폴더 목록에서 연 것과 같은 방식으로 연다. */
    fun playNext() {
        val queue = mutableSelection.value?.queue ?: return
        val next = queue.next ?: return
        playFromFolder(DocumentsContract.buildDocumentUriUsingTree(queue.tree, next.documentId), queue.advanced())
    }

    fun closeVideo() {
        mutableSelection.value = null
        mutableNotice.value = null
    }
}

private const val VIDEO_SCALE_KEY = "video_scale"
