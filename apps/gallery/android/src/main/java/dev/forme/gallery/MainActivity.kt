package dev.forme.gallery

import android.content.Intent
import android.database.ContentObserver
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.mutableStateOf
import androidx.core.content.edit
import dev.forme.gallery.library.MediaStoreSource
import dev.forme.gallery.ui.GalleryTheme
import dev.forme.gallery.ui.LibraryScreen

class MainActivity : ComponentActivity() {
    private val viewModel: GalleryViewModel by viewModels()
    private val access = mutableStateOf(MediaAccess.NONE)
    private val canAskAccess = mutableStateOf(true)
    private val prefs by lazy { getSharedPreferences(PREFS, MODE_PRIVATE) }

    private val requestAccess = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        updateAccess()
    }

    // 다른 앱이 사진을 찍거나 지우면 목록을 다시 읽는다. 화면이 보이는 동안만 지켜본다.
    private val mediaObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean) {
            viewModel.refresh(access.value, settleMillis = 300)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            GalleryTheme {
                LibraryScreen(
                    viewModel = viewModel,
                    access = access.value,
                    canAskAccess = canAskAccess.value,
                    onRequestAccess = ::requestMediaAccess,
                )
            }
        }
        // 처음 여는 사람에게만 바로 묻는다. 한 번 거절했으면 화면의 단추로 다시 묻는다.
        if (savedInstanceState == null && currentMediaAccess() == MediaAccess.NONE && !prefs.getBoolean(ASKED, false)) {
            requestMediaAccess()
        }
    }

    override fun onStart() {
        super.onStart()
        // 설정에서 권한을 바꾸고 돌아온 경우도 여기서 다시 읽는다.
        updateAccess()
        contentResolver.registerContentObserver(MediaStoreSource.filesCollection, true, mediaObserver)
    }

    override fun onStop() {
        contentResolver.unregisterContentObserver(mediaObserver)
        super.onStop()
    }

    private fun updateAccess() {
        access.value = currentMediaAccess()
        // 시스템이 더는 묻지 않는 상태(두 번 거절)는 "물어본 적 있음"과 "이유를 보여 줄 수 없음"이 함께일 때다.
        canAskAccess.value = !prefs.getBoolean(ASKED, false) ||
            shouldShowRequestPermissionRationale(android.Manifest.permission.READ_MEDIA_IMAGES)
        viewModel.refresh(access.value)
    }

    private fun requestMediaAccess() {
        if (access.value == MediaAccess.NONE && !canAskAccess.value) {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
            return
        }
        // 부분 허용이면 같은 요청이 사진 고르기와 모두 허용 창을 다시 연다.
        prefs.edit { putBoolean(ASKED, true) }
        requestAccess.launch(mediaPermissions)
    }

    private companion object {
        const val PREFS = "media_access"
        const val ASKED = "asked"
    }
}
