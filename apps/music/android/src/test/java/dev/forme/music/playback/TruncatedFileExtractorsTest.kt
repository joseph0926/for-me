package dev.forme.music.playback

import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.DataReader
import androidx.media3.common.Format
import androidx.media3.common.util.ParsableByteArray
import androidx.media3.common.util.UnstableApi
import androidx.media3.extractor.DefaultExtractorInput
import androidx.media3.extractor.Extractor
import androidx.media3.extractor.ExtractorOutput
import androidx.media3.extractor.PositionHolder
import androidx.media3.extractor.SeekMap
import androidx.media3.extractor.TrackOutput
import androidx.media3.extractor.mp3.Mp3Extractor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * 시험 자료: ffmpeg 9.1로 만든 10초 440Hz 사인파(22.05kHz 모노, libmp3lame -q:a 9, Xing 헤더)와
 * 그 파일의 앞쪽 절반 바이트만 남긴 사본. 잘린 사본의 헤더는 여전히 10초라고 적는다.
 */
@OptIn(UnstableApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TruncatedFileExtractorsTest {
    @Test fun truncatedFileEndsWhereItsAudioEnds() {
        val seekMaps = extract("sine-10s-vbr-truncated.mp3")
        assertEquals("처음에는 헤더 길이를 그대로 알린다", 10.0, seekMaps.first().durationUs / 1e6, 0.1)
        val finalSeconds = seekMaps.last().durationUs / 1e6
        assertTrue("실제로 읽은 길이로 줄여야 한다: $finalSeconds", finalSeconds in 4.0..6.0)
    }

    @Test fun completeFileKeepsHeaderDuration() {
        val seekMaps = extract("sine-10s-vbr.mp3")
        assertEquals(1, seekMaps.size)
        assertEquals(10.0, seekMaps.single().durationUs / 1e6, 0.1)
    }

    /** 파일 끝까지 읽으며 추출기가 알린 위치표를 순서대로 돌려준다. */
    private fun extract(resource: String): List<SeekMap> {
        val bytes = requireNotNull(javaClass.classLoader?.getResourceAsStream(resource)).use { it.readBytes() }
        val output = RecordingOutput()
        val extractor = TruncationAwareExtractor(Mp3Extractor())
        extractor.init(output)
        val holder = PositionHolder()
        var input = DefaultExtractorInput(ByteReader(bytes, 0), 0, bytes.size.toLong())
        while (true) {
            when (extractor.read(input, holder)) {
                Extractor.RESULT_END_OF_INPUT -> return output.seekMaps
                Extractor.RESULT_SEEK -> {
                    val position = holder.position
                    input = DefaultExtractorInput(ByteReader(bytes, position.toInt()), position, bytes.size.toLong())
                }
            }
        }
    }

    private class ByteReader(private val bytes: ByteArray, private var position: Int) : DataReader {
        override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
            if (position >= bytes.size) return C.RESULT_END_OF_INPUT
            val count = minOf(length, bytes.size - position)
            System.arraycopy(bytes, position, buffer, offset, count)
            position += count
            return count
        }
    }

    private class RecordingOutput : ExtractorOutput {
        val seekMaps = mutableListOf<SeekMap>()
        override fun track(id: Int, type: Int): TrackOutput = DiscardingTrack()
        override fun endTracks() = Unit
        override fun seekMap(seekMap: SeekMap) {
            seekMaps += seekMap
        }
    }

    private class DiscardingTrack : TrackOutput {
        private val scratch = ByteArray(4096)
        override fun format(format: Format) = Unit
        override fun sampleData(input: DataReader, length: Int, allowEndOfInput: Boolean, sampleDataPart: Int): Int {
            val result = input.read(scratch, 0, minOf(length, scratch.size))
            return if (result == C.RESULT_END_OF_INPUT && !allowEndOfInput) throw java.io.EOFException() else result
        }
        override fun sampleData(data: ParsableByteArray, length: Int, sampleDataPart: Int) = data.skipBytes(length)
        override fun sampleMetadata(timeUs: Long, flags: Int, size: Int, offset: Int, cryptoData: TrackOutput.CryptoData?) = Unit
    }
}
