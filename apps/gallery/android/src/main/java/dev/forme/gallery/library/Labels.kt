package dev.forme.gallery.library

import java.time.LocalDate
import java.time.LocalTime
import java.util.Locale

/**
 * 날짜, 개수, 재생 길이 표기. 화면 레퍼런스 "낱장"(apps/today-ref/works/2026-11-28-gallery-app/src/format.ts)과 같은 규칙이다.
 * 올해 날짜는 연도를 빼고 쓴다. [today]를 받아 검사에서 날짜를 고정할 수 있게 한다.
 */
class Labels(private val today: LocalDate) {
    fun day(date: LocalDate): String =
        if (date.year == today.year) "${date.monthValue}월 ${date.dayOfMonth}일"
        else "${date.year}년 ${date.monthValue}월 ${date.dayOfMonth}일"

    fun month(date: LocalDate): String =
        if (date.year == today.year) "${date.monthValue}월" else "${date.year}년 ${date.monthValue}월"

    fun year(date: LocalDate): String = "${date.year}년"

    companion object {
        /** "사진 1,234장, 동영상 2개". 0인 형식은 뺀다. */
        fun count(photos: Int, videos: Int): String {
            val words = buildList {
                if (photos > 0) add("사진 ${String.format(Locale.KOREA, "%,d", photos)}장")
                if (videos > 0) add("동영상 ${String.format(Locale.KOREA, "%,d", videos)}개")
            }
            return if (words.isEmpty()) "항목 없음" else words.joinToString(", ")
        }

        fun count(items: List<MediaItem>): String {
            val videos = items.count { it.kind == MediaKind.VIDEO }
            return count(items.size - videos, videos)
        }

        /** 1시간 미만은 분:초, 그 이상은 시:분:초. 초는 반올림한다. */
        fun duration(millis: Long): String {
            val total = (millis.coerceAtLeast(0) + 500) / 1000
            val hours = total / 3600
            val minutes = total % 3600 / 60
            val seconds = total % 60
            return if (hours > 0) {
                String.format(Locale.ROOT, "%d:%02d:%02d", hours, minutes, seconds)
            } else {
                String.format(Locale.ROOT, "%d:%02d", minutes, seconds)
            }
        }

        /** "오후 3:41" */
        fun time(time: LocalTime): String {
            val half = if (time.hour < 12) "오전" else "오후"
            val hour = if (time.hour % 12 == 0) 12 else time.hour % 12
            return String.format(Locale.ROOT, "%s %d:%02d", half, hour, time.minute)
        }
    }
}
