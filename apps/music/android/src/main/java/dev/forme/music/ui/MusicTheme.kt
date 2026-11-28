package dev.forme.music.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import java.util.Locale

/**
 * 화면 레퍼런스 "속지"의 정체성(apps/today-ref/works/2026-11-28-music): 무채색 바탕, 강조색 하나, 모서리 4px.
 * 면을 채운 칸이나 떠 있는 카드로 묶지 않는다. 레퍼런스의 Wanted Sans 서체는 아직 넣지 않았다.
 */
object MusicColors {
    val Background = Color(0xFFF4F4F5)
    val Text = Color(0xFF18181B)
    val SubText = Color(0xFF71717A)
    val Faint = Color(0xFFD4D4D8)
    val Accent = Color(0xFFD93A1C)
}

@Composable
fun MusicTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = MusicColors.Accent,
            onPrimary = Color.White,
            secondary = MusicColors.Text,
            background = MusicColors.Background,
            onBackground = MusicColors.Text,
            surface = MusicColors.Background,
            onSurface = MusicColors.Text,
            surfaceVariant = MusicColors.Background,
            onSurfaceVariant = MusicColors.SubText,
            surfaceContainer = MusicColors.Background,
            surfaceContainerHigh = Color.White,
            surfaceContainerHighest = Color.White,
            outline = MusicColors.Faint,
        ),
        shapes = Shapes(
            extraSmall = RoundedCornerShape(4.dp),
            small = RoundedCornerShape(4.dp),
            medium = RoundedCornerShape(4.dp),
            large = RoundedCornerShape(4.dp),
            extraLarge = RoundedCornerShape(4.dp),
        ),
        content = content,
    )
}

/** 1시간 미만은 분:초, 그 이상은 시:분:초. */
fun formatTime(ms: Long): String {
    val totalSeconds = (ms.coerceAtLeast(0) / 1000)
    val hours = totalSeconds / 3600
    val minutes = totalSeconds % 3600 / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format(Locale.ROOT, "%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format(Locale.ROOT, "%d:%02d", minutes, seconds)
    }
}
