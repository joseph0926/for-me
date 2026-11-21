package dev.forme.video.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VideoFileInfoTest {
    @Test fun namesCommonCodecsAndFallsBackToTheMimeSubtype() {
        assertEquals("H.264", codecName("video/avc"))
        assertEquals("H.265", codecName("video/hevc"))
        assertEquals("AAC", codecName("audio/mp4a-latm"))
        assertEquals("E-AC-3", codecName("audio/eac3"))
        assertEquals("DTS", codecName("audio/x-dts"))
    }

    @Test fun formatsSizesWithDecimalUnits() {
        assertEquals("64.3 MB", formatFileSize(64_293_876))
        assertEquals("1.2 GB", formatFileSize(1_200_000_000))
        assertEquals("61 KB", formatFileSize(61_796))
        assertEquals("512 B", formatFileSize(512))
    }

    @Test fun resolutionUsesTheShortSide() {
        assertEquals("720p", resolutionLabel(1280, 720))
        assertEquals("1080p", resolutionLabel(1080, 1920))
        assertNull(resolutionLabel(0, 0))
    }

    @Test fun formatsAudioAndFrameRates() {
        assertEquals("48.0kHz", formatSampleRate(48_000))
        assertEquals("44.1kHz", formatSampleRate(44_100))
        assertEquals("30fps", formatFrameRate(30f))
        assertEquals("29.97fps", formatFrameRate(29.97f))
    }
}
