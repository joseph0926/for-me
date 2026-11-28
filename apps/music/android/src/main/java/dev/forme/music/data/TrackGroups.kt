package dev.forme.music.data

import java.text.Collator
import java.time.Instant
import java.time.ZoneId
import java.util.Locale

/** 곡이 많을 때 묶어 찾는 기준. 2026-11-28 사용자 결정으로 네 가지를 모두 둔다. */
enum class GroupKind { FOLDER, SINGER, CHANNEL, MONTH }

/**
 * 한 기준으로 묶은 곡들. [key]는 묶음을 다시 찾는 값이고, 기준 정보가 없는 곡끼리 모인 묶음은 null이다.
 * 달 묶음의 [key]는 "2026-11" 꼴이다.
 */
data class TrackGroup(val kind: GroupKind, val key: String?, val tracks: List<Track>)

/**
 * 곡의 가수. 사용자 음악은 파일 이름에 곡명만 있고 태그 제목이 "가수 - 곡명 | 공연 날짜"나
 * "[LIVE] 가수 - 곡명 (무대)" 꼴이라 태그 제목을 먼저 보고, 없으면 "가수 - 곡명" 꼴 파일 이름을 본다.
 */
fun singerOf(track: Track): String? = track.tagTitle?.let(::singerIn) ?: singerIn(track.name)

private val leadingLabel = Regex("""^(\s*[\[(【][^\])】]*[\])】])+""")

private fun singerIn(text: String): String? {
    val dash = text.indexOf(" - ")
    if (dash < 0) return null
    return text.substring(0, dash).replace(leadingLabel, "").trim().ifEmpty { null }
}

/** 저장소 안의 폴더 경로에서 앞뒤 빗금을 뺀다. "Music/공연 실황/"은 "Music/공연 실황", 저장소 맨 위는 null이다. */
fun storageFolder(path: String): String? = path.trim('/').ifEmpty { null }

/** 곡이 추가된 달. 달 묶음의 [TrackGroup.key]와 같은 "2026-11" 꼴이다. */
fun monthOf(track: Track, zone: ZoneId): String {
    val date = Instant.ofEpochMilli(track.addedAtMs).atZone(zone)
    return "%04d-%02d".format(Locale.ROOT, date.year, date.monthValue)
}

fun keyOf(track: Track, kind: GroupKind, zone: ZoneId): String? = when (kind) {
    GroupKind.FOLDER -> track.folder
    GroupKind.SINGER -> singerOf(track)
    GroupKind.CHANNEL -> track.artistTag
    GroupKind.MONTH -> monthOf(track, zone)
}

/**
 * [tracks]를 [kind]로 묶는다. 달은 최근 달부터, 나머지는 이름의 가나다순이고 기준 정보가 없는 묶음은 맨 뒤다.
 * 묶음 안의 곡은 달 묶음이면 최근 추가순, 나머지는 이름순이다.
 */
fun groupsOf(tracks: List<Track>, kind: GroupKind, zone: ZoneId = ZoneId.systemDefault()): List<TrackGroup> {
    val collator = Collator.getInstance(Locale.KOREAN)
    val trackOrder = if (kind == GroupKind.MONTH) TrackOrder.RECENTLY_ADDED else TrackOrder.NAME
    val groups = tracks.groupBy { keyOf(it, kind, zone) }
        .map { (key, members) -> TrackGroup(kind, key, members.sortedFor(trackOrder)) }
    val known = groups.filter { it.key != null }
    val sortedKnown = if (kind == GroupKind.MONTH) {
        known.sortedByDescending { it.key }
    } else {
        known.sortedWith { a, b -> collator.compare(a.key, b.key) }
    }
    return sortedKnown + groups.filter { it.key == null }
}

/** [groupsOf]로 만든 묶음 중 [key]인 것. 그 사이 곡이 모두 사라졌으면 null. */
fun groupOf(tracks: List<Track>, kind: GroupKind, key: String?, zone: ZoneId = ZoneId.systemDefault()): TrackGroup? =
    groupsOf(tracks, kind, zone).firstOrNull { it.key == key }
