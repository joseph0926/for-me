package dev.forme.video.ui

import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import android.media.MediaMetadataRetriever
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import dev.forme.video.VideoApplication
import dev.forme.video.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext

// 폴더 목록을 빠르게 넘길 때 화면에서 사라진 행은 차례를 기다리다 취소되도록 동시 추출 수를 제한한다.
private val artworkPermits = Semaphore(2)

// 원본을 쓰거나 별도 파일을 만들지 않는 메모리 캐시다.
private val artworkCache = object : LruCache<String, Bitmap>(12 * 1024 * 1024) {
    override fun sizeOf(key: String, value: Bitmap) = value.allocationByteCount
}

@Composable
internal fun VideoArtwork(uri: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current.applicationContext
    val bitmap by produceState<Bitmap?>(artworkCache.get(uri), uri) {
        value = artworkCache.get(uri) ?: artworkPermits.withPermit { extractArtwork(context, uri) }
    }
    Box(modifier.background(Color(0xFF17212C)), contentAlignment = Alignment.Center) {
        val frame = bitmap
        if (frame != null) Image(frame.asImageBitmap(), null, Modifier.matchParentSize(), contentScale = ContentScale.Crop)
        else Icon(painterResource(R.drawable.ic_library), null, Modifier.size(28.dp), tint = Color(0xFF8C9BAA))
    }
}

private suspend fun extractArtwork(context: Context, uri: String): Bitmap? = withContext(Dispatchers.IO) {
    try {
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(context, (context as VideoApplication).folders.readableUri(uri.toUri()))
            if (Build.VERSION.SDK_INT >= 27) {
                retriever.getScaledFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, 800, 450)
                    ?.also { artworkCache.put(uri, it) }
            } else null
        } finally {
            retriever.release()
        }
    } catch (_: RuntimeException) {
        null // 지원하지 않는 형식과 접근 불가 파일도 목록에서 다시 열 수 있다.
    } catch (_: java.io.IOException) {
        null
    }
}
