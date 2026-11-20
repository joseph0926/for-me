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

    @Test fun skipsUnusableCuesInsteadOfRejectingTheFile() {
        val input = "1\n00:00:01,000 --> 00:00:02,000\n하나\n \n \n" +
            "2\n00:00:03,000 --> 00:00:04,000\n\n" +
            "3\n00:00:05,000 --> 00:00:05,000\n길이 없음\n\n" +
            "4\n00:00:06,000 --> 00:00:07,000\n넷"
        val subtitles = SrtSubtitles.read(input.byteInputStream())
        assertEquals("하나", subtitles.textAt(1500))
        assertEquals("", subtitles.textAt(3500))
        assertEquals("", subtitles.textAt(5000))
        assertEquals("넷", subtitles.textAt(6500))
    }

    @Test fun removesFontAndPositionTags() {
        val input = "1\n00:00:01,000 --> 00:00:02,000\n" +
            "{\\an8}<font color=\"#ffff00\">노란</font> <FONT face='굴림'>글자</FONT>\n" +
            "<font color=red>\n둘째 줄</font>"
        assertEquals("노란 글자\n둘째 줄", SrtSubtitles.read(input.byteInputStream()).textAt(1000))
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
