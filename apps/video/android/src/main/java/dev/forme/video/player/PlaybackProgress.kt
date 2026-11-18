package dev.forme.video.player

private const val SEEK_TOLERANCE_MS = 1_500L

data class ProgressSnapshot(val positionMs: Long, val durationMs: Long)

class PlaybackProgress(savedPositionMs: Long) {
    var positionMs = savedPositionMs.coerceAtLeast(0)
        private set
    var durationMs = 0L
        private set
    var pendingSeekMs: Long? = positionMs.takeIf { it > 0 }
        private set
    private var receivedTime = false
    private var selectedByUser = false

    fun updateDuration(durationMs: Long) {
        if (durationMs <= 0) return
        // 처음 연 파일의 예전 저장값만 보정한다. 재생 중 고른 끝 위치는 종료 알림까지 유지한다.
        val restoring = this.durationMs == 0L && !selectedByUser && !receivedTime
        this.durationMs = durationMs
        if (restoring && positionMs >= durationMs) {
            positionMs = 0
            pendingSeekMs = 0
        }
    }

    fun seek(positionMs: Long) {
        val maximum = durationMs.takeIf { it > 0 } ?: Long.MAX_VALUE
        this.positionMs = positionMs.coerceIn(0, maximum)
        pendingSeekMs = this.positionMs
        selectedByUser = true
    }

    fun acceptTime(positionMs: Long, elapsedPlayingMs: Long = 0): Boolean {
        if (positionMs < 0) return false
        // 탐색 완료 전 들어오는 0이나 이전 위치로 이어보기 기록을 덮어쓰지 않는다.
        pendingSeekMs?.let { target ->
            val distanceMs = positionMs - target
            if (distanceMs < -SEEK_TOLERANCE_MS || distanceMs > elapsedPlayingMs + SEEK_TOLERANCE_MS) {
                return false
            }
        }
        pendingSeekMs = null
        selectedByUser = false
        this.positionMs = positionMs
        receivedTime = true
        return true
    }

    fun finish() {
        positionMs = 0
        pendingSeekMs = null
        selectedByUser = false
        receivedTime = true
    }

    fun snapshot(): ProgressSnapshot? =
        // 사용자가 고른 위치는 일시정지 중 시간 이벤트가 없어도 이어보기 기준으로 보존한다.
        if (selectedByUser || (receivedTime && pendingSeekMs == null)) {
            ProgressSnapshot(positionMs, durationMs)
        } else null
}
