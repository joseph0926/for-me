package dev.forme.gallery.library

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

class LibraryRowsTest {
    private val seoul = ZoneId.of("Asia/Seoul")

    private fun item(id: Long, taken: String, kind: MediaKind = MediaKind.PHOTO) = MediaItem(
        id = id,
        kind = kind,
        takenAtMillis = LocalDateTime.parse(taken).atZone(seoul).toInstant().toEpochMilli(),
        modifiedSeconds = 0,
        durationMillis = 0,
        favorite = false,
    )

    private val library = Library(
        listOf(
            item(1, "2025-12-24T18:00"),
            item(2, "2026-10-03T12:00", MediaKind.VIDEO),
            item(3, "2026-11-22T15:41"),
            // 그날 가장 최근 항목이 동영상이어도 크게 두는 칸은 사진이다.
            item(4, "2026-11-22T16:02", MediaKind.VIDEO),
            item(5, "2026-11-22T14:00"),
        ),
        seoul,
    )

    @Test
    fun `일 단위는 하루마다 첫 사진을 크게 두고 나머지를 칸으로 잇는다`() {
        val rows = libraryRows(library, LibraryUnit.DAY)
        assertEquals(
            listOf("hero-2026-11-22", "tile-4", "tile-5", "hero-2026-10-03", "hero-2025-12-24"),
            rows.map { it.key },
        )
        assertEquals(3L, (rows.first() as LibraryRow.DayHero).item.id)
        // 동영상만 있는 날은 동영상을 크게 둔다.
        assertEquals(2L, (rows[3] as LibraryRow.DayHero).item.id)
    }

    @Test
    fun `전체 단위는 모든 항목을 최근 순 칸으로 둔다`() {
        assertEquals(listOf(4L, 3L, 5L, 2L, 1L), libraryRows(library, LibraryUnit.ALL).map { (it as LibraryRow.Tile).item.id })
    }

    @Test
    fun `연 카드를 누르면 그해의 최근 달로, 월 카드를 누르면 그달의 최근 날로 내려간다`() {
        val years = libraryRows(library, LibraryUnit.YEAR).map { it as LibraryRow.Card }
        assertEquals(LibraryUnit.MONTH to "2026-11", drillDown(years[0]))
        assertEquals(LibraryUnit.MONTH to "2025-12", drillDown(years[1]))

        val months = libraryRows(library, LibraryUnit.MONTH).map { it as LibraryRow.Card }
        assertEquals(LibraryUnit.DAY to "2026-10-03", drillDown(months[1]))
    }

    @Test
    fun `내려간 단위에서 고른 묶음의 줄을 찾고 없으면 맨 위로 간다`() {
        val days = libraryRows(library, LibraryUnit.DAY)
        assertEquals(3, rowIndexOf(days, "2026-10-03"))
        assertEquals(0, rowIndexOf(days, "2020-01-01"))
        assertEquals(0, rowIndexOf(days, null))
        assertEquals(1, rowIndexOf(libraryRows(library, LibraryUnit.MONTH), "2026-10"))
    }
}
