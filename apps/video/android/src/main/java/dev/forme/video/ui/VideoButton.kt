package dev.forme.video.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.material3.Button
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp

/** [progress]는 본 비율(0~1)이며, 주 버튼의 바탕을 그만큼 어둡게 칠해 이어볼 위치를 보여 준다. */
@Composable
internal fun VideoButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, secondary: Boolean = false,
    progress: Float = 0f) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.95f else 1f,
        tween(120, easing = VideoEasing), label = "buttonPress")
    val shape = MaterialTheme.shapes.small
    val watchedColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.2f)
    val watched = progress.coerceIn(0f, 1f)
    val buttonModifier = modifier.defaultMinSize(minHeight = 44.dp)
        .graphicsLayer { scaleX = scale; scaleY = scale }
        .clip(shape)
        .drawWithContent {
            drawContent()
            if (watched > 0f && !secondary) {
                val width = size.width * watched
                val left = if (layoutDirection == LayoutDirection.Rtl) size.width - width else 0f
                drawRect(watchedColor, Offset(left, 0f), Size(width, size.height))
            }
        }
    if (secondary) {
        OutlinedButton(onClick, buttonModifier, shape = shape, interactionSource = interaction,
            contentPadding = PaddingValues(horizontal = 18.dp, vertical = 11.dp)) { Text(label) }
    } else {
        Button(onClick, buttonModifier, shape = shape, interactionSource = interaction,
            contentPadding = PaddingValues(horizontal = 18.dp, vertical = 11.dp)) { Text(label) }
    }
}

@Composable
internal fun VideoIconButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.95f else 1f,
        tween(120, easing = VideoEasing), label = "iconPress")
    IconButton(onClick, modifier.graphicsLayer { scaleX = scale; scaleY = scale },
        enabled = enabled, interactionSource = interaction, content = content)
}
