package dev.forme.video

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.forme.video.data.PlaybackRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.stateIn

data class VideoSelection(val uri: Uri, val sequence: Long) {
    var wantsToPlay = true
}

class VideoViewModel(application: Application) : AndroidViewModel(application) {
    val repository = (application as VideoApplication).repository
    private val mutableSelection = MutableStateFlow<VideoSelection?>(null)
    val selection = mutableSelection.asStateFlow()
    private val mutableNotice = MutableStateFlow<Int?>(null)
    val notice = mutableNotice.asStateFlow()
    val recent = repository.recent.catch {
        mutableNotice.value = R.string.storage_failed
        emit(emptyList<PlaybackRecord>())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    private var sequence = 0L

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
        mutableSelection.value = VideoSelection(uri, ++sequence)
    }

    fun closeVideo() {
        mutableSelection.value = null
        mutableNotice.value = null
    }
}
