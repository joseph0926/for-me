package dev.forme.video

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.net.toUri
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class OpenVideoActivityTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()

    private fun viewIntent(uri: String, type: String) =
        Intent(Intent.ACTION_VIEW).setDataAndType(uri.toUri(), type).setPackage(context.packageName)

    private fun handlers(intent: Intent) =
        context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY).map { it.activityInfo.name }

    @Test fun otherAppsCanOpenVideoDocumentsButNotEveryUnknownFileOrPlainPath() {
        val player = OpenVideoActivity::class.java.name
        assertEquals(listOf(player), handlers(viewIntent("content://files/document/1", "video/mp4")))
        assertEquals(listOf(player), handlers(viewIntent("content://files/document/2", "application/x-matroska")))
        assertEquals(emptyList<String>(), handlers(viewIntent("content://files/document/3", "application/octet-stream")))
        assertEquals(emptyList<String>(), handlers(viewIntent("file:///sdcard/Movies/a.mp4", "video/mp4")))
    }

    @Test fun onlyViewRequestsWithAnAddressOpenAVideo() {
        val uri = "content://files/document/1".toUri()
        assertEquals(uri, videoUriFrom(Intent(Intent.ACTION_VIEW, uri)))
        assertNull(videoUriFrom(Intent(Intent.ACTION_VIEW)))
        assertNull(videoUriFrom(Intent(Intent.ACTION_SEND).setData(uri)))
    }

    @Test fun videoFromAnotherAppPlaysItsOwnAddressAndKeepsAccessWhenAllowed() {
        val model = VideoViewModel(ApplicationProvider.getApplicationContext())
        val uri = Uri.parse("content://files/document/1")

        model.openFromOtherApp(uri)

        val selection = checkNotNull(model.selection.value)
        assertEquals(uri, selection.uri)
        assertEquals(uri, selection.accessUri)
        assertNull(selection.queue)
        assertNull(model.notice.value)
        assertEquals(listOf(uri), context.contentResolver.persistedUriPermissions.map { it.uri })
    }
}
