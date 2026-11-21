package dev.forme.video.ui

import android.content.pm.ActivityInfo

/** 재생 화면이 고정하는 방향. 목록으로 돌아가면 앱 기본값(방향 미지정)으로 되돌린다. */
internal enum class ScreenOrientation(val activityValue: Int) {
    Landscape(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE),
    Portrait(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT),
}

/** 가로로 긴 영상은 가로, 세로로 긴 영상은 세로로 맞춘다. 비율을 모르거나 정사각형에 가까우면 방향을 바꾸지 않는다. */
internal fun orientationFor(videoAspect: Float?): ScreenOrientation? = when {
    videoAspect == null -> null
    videoAspect > 1.05f -> ScreenOrientation.Landscape
    videoAspect < 0.95f -> ScreenOrientation.Portrait
    else -> null
}
