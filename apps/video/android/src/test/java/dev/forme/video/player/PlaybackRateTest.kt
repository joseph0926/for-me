package dev.forme.video.player

import org.junit.Assert.assertEquals
import org.junit.Test

class PlaybackRateTest {
    @Test fun delayedSeekReportUsesTimeAtEachRateAndSkipsPausedTime() {
        val clock = SeekPlaybackClock(2f)
        val progress = PlaybackProgress(0)
        progress.seek(30_000)
        clock.start(100)
        clock.setRate(1f, 2_100)
        clock.pause(3_100)
        clock.start(10_100)
        clock.start(10_500)
        val elapsed = clock.elapsedMediaMs(11_100)
        assertEquals(6_000L, elapsed)
        assertEquals(false, progress.acceptTime(45_000, elapsed))
        assertEquals(true, progress.acceptTime(36_000, elapsed))
        clock.reset()
        assertEquals(0L, clock.elapsedMediaMs(12_000))
    }

    @Test fun stepsThroughRatesAndStopsAtBothEnds() {
        assertEquals(1.25f, stepPlaybackRate(1f, 1))
        assertEquals(0.75f, stepPlaybackRate(1f, -1))
        assertEquals(2f, stepPlaybackRate(1.5f, 1))
        assertEquals(2f, stepPlaybackRate(2f, 1))
        assertEquals(0.5f, stepPlaybackRate(0.5f, -1))
    }

    @Test fun unknownRateStepsFromNormalSpeed() {
        assertEquals(1.25f, stepPlaybackRate(1.1f, 1))
    }

    @Test fun formatsRatesForTheSpeedLabel() {
        assertEquals("1.0", formatPlaybackRate(1f))
        assertEquals("2.0", formatPlaybackRate(2f))
        assertEquals("1.5", formatPlaybackRate(1.5f))
        assertEquals("0.75", formatPlaybackRate(0.75f))
        assertEquals("1.25", formatPlaybackRate(1.25f))
    }
}
