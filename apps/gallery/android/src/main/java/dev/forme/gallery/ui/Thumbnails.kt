package dev.forme.gallery.ui

import android.content.ContentResolver
import android.os.CancellationSignal
import android.os.OperationCanceledException
import android.util.LruCache
import android.util.Size
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import dev.forme.gallery.library.MediaItem
import dev.forme.gallery.library.contentUri
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.job
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import java.io.IOException

/**
 * 격자 칸의 썸네일을 시스템 썸네일(ContentResolver.loadThumbnail)로 받는다. 시스템이 디스크에 캐시하므로
 * 앱은 메모리 캐시와 취소만 맡는다(2026-11-28 사용자 결정 "직접 로더", docs/research.md#개발-스택).
 */
class ThumbnailLoader(private val resolver: ContentResolver) {
    private val cache = object : LruCache<String, ImageBitmap>(cacheBytes()) {
        override fun sizeOf(key: String, value: ImageBitmap): Int = value.asAndroidBitmap().byteCount
    }

    // 썸네일 만들기는 디스크와 디코더를 쓰므로 동시에 몇 개만 돌린다. 빨리 지나간 칸의 작업은 차례를 기다리다 취소된다.
    private val slots = Semaphore(4)

    fun cached(item: MediaItem, sizePx: Int): ImageBitmap? = cache.get(keyOf(item, sizePx))

    /** 읽지 못하면(파일이 사라졌거나 깨졌거나 권한이 없으면) null. 실패는 캐시하지 않아 다음에 다시 시도한다. */
    suspend fun load(item: MediaItem, sizePx: Int): ImageBitmap? {
        cached(item, sizePx)?.let { return it }
        return slots.withPermit { withContext(Dispatchers.IO) { loadNow(item, sizePx) } }
    }

    private fun CoroutineScope.loadNow(item: MediaItem, sizePx: Int): ImageBitmap? {
        // 칸이 화면 밖으로 나가 코루틴이 취소되면 시스템 쪽 썸네일 만들기도 멈춘다.
        val signal = CancellationSignal()
        val onCancel = coroutineContext.job.invokeOnCompletion { cause -> if (cause != null) signal.cancel() }
        return try {
            val bitmap = resolver.loadThumbnail(item.contentUri(), Size(sizePx, sizePx), signal).asImageBitmap()
            cache.put(keyOf(item, sizePx), bitmap)
            bitmap
        } catch (e: OperationCanceledException) {
            throw CancellationException("썸네일 읽기 취소", e)
        } catch (e: IOException) {
            null
        } catch (e: SecurityException) {
            null
        } finally {
            onCancel.dispose()
        }
    }

    // 파일을 고치면 수정 시각이 바뀌어 새로 읽는다.
    private fun keyOf(item: MediaItem, sizePx: Int) = "${item.id}:${item.modifiedSeconds}:$sizePx"

    private companion object {
        fun cacheBytes(): Int = (Runtime.getRuntime().maxMemory() / 8).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
    }
}

@Composable
fun MediaThumbnail(item: MediaItem, loader: ThumbnailLoader, sizePx: Int, modifier: Modifier = Modifier) {
    val bitmap by produceState(loader.cached(item, sizePx), item.id, item.modifiedSeconds, sizePx) {
        if (value == null) value = loader.load(item, sizePx)
    }
    Box(modifier.background(GalleryColors.Sunken)) {
        bitmap?.let {
            Image(bitmap = it, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        }
    }
}
