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
import java.util.concurrent.CancellationException
import java.util.concurrent.ConcurrentHashMap

internal data class FolderEntry(val id: String, val title: String, val isFolder: Boolean, val mime: String = "")
internal data class FolderListing(val title: String, val entries: List<FolderEntry>, val loading: Boolean, val temporaryAccess: Boolean)

data class QueuedVideo(val documentId: String, val title: String)

/** 폴더 목록에서 연 영상의 같은 폴더 영상 순서. 시스템 선택기나 최근 목록에서 연 영상에는 없다. */
data class FolderQueue(val tree: Uri, val directoryId: String, val videos: List<QueuedVideo>, val index: Int) {
    val current: QueuedVideo? get() = videos.getOrNull(index)
    val next: QueuedVideo? get() = videos.getOrNull(index + 1)

    fun advanced(): FolderQueue = copy(index = index + 1)
}

/** 목록에 보인 순서(하위 폴더 제외)대로 [playedId] 영상의 자리를 잡는다. */
internal fun folderQueue(tree: Uri, directoryId: String, entries: List<FolderEntry>, playedId: String): FolderQueue {
    val videos = entries.filterNot { it.isFolder }.map { QueuedVideo(it.id, it.title) }
    return FolderQueue(tree, directoryId, videos, videos.indexOfFirst { it.documentId == playedId })
}

/** 폴더에서 찾은 자막. [persistent]는 폴더 권한이 앱을 다시 켠 뒤에도 남는지다. */
internal data class FolderSubtitle(val uri: Uri, val name: String, val persistent: Boolean)

// 같은 이름 안에서는 이 순서로 고른다. TextSubtitles가 읽는 형식과 맞춘다.
private val subtitleExtensions = listOf("srt", "smi", "sami", "vtt", "ass", "ssa")
private val koreanTags = setOf("ko", "kor", "korean", "kr", "ko-kr")

/**
 * [videoName]과 이름이 같은 자막을 고른다. `영화.srt`처럼 이름이 똑같은 파일, `영화.ko.srt`처럼 한국어 표시가 붙은 파일,
 * `영화.en.srt`처럼 다른 표시가 붙은 파일 순이다. 대소문자는 구분하지 않는다.
 */
internal fun matchingSubtitle(videoName: String, files: List<FolderEntry>): FolderEntry? {
    val videoStem = videoName.substringBeforeLast('.')
    val videoStems = files.filter { !it.isFolder && isVideoFile(it.title, it.mime) }
        .mapTo(mutableSetOf()) { it.title.substringBeforeLast('.').lowercase() }
    fun rank(file: FolderEntry): Int? {
        val stem = file.title.substringBeforeLast('.')
        if (stem.equals(videoStem, ignoreCase = true)) return 0
        if (!stem.startsWith("$videoStem.", ignoreCase = true)) return null
        // 점 뒤의 표시가 다른 영상 이름의 일부라면 더 구체적인 이름을 가진 영상에 속한다.
        var owner = stem.lowercase()
        while ('.' in owner && !owner.equals(videoStem, ignoreCase = true)) {
            if (owner in videoStems) return null
            owner = owner.substringBeforeLast('.')
        }
        return if (stem.substring(videoStem.length + 1).lowercase() in koreanTags) 1 else 2
    }
    return files.filter { !it.isFolder && it.title.substringAfterLast('.', "").lowercase() in subtitleExtensions }
        .mapNotNull { file -> rank(file)?.let { file to it } }
        .minWithOrNull(compareBy<Pair<FolderEntry, Int>> { it.second }
            .thenBy { subtitleExtensions.indexOf(it.first.title.substringAfterLast('.').lowercase()) }
            .thenBy(String.CASE_INSENSITIVE_ORDER) { it.first.title })
        ?.first
}

/** 폴더에서 연 영상 옆에서 같은 이름의 자막을 찾는다. 목록을 읽지 못하면 영상만 재생한다. */
internal fun findFolderSubtitle(resolver: ContentResolver, queue: FolderQueue): FolderSubtitle? {
    val videoName = queue.current?.title ?: return null
    val files = try {
        queryChildren(resolver, queue.tree, queue.directoryId).entries
    } catch (_: IOException) {
        return null
    } catch (_: SecurityException) {
        return null
    }
    val match = matchingSubtitle(videoName, files) ?: return null
    return FolderSubtitle(DocumentsContract.buildDocumentUriUsingTree(queue.tree, match.id), match.title,
        persistent = resolver.hasPersistentRead(queue.tree))
}

private val childColumns = arrayOf(Document.COLUMN_DOCUMENT_ID, Document.COLUMN_DISPLAY_NAME, Document.COLUMN_MIME_TYPE)

private data class ChildDocuments(val entries: List<FolderEntry>, val loading: Boolean)

/** 두 화면이 받는 문서 열과 제공자의 조회 실패를 한 곳에서 해석한다. */
private fun queryChildren(resolver: ContentResolver, tree: Uri, directoryId: String,
    include: (FolderEntry) -> Boolean = { true }): ChildDocuments {
    val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, directoryId)
    return try {
        resolver.query(children, childColumns, null, null, null)?.use { cursor ->
            if (cursor.extras.containsKey(DocumentsContract.EXTRA_ERROR)) throw IOException()
            val entries = buildList {
                while (cursor.moveToNext()) {
                    val id = cursor.getString(0) ?: continue
                    val name = cursor.getString(1) ?: continue
                    val mime = cursor.getString(2).orEmpty()
                    val entry = FolderEntry(id, name, mime == Document.MIME_TYPE_DIR, mime)
                    if (include(entry)) add(entry)
                }
            }
            ChildDocuments(entries, cursor.extras.getBoolean(DocumentsContract.EXTRA_LOADING))
        } ?: throw IOException()
    } catch (error: CancellationException) {
        throw error
    } catch (error: SecurityException) {
        throw error
    } catch (error: RuntimeException) {
        throw IOException("Cannot read folder listing", error)
    }
}

internal class VideoFolders(private val context: Context) {
    private val names = context.getSharedPreferences("video_folder_names", Context.MODE_PRIVATE)
    private val videoAccess = context.getSharedPreferences("video_folder_access", Context.MODE_PRIVATE)
    private val temporaryVideoAccess = ConcurrentHashMap<Uri, Uri>()
    val roots = mutableStateMapOf<Uri, String>().apply {
        names.all.forEach { (uri, name) -> if (name is String) put(uri.toUri(), name) }
    }

    fun add(tree: Uri) {
        val name = roots.getOrPut(tree) { context.getString(R.string.folder) }
        try {
            context.contentResolver.takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            names.edit { putString(tree.toString(), name) }
        } catch (_: SecurityException) {
            // 이번 실행에서 받은 읽기 권한으로 목록을 연다.
        }
    }

    /** 폴더 목록과 홈 바로가기가 같은 순서로 보이도록 이름, 주소 순으로 정렬한다. */
    fun sortedRoots(): List<Pair<Uri, String>> =
        roots.entries.sortedWith(compareBy({ it.value.lowercase() }, { it.key.toString() })).map { it.key to it.value }

    /**
     * [records](최근 순) 중 [tree] 폴더나 그 하위 폴더에서 연 영상의 주소를 처음 하나 돌려준다.
     * 폴더에서 열 때 남긴 접근 주소로만 판단하므로 시스템 선택기로 연 영상은 고르지 않는다.
     */
    fun latestVideoIn(tree: Uri, records: List<PlaybackRecord>): String? {
        val treeId = DocumentsContract.getTreeDocumentId(tree)
        return records.firstOrNull { record ->
            val document = record.uri.toUri()
            val access = temporaryVideoAccess[document] ?: videoAccess.getString(record.uri, null)?.toUri()
            access != null && access.authority == tree.authority && DocumentsContract.getTreeDocumentId(access) == treeId
        }?.uri
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
        if (context.contentResolver.hasPersistentRead(tree)) {
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

private fun ContentResolver.hasPersistentRead(tree: Uri): Boolean =
    persistedUriPermissions.any { it.uri == tree && it.isReadPermission }

private val videoExtensions = setOf("mp4", "m4v", "mkv", "webm", "mov", "avi", "wmv", "flv",
    "mpg", "mpeg", "3gp", "3g2", "ts", "mts", "m2ts", "vob", "ogv", "asf", "m2v", "mxf")

private fun isVideoFile(name: String, mime: String): Boolean {
    val generic = mime.isEmpty() || mime == "application/octet-stream"
    return mime.startsWith("video/") || mime == "application/x-matroska" ||
        (generic && name.substringAfterLast('.', "").lowercase() in videoExtensions)
}

internal fun readVideoFolder(resolver: ContentResolver, tree: Uri, directoryId: String): FolderListing {
    val directory = DocumentsContract.buildDocumentUriUsingTree(tree, directoryId)
    val title = resolver.query(directory, arrayOf(Document.COLUMN_DISPLAY_NAME, Document.COLUMN_MIME_TYPE),
        null, null, null)?.use {
        if (it.moveToFirst() && it.getString(1) == Document.MIME_TYPE_DIR) it.getString(0) else null
    } ?: throw FileNotFoundException()

    val children = queryChildren(resolver, tree, directoryId) { it.isFolder || isVideoFile(it.title, it.mime) }
    val entries = children.entries.sortedWith(compareByDescending<FolderEntry> { it.isFolder }.thenBy(String.CASE_INSENSITIVE_ORDER) { it.title }
            .thenBy { it.id })
    return FolderListing(title, entries, children.loading, temporaryAccess = !resolver.hasPersistentRead(tree))
}
