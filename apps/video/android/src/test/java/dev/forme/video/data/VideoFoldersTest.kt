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
            cursor.addRow(arrayOf("v1", "stream", "video/mp4"))
            cursor.addRow(arrayOf("s1", "자막.srt", "application/octet-stream"))
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
