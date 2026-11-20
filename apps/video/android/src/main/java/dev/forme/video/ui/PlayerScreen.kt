package dev.forme.video.ui

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.saveable.rememberSaveable
import android.view.View
import android.view.accessibility.AccessibilityManager
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalConfiguration
import android.content.res.Configuration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import dev.forme.video.R
import dev.forme.video.VideoSelection
import dev.forme.video.VideoViewModel
import dev.forme.video.player.VlcPlayback
import kotlinx.coroutines.delay
import org.videolan.libvlc.util.VLCVideoLayout

@Composable
internal fun PlayerScreen(
    selection: VideoSelection,
    model: VideoViewModel,
    savedTitle: String?,
    openFile: () -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val playback = remember(selection.sequence) {
        VlcPlayback(context, model.repository, selection.uri, selection.accessUri,
            wantsToPlay = { selection.wantsToPlay }, changePlayIntent = { selection.wantsToPlay = it })
    }
    val state = playback.state
    LaunchedEffect(playback) { playback.open() }
    DisposableEffect(playback, lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> playback.setVisible(true)
                Lifecycle.Event.ON_STOP -> playback.setVisible(false)
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        playback.setVisible(lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED))
        onDispose {
            lifecycle.removeObserver(observer)
            playback.close()
        }
    }

    val title = state.title.ifBlank { savedTitle ?: context.getString(R.string.app_name) }
    val fatalError = state.error?.takeUnless { it == R.string.audio_focus_failed }
    if (fatalError != null) {
        PlaybackFailure(title, fatalError, selection.accessUri.toString(), openFile, model::closeVideo, modifier)
        return
    }

    val touchExploration = rememberTouchExploration()
    var screenLocked by rememberSaveable(selection.sequence) { mutableStateOf(false) }
    var unlockVisible by remember { mutableStateOf(true) }
    var lockInteraction by remember { mutableIntStateOf(0) }
    val revealUnlock: () -> Unit = {
        unlockVisible = true
        lockInteraction++
    }
    BackHandler(enabled = screenLocked) { revealUnlock() }
    LaunchedEffect(screenLocked, unlockVisible, lockInteraction, touchExploration) {
        if (screenLocked && unlockVisible && !touchExploration) {
            delay(2_000)
            unlockVisible = false
        }
    }
    var subtitleMenu by rememberSaveable { mutableStateOf(false) }
    // 메뉴를 닫아 둔 사이 저장한 외부 자막을 읽지 못한 안내도 보여 주고, 잠금 중이면 해제 뒤에 보여 준다.
    val subtitleDialogVisible = (subtitleMenu || playback.subtitles.notice != null) && !screenLocked
    var controlsVisible by remember { mutableStateOf(true) }
    var interactionVersion by remember { mutableIntStateOf(0) }
    var seeking by remember { mutableStateOf(false) }
    var resumePosition by remember { mutableStateOf<Long?>(null) }
    var showLoading by remember { mutableStateOf(false) }
    var loadingShownAt by remember { mutableLongStateOf(0) }
    val touchControls = {
        controlsVisible = true
        interactionVersion++
    }
    LaunchedEffect(state.loading) {
        if (!state.loading && state.error == null && state.positionMs > 0) resumePosition = state.positionMs
        if (state.loading) {
            delay(300)
            loadingShownAt = android.os.SystemClock.uptimeMillis()
            showLoading = true
        } else if (showLoading) {
            delay((400 - (android.os.SystemClock.uptimeMillis() - loadingShownAt)).coerceAtLeast(0))
            showLoading = false
        }
    }
    LaunchedEffect(resumePosition, state.seekable, touchExploration) {
        if (resumePosition != null && state.seekable && !touchExploration) {
            delay(4_000)
            resumePosition = null
        }
    }
    LaunchedEffect(state.playing, controlsVisible, interactionVersion, seeking, touchExploration) {
        if (!state.playing || seeking || touchExploration) {
            controlsVisible = true
        } else if (controlsVisible) {
            delay(2_000)
            controlsVisible = false
        }
    }

    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    Box(modifier.fillMaxSize().background(Color.Black)) {
        Box(Modifier.fillMaxSize()) {
            // 조작 표시와 회전으로 AndroidView를 교체하지 않는다.
            AndroidView(
                factory = { viewContext -> VLCVideoLayout(viewContext).also(playback::attach) },
                modifier = Modifier.fillMaxSize(),
                update = { view ->
                    view.keepScreenOn = state.playing
                    view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
                },
            )
            if (subtitleDialogVisible) {
                SubtitleDialog(playback.subtitles) {
                    subtitleMenu = false
                    playback.subtitles.dismissNotice()
                }
            }
            if (!screenLocked) {
                val showPause = selection.wantsToPlay && state.error == null
                val playLabel = stringResource(if (showPause) R.string.pause else R.string.play)
                Box(Modifier.matchParentSize().clickable(
                    role = Role.Button,
                    enabled = !state.loading && !seeking,
                    onClickLabel = playLabel,
                    onClick = {
                        touchControls()
                        playback.togglePlayback()
                    },
                ).semantics { contentDescription = playLabel })
                androidx.compose.animation.AnimatedVisibility(
                    visible = controlsVisible,
                    modifier = Modifier.matchParentSize(),
                    enter = fadeIn(tween(200, easing = VideoEasing)),
                    exit = fadeOut(tween(200, easing = VideoEasing)),
                ) {
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(
                        Color.Black.copy(alpha = 0.65f), Color.Transparent, Color.Black.copy(alpha = 0.85f))))) {
                        Row(Modifier.align(Alignment.TopStart).fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            VideoIconButton(model::closeVideo, Modifier.size(48.dp)) {
                                Icon(painterResource(R.drawable.ic_back), stringResource(R.string.back_to_list))
                            }
                            Column(Modifier.weight(1f).padding(horizontal = 8.dp)) {
                                Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.titleLarge)
                                Text(stringResource(R.string.local_video), style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            TextButton(onClick = {
                                touchControls()
                                playback.subtitles.refresh()
                                subtitleMenu = true
                            }, enabled = !state.loading && !seeking) { Text(stringResource(R.string.subtitles)) }
                            VideoIconButton(onClick = {
                                screenLocked = true
                                resumePosition = null
                                revealUnlock()
                            }, modifier = Modifier.size(48.dp), enabled = !seeking) {
                                Icon(painterResource(R.drawable.ic_lock), stringResource(R.string.lock_screen))
                            }
                            VideoIconButton(openFile, Modifier.size(48.dp)) {
                                Icon(painterResource(R.drawable.ic_folder), stringResource(R.string.open_video))
                            }
                        }
                        Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                            .padding(horizontal = if (landscape) 24.dp else 16.dp, vertical = 16.dp)) {
                            SeekBar(
                                positionMs = state.positionMs,
                                durationMs = state.durationMs,
                                enabled = state.seekable && state.durationMs > 0 && state.error == null,
                                onSeek = {
                                    seeking = true
                                    resumePosition = null
                                    touchControls()
                                    playback.previewSeek(it)
                                },
                                onSeekFinished = {
                                    playback.finishSeek()
                                    seeking = false
                                    touchControls()
                                },
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(40.dp, Alignment.CenterHorizontally)) {
                                // 탐색 중 엔진이 잠깐 멈춰도 사용자가 정한 재생 의도의 아이콘을 유지한다.
                                SkipButton(R.string.skip_back, R.drawable.ic_skip_back,
                                    state.seekable && !seeking && state.error == null) {
                                    touchControls()
                                    resumePosition = null
                                    playback.previewSeek(state.positionMs - 10_000)
                                    playback.finishSeek()
                                }
                                VideoIconButton(
                                    onClick = { touchControls(); playback.togglePlayback() },
                                    enabled = !state.loading && !seeking,
                                    modifier = Modifier.size(56.dp)
                                        .semantics { contentDescription = playLabel },
                                ) {
                                    AnimatedContent(showPause, transitionSpec = {
                                        (fadeIn(tween(200, easing = VideoEasing)) +
                                            scaleIn(tween(200, easing = VideoEasing), initialScale = 0.5f)) togetherWith
                                            (fadeOut(tween(200, easing = VideoEasing)) +
                                                scaleOut(tween(200, easing = VideoEasing), targetScale = 0.5f))
                                    }, label = "playIcon") { pausedIcon ->
                                        Icon(painterResource(if (pausedIcon) R.drawable.ic_pause else R.drawable.ic_play),
                                            null, Modifier.size(32.dp))
                                    }
                                }
                                SkipButton(R.string.skip_forward, R.drawable.ic_skip_forward,
                                    state.seekable && !seeking && state.error == null) {
                                    touchControls()
                                    resumePosition = null
                                    playback.previewSeek(state.positionMs + 10_000)
                                    playback.finishSeek()
                                }
                            }

                        }
                    }
                }
                androidx.compose.animation.AnimatedVisibility(
                    visible = resumePosition != null && state.seekable,
                    modifier = Modifier.align(Alignment.TopCenter).padding(start = 24.dp, end = 24.dp, top = 84.dp),
                    enter = fadeIn(tween(200, easing = VideoEasing)),
                    exit = fadeOut(tween(200, easing = VideoEasing)),
                ) {
                    // 퇴장 중에도 마지막 문구를 유지한다.
                    val announcedPosition = remember { resumePosition ?: 0 }
                    Surface(color = MaterialTheme.colorScheme.surface, shape = MaterialTheme.shapes.small) {
                        Row(Modifier.padding(start = 12.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(stringResource(R.string.resuming_from, formatTime(announcedPosition)),
                                modifier = Modifier.weight(1f).semantics { liveRegion = LiveRegionMode.Polite },
                                style = MaterialTheme.typography.bodySmall)
                            TextButton(onClick = {
                                playback.previewSeek(0)
                                playback.finishSeek()
                                resumePosition = null
                                touchControls()
                            }) { Text(stringResource(R.string.start_over)) }
                        }
                    }
                }
            }
            ExternalSubtitle(playback, controlsVisible && !screenLocked, Modifier.align(Alignment.BottomCenter))
            if (state.error == R.string.audio_focus_failed) {
                Text(stringResource(R.string.audio_focus_failed), color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.Center).padding(24.dp)
                        .semantics { liveRegion = LiveRegionMode.Polite })
            }
            if (showLoading) {
                Text(stringResource(R.string.loading), style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.align(Alignment.Center).padding(24.dp)
                        .semantics { liveRegion = LiveRegionMode.Polite })
            }
            if (screenLocked) {
                val revealLabel = stringResource(R.string.show_unlock)
                Box(Modifier.matchParentSize().clickable(
                    role = Role.Button,
                    onClickLabel = revealLabel,
                    onClick = revealUnlock,
                ).semantics { contentDescription = revealLabel })
                if (unlockVisible || touchExploration) {
                    Surface(
                        modifier = Modifier.align(Alignment.TopEnd).padding(16.dp),
                        color = Color.Black.copy(alpha = 0.75f),
                        shape = MaterialTheme.shapes.small,
                    ) {
                        TextButton(onClick = {
                            screenLocked = false
                            touchControls()
                        }) {
                            Icon(painterResource(R.drawable.ic_lock), null, Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(stringResource(R.string.unlock_screen))
                        }
                    }
                }
            }

        }
    }
}

@Composable
private fun SkipButton(label: Int, icon: Int, enabled: Boolean, onClick: () -> Unit) {
    val description = stringResource(label)
    VideoIconButton(onClick, enabled = enabled,
        modifier = Modifier.size(48.dp)
            .semantics { contentDescription = description }) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(painterResource(icon), null, Modifier.size(20.dp))
            Text(stringResource(R.string.skip_seconds), style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.clearAndSetSemantics {})
        }
    }
}

@Composable
private fun PlaybackFailure(
    title: String,
    error: Int,
    address: String,
    openFile: () -> Unit,
    closeVideo: () -> Unit,
    modifier: Modifier,
) {
    Column(modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        Text(stringResource(error), modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        if (error == R.string.file_unavailable) {
            // 시스템 문서 주소는 실제 파일 경로와 다르므로 경로로 단정하지 않는다.
            Text(stringResource(R.string.file_address), style = MaterialTheme.typography.titleMedium)
            SelectionContainer {
                Text(address, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall)
            }
        }
        VideoButton(stringResource(R.string.choose_again), openFile)
        VideoButton(stringResource(R.string.back_to_list), closeVideo, secondary = true)
    }
}

@Composable
private fun rememberTouchExploration(): Boolean {
    val context = LocalContext.current
    val manager = remember(context) { context.getSystemService(AccessibilityManager::class.java) }
    var enabled by remember(manager) { mutableStateOf(manager.isTouchExplorationEnabled) }
    DisposableEffect(manager) {
        val listener = AccessibilityManager.TouchExplorationStateChangeListener { enabled = it }
        manager.addTouchExplorationStateChangeListener(listener)
        onDispose { manager.removeTouchExplorationStateChangeListener(listener) }
    }
    return enabled
}
