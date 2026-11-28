package dev.forme.gallery.library

import java.time.YearMonth

/** 보관함을 묶는 단위. 화면 아래 전환에 이 순서로 놓인다. */
enum class LibraryUnit(val label: String) {
    YEAR("연"),
    MONTH("월"),
    DAY("일"),
    ALL("전체"),
}

/** 3열 격자에 놓는 한 줄. [Tile]만 한 칸이고 나머지는 한 줄 전체를 차지한다. */
sealed interface LibraryRow {
    val key: String

    /** 일 단위에서 하루의 첫 사진을 크게 두고 날짜를 얹는다. */
    data class DayHero(val group: MediaGroup, val item: MediaItem) : LibraryRow {
        override val key: String get() = "hero-${group.key}"
    }

    data class Tile(val item: MediaItem) : LibraryRow {
        override val key: String get() = "tile-${item.id}"
    }

    /** 월과 연 단위의 카드. 누르면 한 단계 아래 단위로 내려간다. */
    data class Card(val unit: LibraryUnit, val group: MediaGroup, val cover: MediaItem) : LibraryRow {
        override val key: String get() = "card-${group.key}"
    }
}

fun libraryRows(library: Library, unit: LibraryUnit): List<LibraryRow> = when (unit) {
    LibraryUnit.ALL -> library.items.map { LibraryRow.Tile(it) }
    LibraryUnit.DAY -> library.days.flatMap { group ->
        // 크게 둘 칸은 그날의 첫 사진이다. 동영상만 있는 날은 동영상을 쓴다.
        val hero = group.items.firstOrNull { it.kind == MediaKind.PHOTO } ?: group.items.first()
        listOf(LibraryRow.DayHero(group, hero)) + group.items.filter { it.id != hero.id }.map { LibraryRow.Tile(it) }
    }
    LibraryUnit.MONTH -> library.months.map { LibraryRow.Card(unit, it, coverOf(it.items)) }
    LibraryUnit.YEAR -> library.years.map { LibraryRow.Card(unit, it, coverOf(it.items)) }
}

/** 카드를 눌렀을 때 내려갈 단위와 그 단위에서 보여 줄 묶음. 연은 그해의 최근 달로, 월은 그달의 최근 날로 간다. */
fun drillDown(card: LibraryRow.Card): Pair<LibraryUnit, String> = when (card.unit) {
    LibraryUnit.YEAR -> LibraryUnit.MONTH to YearMonth.from(card.group.date).toString()
    else -> LibraryUnit.DAY to card.group.date.toString()
}

/** [groupKey] 묶음이 시작하는 줄. 찾지 못하면 맨 위(0)로 간다. */
fun rowIndexOf(rows: List<LibraryRow>, groupKey: String?): Int {
    if (groupKey == null) return 0
    val index = rows.indexOfFirst { row ->
        when (row) {
            is LibraryRow.DayHero -> row.group.key == groupKey
            is LibraryRow.Card -> row.group.key == groupKey
            is LibraryRow.Tile -> false
        }
    }
    return index.coerceAtLeast(0)
}
