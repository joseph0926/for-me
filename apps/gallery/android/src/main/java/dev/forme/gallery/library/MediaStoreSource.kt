package dev.forme.gallery.library

import android.content.ContentResolver
import android.content.ContentUris
import android.net.Uri
import android.provider.MediaStore
import android.provider.MediaStore.Files.FileColumns

/**
 * 기기의 사진과 동영상 목록을 MediaStore에서 읽는다. 앱이 읽을 수 있는 항목만 돌아오므로,
 * 부분 허용이면 사용자가 고른 항목만 나온다. 휴지통과 아직 쓰는 중인 항목은 기본 조회에서 빠진다.
 */
class MediaStoreSource(private val resolver: ContentResolver) {
    fun loadAll(): List<MediaItem> {
        val projection = arrayOf(
            FileColumns._ID,
            FileColumns.MEDIA_TYPE,
            FileColumns.DATE_TAKEN,
            FileColumns.DATE_MODIFIED,
            FileColumns.DURATION,
            FileColumns.IS_FAVORITE,
        )
        val selection = "${FileColumns.MEDIA_TYPE} IN (?, ?)"
        val args = arrayOf(FileColumns.MEDIA_TYPE_IMAGE.toString(), FileColumns.MEDIA_TYPE_VIDEO.toString())
        val cursor = try {
            resolver.query(filesCollection, projection, selection, args, null)
        } catch (e: SecurityException) {
            // 권한이 읽기 직전에 회수된 경우다. 화면은 다시 보일 때 권한을 새로 확인한다.
            null
        } ?: return emptyList()

        return cursor.use { c ->
            val id = c.getColumnIndexOrThrow(FileColumns._ID)
            val type = c.getColumnIndexOrThrow(FileColumns.MEDIA_TYPE)
            val taken = c.getColumnIndexOrThrow(FileColumns.DATE_TAKEN)
            val modified = c.getColumnIndexOrThrow(FileColumns.DATE_MODIFIED)
            val duration = c.getColumnIndexOrThrow(FileColumns.DURATION)
            val favorite = c.getColumnIndexOrThrow(FileColumns.IS_FAVORITE)
            buildList(c.count) {
                while (c.moveToNext()) {
                    val modifiedSeconds = c.getLong(modified)
                    add(
                        MediaItem(
                            id = c.getLong(id),
                            kind = if (c.getInt(type) == FileColumns.MEDIA_TYPE_VIDEO) MediaKind.VIDEO else MediaKind.PHOTO,
                            // 촬영 정보가 없는 파일(받은 이미지, 화면 캡처 일부)은 파일을 마지막으로 고친 시각으로 둔다.
                            takenAtMillis = if (c.isNull(taken)) modifiedSeconds * 1000 else c.getLong(taken),
                            modifiedSeconds = modifiedSeconds,
                            durationMillis = if (c.isNull(duration)) 0 else c.getLong(duration),
                            favorite = c.getInt(favorite) == 1,
                        ),
                    )
                }
            }
        }
    }

    companion object {
        /** 사진과 동영상이 함께 있는 표. 바뀌었는지 지켜볼 때도 이 주소를 쓴다. */
        val filesCollection: Uri = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL)
    }
}

/** 썸네일과 이후 사진 보기, 휴지통 요청에 쓰는 항목 주소. 요청 함수는 Images나 Video 표의 주소를 받는다. */
fun MediaItem.contentUri(): Uri {
    val collection = when (kind) {
        MediaKind.PHOTO -> MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        MediaKind.VIDEO -> MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
    }
    return ContentUris.withAppendedId(collection, id)
}
