package dev.forme.music.redesign

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import dev.forme.music.R

/**
 * 재설계 화면의 정체성. 오늘의레퍼런스 완성작 "속지"(apps/today-ref/works/2026-11-28-music)의 값을 옮겼다.
 * 바탕과 면은 무채색 단계만 쓰고 색은 강조색 하나와 커버에만 둔다. 면을 채운 칸, 떠 있는 카드, 테두리 원으로 묶지 않는다.
 * 2026-11-28 사용자 결정: 재설계는 이 정체성을 유지한다.
 */
object Sokji {
    val Surface = Color(0xFFF4F4F5)
    val Raised = Color(0xFFFFFFFF)
    val Sunken = Color(0xFFE9E9EB)
    val Ink = Color(0xFF111113)
    val Muted = Color(0xFF5E5E64)
    val Faint = Color(0xFF8A8A90)
    val Line = Color(0xFFDEDEDF)
    val Accent = Color(0xFFD93A1C)
    val AccentInk = Color.White

    /** 작은 글자의 강조색. 주홍 그대로는 밝은 바탕에서 4.5:1에 못 미쳐 본문색을 12% 섞었다(속지와 같은 방법). */
    val AccentText = Color(0xFFC1351B)

    /** 재생 화면의 글자. 커버 색을 깐 어두운 바탕 위에 둔다. */
    val OnPlayer = Color(0xFFF2F2F3)
    val OnPlayerMuted = Color(0xB3F2F2F3)

    /** 어두운 재생 화면 위의 강조색. 속지의 어두운 화면 강조색과 같다. */
    val AccentOnPlayer = Color(0xFFFF6A45)

    val Corner = RoundedCornerShape(4.dp)
}

/** 바늘이 내려앉듯 무게 있게 감속하는 곡선. 시트 320ms, 화면 이동 260ms, 작은 움직임 220ms. */
object SokjiMotion {
    private val settle = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
    fun <T> sheet() = tween<T>(320, easing = settle)
    fun <T> push() = tween<T>(260, easing = settle)
    fun <T> quick() = tween<T>(220, easing = settle)

    /** 곡이 바뀔 때 재생 화면 배경이 따라 바뀌는 길이. 다른 움직임보다 느리게 둔다. */
    fun <T> toneChange() = tween<T>(600)
}

/** Wanted Sans 가변 서체 한 파일을 굵기마다 다르게 읽는다. 한글 서체는 이 하나만 쓴다(속지 사용자 결정). */
@OptIn(ExperimentalTextApi::class)
private val WantedSans = FontFamily(
    listOf(400, 500, 600, 700).map { weight ->
        Font(R.font.wanted_sans, FontWeight(weight), variationSettings = FontVariation.Settings(FontVariation.weight(weight)))
    },
)

private val tightTitle = (-0.02).em

private val SokjiTypography = Typography(
    // 화면 제목 28, 상세 제목 26, 재생 화면 곡 제목 24. 굵게, 자간 -0.02em.
    headlineLarge = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 34.sp, letterSpacing = tightTitle),
    headlineMedium = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.Bold, fontSize = 26.sp, lineHeight = 32.sp, letterSpacing = tightTitle),
    headlineSmall = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 30.sp, letterSpacing = tightTitle),
    titleMedium = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 24.sp, letterSpacing = tightTitle),
    // 목록 행 제목 15, 보조 줄 14.
    bodyLarge = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.Medium, fontSize = 15.sp, lineHeight = 21.sp),
    bodyMedium = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.Normal, fontSize = 13.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontFamily = WantedSans, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp),
)

@Composable
fun SokjiTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Sokji.Accent,
            onPrimary = Sokji.AccentInk,
            secondary = Sokji.Ink,
            background = Sokji.Surface,
            onBackground = Sokji.Ink,
            surface = Sokji.Surface,
            onSurface = Sokji.Ink,
            surfaceVariant = Sokji.Sunken,
            onSurfaceVariant = Sokji.Muted,
            surfaceContainer = Sokji.Raised,
            surfaceContainerLow = Sokji.Raised,
            surfaceContainerHigh = Sokji.Raised,
            surfaceContainerHighest = Sokji.Raised,
            outline = Sokji.Line,
            outlineVariant = Sokji.Line,
        ),
        typography = SokjiTypography,
        shapes = Shapes(
            extraSmall = Sokji.Corner,
            small = Sokji.Corner,
            medium = Sokji.Corner,
            large = Sokji.Corner,
            extraLarge = Sokji.Corner,
        ),
        content = content,
    )
}
