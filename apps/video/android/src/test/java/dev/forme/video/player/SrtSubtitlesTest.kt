package dev.forme.video.player

import java.nio.charset.CharacterCodingException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class SrtSubtitlesTest {
    @Test fun koreanCuesSurviveBomOverlapAndBackwardSeek() {
        val input = "\uFEFF2\r\n00:00:02,000 --> 00:00:03,000\r\n둘\r\n\r\n" +
            "1\r\n00:00:01,100 --> 00:00:04,000\r\n<i>하나</i>\r\n두 줄"
        val subtitles = SrtSubtitles.read(input.byteInputStream())
        assertEquals("하나\n두 줄\n둘", subtitles.textAt(2000))
        assertEquals("하나\n두 줄", subtitles.textAt(3000))
        assertEquals("", subtitles.textAt(4000))
        assertEquals("", subtitles.textAt(1099))
        assertEquals("하나\n두 줄", subtitles.textAt(1100))
    }

    @Test fun rejectsUnreadableSubtitlesAndAllowsTheExactByteLimit() {
        val cue = "1\n00:00:00,000 --> 00:00:01,000\nA"
        val full = cue.padEnd(MAX_SRT_BYTES)
        assertEquals("A", SrtSubtitles.read(full.byteInputStream()).textAt(0))
        assertThrows(IllegalArgumentException::class.java) { SrtSubtitles.read((full + " ").byteInputStream()) }
        assertThrows(IllegalArgumentException::class.java) { SrtSubtitles.read("본문만".byteInputStream()) }
        assertThrows(CharacterCodingException::class.java) { SrtSubtitles.read(byteArrayOf(-1).inputStream()) }
    }
}
