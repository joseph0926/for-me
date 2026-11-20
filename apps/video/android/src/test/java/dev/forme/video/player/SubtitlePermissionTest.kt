package dev.forme.video.player

import android.content.Context
import android.content.Intent
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SubtitlePermissionTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val resolver = context.contentResolver
    private val prefs = context.getSharedPreferences("video_subtitles", Context.MODE_PRIVATE)

    @Test fun releasesReplacedSubtitleUnlessAnotherVideoStillUsesIt() {
        val replaced = "content://test.subtitles/replaced"
        val shared = "content://test.subtitles/shared"
        listOf(replaced, shared).forEach {
            resolver.takePersistableUriPermission(it.toUri(), Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        prefs.edit {
            putString("external:content://test.videos/a", "content://test.subtitles/new")
            putString("external:content://test.videos/b", shared)
        }

        releaseUnusedSubtitle(resolver, prefs, replaced)
        releaseUnusedSubtitle(resolver, prefs, shared)

        assertEquals(listOf(shared), resolver.persistedUriPermissions.map { it.uri.toString() })
    }
}
