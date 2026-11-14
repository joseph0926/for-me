package dev.forme.video.player

import org.junit.Assert.*
import org.junit.Test

class PlaybackProgressTest {
    @Test fun openingOrFailedRestoreDoesNotOverwriteSavedPosition() {
        val progress = PlaybackProgress(45_000)
        assertNull(progress.snapshot())
        assertFalse(progress.acceptTime(0))
        assertNull(progress.snapshot())
        assertEquals(45_000, progress.positionMs)
        assertTrue(progress.acceptTime(45_200))
        assertEquals(45_200, progress.snapshot()!!.positionMs)
    }

    @Test fun seekingBackwardsWaitsForTheNewPosition() {
        val progress = PlaybackProgress(0)
        progress.updateDuration(120_000)
        progress.acceptTime(90_000)
        progress.seek(10_000)
        assertFalse(progress.acceptTime(90_200))
        assertNull(progress.snapshot())
        assertTrue(progress.acceptTime(10_300))
        assertEquals(10_300, progress.snapshot()!!.positionMs)
    }

    @Test fun completedVideoStartsAgainAtZero() {
        val progress = PlaybackProgress(0)
        progress.updateDuration(60_000)
        progress.acceptTime(59_900)
        progress.finish()
        assertEquals(ProgressSnapshot(0, 60_000), progress.snapshot())
    }

    @Test fun savedPositionOutsideFileStartsFromBeginning() {
        val progress = PlaybackProgress(90_000)
        progress.updateDuration(60_000)
        assertEquals(0L, progress.pendingSeekMs)
        assertTrue(progress.acceptTime(0))
        assertEquals(0, progress.snapshot()!!.positionMs)
    }

    @Test fun invalidNativeTimeDoesNotBecomeAStoredPosition() {
        val progress = PlaybackProgress(0)
        assertFalse(progress.acceptTime(-1))
        assertNull(progress.snapshot())
    }
}
