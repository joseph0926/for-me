package dev.forme.video.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class SeekTapsTest {
    @Test fun splitsTheScreenIntoSidesAndAWiderCenter() {
        assertEquals(TapZone.Left, tapZone(0f, 320f))
        assertEquals(TapZone.Left, tapZone(99f, 320f))
        assertEquals(TapZone.Center, tapZone(101f, 320f))
        assertEquals(TapZone.Center, tapZone(219f, 320f))
        assertEquals(TapZone.Right, tapZone(221f, 320f))
    }

    @Test fun centerTapActsAtOnceAndSideTapWaitsForASecondTap() {
        assertEquals(TapDecision.Single(0), decideTap(TapZone.Center, flashZone = null, pendingZone = null))
        assertEquals(TapDecision.Single(DOUBLE_TAP_WINDOW_MS), decideTap(TapZone.Right, null, null))
        assertEquals(TapDecision.Seek, decideTap(TapZone.Right, null, pendingZone = TapZone.Right))
    }

    @Test fun tapOnTheOtherSideDoesNotSeek() {
        assertEquals(TapDecision.Single(DOUBLE_TAP_WINDOW_MS), decideTap(TapZone.Left, null, pendingZone = TapZone.Right))
        assertEquals(TapDecision.Single(DOUBLE_TAP_WINDOW_MS), decideTap(TapZone.Left, flashZone = TapZone.Right, null))
        assertEquals(TapDecision.Single(0), decideTap(TapZone.Center, flashZone = TapZone.Right, null))
    }

    @Test fun singleTapOnTheSameSideKeepsSeekingWhileTheFlashShows() {
        assertEquals(TapDecision.Seek, decideTap(TapZone.Left, flashZone = TapZone.Left, null))
    }

    @Test fun flashAddsSecondsOnTheSameSideAndRestartsOnTheOtherSide() {
        val first = nextSeekFlash(null, TapZone.Right)
        assertEquals(10, first.totalSeconds)
        val second = nextSeekFlash(first, TapZone.Right)
        assertEquals(20, second.totalSeconds)
        assertEquals(30, nextSeekFlash(second, TapZone.Right).totalSeconds)
        assertEquals(SeekFlash(TapZone.Left, 10, second.version + 1), nextSeekFlash(second, TapZone.Left))
    }

    @Test fun dragAcrossTheWholeWidthMovesNinetySecondsAndStopsAtBothEnds() {
        assertEquals(100_000L, dragSeekTarget(10_000, dragPx = 1_000f, widthPx = 1_000f, durationMs = 600_000))
        assertEquals(55_000L, dragSeekTarget(100_000, dragPx = -500f, widthPx = 1_000f, durationMs = 600_000))
        assertEquals(0L, dragSeekTarget(20_000, dragPx = -1_000f, widthPx = 1_000f, durationMs = 600_000))
        assertEquals(60_000L, dragSeekTarget(50_000, dragPx = 1_000f, widthPx = 1_000f, durationMs = 60_000))
    }

    @Test fun orientationFollowsTheVideoShapeOnlyWhenItIsKnown() {
        assertEquals(ScreenOrientation.Landscape, orientationFor(16f / 9))
        assertEquals(ScreenOrientation.Portrait, orientationFor(9f / 16))
        assertEquals(null, orientationFor(1f))
        assertEquals(null, orientationFor(null))
    }
}
