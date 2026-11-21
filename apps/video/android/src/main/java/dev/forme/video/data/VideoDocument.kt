package dev.forme.video.data

import android.content.ContentResolver
import android.net.Uri
import android.os.OperationCanceledException
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import java.io.Closeable
import java.io.FileNotFoundException
import java.util.concurrent.CancellationException

class VideoDocument(val descriptor: ParcelFileDescriptor, val title: String) : Closeable {
    override fun close() = descriptor.close()
}

fun openVideoDocument(resolver: ContentResolver, uri: Uri, fallbackTitle: String): VideoDocument {
    val descriptor = resolver.openFileDescriptor(uri, "r")
        ?: throw FileNotFoundException("No file descriptor")
    val title = try {
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null }
    } catch (error: Exception) {
        if (error is OperationCanceledException || error is CancellationException) {
            descriptor.close()
            throw error
        }
        null
    }
    return VideoDocument(descriptor, title ?: fallbackTitle)
}
