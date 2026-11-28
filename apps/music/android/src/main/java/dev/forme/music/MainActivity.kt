package dev.forme.music

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.mutableStateOf
import androidx.core.content.ContextCompat
import dev.forme.music.ui.AudioAccess
import dev.forme.music.redesign.RedesignApp
import dev.forme.music.redesign.SokjiTheme
import dev.forme.music.ui.MusicApp
import dev.forme.music.ui.MusicTheme
import dev.forme.music.ui.MusicViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: MusicViewModel by viewModels()
    private val audioAccess = mutableStateOf(AudioAccess.NOT_ASKED)

    private val requestAudio = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        // 거절 뒤 시스템이 더는 묻지 않으면 설정 화면으로만 허용할 수 있다.
        audioAccess.value = when {
            granted -> AudioAccess.GRANTED
            shouldShowRequestPermissionRationale(audioPermission) -> AudioAccess.DENIED
            else -> AudioAccess.BLOCKED
        }
        viewModel.refresh(granted)
    }

    private val pickFiles = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        viewModel.addPicked(uris, hasAudioPermission())
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            if (BuildConfig.REDESIGN) {
                SokjiTheme {
                    RedesignApp(
                        viewModel = viewModel,
                        audioAccess = audioAccess.value,
                        onRequestAudio = ::requestAudioAccess,
                        onPickFiles = { pickFiles.launch(arrayOf("audio/*")) },
                    )
                }
            } else {
                MusicTheme {
                    MusicApp(
                        viewModel = viewModel,
                        audioAccess = audioAccess.value,
                        onRequestAudio = ::requestAudioAccess,
                        onPickFiles = { pickFiles.launch(arrayOf("audio/*")) },
                    )
                }
            }
        }
        if (savedInstanceState == null && !hasAudioPermission()) requestAudio.launch(audioPermission)
    }

    override fun onStart() {
        super.onStart()
        viewModel.player.connect()
        // 설정에서 권한을 바꾸고 돌아온 경우도 여기서 다시 읽는다.
        val granted = hasAudioPermission()
        if (granted) {
            audioAccess.value = AudioAccess.GRANTED
        } else if (audioAccess.value == AudioAccess.GRANTED) {
            audioAccess.value = AudioAccess.DENIED
        }
        viewModel.refresh(granted)
    }

    override fun onStop() {
        viewModel.player.release()
        super.onStop()
    }

    private fun requestAudioAccess() {
        if (audioAccess.value == AudioAccess.BLOCKED) {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
        } else {
            requestAudio.launch(audioPermission)
        }
    }

    private fun hasAudioPermission() =
        ContextCompat.checkSelfPermission(this, audioPermission) == PackageManager.PERMISSION_GRANTED

    private val audioPermission: String
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Manifest.permission.READ_MEDIA_AUDIO
        } else {
            Manifest.permission.READ_EXTERNAL_STORAGE
        }
}
