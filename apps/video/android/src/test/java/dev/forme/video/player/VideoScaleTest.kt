package dev.forme.video.player

import org.junit.Assert.assertEquals
import org.junit.Test

class VideoScaleTest {
    @Test fun buttonCyclesFitFillStretchAndBackToFit() {
        assertEquals(VideoScale.Fill, VideoScale.Fit.next)
        assertEquals(VideoScale.Stretch, VideoScale.Fill.next)
        assertEquals(VideoScale.Fit, VideoScale.Stretch.next)
    }

    @Test fun savedChoiceIsRestoredAndUnknownValuesOpenAsFit() {
        assertEquals(VideoScale.Fill, VideoScale.fromStored(VideoScale.Fill.name))
        assertEquals(VideoScale.Fit, VideoScale.fromStored(null))
        assertEquals(VideoScale.Fit, VideoScale.fromStored("Zoom"))
    }
}
