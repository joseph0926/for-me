package dev.forme.video.player

import java.util.Locale

/** 재생 화면의 속도 버튼이 오가는 단계. 1배가 기본이다. */
internal val PLAYBACK_RATES = listOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f)

/** 현재 속도에서 [direction](1은 빠르게, -1은 느리게) 쪽 다음 단계를 돌려준다. 양 끝에서는 그대로 둔다. */
internal fun stepPlaybackRate(current: Float, direction: Int): Float {
    val index = PLAYBACK_RATES.indexOf(current).takeIf { it >= 0 } ?: PLAYBACK_RATES.indexOf(1f)
    return PLAYBACK_RATES[(index + direction).coerceIn(0, PLAYBACK_RATES.lastIndex)]
}

/** 소수 첫째 자리까지는 `1.0`, `1.5`처럼, 그보다 잘게 나뉘면 `0.75`처럼 쓴다. */
internal fun formatPlaybackRate(rate: Float): String =
    if ((rate * 10).let { it == Math.round(it).toFloat() }) String.format(Locale.ROOT, "%.1f", rate)
    else String.format(Locale.ROOT, "%.2f", rate)
