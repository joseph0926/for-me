package dev.forme.music.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.music.R
import dev.forme.music.data.Track

/** 음악 접근 권한. [BLOCKED]는 시스템이 더는 묻지 않아 설정 화면으로만 허용할 수 있는 상태다. */
enum class AudioAccess { NOT_ASKED, GRANTED, DENIED, BLOCKED }

private enum class Tab { SONGS, PLAYLISTS }

/** 재생 화면은 닫힘, 재생기, 대기열 중 하나로만 열린다. */
private enum class PlayerView { CLOSED, PLAYER, QUEUE }

@Composable
fun MusicApp(
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
    var openPlaylistId by rememberSaveable { mutableStateOf<Long?>(null) }
    var playerView by rememberSaveable { mutableStateOf(PlayerView.CLOSED) }
    var addTarget by remember { mutableStateOf<Track?>(null) }

    LaunchedEffect(viewModel) {
        viewModel.messages.collect { snackbar.showSnackbar(it) }
    }
    // 대기열을 모두 지우면 재생 화면을 닫는다.
    val hasQueue = playerState.queue.isNotEmpty()
    val shownPlayerView = if (hasQueue) playerView else PlayerView.CLOSED

    BackHandler(enabled = shownPlayerView == PlayerView.QUEUE) { playerView = PlayerView.PLAYER }
    BackHandler(enabled = shownPlayerView == PlayerView.PLAYER) { playerView = PlayerView.CLOSED }
    BackHandler(enabled = shownPlayerView == PlayerView.CLOSED && openPlaylistId != null) { openPlaylistId = null }

    val tracks = (libraryState as? LibraryState.Loaded)?.tracks.orEmpty()
    Box(Modifier.fillMaxSize()) {
        Scaffold(
            bottomBar = {
                Column {
                    if (hasQueue) {
                        MiniPlayer(
                            state = playerState,
                            onOpen = { playerView = PlayerView.PLAYER },
                            onTogglePlay = viewModel.player::togglePlay,
                            onNext = viewModel.player::next,
                        )
                    }
                    NavigationBar(containerColor = MusicColors.Background) {
                        TabItem(tab == Tab.SONGS, "곡", R.drawable.ic_music_note) {
                            tab = Tab.SONGS
                        }
                        TabItem(tab == Tab.PLAYLISTS, "재생 목록", R.drawable.ic_queue_music) {
                            tab = Tab.PLAYLISTS
                        }
                    }
                }
            },
        ) { padding ->
            Box(Modifier.padding(padding)) {
                when (tab) {
                    Tab.SONGS -> SongsScreen(
                        libraryState = libraryState,
                        audioAccess = audioAccess,
                        currentUri = playerState.current?.uri,
                        onRequestAudio = onRequestAudio,
                        onPickFiles = onPickFiles,
                        onPlay = viewModel.player::play,
                        onPlayNext = viewModel.player::playNext,
                        onAddToQueue = viewModel.player::addToQueue,
                        onAddToPlaylist = { addTarget = it },
                    )
                    Tab.PLAYLISTS -> {
                        val playlistId = openPlaylistId
                        val open = playlists.firstOrNull { it.playlist.id == playlistId }
                        if (open == null) {
                            PlaylistsScreen(
                                playlists = playlists,
                                onOpen = { openPlaylistId = it },
                                onCreate = { viewModel.createPlaylist(it) },
                            )
                        } else {
                            PlaylistDetail(
                                summary = open,
                                viewModel = viewModel,
                                tracks = tracks,
                                currentUri = playerState.current?.uri,
                                onBack = { openPlaylistId = null },
                            )
                        }
                    }
                }
            }
        }
        when (shownPlayerView) {
            PlayerView.PLAYER -> NowPlayingScreen(
                state = playerState,
                connection = viewModel.player,
                onClose = { playerView = PlayerView.CLOSED },
                onOpenQueue = { playerView = PlayerView.QUEUE },
            )
            PlayerView.QUEUE -> QueueScreen(
                state = playerState,
                connection = viewModel.player,
                onBack = { playerView = PlayerView.PLAYER },
            )
            PlayerView.CLOSED -> Unit
        }
        // 재생 화면과 대기열이 열려 있어도 안내가 보이도록 모든 화면 위에 둔다.
        SnackbarHost(
            snackbar,
            Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 136.dp),
        )
    }

    addTarget?.let { track ->
        AddToPlaylistDialog(
            track = track,
            playlists = playlists,
            onAdd = { viewModel.addToPlaylist(it, track) },
            onCreate = { viewModel.createPlaylist(it, firstTrack = track) },
            onDismiss = { addTarget = null },
        )
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.TabItem(
    selected: Boolean,
    label: String,
    icon: Int,
    onClick: () -> Unit,
) {
    NavigationBarItem(
        selected = selected,
        onClick = onClick,
        icon = { Icon(painterResource(icon), contentDescription = null) },
        label = { Text(label) },
        colors = NavigationBarItemDefaults.colors(
            selectedIconColor = MusicColors.Accent,
            selectedTextColor = MusicColors.Accent,
            indicatorColor = Color.Transparent,
            unselectedIconColor = MusicColors.SubText,
            unselectedTextColor = MusicColors.SubText,
        ),
    )
}
