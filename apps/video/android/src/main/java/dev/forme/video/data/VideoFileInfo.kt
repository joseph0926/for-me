package dev.forme.video.data

import android.content.Context
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.provider.DocumentsContract.Document
import android.provider.OpenableColumns
import java.io.IOException
import java.util.Locale

data class VideoTrackInfo(val width: Int, val height: Int, val codec: String, val frameRate: Float?)
data class AudioTrackInfo(val channels: Int, val sampleRateHz: Int, val codec: String)

/**
 * 상세 화면의 파일 정보. 크기와 날짜, 트랙 정보는 각각 따로 읽어 하나가 실패해도 나머지는 보여 준다.
 * [tracksRead]가 false이면 Android가 이 파일의 트랙을 읽지 못한 것이다. libVLC는 재생할 수도 있다.
 */
data class VideoFileInfo(
    val sizeBytes: Long?,
    val modifiedAt: Long?,
    val container: String?,
    val video: VideoTrackInfo?,
    val audio: AudioTrackInfo?,
    val tracksRead: Boolean,
)

/** [uri]는 읽을 수 있는 주소(폴더 권한으로 연 영상이면 폴더 기준 주소)여야 한다. 원본은 읽기만 한다. */
internal fun readVideoFileInfo(context: Context, uri: Uri, displayName: String): VideoFileInfo {
    val resolver = context.contentResolver
    val size = readLongColumn(context, uri, OpenableColumns.SIZE)
    // 문서 제공자가 아닌 주소는 수정 시각 열이 없을 수 있다.
    val modified = readLongColumn(context, uri, Document.COLUMN_LAST_MODIFIED)
    val container = displayName.substringAfterLast('.', "").takeIf { it.isNotEmpty() && it.length <= 5 }
        ?.uppercase(Locale.ROOT)
        ?: runCatching { resolver.getType(uri) }.getOrNull()?.substringAfter('/')?.uppercase(Locale.ROOT)

    var video: VideoTrackInfo? = null
    var audio: AudioTrackInfo? = null
    val extractor = MediaExtractor()
    val tracksRead = try {
        extractor.setDataSource(context, uri, null)
        for (index in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(index)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
            if (video == null && mime.startsWith("video/")) {
                video = VideoTrackInfo(format.intOrZero(MediaFormat.KEY_WIDTH), format.intOrZero(MediaFormat.KEY_HEIGHT),
                    codecName(mime), format.frameRateOrNull())
            } else if (audio == null && mime.startsWith("audio/")) {
                audio = AudioTrackInfo(format.intOrZero(MediaFormat.KEY_CHANNEL_COUNT),
                    format.intOrZero(MediaFormat.KEY_SAMPLE_RATE), codecName(mime))
            }
        }
        true
    } catch (_: IOException) {
        false
    } catch (_: RuntimeException) {
        // 지원하지 않는 형식과 권한 회수는 IllegalArgumentException이나 SecurityException으로 온다.
        false
    } finally {
        extractor.release()
    }
    return VideoFileInfo(size, modified, container, video, audio, tracksRead)
}

private fun readLongColumn(context: Context, uri: Uri, column: String): Long? = try {
    context.contentResolver.query(uri, arrayOf(column), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getLong(0).takeIf { it > 0 } else null
    }
} catch (_: RuntimeException) {
    null
}

private fun MediaFormat.intOrZero(key: String): Int = if (containsKey(key)) getInteger(key) else 0

private fun MediaFormat.frameRateOrNull(): Float? {
    if (!containsKey(MediaFormat.KEY_FRAME_RATE)) return null
    // 컨테이너에 따라 정수나 실수로 저장된다.
    return runCatching { getInteger(MediaFormat.KEY_FRAME_RATE).toFloat() }
        .recoverCatching { getFloat(MediaFormat.KEY_FRAME_RATE) }.getOrNull()?.takeIf { it > 0f }
}

private val codecNames = mapOf(
    "video/avc" to "H.264",
    "video/hevc" to "H.265",
    "video/x-vnd.on2.vp8" to "VP8",
    "video/x-vnd.on2.vp9" to "VP9",
    "video/av01" to "AV1",
    "video/mp4v-es" to "MPEG-4",
    "video/mpeg2" to "MPEG-2",
    "video/3gpp" to "H.263",
    "audio/mp4a-latm" to "AAC",
    "audio/mpeg" to "MP3",
    "audio/opus" to "Opus",
    "audio/vorbis" to "Vorbis",
    "audio/ac3" to "AC-3",
    "audio/eac3" to "E-AC-3",
    "audio/flac" to "FLAC",
    "audio/raw" to "PCM",
)

/** 사람에게 익숙한 압축 방식 이름. 모르는 형식은 MIME의 뒷부분을 대문자로 보여 준다. */
internal fun codecName(mime: String): String =
    codecNames[mime.lowercase(Locale.ROOT)] ?: mime.substringAfter('/').removePrefix("x-").uppercase(Locale.ROOT)

internal fun formatFileSize(bytes: Long): String = when {
    bytes >= 1_000_000_000 -> String.format(Locale.ROOT, "%.1f GB", bytes / 1_000_000_000.0)
    bytes >= 1_000_000 -> String.format(Locale.ROOT, "%.1f MB", bytes / 1_000_000.0)
    bytes >= 1_000 -> String.format(Locale.ROOT, "%d KB", bytes / 1_000)
    else -> "$bytes B"
}

/** 세로 영상도 짧은 변을 기준으로 `1080p`처럼 쓴다. */
internal fun resolutionLabel(width: Int, height: Int): String? =
    minOf(width, height).takeIf { it > 0 }?.let { "${it}p" }

internal fun formatSampleRate(hertz: Int): String = String.format(Locale.ROOT, "%.1fkHz", hertz / 1000.0)

internal fun formatFrameRate(rate: Float): String =
    if (rate == Math.round(rate).toFloat()) "${Math.round(rate)}fps" else String.format(Locale.ROOT, "%.2ffps", rate)
