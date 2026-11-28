package dev.forme.music.playback

import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import dev.forme.music.data.QueueItemRecord
import dev.forme.music.data.Track

/**
 * 대기열의 곡은 mediaId에 곡 URI를, 제목에 목록 이름을, 부제에 태그 제목을 둔다.
 * 재생 서비스는 mediaId로 재생할 주소를 다시 채우므로 화면 쪽 항목에는 주소가 없어도 된다.
 */
fun mediaItemOf(uri: String, name: String, tagTitle: String?): MediaItem = MediaItem.Builder()
    .setMediaId(uri)
    .setUri(uri)
    .setMediaMetadata(
        MediaMetadata.Builder()
            .setTitle(name)
            .setSubtitle(tagTitle)
            .setIsPlayable(true)
            .setIsBrowsable(false)
            .build(),
    )
    .build()

fun Track.toMediaItem(): MediaItem = mediaItemOf(uri, name, tagTitle)

fun QueueItemRecord.toMediaItem(): MediaItem = mediaItemOf(uri, name, tagTitle)

fun MediaItem.toQueueItem(position: Int) = QueueItemRecord(
    position = position,
    uri = mediaId,
    name = mediaMetadata.title?.toString() ?: mediaId,
    tagTitle = mediaMetadata.subtitle?.toString(),
)
