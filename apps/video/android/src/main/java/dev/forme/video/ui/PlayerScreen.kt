package dev.forme.video.ui

import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.compose.runtime.saveable.rememberSaveable
import android.view.View
import android.view.accessibility.AccessibilityManager
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
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
import dev.forme.video.player.PLAYBACK_RATES
import dev.forme.video.player.VideoScale
import dev.forme.video.player.VlcPlayback
import dev.forme.video.player.formatPlaybackRate
import dev.forme.video.player.stepPlaybackRate
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs
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
            wantsToPlay = { selection.wantsToPlay }, changePlayIntent = { selection.wantsToPlay = it },
            rate = model.playbackRate, videoScale = model.videoScale)
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
    // 사용자가 회전 버튼으로 고른 방향. 고르기 전에는 영상 비율에 맞춘다. 목록으로 돌아갈 때 되돌리는 일은 VideoApp이 맡는다.
    var orientationChoice by rememberSaveable(selection.sequence) { mutableStateOf<ScreenOrientation?>(null) }
    val requestedOrientation = orientationChoice ?: orientationFor(state.videoAspect)
    val activity = LocalActivity.current
    LaunchedEffect(activity, requestedOrientation) {
        if (activity != null && requestedOrientation != null) activity.requestedOrientation = requestedOrientation.activityValue
    }
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
    val tapScope = rememberCoroutineScope()
    val pendingTap = remember { PendingTap() }
    var seekFlash by remember { mutableStateOf<SeekFlash?>(null) }
    LaunchedEffect(seekFlash) {
        if (seekFlash != null) {
            delay(SEEK_FLASH_MS)
            seekFlash = null
        }
    }
    var interactionVersion by remember { mutableIntStateOf(0) }
    var seeking by remember { mutableStateOf(false) }
    var dragSeek by remember { mutableStateOf<DragSeek?>(null) }
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
    LaunchedEffect(state.playing, interactionVersion, seeking, touchExploration) {
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
                val centerIcon = when {
                    showPause -> R.drawable.ic_pause
                    state.ended -> R.drawable.ic_replay
                    else -> R.drawable.ic_play
                }
                val playLabel = stringResource(when (centerIcon) {
                    R.drawable.ic_pause -> R.string.pause
                    R.drawable.ic_replay -> R.string.replay
                    else -> R.string.play
                })
                val tapsEnabled = !state.loading && !seeking
                // 채우기와 늘이기는 영상이 화면 전체를 덮으므로 터치 자리와 이동 표시도 화면 전체를 기준으로 한다.
                val displayedAspect = state.videoAspect.takeIf { model.videoScale == VideoScale.Fit }
                // 영상을 누르면 조작만 보이거나 숨긴다. 재생과 일시정지는 가운데 버튼으로만 바꾼다.
                val toggleControlsByTap = {
                    if (controlsVisible && !touchExploration) controlsVisible = false else touchControls()
                }
                val seekByTap = { zone: TapZone ->
                    val current = playback.state
                    if (current.seekable && current.error == null) {
                        // 이동한 위치를 볼 수 있게 아래 시간과 재생바를 띄운다. 나머지 조작은 표시가 끝난 뒤 돌아온다.
                        touchControls()
                        resumePosition = null
                        val direction = if (zone == TapZone.Left) -1 else 1
                        playback.previewSeek(current.positionMs + direction * SEEK_STEP_SECONDS * 1_000L)
                        playback.finishSeek()
                        seekFlash = nextSeekFlash(seekFlash, zone)
                    }
                }
                val handleTap by rememberUpdatedState { zone: TapZone ->
                    val pendingZone = pendingTap.zone
                    pendingTap.cancel()
                    when (val decision = decideTap(zone, seekFlash?.zone, pendingZone)) {
                        TapDecision.Seek -> seekByTap(zone)
                        is TapDecision.Single -> if (decision.delayMs == 0L) toggleControlsByTap() else {
                            pendingTap.zone = zone
                            pendingTap.job = tapScope.launch {
                                delay(decision.delayMs)
                                pendingTap.zone = null
                                pendingTap.job = null
                                // 기다리는 사이 화면을 잠그거나 재생바를 잡았으면 한 번 누르기를 버린다.
                                if (!screenLocked && !seeking) toggleControlsByTap()
                            }
                        }
                    }
                }
                // 화면 읽기 기능은 두 번 누르기를 선택으로 쓰고 조작을 늘 보여 주므로 아래 onClick으로 재생만 바꾼다.
                Box(Modifier.matchParentSize()
                    .pointerInput(tapsEnabled, displayedAspect) {
                        if (tapsEnabled) detectTapGestures { offset ->
                            val video = fittedVideoSize(size.width.toFloat(), size.height.toFloat(), displayedAspect)
                            val left = (size.width - video.width) / 2
                            handleTap(tapZone(offset.x - left, video.width))
                        }
                    }
                    // 탐색 상태가 바뀌어도 끄는 도중의 제스처가 끊기지 않게 재생기 하나에만 묶는다.
                    .pointerInput(playback) {
                        var active = false
                        var startMs = 0L
                        var distancePx = 0f
                        val finish = {
                            if (active) {
                                active = false
                                playback.finishSeek()
                                seeking = false
                                dragSeek = null
                                touchControls()
                            }
                        }
                        detectHorizontalDragGestures(
                            onDragStart = {
                                val current = playback.state
                                active = !seeking && !current.loading && current.seekable &&
                                    current.durationMs > 0 && current.error == null
                                if (active) {
                                    pendingTap.cancel()
                                    startMs = current.positionMs
                                    distancePx = 0f
                                    seeking = true
                                    resumePosition = null
                                    dragSeek = DragSeek(startMs, startMs)
                                    touchControls()
                                }
                            },
                            onDragEnd = finish,
                            onDragCancel = finish,
                        ) { change, amount ->
                            if (active) {
                                change.consume()
                                distancePx += amount
                                val target = dragSeekTarget(startMs, distancePx, size.width.toFloat(), playback.state.durationMs)
                                dragSeek = DragSeek(startMs, target)
                                playback.previewSeek(target)
                            }
                        }
                    }
                    .semantics {
                        role = Role.Button
                        contentDescription = playLabel
                        if (tapsEnabled) onClick(label = playLabel) {
                            touchControls()
                            playback.togglePlayback()
                            true
                        } else disabled()
                    })
                SeekFlashIndicator(seekFlash, displayedAspect, Modifier.matchParentSize())
                dragSeek?.let { DragSeekLabel(it, Modifier.align(Alignment.Center)) }
                androidx.compose.animation.AnimatedVisibility(
                    visible = controlsVisible,
                    modifier = Modifier.matchParentSize(),
                    enter = fadeIn(tween(200, easing = VideoEasing)),
                    exit = fadeOut(tween(200, easing = VideoEasing)),
                ) {
                    // 재생바를 끌거나 두 번 눌러 이동하는 동안에는 덮개를 옅게 하고 재생바와 시간만 남긴다.
                    val chromeHidden = seeking || seekFlash != null
                    val scrimAlpha by animateFloatAsState(if (chromeHidden) 0.2f else 0.5f,
                        tween(200, easing = VideoEasing), label = "scrim")
                    Box(Modifier.fillMaxSize()
                        .background(Color.Black.copy(alpha = scrimAlpha))
                        .background(Brush.verticalGradient(listOf(
                            Color.Black.copy(alpha = 0.4f), Color.Transparent, Color.Transparent,
                            Color.Black.copy(alpha = 0.5f))))) {
                        FadeInChrome(chromeHidden, Modifier.align(Alignment.TopStart).safeDrawingPadding()) {
                            Row(Modifier.fillMaxWidth().padding(12.dp),
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
                                    touchControls()
                                    orientationChoice = if (landscape) ScreenOrientation.Portrait else ScreenOrientation.Landscape
                                }, modifier = Modifier.size(48.dp), enabled = !seeking) {
                                    Icon(painterResource(R.drawable.ic_rotate),
                                        stringResource(if (landscape) R.string.rotate_portrait else R.string.rotate_landscape))
                                }
                                VideoIconButton(onClick = {
                                    screenLocked = true
                                    resumePosition = null
                                    revealUnlock()
                                }, modifier = Modifier.size(48.dp), enabled = !seeking) {
                                    Icon(painterResource(R.drawable.ic_lock), stringResource(R.string.lock_screen))
                                }
                                VideoIconButton(openFile, Modifier.size(48.dp), enabled = !seeking) {
                                    Icon(painterResource(R.drawable.ic_folder), stringResource(R.string.open_video))
                                }
                            }
                        }
                        FadeInChrome(chromeHidden, Modifier.align(Alignment.Center)) {
                            Row(verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(28.dp)) {
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
                                    modifier = Modifier.size(64.dp)
                                        .semantics { contentDescription = playLabel },
                                ) {
                                    Box(Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.18f), CircleShape),
                                        contentAlignment = Alignment.Center) {
                                        AnimatedContent(centerIcon, transitionSpec = {
                                            (fadeIn(tween(200, easing = VideoEasing)) +
                                                scaleIn(tween(200, easing = VideoEasing), initialScale = 0.5f)) togetherWith
                                                (fadeOut(tween(200, easing = VideoEasing)) +
                                                    scaleOut(tween(200, easing = VideoEasing), targetScale = 0.5f))
                                        }, label = "playIcon") { icon ->
                                            Icon(painterResource(icon), null, Modifier.size(30.dp))
                                        }
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
                        // 끝까지 본 영상이 폴더 목록에서 연 것이면 같은 폴더의 다음 영상을 다시 보기 아래에 둔다.
                        val nextVideo = selection.queue?.next
                        if (state.ended && nextVideo != null) {
                            FadeInChrome(chromeHidden, Modifier.align(Alignment.Center).offset(y = 76.dp)) {
                                Button(
                                    onClick = model::playNext,
                                    modifier = Modifier.widthIn(max = 360.dp).padding(horizontal = 24.dp)
                                        .defaultMinSize(minHeight = 44.dp),
                                    shape = MaterialTheme.shapes.small,
                                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 11.dp),
                                ) {
                                    Text(stringResource(R.string.next_video, nextVideo.title),
                                        maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                        FadeInChrome(chromeHidden, Modifier.align(Alignment.CenterStart).safeDrawingPadding()) {
                            VideoScaleButton(
                                scale = model.videoScale,
                                enabled = !seeking && state.error == null,
                                change = {
                                    touchControls()
                                    val next = model.videoScale.next
                                    model.changeVideoScale(next)
                                    playback.setVideoScale(next)
                                },
                                modifier = Modifier.padding(start = 4.dp),
                            )
                        }
                        FadeInChrome(chromeHidden, Modifier.align(Alignment.CenterEnd).safeDrawingPadding()) {
                            SpeedControls(
                                rate = model.playbackRate,
                                enabled = !seeking && state.error == null,
                                changeRate = {
                                    touchControls()
                                    model.playbackRate = it
                                    playback.setRate(it)
                                },
                                modifier = Modifier.padding(end = 4.dp),
                            )
                        }
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
                            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().safeDrawingPadding()
                                .padding(horizontal = if (landscape) 24.dp else 16.dp, vertical = 16.dp),
                        )
                    }
                }
                androidx.compose.animation.AnimatedVisibility(
                    visible = resumePosition != null && state.seekable,
                    modifier = Modifier.align(Alignment.TopCenter).safeDrawingPadding().padding(start = 24.dp, end = 24.dp, top = 84.dp),
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
            ExternalSubtitle(playback, controlsVisible && !screenLocked, Modifier.align(Alignment.BottomCenter).safeDrawingPadding())
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
                        modifier = Modifier.align(Alignment.TopEnd).safeDrawingPadding().padding(16.dp),
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

/**
 * 숨길 때는 같은 구성에서 바로 빼고, 다시 보일 때만 서서히 나타낸다.
 * 사라지는 동안 남아 있는 버튼이 이어서 누르는 양옆 누르기를 가로채지 않게 하려는 것이다.
 */
@Composable
private fun FadeInChrome(hidden: Boolean, modifier: Modifier, content: @Composable () -> Unit) {
    if (hidden) return
    val appear = remember { MutableTransitionState(false).apply { targetState = true } }
    androidx.compose.animation.AnimatedVisibility(appear, modifier, enter = fadeIn(tween(200, easing = VideoEasing))) {
        content()
    }
}

/** 양옆 첫 누르기가 두 번째 누르기를 기다리는 동안의 자리와 지연 작업. 화면에 그리지 않는다. */
private class PendingTap {
    var zone: TapZone? = null
    var job: Job? = null

    fun cancel() {
        job?.cancel()
        job = null
        zone = null
    }
}

/** 좌우로 끄는 동안 화면 가운데에 옮겨 갈 시각과 이동량을 보여 준다. 시각은 아래 재생바도 함께 알린다. */
@Composable
private fun DragSeekLabel(drag: DragSeek, modifier: Modifier) {
    val deltaMs = drag.targetMs - drag.startMs
    val sign = if (deltaMs < 0) "-" else "+"
    Column(modifier.clearAndSetSemantics {}
        .background(Color.Black.copy(alpha = 0.6f), MaterialTheme.shapes.small)
        .padding(horizontal = 18.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        Text(formatTime(drag.targetMs), style = MaterialTheme.typography.titleLarge.copy(fontFeatureSettings = "tnum"))
        Text(sign + formatTime(abs(deltaMs)), color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = "tnum"))
    }
}

/** 두 번 눌러 이동한 쪽 가장자리에 반원 모양 밝은 영역과 이동한 초를 잠깐 보여 준다. */
@Composable
private fun SeekFlashIndicator(flash: SeekFlash?, videoAspect: Float?, modifier: Modifier) {
    BoxWithConstraints(modifier.clearAndSetSemantics {}) {
        // VLC는 영상을 비율을 지켜 화면 가운데에 맞추므로 표시도 그 영상 자리 안에만 그린다.
        val video = fittedVideoSize(maxWidth.value, maxHeight.value, videoAspect)
        AnimatedContent(
            targetState = flash,
            modifier = Modifier.align(Alignment.Center).size(video.width.dp, video.height.dp),
            contentKey = { it?.zone },
            transitionSpec = { fadeIn(tween(150, easing = VideoEasing)) togetherWith fadeOut(tween(150, easing = VideoEasing)) },
            label = "seekFlash",
        ) { shown ->
            Box(Modifier.fillMaxSize()) {
                if (shown != null) {
                    val left = shown.zone == TapZone.Left
                    Column(
                        Modifier.align(if (left) Alignment.CenterStart else Alignment.CenterEnd)
                            .fillMaxHeight().fillMaxWidth(0.4f)
                            .clip(EdgeArcShape(left))
                            .background(Color.White.copy(alpha = 0.14f)),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
                    ) {
                        Icon(painterResource(if (left) R.drawable.ic_skip_back else R.drawable.ic_skip_forward), null,
                            Modifier.size(26.dp))
                        Text(stringResource(R.string.seek_flash_seconds, shown.totalSeconds),
                            style = MaterialTheme.typography.labelLarge.copy(fontFeatureSettings = "tnum"))
                    }
                }
            }
        }
    }
}

/** 화면 가장자리에 붙은 쪽은 곧고 안쪽은 타원으로 휘는 모양. */
private class EdgeArcShape(private val left: Boolean) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val oval = if (left) Rect(-size.width, 0f, size.width, size.height) else Rect(0f, 0f, size.width * 2, size.height)
        val bounds = Path().apply { addRect(Rect(0f, 0f, size.width, size.height)) }
        return Outline.Generic(Path.combine(PathOperation.Intersect, Path().apply { addOval(oval) }, bounds))
    }
}

/** 왼쪽 가장자리의 화면 모드. 누를 때마다 맞춤, 채우기, 늘이기 순서로 바뀐다. */
@Composable
private fun VideoScaleButton(scale: VideoScale, enabled: Boolean, change: () -> Unit, modifier: Modifier) {
    val label = stringResource(scale.label)
    val changeLabel = stringResource(R.string.video_scale_change, label, stringResource(scale.next.label))
    Box(modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)
        .clickable(enabled = enabled, role = Role.Button, onClickLabel = changeLabel, onClick = change)
        .clearAndSetSemantics { contentDescription = changeLabel },
        contentAlignment = Alignment.Center) {
        Text(label, color = Color.White, style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.background(Color.Black.copy(alpha = 0.4f), CircleShape)
                .padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

/** 오른쪽 가장자리에 빠르게, 현재 속도(누르면 1배), 느리게를 세로로 둔다. */
@Composable
private fun SpeedControls(rate: Float, enabled: Boolean, changeRate: (Float) -> Unit, modifier: Modifier) {
    val rateText = formatPlaybackRate(rate)
    val resetLabel = stringResource(R.string.speed_reset, rateText)
    val changed = rate != 1f
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        SpeedStepButton(R.drawable.ic_add, R.string.speed_faster, enabled && rate < PLAYBACK_RATES.last()) {
            changeRate(stepPlaybackRate(rate, 1))
        }
        Box(Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)
            .clickable(enabled = enabled, role = Role.Button, onClickLabel = resetLabel) { changeRate(1f) }
            .clearAndSetSemantics { contentDescription = resetLabel },
            contentAlignment = Alignment.Center) {
            Text(stringResource(R.string.speed_value, rateText),
                color = if (changed) MaterialTheme.colorScheme.onPrimary else Color.White,
                style = MaterialTheme.typography.labelMedium.copy(fontFeatureSettings = "tnum"),
                modifier = Modifier
                    .background(if (changed) MaterialTheme.colorScheme.primary else Color.Black.copy(alpha = 0.4f),
                        CircleShape)
                    .padding(horizontal = 8.dp, vertical = 3.dp))
        }
        SpeedStepButton(R.drawable.ic_remove, R.string.speed_slower, enabled && rate > PLAYBACK_RATES.first()) {
            changeRate(stepPlaybackRate(rate, -1))
        }
    }
}

@Composable
private fun SpeedStepButton(icon: Int, label: Int, enabled: Boolean, onClick: () -> Unit) {
    VideoIconButton(onClick, Modifier.size(48.dp), enabled = enabled) {
        Box(Modifier.size(36.dp).background(Color.Black.copy(alpha = 0.4f), CircleShape),
            contentAlignment = Alignment.Center) {
            Icon(painterResource(icon), stringResource(label), Modifier.size(20.dp))
        }
    }
}

@Composable
private fun SkipButton(label: Int, icon: Int, enabled: Boolean, onClick: () -> Unit) {
    val description = stringResource(label)
    VideoIconButton(onClick, enabled = enabled,
        modifier = Modifier.size(48.dp)
            .semantics { contentDescription = description }) {
        Column(Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.12f), CircleShape),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
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
