package dev.forme.music.data

import android.content.ContentResolver
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Log
import androidx.core.net.toUri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 휴대폰의 곡 목록. MediaStore의 음악과 파일 선택기로 직접 추가한 곡을 합친다.
 * 음악 파일은 읽기만 한다.
 */
class MusicLibrary(private val context: Context, private val database: MusicDatabase) {
    private val resolver: ContentResolver get() = context.contentResolver

    /** 지금 재생할 수 있는 곡. 음악 권한이 없으면 직접 추가한 곡만 나온다. */
    suspend fun load(hasAudioPermission: Boolean): List<Track> = withContext(Dispatchers.IO) {
        val stored = if (hasAudioPermission) mediaStoreTracks() else emptyList()
        val storedUris = stored.mapTo(HashSet()) { it.uri }
        // 직접 추가한 파일이 음악 목록에도 있으면 같은 곡이 두 번 보이지 않게 음악 목록 쪽만 남긴다.
        val picked = database.pickedTracks().all()
            .filter { it.uri !in storedUris && mediaStoreUriOf(it.uri) !in storedUris }
            .mapNotNull(::readablePickedTrack)
        stored + picked
    }

    /** 파일 선택기에서 고른 곡의 읽기 권한을 앱을 다시 열어도 쓸 수 있게 보관하고 목록에 더한다. */
    suspend fun addPicked(uris: List<Uri>, nowMs: Long): Int = withContext(Dispatchers.IO) {
        val records = uris.mapNotNull { uri ->
            try {
                resolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (error: SecurityException) {
                Log.w(TAG, "보관할 수 없는 권한: $uri", error)
                return@mapNotNull null
            }
            val fileName = displayNameOf(uri) ?: return@mapNotNull null
            PickedTrackRecord(uri.toString(), trackNameOf(fileName), nowMs)
        }
        database.pickedTracks().save(records)
        records.size
    }

    private fun mediaStoreTracks(): List<Track> {
        val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DATE_ADDED,
        )
        val tracks = mutableListOf<Track>()
        try {
            resolver.query(collection, projection, "${MediaStore.Audio.Media.IS_MUSIC} != 0", null, null)?.use { cursor ->
                val id = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val displayName = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
                val title = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val duration = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val dateAdded = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
                while (cursor.moveToNext()) {
                    val fileName = cursor.getString(displayName) ?: continue
                    val uri = ContentUris.withAppendedId(collection, cursor.getLong(id))
                    tracks += Track(
                        uri = uri.toString(),
                        name = trackNameOf(fileName),
                        tagTitle = cursor.getString(title)?.takeIf { it.isNotBlank() },
                        durationMs = cursor.getLong(duration),
                        addedAtMs = cursor.getLong(dateAdded) * 1000,
                    )
                }
            }
        } catch (error: SecurityException) {
            // 권한을 확인한 뒤 설정에서 거둬 간 경우다. 빈 목록으로 두고 화면이 권한 안내를 다시 보인다.
            Log.w(TAG, "음악 목록 권한 없음", error)
        }
        return tracks
    }

    /** 권한이 남아 있고 파일이 열리는 곡만 목록에 둔다. 사라진 곡의 기록은 지우지 않는다. */
    private fun readablePickedTrack(record: PickedTrackRecord): Track? {
        val uri = record.uri.toUri()
        val granted = resolver.persistedUriPermissions.any { it.uri == uri && it.isReadPermission }
        if (!granted || displayNameOf(uri) == null) return null
        return Track(record.uri, record.name, tagTitle = null, durationMs = 0, addedAtMs = record.addedAtMs)
    }

    /** 파일 선택기가 준 문서 주소를 같은 파일의 MediaStore 주소로 바꾼다. 바꿀 수 없으면 null. */
    private fun mediaStoreUriOf(documentUri: String): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
        val uri = documentUri.toUri()
        return try {
            // 다운로드 문서는 MediaStore.getMediaUri가 거절한다("Provider for this Uri is not supported", Android 17 가상 기기).
            // 그 문서 번호 "msf:<번호>"의 번호가 MediaStore 파일 번호여서 그대로 옮긴다. 공식 문서에 없는 형식이라 다르면 겹침을 두고 넘어간다.
            val documentId = DocumentsContract.getDocumentId(uri)
            if (uri.authority == DOWNLOADS_DOCUMENTS && documentId.startsWith("msf:")) {
                val id = documentId.removePrefix("msf:").toLongOrNull() ?: return null
                ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id).toString()
            } else {
                MediaStore.getMediaUri(context, uri)?.toString()
            }
        } catch (error: Exception) {
            // 권한이 없거나 MediaStore가 모르는 문서면 예외가 온다. 그때는 겹치지 않는 곡으로 본다.
            Log.d(TAG, "MediaStore 주소로 바꿀 수 없음: $documentUri", error)
            null
        }
    }

    private fun displayNameOf(uri: Uri): String? = try {
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0) else null
        }
    } catch (error: Exception) {
        // 파일이 지워졌거나 제공 앱이 사라지면 SecurityException, IllegalArgumentException 등이 온다.
        Log.w(TAG, "열 수 없는 파일: $uri", error)
        null
    }

    private companion object {
        const val TAG = "MusicLibrary"
        const val DOWNLOADS_DOCUMENTS = "com.android.providers.downloads.documents"
    }
}
