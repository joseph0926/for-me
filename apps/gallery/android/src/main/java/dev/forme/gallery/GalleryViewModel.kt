package dev.forme.gallery

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.forme.gallery.library.Library
import dev.forme.gallery.library.MediaStoreSource
import dev.forme.gallery.ui.ThumbnailLoader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.ZoneId

/** 처음 읽기 전([Loading])과 읽은 뒤([Loaded])를 나눈다. 빈 보관함과 아직 모름을 섞지 않기 위해서다. */
sealed interface LibraryState {
    data object Loading : LibraryState
    data class Loaded(val library: Library) : LibraryState
}

class GalleryViewModel(application: Application) : AndroidViewModel(application) {
    private val source = MediaStoreSource(application.contentResolver)
    val thumbnails = ThumbnailLoader(application.contentResolver)

    private val _library = MutableStateFlow<LibraryState>(LibraryState.Loading)
    val library: StateFlow<LibraryState> = _library.asStateFlow()

    private var loading: Job? = null

    /**
     * 화면이 다시 보일 때, 권한이 바뀔 때, 기기의 미디어가 바뀔 때 부른다. 목록은 저장하지 않고 매번 새로 읽는다.
     * 새 요청이 오면 이전 읽기를 취소해 늦게 끝난 옛 결과가 새 결과를 덮지 않게 한다.
     * [settleMillis]는 사진 여러 장이 잇달아 바뀔 때 알림마다 다시 읽지 않도록 기다리는 시간이다.
     */
    fun refresh(access: MediaAccess, settleMillis: Long = 0) {
        loading?.cancel()
        loading = viewModelScope.launch {
            if (settleMillis > 0) delay(settleMillis)
            val items = if (access == MediaAccess.NONE) emptyList() else withContext(Dispatchers.IO) { source.loadAll() }
            val library = withContext(Dispatchers.Default) { Library(items, ZoneId.systemDefault()) }
            _library.value = LibraryState.Loaded(library)
        }
    }
}
