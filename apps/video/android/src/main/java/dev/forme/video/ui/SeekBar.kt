package dev.forme.video.ui

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import dev.forme.video.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun SeekBar(
    positionMs: Long,
    durationMs: Long,
    enabled: Boolean,
    onSeek: (Long) -> Unit,
    onSeekFinished: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var dragging by remember { mutableStateOf<Float?>(null) }
    val maximum = durationMs.toFloat().coerceAtLeast(1f)
    val shownPosition = (dragging ?: positionMs.toFloat()).coerceIn(0f, maximum)
    val fraction = shownPosition / maximum
    val thickness by animateDpAsState(if (dragging != null) 6.dp else 3.dp,
        tween(120, easing = VideoEasing), label = "seekTrack")
    val thumbSize by animateDpAsState(if (dragging != null) 18.dp else 12.dp,
        tween(120, easing = VideoEasing), label = "seekThumb")
    val colors = MaterialTheme.colorScheme
    val seekLabel = stringResource(R.string.seek)
    val currentTime = formatTime(shownPosition.toLong())
    val totalTime = formatTime(durationMs)
    val timeStyle = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = "tnum")
    val textMeasurer = rememberTextMeasurer()
    val timeWidthPx = maxOf(
        textMeasurer.measure(currentTime, timeStyle).size.width,
        textMeasurer.measure(totalTime, timeStyle).size.width,
    )
    val timeWidth = with(LocalDensity.current) { timeWidthPx.toDp() }
    val timeText = "$currentTime / $totalTime"

    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(currentTime, style = timeStyle, textAlign = TextAlign.Start,
            modifier = Modifier.width(timeWidth).clearAndSetSemantics {})
        BoxWithConstraints(Modifier.weight(1f)) {
            Slider(
                value = shownPosition,
                onValueChange = { dragging = it; onSeek(it.toLong()) },
                onValueChangeFinished = { onSeekFinished(); dragging = null },
                valueRange = 0f..maximum,
                enabled = enabled,
                modifier = Modifier.fillMaxWidth().semantics {
                    contentDescription = seekLabel
                    stateDescription = timeText
                },
                thumb = {
                    Box(Modifier.size(thumbSize).background(
                        colors.primary.copy(alpha = if (enabled) 1f else 0.4f), CircleShape))
                },
                track = { slider ->
                    Canvas(Modifier.fillMaxWidth().height(thickness)) {
                        val share = (slider.value / maximum).coerceIn(0f, 1f)
                        val start = if (layoutDirection == LayoutDirection.Rtl) size.width else 0f
                        val end = if (layoutDirection == LayoutDirection.Rtl) 0f else size.width
                        val centerY = size.height / 2
                        drawLine(colors.outline.copy(alpha = if (enabled) 1f else 0.4f),
                            Offset(start, centerY), Offset(end, centerY), size.height, StrokeCap.Round)
                        if (share > 0f) drawLine(colors.primary.copy(alpha = if (enabled) 1f else 0.4f),
                            Offset(start, centerY), Offset(start + (end - start) * share, centerY),
                            size.height, StrokeCap.Round)
                    }
                },
            )
            if (dragging != null) {
                // 말풍선은 손잡이를 따라가되 양 끝에서 화면 밖으로 나가지 않는다.
                val bubbleWidth = 88.dp.coerceAtMost(maxWidth)
                val thumbCenter = thumbSize / 2 + (maxWidth - thumbSize) * fraction
                val bubbleOffset = (thumbCenter - bubbleWidth / 2).coerceIn(0.dp, maxWidth - bubbleWidth)
                Box(Modifier.offset(x = bubbleOffset, y = (-28).dp).width(bubbleWidth)
                    .background(colors.primary, RoundedCornerShape(4.dp)).padding(vertical = 2.dp)
                    .clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
                    Text(formatTime(shownPosition.toLong()), color = colors.onPrimary,
                        style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        Text(totalTime, style = timeStyle, textAlign = TextAlign.End,
            modifier = Modifier.width(timeWidth).clearAndSetSemantics {})
    }
}
