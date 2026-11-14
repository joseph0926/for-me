package dev.forme.video

import android.app.Application
import androidx.room.Room
import dev.forme.video.data.PlaybackDatabase
import dev.forme.video.data.PlaybackRepository

class VideoApplication : Application() {
    val repository by lazy {
        PlaybackRepository(
            Room.databaseBuilder(this, PlaybackDatabase::class.java, "playback.db").build()
        )
    }
}
