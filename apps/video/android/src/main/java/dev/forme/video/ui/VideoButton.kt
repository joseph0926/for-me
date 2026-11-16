package dev.forme.video.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.material3.Button
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp

@Composable
internal fun VideoButton(label: String, onClick: () -> Unit, secondary: Boolean = false) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.95f else 1f,
        tween(120, easing = VideoEasing), label = "buttonPress")
    val modifier = Modifier.defaultMinSize(minHeight = 44.dp)
        .graphicsLayer { scaleX = scale; scaleY = scale }
    if (secondary) {
        OutlinedButton(onClick, modifier, interactionSource = interaction,
            contentPadding = PaddingValues(horizontal = 18.dp, vertical = 11.dp)) { Text(label) }
    } else {
        Button(onClick, modifier, interactionSource = interaction,
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
