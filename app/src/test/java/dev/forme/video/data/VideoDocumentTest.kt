package dev.forme.video.data

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.content.pm.ProviderInfo
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import androidx.test.core.app.ApplicationProvider
import androidx.core.net.toUri
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowContentResolver
import java.io.File
import java.io.FileNotFoundException

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class VideoDocumentTest {
    @get:Rule val temporary = TemporaryFolder()
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val uri = "content://test.videos/one".toUri()
    private lateinit var provider: TestVideoProvider

    @Before fun setUp() {
        provider = TestVideoProvider(temporary.newFile().apply { writeText("original video bytes") })
        provider.attachInfo(context, ProviderInfo().apply { authority = "test.videos" })
        ShadowContentResolver.registerProviderInternal("test.videos", provider)
    }

    @Test fun opensReadOnlyAndLeavesOriginalUntouched() {
        openVideoDocument(context.contentResolver, uri, "fallback").use {
            assertEquals("샘플.mkv", it.title)
            assertEquals("r", provider.mode)
        }
        assertEquals("original video bytes", provider.file.readText())
    }

    @Test fun revokedPermissionIsReportedToCaller() {
        provider.denied = true
        assertThrows(SecurityException::class.java) {
            openVideoDocument(context.contentResolver, uri, "fallback")
        }
    }

    @Test fun missingFileIsReportedToCaller() {
        provider.missing = true
        assertThrows(FileNotFoundException::class.java) {
            openVideoDocument(context.contentResolver, uri, "fallback")
        }
    }

    @Test fun failedMetadataQueryClosesTheOpenedDescriptor() {
        provider.queryFails = true
        assertThrows(IllegalStateException::class.java) {
            openVideoDocument(context.contentResolver, uri, "fallback")
        }
        assertFalse(provider.opened!!.fileDescriptor.valid())
    }
}

private class TestVideoProvider(val file: File) : ContentProvider() {
    var mode: String? = null
    var denied = false
    var missing = false
    var queryFails = false
    var opened: ParcelFileDescriptor? = null
    override fun onCreate() = true
    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor {
        this.mode = mode
        if (denied) throw SecurityException("Permission revoked")
        if (missing) throw FileNotFoundException("File moved or deleted")
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).also { opened = it }
    }
    override fun query(uri: Uri, projection: Array<out String>?, selection: String?,
        selectionArgs: Array<out String>?, sortOrder: String?): Cursor {
        if (queryFails) throw IllegalStateException("Provider unavailable")
        return MatrixCursor(arrayOf(OpenableColumns.DISPLAY_NAME)).apply { addRow(arrayOf("샘플.mkv")) }
    }
    override fun getType(uri: Uri) = "video/x-matroska"
    override fun insert(uri: Uri, values: ContentValues?): Uri? = error("Read only")
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = error("Read only")
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = error("Read only")
}
