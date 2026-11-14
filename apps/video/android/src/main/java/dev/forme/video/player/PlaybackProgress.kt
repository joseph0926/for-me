package dev.forme.video.player

import kotlin.math.abs

data class ProgressSnapshot(val positionMs: Long, val durationMs: Long)

class PlaybackProgress(savedPositionMs: Long) {
    var positionMs = savedPositionMs.coerceAtLeast(0)
        private set
    var durationMs = 0L
        private set
    var pendingSeekMs: Long? = positionMs.takeIf { it > 0 }
        private set
    private var receivedTime = false

    fun updateDuration(durationMs: Long) {
        if (durationMs <= 0) return
        this.durationMs = durationMs
        if (positionMs >= durationMs) seek(0)
    }

    fun seek(positionMs: Long) {
        val maximum = durationMs.takeIf { it > 0 } ?: Long.MAX_VALUE
        this.positionMs = positionMs.coerceIn(0, maximum)
        pendingSeekMs = this.positionMs
    }

    fun acceptTime(positionMs: Long): Boolean {
        if (positionMs < 0) return false
        // 탐색 완료 전 들어오는 0이나 이전 위치로 이어보기 기록을 덮어쓰지 않는다.
        pendingSeekMs?.let { if (abs(positionMs - it) > 1_500) return false }
        pendingSeekMs = null
        this.positionMs = positionMs
        receivedTime = true
        return true
    }

    fun finish() {
        positionMs = 0
        pendingSeekMs = null
        receivedTime = true
    }

    fun snapshot(): ProgressSnapshot? =
        if (receivedTime && pendingSeekMs == null) ProgressSnapshot(positionMs, durationMs) else null
}
