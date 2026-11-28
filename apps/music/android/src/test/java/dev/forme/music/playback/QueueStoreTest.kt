package dev.forme.music.playback

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import dev.forme.music.data.MusicDatabase
import dev.forme.music.data.QueueItemRecord
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class QueueStoreTest {
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

    @Test fun nothingSavedRestoresNothing() = runTest {
        assertNull(QueueStore(database.queue()).restore())
    }

    @Test fun lastRequestedSaveWinsAndSurvivesReopening() = runTest {
        val store = QueueStore(database.queue())
        val queue = snapshot(items("부디", "아라리", "잘할게요"), currentIndex = 0, positionMs = 0)
        store.saveQueue(queue)
        store.savePosition(queue.copy(currentIndex = 1, positionMs = 61_000))
        store.savePosition(queue.copy(currentIndex = 2, positionMs = 125_500, shuffle = true, repeatMode = 2))
        // 복원도 저장과 같은 줄에서 실행되므로, 이 호출이 끝나면 앞의 저장도 모두 끝나 있다.
        store.restore()
        database.close()
        database = open()

        val restored = QueueStore(database.queue()).restore()!!
        assertEquals(listOf("부디", "아라리", "잘할게요"), restored.items.map { it.name })
        assertEquals(2, restored.currentIndex)
        assertEquals(125_500, restored.positionMs)
        assertEquals(true, restored.shuffle)
        assertEquals(2, restored.repeatMode)
    }

    @Test fun newQueueReplacesOldOneCompletely() = runTest {
        val store = QueueStore(database.queue())
        store.saveQueue(snapshot(items("가", "나", "다"), currentIndex = 2, positionMs = 10))
        store.saveQueue(snapshot(items("라"), currentIndex = 0, positionMs = 0))
        val restored = store.restore()!!
        assertEquals(listOf("라"), restored.items.map { it.name })
        assertEquals(0, restored.currentIndex)
    }

    @Test fun outOfRangeStateIsPulledBackIntoTheQueue() = runTest {
        val store = QueueStore(database.queue())
        store.saveQueue(snapshot(items("가", "나"), currentIndex = 5, positionMs = -30))
        val restored = store.restore()!!
        assertEquals(1, restored.currentIndex)
        assertEquals(0, restored.positionMs)
    }

    @Test fun mediaItemKeepsUriNameAndTagTitle() {
        val record = QueueItemRecord(3, "content://media/external/audio/media/7", "부디", "[LIVE] 심규선 - 부디")
        assertEquals(record, record.toMediaItem().toQueueItem(3))
    }

    private fun items(vararg names: String) =
        names.mapIndexed { index, name -> QueueItemRecord(index, "content://media/$name", name, tagTitle = null) }

    private fun snapshot(items: List<QueueItemRecord>, currentIndex: Int, positionMs: Long) =
        QueueSnapshot(items, currentIndex, positionMs, shuffle = false, repeatMode = 0)
}
