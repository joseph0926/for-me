package dev.forme.video.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "playback")
data class PlaybackRecord(
    @PrimaryKey val uri: String,
    val title: String,
    val positionMs: Long,
    val durationMs: Long,
    val updatedAt: Long,
)

@Dao
interface PlaybackDao {
    @Query("SELECT * FROM playback WHERE uri = :uri")
    suspend fun find(uri: String): PlaybackRecord?

    @Query("SELECT * FROM playback ORDER BY updatedAt DESC LIMIT 20")
    fun recent(): Flow<List<PlaybackRecord>>

    @Upsert
    suspend fun save(record: PlaybackRecord)
}

@Database(entities = [PlaybackRecord::class], version = 1, exportSchema = true)
abstract class PlaybackDatabase : RoomDatabase() {
    abstract fun playback(): PlaybackDao
}
