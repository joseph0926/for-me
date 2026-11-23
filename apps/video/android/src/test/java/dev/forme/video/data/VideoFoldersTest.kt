package dev.forme.video.data

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.content.pm.ProviderInfo
import android.database.MatrixCursor
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowContentResolver
import java.io.FileNotFoundException

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class VideoFoldersTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val tree = DocumentsContract.buildTreeDocumentUri("test.folders", "opaque:root")
    private val provider = FolderProvider().apply {
        attachInfo(context, ProviderInfo().apply { authority = "test.folders" })
        ShadowContentResolver.registerProviderInternal("test.folders", this)
    }

    @Test fun filtersSortsAndReadsAgainAfterRevocationOrDeletion() {
        fun list() = readVideoFolder(context.contentResolver, tree, "opaque:child")
        assertEquals(listOf("Series", "Clip.MKV", "stream"), list().entries.map { it.title })
        provider.denied = true
        assertThrows(SecurityException::class.java) { list() }
        provider.denied = false
        provider.exists = false
        assertThrows(FileNotFoundException::class.java) { list() }
        provider.exists = true
        assertEquals("다시 열 폴더", list().title)
        assertEquals("opaque:child", DocumentsContract.getDocumentId(provider.lastQuery))
    }

    @Test fun subtitleWithTheSameNameWinsThenKoreanTagThenOtherTags() {
        fun file(name: String) = FolderEntry(name, name, isFolder = false)
        val files = listOf(file("Movie.en.srt"), file("Movie.ko.vtt"), file("movie.smi"), file("Movie.srt"),
            file("Movie 2.srt"), file("Movie.srt.bak"), FolderEntry("dir", "Movie.srt", isFolder = true))
        assertEquals("Movie.srt", matchingSubtitle("Movie.mkv", files)?.id)
        assertEquals("movie.smi", matchingSubtitle("Movie.mkv", files - file("Movie.srt"))?.id)
        assertEquals("Movie.ko.vtt", matchingSubtitle("Movie.mkv", listOf(file("Movie.en.srt"), file("Movie.ko.vtt")))?.id)
        assertEquals("Movie.en.srt", matchingSubtitle("Movie.mkv", listOf(file("Movie.en.srt"), file("Movie 2.srt")))?.id)
        assertNull(matchingSubtitle("Movie.mkv", listOf(file("Movie 2.srt"), file("Movie.srt.bak"), file("Other.srt"))))
    }

    @Test fun numberedSiblingOwnsItsSubtitles() {
        fun file(name: String) = FolderEntry(name, name, false)
        val files = listOf("Movie.mkv", "Movie.Part2.mkv", "Movie.Part2.srt", "Movie.Part2.ko.srt").map(::file)
        assertNull(matchingSubtitle("Movie.mkv", files))
        assertEquals("Movie.Part2.srt", matchingSubtitle("Movie.Part2.mkv", files)?.title)
    }

    @Test fun optionalSubtitleSearchSurvivesFailedDirectoryQuery() {
        val queue = FolderQueue(tree, "opaque:child", listOf(QueuedVideo("v2", "Clip.MKV")), 0)
        provider.invalidListing = true
        assertThrows(java.io.IOException::class.java) { readVideoFolder(context.contentResolver, tree, queue.directoryId) }
        assertNull(findFolderSubtitle(context.contentResolver, queue))
        provider.invalidListing = false
        assertEquals("Clip.smi", findFolderSubtitle(context.contentResolver, queue)?.name)
    }

    @Test fun findsTheSubtitleNextToTheVideoInTheSameFolder() {
        val queue = folderQueue(tree, "opaque:child", listOf(FolderEntry("v2", "Clip.MKV", isFolder = false)), "v2")
        val found = checkNotNull(findFolderSubtitle(context.contentResolver, queue))
        assertEquals(DocumentsContract.buildDocumentUriUsingTree(tree, "s2"), found.uri)
        assertEquals("Clip.smi", found.name)
        assertFalse(found.persistent)
        assertEquals("opaque:child", DocumentsContract.getDocumentId(provider.lastQuery))
        val unmatched = folderQueue(tree, "opaque:child", listOf(FolderEntry("v1", "stream", isFolder = false)), "v1")
        assertNull(findFolderSubtitle(context.contentResolver, unmatched))
    }

    @Test fun folderAndFileSelectionsShareTheSameDocumentKey() {
        val onlyTreeGranted = object : ContextWrapper(context) {
            override fun checkUriPermission(uri: Uri, pid: Int, uid: Int, modeFlags: Int) = PackageManager.PERMISSION_DENIED
        }
        val folders = VideoFolders(onlyTreeGranted)
        val access = DocumentsContract.buildDocumentUriUsingTree(tree, "movie:12")
        val direct = DocumentsContract.buildDocumentUri("test.folders", "movie:12")
        assertEquals(direct, folders.rememberVideo(access))
        assertEquals(access, folders.readableUri(direct))
        assertEquals(direct, VideoFolders(onlyTreeGranted).readableUri(direct))
    }

    @Test fun homeShortcutFindsTheLatestVideoOpenedFromEachFolder() {
        val folders = VideoFolders(context)
        val other = DocumentsContract.buildTreeDocumentUri("test.folders", "opaque:other")
        val inSubfolder = folders.rememberVideo(DocumentsContract.buildDocumentUriUsingTree(tree, "opaque:child/clip"))
        val older = folders.rememberVideo(DocumentsContract.buildDocumentUriUsingTree(tree, "opaque:old"))
        val elsewhere = folders.rememberVideo(DocumentsContract.buildDocumentUriUsingTree(other, "opaque:b1"))
        fun record(uri: Uri) = PlaybackRecord(uri.toString(), "", 0, 0, 0)
        val picked = DocumentsContract.buildDocumentUri("test.folders", "picked")
        val recent = listOf(record(picked), record(elsewhere), record(inSubfolder), record(older))

        assertEquals(inSubfolder.toString(), folders.latestVideoIn(tree, recent))
        assertEquals(elsewhere.toString(), folders.latestVideoIn(other, recent))
        assertNull(folders.latestVideoIn(DocumentsContract.buildTreeDocumentUri("test.folders", "opaque:empty"), recent))
    }

    @Test fun rootsAreSortedByNameThenAddress() {
        val folders = VideoFolders(context)
        val b = DocumentsContract.buildTreeDocumentUri("test.folders", "b")
        val a = DocumentsContract.buildTreeDocumentUri("test.folders", "a")
        folders.roots[b] = "movies"
        folders.roots[tree] = "Anime"
        folders.roots[a] = "movies"
        assertEquals(listOf(tree, a, b), folders.sortedRoots().map { it.first })
    }
}

private class FolderProvider : ContentProvider() {
    var denied = false
    var invalidListing = false
    var exists = true
    lateinit var lastQuery: Uri
    override fun onCreate() = true
    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?,
        sortOrder: String?): MatrixCursor {
        if (denied) throw SecurityException()
        lastQuery = uri
        val cursor = MatrixCursor(checkNotNull(projection))
        if (!exists) return cursor
        if (uri.lastPathSegment == "children") {
            if (invalidListing) throw IllegalStateException("Folder listing unavailable")
            cursor.addRow(arrayOf("v1", "stream", "video/mp4"))
            cursor.addRow(arrayOf("s1", "자막.srt", "application/octet-stream"))
            cursor.addRow(arrayOf("s2", "Clip.smi", "application/smil"))
            cursor.addRow(arrayOf("s3", "Clip.ko.srt", "application/x-subrip"))
            cursor.addRow(arrayOf("f1", "Series", Document.MIME_TYPE_DIR))
            cursor.addRow(arrayOf("v2", "Clip.MKV", "application/octet-stream"))
            cursor.addRow(arrayOf("a1", "song.mp4", "audio/mp4"))
        } else {
            cursor.addRow(arrayOf("다시 열 폴더", Document.MIME_TYPE_DIR))
        }
        return cursor
    }

    override fun getType(uri: Uri): String? = null
    override fun insert(uri: Uri, values: ContentValues?): Uri? = error("Read only")
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = error("Read only")
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = error("Read only")
}
