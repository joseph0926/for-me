package dev.forme.video.player

import java.nio.charset.CharacterCodingException
import java.nio.charset.Charset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class TextSubtitlesTest {
    @Test fun koreanCuesSurviveBomOverlapAndBackwardSeek() {
        val input = "\uFEFF2\r\n00:00:02,000 --> 00:00:03,000\r\n둘\r\n\r\n" +
            "1\r\n00:00:01,100 --> 00:00:04,000\r\n<i>하나</i>\r\n두 줄"
        val subtitles = TextSubtitles.read(input.byteInputStream())
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
        val subtitles = TextSubtitles.read(input.byteInputStream())
        assertEquals("하나", subtitles.textAt(1500))
        assertEquals("", subtitles.textAt(3500))
        assertEquals("", subtitles.textAt(5000))
        assertEquals("넷", subtitles.textAt(6500))
    }

    @Test fun removesFontAndPositionTags() {
        val input = "1\n00:00:01,000 --> 00:00:02,000\n" +
            "{\\an8}<font color=\"#ffff00\">노란</font> <FONT face='굴림'>글자</FONT>\n" +
            "<font color=red>\n둘째 줄</font>"
        assertEquals("노란 글자\n둘째 줄", TextSubtitles.read(input.byteInputStream()).textAt(1000))
    }

    @Test fun rejectsUnreadableSubtitlesAndAllowsTheExactByteLimit() {
        val cue = "1\n00:00:00,000 --> 00:00:01,000\nA"
        val full = cue.padEnd(MAX_SUBTITLE_BYTES)
        assertEquals("A", TextSubtitles.read(full.byteInputStream()).textAt(0))
        assertThrows(IllegalArgumentException::class.java) { TextSubtitles.read((full + " ").byteInputStream()) }
        assertThrows(IllegalArgumentException::class.java) { TextSubtitles.read("본문만".byteInputStream()) }
        assertThrows(CharacterCodingException::class.java) { TextSubtitles.read(byteArrayOf(-1).inputStream()) }
    }

    @Test fun readsWebVttCuesWithoutHeaderNotesOrTags() {
        val input = "\uFEFFWEBVTT - 한국어\n\nNOTE 설명은\n보이지 않는다\n\n" +
            "STYLE\n::cue { color: yellow }\n\n" +
            "intro\n00:01.000 --> 00:02.500 align:start line:10%\n<v 민수>안녕</v> &amp; <c.yellow>반가워</c>\n\n" +
            "01:00:00.000 --> 01:00:01.000\n<i>한 시간</i><00:00:00.500> 뒤"
        val subtitles = TextSubtitles.read(input.byteInputStream())
        assertEquals("안녕 & 반가워", subtitles.textAt(1_000))
        assertEquals("", subtitles.textAt(2_500))
        assertEquals("한 시간 뒤", subtitles.textAt(3_600_500))
    }

    @Test fun readsSamiInKoreanAndEndsEachLineAtTheNextSync() {
        val input = """
            <SAMI><HEAD><STYLE TYPE="text/css"><!--
            .ENCC { Name: English; lang: en-US; }
            .KRCC { Name: Korean; lang: ko-KR; }
            --></STYLE></HEAD><BODY>
            <SYNC Start=1000><P Class=ENCC>Hello<P Class=KRCC>안녕<br>하세요
            <SYNC Start="2500"><P Class=ENCC>&nbsp;<P Class=KRCC>&nbsp;
            <SYNC Start=4000><P Class=KRCC><font color="#ffff00">마지막</font> &lt;끝&gt;
            </BODY></SAMI>
        """.trimIndent()
        val subtitles = TextSubtitles.read(input.byteInputStream())
        assertEquals("", subtitles.textAt(999))
        assertEquals("안녕\n하세요", subtitles.textAt(1_000))
        assertEquals("", subtitles.textAt(2_500))
        assertEquals("마지막 <끝>", subtitles.textAt(4_000))
    }

    @Test fun samiWithoutKoreanUsesTheFirstLanguage() {
        val input = "<SAMI><BODY><SYNC Start=0><P Class=ENCC>Hi<P Class=JPCC>やあ" +
            "<SYNC Start=1000><P Class=ENCC>&nbsp;<P Class=JPCC>&nbsp;</BODY></SAMI>"
        assertEquals("Hi", TextSubtitles.read(input.byteInputStream()).textAt(500))
    }

    @Test fun readsAssDialogueAndSkipsCommentsAndDrawings() {
        val input = "[Script Info]\nScriptType: v4.00+\n\n[V4+ Styles]\nFormat: Name, Fontname\nStyle: Default,Arial\n\n" +
            "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n" +
            "Comment: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,메모\n" +
            "Dialogue: 0,0:00:01.00,0:00:02.50,Default,,0,0,0,,{\\an8}첫 줄,\\N쉼표 포함\\h끝\n" +
            "Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\p1}m 0 0 l 10 10{\\p0}\n" +
            "Dialogue: 0,1:00:00.10,1:00:01.00,Default,,0,0,0,,한 시간"
        val subtitles = TextSubtitles.read(input.byteInputStream())
        assertEquals("첫 줄,\n쉼표 포함 끝", subtitles.textAt(1_000))
        assertEquals("", subtitles.textAt(2_500))
        assertEquals("한 시간", subtitles.textAt(3_600_100))
    }

    @Test fun readsKoreanWindowsAndUtf16Encodings() {
        // '똠'은 EUC-KR에 없고 CP949에만 있는 글자다.
        val srt = "1\r\n00:00:01,000 --> 00:00:02,000\r\n똠방각하\r\n"
        assertEquals("똠방각하", TextSubtitles.read(srt.toByteArray(Charset.forName("x-windows-949")).inputStream()).textAt(1_000))
        val utf16 = byteArrayOf(0xFF.toByte(), 0xFE.toByte()) + srt.toByteArray(Charsets.UTF_16LE)
        assertEquals("똠방각하", TextSubtitles.read(utf16.inputStream()).textAt(1_000))
    }
}
