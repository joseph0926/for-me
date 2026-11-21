package dev.forme.video.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import android.content.res.Configuration
import androidx.core.net.toUri
import dev.forme.video.R
import dev.forme.video.VideoApplication
import dev.forme.video.data.AudioTrackInfo
import dev.forme.video.data.PlaybackRecord
import dev.forme.video.data.VideoFileInfo
import dev.forme.video.data.formatFileSize
import dev.forme.video.data.formatFrameRate
import dev.forme.video.data.formatSampleRate
import dev.forme.video.data.readVideoFileInfo
import dev.forme.video.data.resolutionLabel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** 영상 상세: 장면 배경, 제목과 한 줄 정보, 본 만큼 채워지는 이어보기 버튼, 파일 정보 표. */
@Composable
internal fun VideoDetail(record: PlaybackRecord, play: () -> Unit, close: () -> Unit, modifier: Modifier) {
    BackHandler(onBack = close)
    val context = LocalContext.current.applicationContext
    val info by produceState<VideoFileInfo?>(null, record.uri) {
        value = withContext(Dispatchers.IO) {
            val readable = (context as VideoApplication).folders.readableUri(record.uri.toUri())
            readVideoFileInfo(context, readable, record.title)
        }
    }
    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Box(Modifier.fillMaxWidth().then(if (landscape) Modifier.height(220.dp) else Modifier.aspectRatio(4f / 3f))) {
            VideoArtwork(record.uri, Modifier.fillMaxSize())
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(
                Color.Black.copy(alpha = 0.3f), Color.Transparent, MaterialTheme.colorScheme.surface))))
            VideoIconButton(close, Modifier.padding(12.dp).size(48.dp)) {
                Box(Modifier.size(40.dp).background(Color.Black.copy(alpha = 0.4f), CircleShape),
                    contentAlignment = Alignment.Center) {
                    Icon(painterResource(R.drawable.ic_back), stringResource(R.string.back_to_list))
                }
            }
        }
        // 제목 묶음을 장면 아래쪽에 겹쳐 올린다. offset은 자리를 옮기지 않아 그만큼 아래 여백으로 남는다.
        Column(Modifier.offset(y = (-48).dp).padding(horizontal = 24.dp)) {
            Text(record.title, maxLines = 3, overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.headlineLarge)
            Spacer(Modifier.height(8.dp))
            DetailSummary(record, info)
            Spacer(Modifier.height(20.dp))
            val label = if (record.positionMs > 0) stringResource(R.string.resume_at, formatTime(record.positionMs))
            else stringResource(R.string.play)
            VideoButton(label, play, progress = progress(record), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(28.dp))
            Text(stringResource(R.string.file_info), style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            FileInfoTable(info)
        }
    }
}

/** 길이, 수정한 날짜, 해상도 표시, 형식을 한 줄에 둔다. 모르는 값은 뺀다. */
@Composable
private fun DetailSummary(record: PlaybackRecord, info: VideoFileInfo?) {
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val style = MaterialTheme.typography.bodySmall
    val parts = buildList<@Composable () -> Unit> {
        if (record.durationMs > 0) add { Text(lengthText(record.durationMs), color = muted, style = style) }
        info?.modifiedAt?.let { add { Text(shortDate(it), color = muted, style = style) } }
        info?.video?.let { resolutionLabel(it.width, it.height) }?.let { resolution ->
            add {
                Text(resolution, color = muted, style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.border(1.dp, muted.copy(alpha = 0.6f), MaterialTheme.shapes.extraSmall)
                        .padding(horizontal = 4.dp))
            }
        }
        info?.container?.let { add { Text(it, color = muted, style = style) } }
    }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        parts.forEachIndexed { index, part ->
            if (index > 0) Box(Modifier.size(3.dp).background(muted, CircleShape))
            part()
        }
    }
}

@Composable
private fun FileInfoTable(info: VideoFileInfo?) {
    if (info == null) {
        Text(stringResource(R.string.file_info_loading), color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall)
        return
    }
    val unknown = stringResource(R.string.file_info_unknown)
    val video = info.video?.let { track ->
        listOfNotNull("${track.width}×${track.height}", track.codec, track.frameRate?.let(::formatFrameRate))
            .joinToString(", ")
    } ?: if (info.tracksRead) stringResource(R.string.file_info_none) else unknown
    val audio = info.audio?.let { audioText(it) }
        ?: if (info.tracksRead) stringResource(R.string.file_info_none) else unknown
    val rows = listOfNotNull(
        R.string.file_info_video to video,
        R.string.file_info_audio to audio,
        info.container?.let { R.string.file_info_format to it },
        info.sizeBytes?.let { R.string.file_info_size to formatFileSize(it) },
        info.modifiedAt?.let { R.string.file_info_modified to fullDate(it) },
    )
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        rows.forEach { (label, value) ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(label), Modifier.width(72.dp), color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall)
                Text(value, style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = "tnum"))
            }
        }
    }
}

@Composable
private fun audioText(track: AudioTrackInfo): String {
    val channels = when (track.channels) {
        0 -> null
        1 -> stringResource(R.string.channels_mono)
        2 -> stringResource(R.string.channels_stereo)
        6 -> stringResource(R.string.channels_5_1)
        8 -> stringResource(R.string.channels_7_1)
        else -> stringResource(R.string.channels_count, track.channels)
    }
    val rate = track.sampleRateHz.takeIf { it > 0 }?.let(::formatSampleRate)
    return listOfNotNull(channels, rate, track.codec).joinToString(", ")
}

@Composable
private fun lengthText(durationMs: Long): String {
    val seconds = durationMs / 1_000
    if (seconds < 60) return stringResource(R.string.length_seconds, seconds.toInt())
    val minutes = ((durationMs + 30_000) / 60_000).toInt()
    return when {
        minutes < 60 -> stringResource(R.string.length_minutes, minutes)
        minutes % 60 == 0 -> stringResource(R.string.length_hours, minutes / 60)
        else -> stringResource(R.string.length_hours_minutes, minutes / 60, minutes % 60)
    }
}

/** 올해 날짜는 연도를 빼 `11.21`처럼 쓴다. */
private fun shortDate(epochMs: Long): String {
    val calendar = Calendar.getInstance()
    val thisYear = calendar.get(Calendar.YEAR)
    calendar.timeInMillis = epochMs
    val pattern = if (calendar.get(Calendar.YEAR) == thisYear) "MM.dd" else "yyyy.MM.dd"
    return SimpleDateFormat(pattern, Locale.ROOT).format(Date(epochMs))
}

private fun fullDate(epochMs: Long): String = SimpleDateFormat("yyyy.MM.dd HH:mm", Locale.ROOT).format(Date(epochMs))
