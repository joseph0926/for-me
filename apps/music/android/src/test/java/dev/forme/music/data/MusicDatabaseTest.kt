package dev.forme.music.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MusicDatabaseTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val name = "test-${UUID.randomUUID()}.db"
    private lateinit var database: MusicDatabase

    private fun open() = Room.databaseBuilder(context, MusicDatabase::class.java, name).build()

    @Before fun setUp() {
        database = open()
    }

    @After fun tearDown() {
        database.close()
        context.deleteDatabase(name)
    }

    @Test fun playlistsAndTheirOrderSurviveReopening() = runTest {
        val id = database.playlists().create(PlaylistRecord(name = "출근", createdAtMs = 1))
        database.playlists().replaceTracks(
            id,
            listOf("content://a" to "부디", "content://b" to "아라리", "content://a" to "부디"),
        )
        database.close()
        database = open()

        val tracks = database.playlists().currentTracks(id)
        assertEquals(listOf("부디", "아라리", "부디"), tracks.map { it.name })
        assertEquals(listOf(0, 1, 2), tracks.map { it.position })
        assertEquals(listOf(3), database.playlists().summaries().first().map { it.trackCount })
    }

    @Test fun deletingPlaylistRemovesOnlyItsTracks() = runTest {
        val kept = database.playlists().create(PlaylistRecord(name = "남길 것", createdAtMs = 1))
        val removed = database.playlists().create(PlaylistRecord(name = "지울 것", createdAtMs = 2))
        database.playlists().replaceTracks(kept, listOf("content://a" to "부디"))
        database.playlists().replaceTracks(removed, listOf("content://b" to "아라리"))

        database.playlists().delete(removed)

        assertEquals(listOf("남길 것"), database.playlists().summaries().first().map { it.playlist.name })
        assertEquals(listOf("부디"), database.playlists().currentTracks(kept).map { it.name })
        assertEquals(emptyList<PlaylistTrackRecord>(), database.playlists().currentTracks(removed))
    }

    @Test fun replacingTracksWithShorterListLeavesNoStaleRows() = runTest {
        val id = database.playlists().create(PlaylistRecord(name = "목록", createdAtMs = 1))
        database.playlists().replaceTracks(id, listOf("content://a" to "가", "content://b" to "나", "content://c" to "다"))
        database.playlists().replaceTracks(id, listOf("content://c" to "다"))
        assertEquals(listOf("다"), database.playlists().currentTracks(id).map { it.name })
    }
}
