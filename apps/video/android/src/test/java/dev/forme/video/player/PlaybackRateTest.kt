package dev.forme.video.player

import org.junit.Assert.assertEquals
import org.junit.Test

class PlaybackRateTest {
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
