package dev.forme.video.ui

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.forme.video.R

internal val VideoEasing = CubicBezierEasing(0.215f, 0.61f, 0.355f, 1f)

@OptIn(ExperimentalTextApi::class)
private val Pretendard = FontFamily(
    listOf(400, 600, 650).map { weight ->
        Font(R.font.pretendard_variable, weight = FontWeight(weight),
            variationSettings = FontVariation.Settings(FontVariation.weight(weight)))
    },
)

private val Body = TextStyle(
    fontFamily = Pretendard,
    fontWeight = FontWeight.Normal,
    fontSize = 15.sp,
    lineHeight = 23.25.sp,
    letterSpacing = 0.sp,
)

@Composable
fun VideoTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFFECEEF2),
            onPrimary = Color(0xFF0B1016),
            background = Color(0xFF0B1016),
            onBackground = Color(0xFFECEEF2),
            surface = Color(0xFF0B1016),
            onSurface = Color(0xFFECEEF2),
            surfaceVariant = Color(0xFF202A35),
            onSurfaceVariant = Color(0xFFAEB5C0),
            outline = Color(0xFF858D9A),
            error = Color(0xFFFFB4AB),
        ),
        typography = Typography(
            headlineLarge = Body.copy(fontSize = 30.sp, lineHeight = 38.sp, fontWeight = FontWeight(650)),
            titleLarge = Body.copy(fontSize = 21.sp, lineHeight = 32.55.sp, fontWeight = FontWeight(650)),
            titleMedium = Body.copy(fontSize = 16.sp, lineHeight = 24.8.sp, fontWeight = FontWeight(650)),
            titleSmall = Body.copy(fontWeight = FontWeight.SemiBold),
            bodyLarge = Body,
            bodyMedium = Body,
            bodySmall = Body.copy(fontSize = 13.sp, lineHeight = 20.15.sp),
            labelLarge = Body.copy(fontSize = 14.sp, lineHeight = 21.7.sp, fontWeight = FontWeight.SemiBold),
            labelMedium = Body.copy(fontSize = 13.sp, lineHeight = 20.15.sp),
            labelSmall = Body.copy(fontSize = 11.sp, lineHeight = 17.05.sp),
        ),
        shapes = Shapes(
            extraSmall = RoundedCornerShape(4.dp),
            small = RoundedCornerShape(6.dp),
            medium = RoundedCornerShape(10.dp),
            large = RoundedCornerShape(6.dp),
            extraLarge = RoundedCornerShape(6.dp),
        ),
        content = content,
    )
}
