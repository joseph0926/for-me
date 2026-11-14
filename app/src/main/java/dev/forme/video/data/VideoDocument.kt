package dev.forme.video.data

import android.content.ContentResolver
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import java.io.Closeable
import java.io.FileNotFoundException

class VideoDocument(val descriptor: ParcelFileDescriptor, val title: String) : Closeable {
    override fun close() = descriptor.close()
}

fun openVideoDocument(resolver: ContentResolver, uri: Uri, fallbackTitle: String): VideoDocument {
    val descriptor = resolver.openFileDescriptor(uri, "r")
        ?: throw FileNotFoundException("No file descriptor")
    try {
        val title = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null }
            ?: fallbackTitle
        return VideoDocument(descriptor, title)
    } catch (error: Exception) {
        descriptor.close()
        throw error
    }
}
