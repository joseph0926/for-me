package dev.forme.music.data

import java.text.Collator
import java.util.Locale

/** 재생할 수 있는 곡 하나. [uri]가 식별자이고, 재생 목록과 대기열도 이 값으로 곡을 가리킨다. */
data class Track(
    val uri: String,
    /** 목록에 보이는 이름. 확장자를 뺀 파일 이름이다(2026-11-28 사용자 결정). */
    val name: String,
    /** 파일 태그의 제목. 재생 화면에만 보조로 보인다. */
    val tagTitle: String?,
    /** 헤더가 적은 길이. 잘린 파일은 실제 소리보다 길 수 있다. 모르면 0. */
    val durationMs: Long,
    val addedAtMs: Long,
)

/** 파일 이름에서 마지막 확장자를 빼 목록 이름을 만든다. 남는 글자가 없으면 파일 이름을 그대로 쓴다. */
fun trackNameOf(fileName: String): String {
    val dot = fileName.lastIndexOf('.')
    val withoutExtension = if (dot > 0) fileName.substring(0, dot) else fileName
    return withoutExtension.trim().ifEmpty { fileName.trim() }
}

enum class TrackOrder { NAME, RECENTLY_ADDED }

fun List<Track>.sortedFor(order: TrackOrder): List<Track> = when (order) {
    TrackOrder.NAME -> {
        val collator = Collator.getInstance(Locale.KOREAN)
        sortedWith { a, b -> collator.compare(a.name, b.name) }
    }
    TrackOrder.RECENTLY_ADDED -> sortedByDescending { it.addedAtMs }
}

/** 목록 이름과 태그 제목에서 찾는다. 대소문자와 앞뒤 공백은 가리지 않는다. */
fun List<Track>.matching(query: String): List<Track> {
    val needle = query.trim()
    if (needle.isEmpty()) return this
    return filter {
        it.name.contains(needle, ignoreCase = true) || it.tagTitle?.contains(needle, ignoreCase = true) == true
    }
}
