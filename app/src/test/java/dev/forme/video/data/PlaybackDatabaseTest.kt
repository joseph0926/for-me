package dev.forme.video.data

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class PlaybackDatabaseTest {
    @Test fun reopeningDatabasePreservesPositionsForEachUri() = runTest {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val name = "test-${UUID.randomUUID()}.db"
        fun open() = Room.databaseBuilder(context, PlaybackDatabase::class.java, name).build()
        val first = PlaybackRecord("content://videos/1", "같은 이름.mp4", 12_000, 90_000, 1)
        val second = PlaybackRecord("content://videos/2", "같은 이름.mp4", 50_000, 120_000, 2)
        var database = open()
        try {
            database.playback().save(first)
            database.playback().save(second)
            database.close()
            database = open()
            assertEquals(first, database.playback().find(first.uri))
            assertEquals(second, database.playback().find(second.uri))
            database.playback().save(first.copy(positionMs = 33_000, updatedAt = 3))
            val recent = database.playback().recent().first()
            assertEquals(listOf(first.uri, second.uri), recent.map { it.uri })
            assertEquals(33_000, recent.first().positionMs)
            assertNull(database.playback().find("content://videos/missing"))
        } finally {
            database.close()
            context.deleteDatabase(name)
        }
    }
}
