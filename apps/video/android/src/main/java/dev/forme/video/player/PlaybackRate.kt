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

/** 탐색 뒤 재생한 구간만 당시 배속으로 합산해 뒤늦은 시각 알림을 판정한다. */
internal class SeekPlaybackClock(private var rate: Float) {
    private var startedAtMs: Long? = null
    private var accumulatedMs = 0.0

    fun start(nowMs: Long) {
        if (startedAtMs == null) startedAtMs = nowMs
    }

    fun pause(nowMs: Long) {
        accumulatedMs += currentIntervalMs(nowMs)
        startedAtMs = null
    }

    fun setRate(newRate: Float, nowMs: Long) {
        if (startedAtMs != null) {
            accumulatedMs += currentIntervalMs(nowMs)
            startedAtMs = nowMs
        }
        rate = newRate
    }

    fun reset() {
        startedAtMs = null
        accumulatedMs = 0.0
    }

    fun elapsedMediaMs(nowMs: Long): Long = (accumulatedMs + currentIntervalMs(nowMs)).toLong()

    private fun currentIntervalMs(nowMs: Long): Double =
        startedAtMs?.let { (nowMs - it) * rate.toDouble() } ?: 0.0
}
