package dev.forme.gallery.library

import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId

enum class MediaKind { PHOTO, VIDEO }

/**
 * 보관함의 한 항목. MediaStore 한 줄에서 화면에 필요한 값만 담는다.
 * 원본 주소는 [id]와 [kind]로 다시 만들 수 있으므로 담지 않는다(이 파일을 Android 없이 검사하기 위해서다).
 */
data class MediaItem(
    val id: Long,
    val kind: MediaKind,
    val takenAtMillis: Long,
    /** 썸네일 캐시가 파일이 바뀐 것을 알아채는 데 쓴다. */
    val modifiedSeconds: Long,
    val durationMillis: Long,
    val favorite: Boolean,
)

/** 연, 월, 일 가운데 하나로 묶은 사진들. [key]는 "2026", "2026-11", "2026-11-22" 꼴이다. */
data class MediaGroup(val key: String, val date: LocalDate, val items: List<MediaItem>)

/**
 * 보관함 전체. 최근 순으로 정렬한 항목과 연, 월, 일 묶음을 한 번에 만든다.
 * 날짜는 [zone]의 달력으로 나눈다. 여행지에서 찍은 사진도 지금 기기의 시간대로 묶인다.
 */
class Library(items: List<MediaItem>, private val zone: ZoneId) {
    val items: List<MediaItem> = items.sortedWith(
        compareByDescending<MediaItem> { it.takenAtMillis }.thenByDescending { it.id },
    )
    val days: List<MediaGroup> = groupConsecutive { it.toString() }
    val months: List<MediaGroup> = groupConsecutive { YearMonth.from(it).toString() }
    val years: List<MediaGroup> = groupConsecutive { it.year.toString() }

    val photoCount: Int = this.items.count { it.kind == MediaKind.PHOTO }
    val videoCount: Int = this.items.size - photoCount

    fun dateOf(item: MediaItem): LocalDate = Instant.ofEpochMilli(item.takenAtMillis).atZone(zone).toLocalDate()

    // 최근 순으로 정렬돼 있으므로 같은 묶음은 이어져 있다.
    private fun groupConsecutive(keyOf: (LocalDate) -> String): List<MediaGroup> {
        val groups = mutableListOf<MediaGroup>()
        var currentKey: String? = null
        var current = mutableListOf<MediaItem>()
        for (item in items) {
            val date = dateOf(item)
            val key = keyOf(date)
            if (key != currentKey) {
                if (current.isNotEmpty()) groups += MediaGroup(currentKey!!, dateOf(current.first()), current)
                currentKey = key
                current = mutableListOf()
            }
            current += item
        }
        if (current.isNotEmpty()) groups += MediaGroup(currentKey!!, dateOf(current.first()), current)
        return groups
    }
}

/** 월과 연 카드의 대표 사진. 즐겨찾기한 사진, 가장 최근 사진, 첫 항목 순으로 고른다. */
fun coverOf(items: List<MediaItem>): MediaItem =
    items.firstOrNull { it.kind == MediaKind.PHOTO && it.favorite }
        ?: items.firstOrNull { it.kind == MediaKind.PHOTO }
        ?: items.first()
