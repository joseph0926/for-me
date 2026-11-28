package dev.forme.gallery.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * 화면 레퍼런스 "낱장"(apps/today-ref/works/2026-11-28-gallery-app/src/styles.css)의 밝은 화면 값.
 * 무채색 바탕, 코발트 파랑 하나, 모서리 6px. 어두운 화면과 SUIT 서체는 아직 넣지 않았다.
 */
object GalleryColors {
    val Surface = Color(0xFFF5F5F4)
    val Raised = Color(0xFFFFFFFF)
    val Sunken = Color(0xFFE8E8E6)
    val Ink = Color(0xFF121212)
    val Muted = Color(0xFF5D5D5A)
    val Faint = Color(0xFF8A8A86)
    val Accent = Color(0xFF2F5BD8)
    val AccentInk = Color(0xFFFFFFFF)
}

val WorkShape = RoundedCornerShape(6.dp)

@Composable
fun GalleryTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = GalleryColors.Accent,
            onPrimary = GalleryColors.AccentInk,
            background = GalleryColors.Surface,
            onBackground = GalleryColors.Ink,
            surface = GalleryColors.Surface,
            onSurface = GalleryColors.Ink,
            onSurfaceVariant = GalleryColors.Muted,
            surfaceContainer = GalleryColors.Raised,
        ),
        shapes = Shapes(
            extraSmall = WorkShape,
            small = WorkShape,
            medium = WorkShape,
            large = WorkShape,
            extraLarge = WorkShape,
        ),
        content = content,
    )
}
