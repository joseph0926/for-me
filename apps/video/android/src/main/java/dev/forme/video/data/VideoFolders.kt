package dev.forme.video.data

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Process
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import androidx.compose.runtime.mutableStateMapOf
import androidx.core.content.edit
import androidx.core.net.toUri
import dev.forme.video.R
import java.io.FileNotFoundException
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap

internal data class FolderEntry(val id: String, val title: String, val isFolder: Boolean)
internal data class FolderListing(val title: String, val entries: List<FolderEntry>, val loading: Boolean)

internal class VideoFolders(private val context: Context) {
    private val names = context.getSharedPreferences("video_folder_names", Context.MODE_PRIVATE)
    private val videoAccess = context.getSharedPreferences("video_folder_access", Context.MODE_PRIVATE)
    private val temporaryVideoAccess = ConcurrentHashMap<Uri, Uri>()
    val roots = mutableStateMapOf<Uri, String>().apply {
        names.all.forEach { (uri, name) -> if (name is String) put(uri.toUri(), name) }
    }

    fun add(tree: Uri): Boolean {
        val name = roots.getOrPut(tree) { context.getString(R.string.folder) }
        return try {
            context.contentResolver.takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            names.edit { putString(tree.toString(), name) }
            true
        } catch (_: SecurityException) {
            false
        }
    }

    fun updateTitle(tree: Uri, title: String) {
        if (roots[tree] == title) return
        roots[tree] = title
        if (names.contains(tree.toString())) names.edit { putString(tree.toString(), title) }
    }

    // 재생 기록과 자막 설정은 개별 문서 주소를 쓰고, 폴더 권한으로 열 수 있는 주소는 따로 보존한다.
    fun rememberVideo(access: Uri): Uri {
        val id = DocumentsContract.getDocumentId(access)
        val document = DocumentsContract.buildDocumentUri(checkNotNull(access.authority), id)
        val tree = DocumentsContract.buildTreeDocumentUri(checkNotNull(access.authority), DocumentsContract.getTreeDocumentId(access))
        if (context.contentResolver.persistedUriPermissions.any { it.uri == tree && it.isReadPermission }) {
            videoAccess.edit { putString(document.toString(), access.toString()) }
            temporaryVideoAccess.remove(document)
        } else {
            temporaryVideoAccess[document] = access
        }
        return document
    }

    fun readableUri(document: Uri): Uri {
        val treeAddress = temporaryVideoAccess[document] ?: videoAccess.getString(document.toString(), null)?.toUri()
            ?: return document
        val direct = context.checkUriPermission(document, Process.myPid(), Process.myUid(), Intent.FLAG_GRANT_READ_URI_PERMISSION)
        return if (direct == PackageManager.PERMISSION_GRANTED) document else treeAddress
    }
}

private val videoExtensions = setOf("mp4", "m4v", "mkv", "webm", "mov", "avi", "wmv", "flv",
    "mpg", "mpeg", "3gp", "3g2", "ts", "mts", "m2ts", "vob", "ogv", "asf", "m2v", "mxf")

internal fun readVideoFolder(resolver: ContentResolver, tree: Uri, directoryId: String): FolderListing {
    val directory = DocumentsContract.buildDocumentUriUsingTree(tree, directoryId)
    val title = resolver.query(directory, arrayOf(Document.COLUMN_DISPLAY_NAME, Document.COLUMN_MIME_TYPE),
        null, null, null)?.use {
        if (it.moveToFirst() && it.getString(1) == Document.MIME_TYPE_DIR) it.getString(0) else null
    } ?: throw FileNotFoundException()

    val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, directoryId)
    val columns = arrayOf(Document.COLUMN_DOCUMENT_ID, Document.COLUMN_DISPLAY_NAME, Document.COLUMN_MIME_TYPE)
    return resolver.query(children, columns, null, null, null)?.use { cursor ->
        if (cursor.extras.containsKey(DocumentsContract.EXTRA_ERROR)) throw IOException()
        val entries = buildList {
            while (cursor.moveToNext()) {
                val id = cursor.getString(0) ?: continue
                val name = cursor.getString(1) ?: continue
                val mime = cursor.getString(2).orEmpty()
                val folder = mime == Document.MIME_TYPE_DIR
                val generic = mime.isEmpty() || mime == "application/octet-stream"
                if (folder || mime.startsWith("video/") || mime == "application/x-matroska" ||
                    (generic && name.substringAfterLast('.', "").lowercase() in videoExtensions)) {
                    add(FolderEntry(id, name, folder))
                }
            }
        }.sortedWith(compareByDescending<FolderEntry> { it.isFolder }.thenBy(String.CASE_INSENSITIVE_ORDER) { it.title }
            .thenBy { it.id })
        FolderListing(title, entries, cursor.extras.getBoolean(DocumentsContract.EXTRA_LOADING))
    } ?: throw IOException()
}
