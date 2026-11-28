package dev.forme.gallery.library

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime

class LabelsTest {
    private val labels = Labels(today = LocalDate.of(2026, 11, 28))

    @Test
    fun `올해 날짜는 연도를 빼고 다른 해는 연도를 붙인다`() {
        assertEquals("11월 22일", labels.day(LocalDate.of(2026, 11, 22)))
        assertEquals("2025년 12월 24일", labels.day(LocalDate.of(2025, 12, 24)))
        assertEquals("10월", labels.month(LocalDate.of(2026, 10, 3)))
        assertEquals("2025년 12월", labels.month(LocalDate.of(2025, 12, 24)))
        assertEquals("2025년", labels.year(LocalDate.of(2025, 12, 24)))
    }

    @Test
    fun `개수는 천 단위를 끊고 0인 형식은 뺀다`() {
        assertEquals("사진 1,234장, 동영상 2개", Labels.count(1234, 2))
        assertEquals("사진 3장", Labels.count(3, 0))
        assertEquals("동영상 1개", Labels.count(0, 1))
        assertEquals("항목 없음", Labels.count(0, 0))
    }

    @Test
    fun `재생 길이는 초를 반올림하고 1시간부터 시를 붙인다`() {
        assertEquals("0:00", Labels.duration(0))
        assertEquals("1:00", Labels.duration(59_500))
        assertEquals("0:59", Labels.duration(59_499))
        assertEquals("12:05", Labels.duration(725_000))
        assertEquals("1:00:00", Labels.duration(3_600_000))
    }

    @Test
    fun `시각은 오전과 오후 12시간제다`() {
        assertEquals("오전 12:05", Labels.time(LocalTime.of(0, 5)))
        assertEquals("오후 12:00", Labels.time(LocalTime.of(12, 0)))
        assertEquals("오후 3:41", Labels.time(LocalTime.of(15, 41)))
    }
}
