package dev.forme.music.redesign

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.os.Build
import android.util.Log
import android.util.LruCache
import android.util.Size
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.toArgb
import androidx.core.graphics.ColorUtils
import androidx.core.graphics.get
import androidx.core.graphics.scale
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.core.net.toUri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.abs

/**
 * 곡 파일에 든 앨범 아트를 목록 크기로 읽어 둔다. 사용자 음악 12곡은 모두 500x500 그림이 들어 있다(2026-11-28 형식 확인).
 * 그림이 없는 곡도 다시 읽지 않도록 없음을 함께 기억한다.
 */
private object ArtworkCache {
    private val cache = object : LruCache<String, Any>(300) {}
    private val none = Any()

    fun peek(key: String): ImageBitmap? = cache.get(key) as? ImageBitmap
    fun known(key: String) = cache.get(key) != null

    suspend fun load(context: Context, uri: String, sizePx: Int): ImageBitmap? = withContext(Dispatchers.IO) {
        val key = "$uri@$sizePx"
        cache.get(key)?.let { return@withContext it as? ImageBitmap }
        val bitmap = read(context, uri, sizePx)?.asImageBitmap()
        cache.put(key, bitmap ?: none)
        bitmap
    }

    private fun read(context: Context, uri: String, sizePx: Int): Bitmap? {
        val parsed = uri.toUri()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && parsed.authority == "media") {
            try {
                return context.contentResolver.loadThumbnail(parsed, Size(sizePx, sizePx), null)
            } catch (error: Exception) {
                // 그림이 없거나 파일이 사라졌다. 아래에서 한 번 더 파일 태그를 직접 읽는다.
                Log.d(TAG, "썸네일 없음: $uri", error)
            }
        }
        // MediaMetadataRetriever의 use는 Android 10부터라 직접 닫는다.
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(context, parsed)
            retriever.embeddedPicture?.let { decodeScaled(it, sizePx) }
        } catch (error: Exception) {
            Log.d(TAG, "앨범 아트를 읽을 수 없음: $uri", error)
            null
        } finally {
            retriever.release()
        }
    }

    private fun decodeScaled(bytes: ByteArray, sizePx: Int): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= sizePx && bounds.outHeight / (sample * 2) >= sizePx) sample *= 2
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
    }

    private const val TAG = "ArtworkCache"
}

@Composable
private fun rememberArtwork(uri: String, sizePx: Int): ImageBitmap? {
    val context = LocalContext.current
    val key = "$uri@$sizePx"
    val artwork by produceState(ArtworkCache.peek(key), uri, sizePx) {
        if (!ArtworkCache.known(key)) value = ArtworkCache.load(context, uri, sizePx)
    }
    return artwork
}

/**
 * 그림이 없는 곡의 커버 색. 속지처럼 채도 있는 색을 쓰고, 같은 곡은 언제나 같은 색이 되도록 이름으로 고른다.
 * 흙빛이나 탁한 색은 사용자 피드백("색감이 칙칙함")으로 쓰지 않는다.
 */
private val coverColors = listOf(
    Color(0xFFEF6A4A), Color(0xFF2F3B8F), Color(0xFFF2C94C), Color(0xFF1F8A7A),
    Color(0xFF6FB3E0), Color(0xFFC2417A), Color(0xFF3A7D44), Color(0xFFE58F3A),
)

fun placeholderColor(seed: String): Color = coverColors[abs(seed.hashCode() % coverColors.size)]

/** 레코드 소리골을 닮은 동심원 무늬. 그림이 없는 곡의 커버로 쓴다. */
@Composable
private fun Grooves(seed: String, modifier: Modifier) {
    val base = placeholderColor(seed)
    Canvas(modifier.background(base)) {
        val center = Offset(size.width / 2, size.height / 2)
        val radius = size.minDimension * 0.42f
        val groove = Color.Black.copy(alpha = 0.22f)
        for (step in 0 until 4) {
            drawCircle(groove, radius * (1f - step * 0.2f), center, style = Stroke(width = size.minDimension * 0.018f))
        }
        drawCircle(groove, radius * 0.22f, center)
        drawCircle(base, radius * 0.05f, center)
    }
}

/** 곡 하나의 커버. 파일에 그림이 있으면 그 그림, 없으면 이름으로 정한 색의 소리골 무늬다. */
@Composable
fun TrackCover(uri: String, seed: String, size: Dp, modifier: Modifier = Modifier, shape: Shape = Sokji.Corner) {
    val sizePx = with(LocalDensity.current) { size.roundToPx() }.coerceAtLeast(48)
    val artwork = rememberArtwork(uri, sizePx)
    val shaped = modifier.size(size).clip(shape)
    if (artwork != null) {
        Image(artwork, contentDescription = null, modifier = shaped, contentScale = ContentScale.Crop)
    } else {
        Grooves(seed, shaped)
    }
}

/** 여러 곡의 묶음 커버. 서로 다른 곡이 넷 이상이면 앞의 넷을 2×2로, 아니면 첫 곡 하나를 크게 둔다. */
@Composable
fun MosaicCover(items: List<Pair<String, String>>, size: Dp, modifier: Modifier = Modifier) {
    val distinct = items.distinctBy { it.first }
    when {
        distinct.isEmpty() -> Grooves("", modifier.size(size).clip(Sokji.Corner))
        distinct.size < 4 -> TrackCover(distinct[0].first, distinct[0].second, size, modifier)
        else -> Column(modifier.size(size).clip(Sokji.Corner)) {
            for (row in 0 until 2) {
                Row(Modifier.weight(1f)) {
                    for (column in 0 until 2) {
                        val (uri, seed) = distinct[row * 2 + column]
                        Box(Modifier.weight(1f).fillMaxSize()) { TrackCover(uri, seed, size / 2, shape = RectangleShape) }
                    }
                }
            }
        }
    }
}

/**
 * 재생 화면에 까는 바탕색. 커버 그림의 평균색에서 색상만 가져와 채도를 지키고 어둡게 만든다.
 * 검정을 섞어 누르면 노랑과 주황이 탁한 올리브와 갈색이 되는데, 이는 사용자 피드백("색감이 칙칙함")에서 뺀 색이다.
 * 그래서 노랑 계열 색상은 주홍 쪽으로 옮긴다. 그림이 없으면 소리골 무늬 색을 쓴다.
 */
fun playerTone(artwork: Bitmap?, seed: String): Color {
    val average = artwork?.let(::averageColor) ?: placeholderColor(seed)
    val hsl = FloatArray(3)
    ColorUtils.colorToHSL(average.toArgb(), hsl)
    val hue = if (hsl[0] in 38f..80f) 18f else hsl[0]
    // 무채색에 가까운 그림(흑백 사진 등)은 억지로 물들이지 않는다.
    val saturation = if (hsl[1] < 0.08f) hsl[1] else hsl[1].coerceIn(0.45f, 0.7f)
    return Color(ColorUtils.HSLToColor(floatArrayOf(hue, saturation, 0.2f)))
}

private fun averageColor(bitmap: Bitmap): Color {
    val small = bitmap.scale(8, 8)
    var red = 0f
    var green = 0f
    var blue = 0f
    for (x in 0 until 8) {
        for (y in 0 until 8) {
            val pixel = small[x, y]
            red += android.graphics.Color.red(pixel)
            green += android.graphics.Color.green(pixel)
            blue += android.graphics.Color.blue(pixel)
        }
    }
    if (small !== bitmap) small.recycle()
    return Color(red / 64f / 255f, green / 64f / 255f, blue / 64f / 255f)
}
