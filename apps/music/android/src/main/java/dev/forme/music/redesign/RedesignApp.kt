package dev.forme.music.redesign

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.music.R
import dev.forme.music.data.GroupKind
import dev.forme.music.data.Track
import dev.forme.music.ui.AudioAccess
import dev.forme.music.ui.LibraryState
import dev.forme.music.ui.MusicViewModel

private enum class Tab { SONGS, LIBRARY }

/** 재생 화면은 닫힘, 재생기, 대기열 중 하나로만 열린다. */
enum class PlayerView { CLOSED, PLAYER, QUEUE }

/**
 * 보관함 안에서 들어간 화면. 뒤로 가면 하나씩 돌아온다. 화면 회전에도 남도록 글자로 바꿔 보관한다.
 * 묶음([Group])의 key는 기준 정보가 없는 곡끼리 모인 묶음이면 null이다.
 */
sealed interface Page {
    data object Home : Page
    data class Groups(val kind: GroupKind) : Page
    data class Group(val kind: GroupKind, val key: String?) : Page
    data class Playlist(val id: Long) : Page

    fun encode(): String = when (this) {
        Home -> "home"
        is Groups -> "groups|${kind.name}"
        is Group -> "group|${kind.name}|" + if (key == null) "0" else "1$key"
        is Playlist -> "playlist|$id"
    }

    companion object {
        fun decode(text: String): Page {
            val parts = text.split("|", limit = 3)
            return when (parts[0]) {
                "groups" -> Groups(GroupKind.valueOf(parts[1]))
                "group" -> Group(GroupKind.valueOf(parts[1]), parts[2].takeIf { it.startsWith("1") }?.drop(1))
                "playlist" -> Playlist(parts[1].toLong())
                else -> Home
            }
        }
    }
}

/** 글자 목록을 화면 회전과 프로세스 재시작 너머로 보관한다. null이면 보관하지 않아 처음 값(null)으로 돌아온다. */
private val stringListSaver = Saver<List<String>?, ArrayList<String>>(
    save = { list -> list?.let(::ArrayList) },
    restore = { it },
)

private val pageStackSaver = Saver<List<String>, ArrayList<String>>(
    save = { ArrayList(it) },
    restore = { it },
)

/** 여러 곡 담기 창에 넘기는 곡과, 새 재생 목록을 만들 때 미리 넣어 둘 이름. */
data class AddRequest(val tracks: List<Track>, val suggestedName: String)

/**
 * 재설계 화면의 뿌리. 탭은 곡과 보관함 둘이고, 하단에는 미니 플레이어와 탭이 붙는다.
 * 여러 곡을 고르는 동안에는 그 자리를 고른 곡에 할 동작 막대가 대신한다.
 * 저장과 재생은 옛 화면과 같은 [MusicViewModel]이 맡고, 이 파일은 보기만 바꾼다.
 */
@Composable
fun RedesignApp(
    viewModel: MusicViewModel,
    audioAccess: AudioAccess,
    onRequestAudio: () -> Unit,
    onPickFiles: () -> Unit,
) {
    val libraryState by viewModel.libraryState.collectAsStateWithLifecycle()
    val playlists by viewModel.playlists.collectAsStateWithLifecycle()
    val playerState by viewModel.player.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var tab by rememberSaveable { mutableStateOf(Tab.SONGS) }
    var pageStack by rememberSaveable(stateSaver = pageStackSaver) { mutableStateOf(listOf(Page.Home.encode())) }
    var playerView by rememberSaveable { mutableStateOf(PlayerView.CLOSED) }
    // 고른 곡의 주소. 고른 순서대로 담기므로 집합이 아니라 목록이다. null이면 고르는 중이 아니다.
    var selection by rememberSaveable(stateSaver = stringListSaver) { mutableStateOf<List<String>?>(null) }
    var addRequest by remember { mutableStateOf<AddRequest?>(null) }

    LaunchedEffect(viewModel) {
        viewModel.messages.collect { snackbar.showSnackbar(it) }
    }

    val tracks = (libraryState as? LibraryState.Loaded)?.tracks.orEmpty()
    val tracksByUri = remember(tracks) { tracks.associateBy { it.uri } }
    val hasQueue = playerState.queue.isNotEmpty()
    // 대기열을 모두 지우면 재생 화면을 닫는다.
    val shownPlayerView = if (hasQueue) playerView else PlayerView.CLOSED
    val page = Page.decode(pageStack.last())

    fun openPage(next: Page) {
        selection = null
        pageStack = pageStack + next.encode()
    }
    fun goBack() {
        pageStack = pageStack.dropLast(1)
    }
    fun selectedTracks(): List<Track> = selection.orEmpty().mapNotNull(tracksByUri::get)

    val selecting = selection != null
    val selectionHandle = SelectionHandle(
        selected = selection,
        onStart = { uri -> selection = listOfNotNull(uri) },
        onToggle = { uri ->
            val current = selection ?: return@SelectionHandle
            selection = if (uri in current) current - uri else current + uri
        },
        onSelectAll = { uris ->
            val current = selection.orEmpty()
            selection = if (uris.all { it in current }) current - uris.toSet() else current + uris.filter { it !in current }
        },
        onClear = { selection = null },
    )

    BackHandler(enabled = shownPlayerView == PlayerView.QUEUE) { playerView = PlayerView.PLAYER }
    BackHandler(enabled = shownPlayerView == PlayerView.PLAYER) { playerView = PlayerView.CLOSED }
    BackHandler(enabled = shownPlayerView == PlayerView.CLOSED && selecting) { selection = null }
    BackHandler(enabled = shownPlayerView == PlayerView.CLOSED && !selecting && tab == Tab.LIBRARY && pageStack.size > 1) { goBack() }

    Box(Modifier.fillMaxSize().background(Sokji.Surface)) {
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.weight(1f).statusBarsPadding()) {
                when (tab) {
                    Tab.SONGS -> SongsTab(
                        libraryState = libraryState,
                        audioAccess = audioAccess,
                        currentUri = playerState.current?.uri,
                        selection = selectionHandle,
                        onRequestAudio = onRequestAudio,
                        onPickFiles = onPickFiles,
                        onPlay = viewModel.player::play,
                        onPlayNext = viewModel.player::playNext,
                        onAddToQueue = viewModel.player::addToQueue,
                        onAddToPlaylist = { addRequest = AddRequest(listOf(it), "") },
                    )
                    Tab.LIBRARY -> AnimatedContent(
                        targetState = pageStack.size to page,
                        transitionSpec = {
                            val forward = targetState.first >= initialState.first
                            val sign = if (forward) 1 else -1
                            slideInHorizontally(SokjiMotion.push()) { width -> sign * width } togetherWith
                                slideOutHorizontally(SokjiMotion.push()) { width -> -sign * width / 3 }
                        },
                        label = "보관함 화면",
                    ) { (_, shown) ->
                        LibraryPages(
                            page = shown,
                            viewModel = viewModel,
                            tracks = tracks,
                            libraryLoaded = libraryState is LibraryState.Loaded,
                            playlists = playlists,
                            currentUri = playerState.current?.uri,
                            selection = selectionHandle,
                            onOpen = ::openPage,
                            onBack = ::goBack,
                            onAdd = { addRequest = it },
                        )
                    }
                }
            }
            if (selecting) {
                SelectionActions(
                    count = selection.orEmpty().size,
                    onAddToPlaylist = { addRequest = AddRequest(selectedTracks(), "") },
                    onPlayNext = {
                        viewModel.player.playNext(selectedTracks())
                        selection = null
                    },
                    onAddToQueue = {
                        viewModel.player.addToQueue(selectedTracks())
                        selection = null
                    },
                )
            } else {
                if (hasQueue) {
                    MiniPlayer(
                        state = playerState,
                        connection = viewModel.player,
                        onOpen = { playerView = PlayerView.PLAYER },
                    )
                }
                TabBar {
                    TabItem("곡", R.drawable.ic_music_note, tab == Tab.SONGS) { tab = Tab.SONGS }
                    TabItem("보관함", R.drawable.ic_library, tab == Tab.LIBRARY) {
                        // 같은 탭을 다시 누르면 그 탭의 첫 화면으로 돌아간다(속지).
                        if (tab == Tab.LIBRARY) pageStack = listOf(Page.Home.encode())
                        tab = Tab.LIBRARY
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = shownPlayerView != PlayerView.CLOSED,
            enter = slideInVertically(SokjiMotion.sheet()) { it },
            exit = slideOutVertically(SokjiMotion.sheet()) { it },
        ) {
            PlayerSheet(
                state = playerState,
                connection = viewModel.player,
                view = if (shownPlayerView == PlayerView.CLOSED) PlayerView.PLAYER else shownPlayerView,
                onClose = { playerView = PlayerView.CLOSED },
                onToggleQueue = { playerView = if (playerView == PlayerView.QUEUE) PlayerView.PLAYER else PlayerView.QUEUE },
            )
        }

        // 재생 화면이 열려 있어도 안내가 보이도록 모든 화면 위에 둔다.
        SnackbarHost(
            snackbar,
            Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 132.dp),
        )
    }

    addRequest?.let { request ->
        AddToPlaylistSheet(
            request = request,
            playlists = playlists,
            onAdd = { playlist ->
                if (request.tracks.size == 1) viewModel.addToPlaylist(playlist, request.tracks[0]) else viewModel.addAllToPlaylist(playlist, request.tracks)
                addRequest = null
                selection = null
            },
            onCreate = { name ->
                viewModel.createPlaylist(name, request.tracks)
                addRequest = null
                selection = null
            },
            onDismiss = { addRequest = null },
        )
    }
}

/** 여러 곡 고르기의 상태와 동작. 곡 탭과 묶음 상세가 같은 고름을 쓴다. */
class SelectionHandle(
    val selected: List<String>?,
    /** 고르기를 시작한다. 길게 누른 곡이 있으면 그 곡을 고른 채로 시작한다. */
    val onStart: (String?) -> Unit,
    val onToggle: (String) -> Unit,
    /** [uris]가 모두 골라져 있으면 모두 풀고, 아니면 빠진 것을 더한다. */
    val onSelectAll: (List<String>) -> Unit,
    val onClear: () -> Unit,
) {
    val active: Boolean get() = selected != null
    fun isSelected(uri: String) = selected?.contains(uri) == true
}

/** 고르는 동안 목록 맨 위에 두는 줄: 닫기, 고른 수, 보이는 곡 모두 고르기. */
@Composable
fun SelectionHeader(selection: SelectionHandle, visibleUris: List<String>) {
    val count = selection.selected.orEmpty().size
    val allSelected = visibleUris.isNotEmpty() && visibleUris.all(selection::isSelected)
    Row(
        Modifier.fillMaxWidth().padding(start = 4.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.material3.IconButton(onClick = selection.onClear) {
            Icon(painterResource(R.drawable.ic_close), contentDescription = "고르기 끝내기", tint = Sokji.Ink)
        }
        Text("${count}곡 고름", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        TextAction(if (allSelected) "모두 풀기" else "모두 고르기", onClick = { selection.onSelectAll(visibleUris) }, color = Sokji.Ink, enabled = visibleUris.isNotEmpty())
    }
}

/** 고르는 동안 미니 플레이어와 탭 자리에 두는 동작 막대. */
@Composable
private fun SelectionActions(count: Int, onAddToPlaylist: () -> Unit, onPlayNext: () -> Unit, onAddToQueue: () -> Unit) {
    val enabled = count > 0
    Row(
        Modifier
            .fillMaxWidth()
            .background(Sokji.Raised)
            .navigationBarsPadding()
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        ActionItem("재생 목록에 담기", R.drawable.ic_playlist_add, enabled, onAddToPlaylist)
        ActionItem("다음에 재생", R.drawable.ic_play_next, enabled, onPlayNext)
        ActionItem("대기열에 추가", R.drawable.ic_queue_add, enabled, onAddToQueue)
    }
}

@Composable
private fun RowScope.ActionItem(label: String, icon: Int, enabled: Boolean, onClick: () -> Unit) {
    Column(
        Modifier
            .weight(1f)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        val tint = if (enabled) Sokji.Ink else Sokji.Faint
        Icon(painterResource(icon), contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = tint)
    }
}

/** 하단 탭. 위에 구분선을 두지 않고, 고른 탭만 강조색이다. */
@Composable
private fun TabBar(content: @Composable RowScope.() -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(Sokji.Surface)
            .navigationBarsPadding()
            .padding(vertical = 4.dp),
        content = content,
    )
}

@Composable
private fun RowScope.TabItem(label: String, icon: Int, selected: Boolean, onClick: () -> Unit) {
    val tint = if (selected) Sokji.AccentText else Sokji.Muted
    Column(
        Modifier
            .weight(1f)
            .semantics { this.selected = selected }
            .clickable(role = Role.Tab, onClick = onClick)
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Icon(painterResource(icon), contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = tint)
    }
}
