package dev.forme.music.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

class TrackGroupsTest {
    private val seoul = ZoneId.of("Asia/Seoul")

    @Test fun singerComesFromTagTitleBeforeFileName() {
        // 사용자 음악의 태그 제목 형태(2026-11-28 형식 확인)
        assertEquals("심규선", singerOf(track("부디", tagTitle = "[LIVE] 심규선 - 부디 (즉흥 싱크룸)")))
        assertEquals("지코(ZICO)", singerOf(track("Sick", tagTitle = "지코(ZICO) - 아프다")))
        assertEquals("아이유", singerOf(track("밤편지", tagTitle = "아이유 - 밤편지 | 2025.06.01 공연")))
        assertEquals("10CM", singerOf(track("10CM - 봄날 1", tagTitle = "10CM - 봄날 | 2025.01.10 공연")))
        assertEquals("심규선", singerOf(track("아라리 - 즉흥", tagTitle = "[LIVE] 심규선 - 아라리")))
    }

    @Test fun singerFallsBackToFileNameThenUnknown() {
        assertEquals("성시경", singerOf(track("성시경 - 거리에서")))
        assertEquals("태연", singerOf(track("태연 - 사계", tagTitle = "사계 라이브")))
        assertNull(singerOf(track("부디")))
        // 파일 이름에 곡명이 없는 사용자 음악 1곡
        assertNull(singerOf(track("Lyrics Video   -")))
    }

    @Test fun folderKeepsPathWithoutSlashes() {
        assertEquals("Music/공연 실황", storageFolder("Music/공연 실황/"))
        assertEquals("Download", storageFolder("/Download"))
        assertNull(storageFolder("/"))
    }

    @Test fun namedGroupsFollowKoreanOrderAndUnknownGoesLast() {
        val tracks = listOf(
            track("잔나비 - 꽃갈피"),
            track("부디"),
            track("아이유 - 밤편지"),
            track("아이유 - 사계"),
        )
        val groups = groupsOf(tracks, GroupKind.SINGER, seoul)
        assertEquals(listOf("아이유", "잔나비", null), groups.map { it.key })
        assertEquals(listOf("아이유 - 밤편지", "아이유 - 사계"), groups[0].tracks.map { it.name })
    }

    @Test fun channelAndFolderUseTheirOwnFields() {
        val tracks = listOf(
            track("가", folder = "Music/커버", artistTag = "Cover Lab"),
            track("나", folder = "Music/공연 실황", artistTag = "LiveClip TV"),
            track("다", folder = null, artistTag = null),
        )
        assertEquals(listOf("Music/공연 실황", "Music/커버", null), groupsOf(tracks, GroupKind.FOLDER, seoul).map { it.key })
        assertEquals(listOf("Cover Lab", "LiveClip TV", null), groupsOf(tracks, GroupKind.CHANNEL, seoul).map { it.key })
    }

    @Test fun monthsAreLocalAndNewestFirst() {
        // 서울 12월 1일 0시 30분은 UTC로 11월 30일이다. 사용자가 보는 달로 묶여야 한다.
        val decemberFirst = LocalDate.of(2026, 12, 1).atTime(0, 30).atZone(seoul).toInstant().toEpochMilli()
        val november = LocalDate.of(2026, 11, 3).atStartOfDay(seoul).toInstant().toEpochMilli()
        val tracks = listOf(track("가", addedAtMs = november), track("나", addedAtMs = decemberFirst))
        val groups = groupsOf(tracks, GroupKind.MONTH, seoul)
        assertEquals(listOf("2026-12", "2026-11"), groups.map { it.key })
    }

    @Test fun groupOfFindsTheSameMembersOrNull() {
        val tracks = listOf(track("아이유 - 사계"), track("아이유 - 밤편지"), track("부디"))
        assertEquals(listOf("아이유 - 밤편지", "아이유 - 사계"), groupOf(tracks, GroupKind.SINGER, "아이유", seoul)?.tracks?.map { it.name })
        assertEquals(listOf("부디"), groupOf(tracks, GroupKind.SINGER, null, seoul)?.tracks?.map { it.name })
        assertNull(groupOf(tracks, GroupKind.SINGER, "태연", seoul))
    }

    private fun track(
        name: String,
        tagTitle: String? = null,
        addedAtMs: Long = 0,
        folder: String? = null,
        artistTag: String? = null,
    ) = Track("content://media/$name", name, tagTitle, durationMs = 0, addedAtMs = addedAtMs, folder = folder, artistTag = artistTag)
}
