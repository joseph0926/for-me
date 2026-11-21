package dev.forme.video.ui

/** 영상 영역을 가로로 나눈 터치 자리. 양옆과 가운데의 폭 비율은 1 : 1.2 : 1이다. */
internal enum class TapZone { Left, Center, Right }

internal const val DOUBLE_TAP_WINDOW_MS = 260L
internal const val SEEK_FLASH_MS = 700L
internal const val SEEK_STEP_SECONDS = 10

internal fun tapZone(x: Float, width: Float): TapZone {
    val side = width / 3.2f
    return when {
        x < side -> TapZone.Left
        x > width - side -> TapZone.Right
        else -> TapZone.Center
    }
}

internal sealed interface TapDecision {
    /** 그쪽으로 10초 이동한다. */
    data object Seek : TapDecision

    /** 한 번 누르기로 보고 [delayMs] 뒤에 재생과 일시정지를 바꾼다. 그 사이 같은 쪽을 또 누르면 취소된다. */
    data class Single(val delayMs: Long) : TapDecision
}

/**
 * 가운데는 한 번 누르기를 바로 처리한다. 양옆은 두 번째 누르기를 기다리고,
 * 이동 표시가 떠 있는 동안에는 같은 쪽을 한 번만 눌러도 10초씩 더 간다.
 */
internal fun decideTap(zone: TapZone, flashZone: TapZone?, pendingZone: TapZone?): TapDecision = when {
    zone == TapZone.Center -> TapDecision.Single(0)
    zone == flashZone || zone == pendingZone -> TapDecision.Seek
    else -> TapDecision.Single(DOUBLE_TAP_WINDOW_MS)
}

/** 가장자리 표시에 쓰는 이동 묶음. 같은 쪽으로 이어 누르면 초가 쌓이고, 반대쪽이면 새로 센다. */
internal data class SeekFlash(val zone: TapZone, val totalSeconds: Int, val version: Int)

internal fun nextSeekFlash(current: SeekFlash?, zone: TapZone): SeekFlash {
    val total = if (current?.zone == zone) current.totalSeconds + SEEK_STEP_SECONDS else SEEK_STEP_SECONDS
    return SeekFlash(zone, total, (current?.version ?: 0) + 1)
}
