package dev.forme.video.player

import dev.forme.video.R
import org.videolan.libvlc.MediaPlayer

/**
 * 재생 화면의 화면 모드. 맞춤은 영상 전체를 보여 주고, 채우기는 넘치는 부분을 잘라 화면을 채우고,
 * 늘이기는 비율을 무시하고 화면에 맞춘다. 항목 이름을 저장하므로 이름을 바꾸면 저장한 선택이 맞춤으로 돌아간다.
 */
enum class VideoScale(internal val vlcType: MediaPlayer.ScaleType, val label: Int) {
    Fit(MediaPlayer.ScaleType.SURFACE_BEST_FIT, R.string.video_scale_fit),
    Fill(MediaPlayer.ScaleType.SURFACE_FIT_SCREEN, R.string.video_scale_fill),
    Stretch(MediaPlayer.ScaleType.SURFACE_FILL, R.string.video_scale_stretch);

    val next: VideoScale get() = entries[(ordinal + 1) % entries.size]

    companion object {
        /** 저장값이 없거나 알 수 없는 이름이면 맞춤으로 연다. */
        fun fromStored(name: String?): VideoScale = entries.firstOrNull { it.name == name } ?: Fit
    }
}
