@file:OptIn(UnstableApi::class)

package dev.forme.music.playback

import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.DataReader
import androidx.media3.common.Format
import androidx.media3.common.util.ParsableByteArray
import androidx.media3.common.util.UnstableApi
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.extractor.Extractor
import androidx.media3.extractor.ExtractorInput
import androidx.media3.extractor.ExtractorOutput
import androidx.media3.extractor.ExtractorsFactory
import androidx.media3.extractor.PositionHolder
import androidx.media3.extractor.SeekMap
import androidx.media3.extractor.TrackOutput

/**
 * 받다가 잘린 파일처럼 헤더가 적은 길이보다 실제 소리가 짧은 파일을 실제 끝에서 끝내기 위한 추출기 묶음.
 *
 * Media3 1.11.1은 MP3의 Xing 헤더가 적은 길이를 그대로 믿고, 재생 위치가 그 길이에 닿아야 곡을 끝낸다
 * (ExoPlayerImplInternal의 `playingPeriodDurationUs <= positionUs`). 그래서 잘린 곡은 실제 끝 뒤에 소리 없이
 * 헤더 길이까지 머문 뒤에야 다음 곡으로 넘어갔다(2026-11-28 검증 기록, 3:12에서 끝나는 곡이 5:10까지 머묾).
 * 파일 끝까지 읽었는데 마지막 표본이 헤더 길이보다 [TOLERANCE_US] 넘게 앞이면, 길이를 읽은 만큼으로 다시 알린다.
 * Media3가 고정 비트레이트 파일에서 같은 경우에 하는 처리와 같은 방식이다.
 */
class TruncatedFileExtractorsFactory(
    private val base: ExtractorsFactory = DefaultExtractorsFactory(),
) : ExtractorsFactory {
    override fun createExtractors(): Array<Extractor> = base.createExtractors().map(::TruncationAwareExtractor).toTypedArray()

    override fun createExtractors(uri: Uri, responseHeaders: Map<String, List<String>>): Array<Extractor> =
        base.createExtractors(uri, responseHeaders).map(::TruncationAwareExtractor).toTypedArray()

    companion object {
        /** 이보다 작은 차이는 인코더 지연과 패딩 같은 정상 범위로 보고 건드리지 않는다. */
        const val TOLERANCE_US = 1_000_000L
    }
}

class TruncationAwareExtractor(private val delegate: Extractor) : Extractor {
    private var output: EndTrackingOutput? = null

    override fun sniff(input: ExtractorInput): Boolean = delegate.sniff(input)

    override fun init(output: ExtractorOutput) {
        val tracking = EndTrackingOutput(output)
        this.output = tracking
        delegate.init(tracking)
    }

    override fun read(input: ExtractorInput, seekPosition: PositionHolder): Int {
        val result = delegate.read(input, seekPosition)
        if (result == Extractor.RESULT_END_OF_INPUT) output?.onEndOfInput()
        return result
    }

    override fun seek(position: Long, timeUs: Long) {
        output?.onSeek()
        delegate.seek(position, timeUs)
    }

    override fun release() = delegate.release()

    override fun getSniffFailureDetails() = delegate.sniffFailureDetails

    override fun getUnderlyingImplementation(): Extractor = delegate.underlyingImplementation
}

/** 추출기가 내보내는 표본의 끝 시각을 지켜보다가, 파일 끝에서 헤더 길이와 비교한다. */
private class EndTrackingOutput(private val real: ExtractorOutput) : ExtractorOutput {
    private val tracks = mutableListOf<EndTrackingTrack>()
    private var declared: SeekMap? = null
    private var shortened = false

    override fun track(id: Int, type: Int): TrackOutput = EndTrackingTrack(real.track(id, type)).also { tracks += it }

    override fun endTracks() = real.endTracks()

    override fun seekMap(seekMap: SeekMap) {
        declared = seekMap
        shortened = false
        real.seekMap(seekMap)
    }

    /** 위치를 옮기면 그 뒤로 읽은 표본만으로 끝을 다시 잰다. */
    fun onSeek() = tracks.forEach(EndTrackingTrack::reset)

    fun onEndOfInput() {
        val seekMap = declared ?: return
        val declaredUs = seekMap.durationUs
        val readEndUs = tracks.maxOfOrNull { it.endUs } ?: return
        if (shortened || declaredUs == C.TIME_UNSET || readEndUs <= 0) return
        if (declaredUs - readEndUs <= TruncatedFileExtractorsFactory.TOLERANCE_US) return
        shortened = true
        real.seekMap(ShortenedSeekMap(seekMap, readEndUs))
    }
}

private class EndTrackingTrack(private val real: TrackOutput) : TrackOutput {
    private var lastTimeUs = C.TIME_UNSET
    private var lastStepUs = 0L

    /** 마지막 표본의 시작 시각에 표본 하나의 길이(직전 두 표본의 간격)를 더한 값. 읽은 표본이 없으면 0. */
    val endUs: Long get() = if (lastTimeUs == C.TIME_UNSET) 0 else lastTimeUs + lastStepUs

    fun reset() {
        lastTimeUs = C.TIME_UNSET
        lastStepUs = 0
    }

    override fun format(format: Format) = real.format(format)

    override fun sampleData(input: DataReader, length: Int, allowEndOfInput: Boolean, sampleDataPart: Int): Int =
        real.sampleData(input, length, allowEndOfInput, sampleDataPart)

    override fun sampleData(data: ParsableByteArray, length: Int, sampleDataPart: Int) =
        real.sampleData(data, length, sampleDataPart)

    override fun sampleMetadata(timeUs: Long, flags: Int, size: Int, offset: Int, cryptoData: TrackOutput.CryptoData?) {
        if (lastTimeUs != C.TIME_UNSET && timeUs > lastTimeUs) lastStepUs = timeUs - lastTimeUs
        lastTimeUs = timeUs
        real.sampleMetadata(timeUs, flags, size, offset, cryptoData)
    }

    override fun durationUs(durationUs: Long) = real.durationUs(durationUs)
}

/** 원래 위치표는 그대로 쓰고 길이만 실제로 읽은 만큼으로 줄인다. 잘린 파일 안의 위치 이동은 원래만큼 부정확하다. */
private class ShortenedSeekMap(private val original: SeekMap, private val durationUs: Long) : SeekMap {
    override fun isSeekable() = original.isSeekable

    override fun getDurationUs() = durationUs

    override fun getSeekPoints(timeUs: Long): SeekMap.SeekPoints = original.getSeekPoints(timeUs.coerceAtMost(durationUs))
}
