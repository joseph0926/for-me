package dev.forme.video.data

import android.provider.DocumentsContract
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class FolderQueueTest {
    private val tree = DocumentsContract.buildTreeDocumentUri("test.folders", "opaque:root")
    private val entries = listOf(
        FolderEntry("dir", "Season 2", isFolder = true),
        FolderEntry("a", "Episode 1.mp4", isFolder = false),
        FolderEntry("b", "Episode 2.mkv", isFolder = false),
        FolderEntry("c", "Episode 3.mp4", isFolder = false),
    )

    @Test fun nextFollowsTheListedOrderAndSkipsFolders() {
        val queue = folderQueue(tree, "opaque:root", entries, playedId = "a")
        assertEquals(QueuedVideo("b", "Episode 2.mkv"), queue.next)
        assertEquals(QueuedVideo("c", "Episode 3.mp4"), queue.advanced().next)
    }

    @Test fun lastVideoHasNoNext() {
        assertNull(folderQueue(tree, "opaque:root", entries, playedId = "c").next)
        assertNull(folderQueue(tree, "opaque:root", entries, playedId = "a").advanced().advanced().next)
    }
}
