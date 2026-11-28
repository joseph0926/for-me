package dev.forme.music.data

import org.junit.Assert.assertEquals
import org.junit.Test

class TrackTest {
    @Test fun nameDropsOnlyTheLastExtension() {
        assertEquals("부디", trackNameOf("부디.mp3"))
        assertEquals("널 미워하기로 했어", trackNameOf("널 미워하기로 했어.mp3"))
        assertEquals("Vol.1 Intro", trackNameOf("Vol.1 Intro.flac"))
    }

    @Test fun nameTrimsSpacesLeftByTheDownloader() {
        // 사용자 음악에 실제로 있는 형태(2026-11-28 형식 확인)
        assertEquals("Lyrics Video   -", trackNameOf("Lyrics Video   -  .mp3"))
    }

    @Test fun nameKeepsFilesWithoutExtensionOrBaseName() {
        assertEquals("노래", trackNameOf("노래"))
        assertEquals(".mp3", trackNameOf(".mp3"))
    }

    @Test fun nameOrderFollowsKoreanDictionaryOrder() {
        val tracks = listOf(track("잘할게요", 1), track("모르시나요", 2), track("부디", 3), track("내사랑내곁에", 4))
        assertEquals(
            listOf("내사랑내곁에", "모르시나요", "부디", "잘할게요"),
            tracks.sortedFor(TrackOrder.NAME).map { it.name },
        )
    }

    @Test fun recentlyAddedComesFirst() {
        val tracks = listOf(track("가", 10), track("나", 30), track("다", 20))
        assertEquals(listOf("나", "다", "가"), tracks.sortedFor(TrackOrder.RECENTLY_ADDED).map { it.name })
    }

    @Test fun searchLooksAtNameAndTagTitle() {
        val tracks = listOf(
            track("부디", 1, tagTitle = "[LIVE] 심규선 - 부디 (즉흥 싱크룸)"),
            track("아라리", 2, tagTitle = "[LIVE] 심규선 - 아라리 (즉흥 싱크룸)"),
            track("Sick", 3, tagTitle = "지코(ZICO) - 아프다"),
        )
        assertEquals(listOf("부디", "아라리"), tracks.matching(" 심규선 ").map { it.name })
        assertEquals(listOf("Sick"), tracks.matching("zico").map { it.name })
        assertEquals(tracks, tracks.matching("  "))
    }

    private fun track(name: String, addedAtMs: Long, tagTitle: String? = null) =
        Track("content://media/$name", name, tagTitle, durationMs = 0, addedAtMs = addedAtMs)
}
