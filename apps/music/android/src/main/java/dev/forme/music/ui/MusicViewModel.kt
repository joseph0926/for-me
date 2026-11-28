package dev.forme.music.ui

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.forme.music.data.MusicDatabase
import dev.forme.music.data.MusicLibrary
import dev.forme.music.data.PlaylistRecord
import dev.forme.music.data.PlaylistSummary
import dev.forme.music.data.PlaylistTrackRecord
import dev.forme.music.data.Track
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** 곡 목록을 처음 읽기 전([Loading])과 읽은 뒤([Loaded])를 구분한다. 빈 목록과 아직 모름을 섞지 않기 위해서다. */
sealed interface LibraryState {
    data object Loading : LibraryState
    data class Loaded(val tracks: List<Track>) : LibraryState
}

/** 재생 목록의 한 줄. 파일이 사라졌거나 권한이 없으면 [track]이 null이다. */
data class PlaylistLine(val record: PlaylistTrackRecord, val track: Track?)

class MusicViewModel(application: Application) : AndroidViewModel(application) {
    private val database = MusicDatabase.get(application)
    private val library = MusicLibrary(application, database)
    private val playlistEdits = Mutex()
    private val _messages = Channel<String>(Channel.BUFFERED)

    private val _libraryState = MutableStateFlow<LibraryState>(LibraryState.Loading)
    val libraryState: StateFlow<LibraryState> = _libraryState.asStateFlow()

    val messages: Flow<String> = _messages.receiveAsFlow()
    val player = PlayerConnection(application) { _messages.trySend(it) }
    val playlists: StateFlow<List<PlaylistSummary>> =
        database.playlists().summaries().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    /** 화면이 다시 보일 때마다 부른다. 그 사이 곡이 추가되거나 지워졌을 수 있다. */
    fun refresh(hasAudioPermission: Boolean) {
        viewModelScope.launch {
            _libraryState.value = LibraryState.Loaded(library.load(hasAudioPermission))
        }
    }

    fun addPicked(uris: List<Uri>, hasAudioPermission: Boolean) {
        if (uris.isEmpty()) return
        viewModelScope.launch {
            val added = library.addPicked(uris, System.currentTimeMillis())
            if (added < uris.size) _messages.trySend("${uris.size - added}개 파일은 추가하지 못했습니다.")
            _libraryState.value = LibraryState.Loaded(library.load(hasAudioPermission))
        }
    }

    fun playlistLines(playlistId: Long): Flow<List<PlaylistTrackRecord>> = database.playlists().tracks(playlistId)

    fun linesOf(records: List<PlaylistTrackRecord>, tracks: List<Track>): List<PlaylistLine> {
        val byUri = tracks.associateBy { it.uri }
        return records.map { PlaylistLine(it, byUri[it.uri]) }
    }

    /** 재생할 수 있는 곡만 대기열에 넣는다. [startIndex]가 재생할 수 없는 곡이면 그다음 재생할 수 있는 곡부터 시작한다. */
    fun playPlaylist(lines: List<PlaylistLine>, startIndex: Int, shuffle: Boolean = false) {
        val playable = lines.withIndex().filter { it.value.track != null }
        if (playable.isEmpty()) {
            _messages.trySend("재생할 수 있는 곡이 없습니다.")
            return
        }
        val start = playable.indexOfFirst { it.index >= startIndex }.coerceAtLeast(0)
        player.play(playable.map { it.value.track!! }, start, shuffle)
    }

    fun createPlaylist(name: String, firstTrack: Track? = null) {
        viewModelScope.launch {
            playlistEdits.withLock {
                val id = database.playlists().create(PlaylistRecord(name = name.trim(), createdAtMs = System.currentTimeMillis()))
                if (firstTrack != null) {
                    database.playlists().replaceTracks(id, listOf(firstTrack.uri to firstTrack.name))
                    _messages.trySend("${name.trim()}에 추가했습니다.")
                }
            }
        }
    }

    fun renamePlaylist(playlistId: Long, name: String) {
        viewModelScope.launch { database.playlists().rename(playlistId, name.trim()) }
    }

    fun deletePlaylist(playlistId: Long) {
        viewModelScope.launch { database.playlists().delete(playlistId) }
    }

    fun addToPlaylist(playlist: PlaylistRecord, track: Track) = editPlaylist(playlist.id) { tracks ->
        _messages.trySend("${playlist.name}에 추가했습니다.")
        tracks + (track.uri to track.name)
    }

    fun removeFromPlaylist(playlistId: Long, index: Int) = editPlaylist(playlistId) { tracks ->
        tracks.filterIndexed { i, _ -> i != index }
    }

    fun moveInPlaylist(playlistId: Long, from: Int, to: Int) = editPlaylist(playlistId) { tracks ->
        if (from !in tracks.indices || to !in tracks.indices) return@editPlaylist tracks
        tracks.toMutableList().apply { add(to, removeAt(from)) }
    }

    /** 읽고 고쳐 쓰는 사이에 다른 편집이 끼어들지 않도록 재생 목록 편집은 하나씩 한다. */
    private fun editPlaylist(playlistId: Long, change: (List<Pair<String, String>>) -> List<Pair<String, String>>) {
        viewModelScope.launch {
            playlistEdits.withLock {
                val current = database.playlists().currentTracks(playlistId).map { it.uri to it.name }
                database.playlists().replaceTracks(playlistId, change(current))
            }
        }
    }

    override fun onCleared() {
        player.release()
    }
}
