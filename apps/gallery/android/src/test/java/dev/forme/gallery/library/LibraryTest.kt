package dev.forme.gallery.library

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

class LibraryTest {
    private val seoul = ZoneId.of("Asia/Seoul")

    private fun item(id: Long, taken: String, kind: MediaKind = MediaKind.PHOTO, favorite: Boolean = false) = MediaItem(
        id = id,
        kind = kind,
        takenAtMillis = LocalDateTime.parse(taken).atZone(seoul).toInstant().toEpochMilli(),
        modifiedSeconds = 0,
        durationMillis = 0,
        favorite = favorite,
    )

    @Test
    fun `최근 순으로 정렬하고 같은 시각이면 나중에 들어온 항목이 먼저다`() {
        val library = Library(
            listOf(item(1, "2026-11-20T10:00"), item(3, "2026-11-22T09:00"), item(2, "2026-11-22T09:00")),
            seoul,
        )
        assertEquals(listOf(3L, 2L, 1L), library.items.map { it.id })
    }

    @Test
    fun `날짜는 기기 시간대의 달력으로 나눈다`() {
        // 두 사진은 UTC로는 같은 날(11월 22일)이지만 서울 시각으로는 자정을 넘긴다.
        val library = Library(listOf(item(1, "2026-11-22T23:30"), item(2, "2026-11-23T00:10")), seoul)
        assertEquals(listOf("2026-11-23", "2026-11-22"), library.days.map { it.key })
    }

    @Test
    fun `일, 월, 연 묶음과 사진과 동영상 수`() {
        val library = Library(
            listOf(
                item(1, "2025-12-24T18:00"),
                item(2, "2026-10-03T12:00", MediaKind.VIDEO),
                item(3, "2026-11-22T15:41"),
                item(4, "2026-11-22T16:02"),
            ),
            seoul,
        )
        assertEquals(listOf("2026-11-22", "2026-10-03", "2025-12-24"), library.days.map { it.key })
        assertEquals(listOf("2026-11", "2026-10", "2025-12"), library.months.map { it.key })
        assertEquals(listOf("2026", "2025"), library.years.map { it.key })
        assertEquals(listOf(4L, 3L), library.days.first().items.map { it.id })
        assertEquals(3, library.photoCount)
        assertEquals(1, library.videoCount)
    }

    @Test
    fun `대표 사진은 즐겨찾기한 사진, 최근 사진, 첫 항목 순이다`() {
        val video = item(1, "2026-11-22T18:00", MediaKind.VIDEO)
        val recent = item(2, "2026-11-22T17:00")
        val favorite = item(3, "2026-11-22T09:00", favorite = true)
        assertEquals(favorite, coverOf(listOf(video, recent, favorite)))
        assertEquals(recent, coverOf(listOf(video, recent)))
        assertEquals(video, coverOf(listOf(video)))
    }

    @Test
    fun `빈 보관함은 묶음이 없다`() {
        val library = Library(emptyList(), seoul)
        assertEquals(emptyList<MediaGroup>(), library.days)
        assertEquals(emptyList<LibraryRow>(), libraryRows(library, LibraryUnit.DAY))
    }
}
