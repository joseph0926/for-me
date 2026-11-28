package dev.forme.gallery

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

/**
 * 사진과 동영상을 읽을 수 있는 정도. 사용자가 설정에서 언제든 바꿀 수 있으므로 저장하지 않고
 * 화면이 다시 보일 때마다 [currentMediaAccess]로 새로 읽는다.
 */
enum class MediaAccess {
    /** 기기의 사진과 동영상을 모두 읽는다. */
    FULL,

    /** 사용자가 사진 고르기에서 고른 항목만 읽는다(Android 14 이상). */
    PARTIAL,

    NONE,
}

/** 세 권한을 함께 요청해야 시스템 창에 "사진 고르기"가 나온다. */
val mediaPermissions = arrayOf(
    Manifest.permission.READ_MEDIA_IMAGES,
    Manifest.permission.READ_MEDIA_VIDEO,
    Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED,
)

fun Context.currentMediaAccess(): MediaAccess {
    fun granted(permission: String) =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    return when {
        granted(Manifest.permission.READ_MEDIA_IMAGES) && granted(Manifest.permission.READ_MEDIA_VIDEO) -> MediaAccess.FULL
        mediaPermissions.any(::granted) -> MediaAccess.PARTIAL
        else -> MediaAccess.NONE
    }
}
