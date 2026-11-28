package dev.forme.music.data

import android.content.Context
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/** 시스템 파일 선택기로 직접 추가한 곡. 음악 목록 권한 밖의 파일이라 읽기 권한을 따로 보관한다. */
@Entity(tableName = "picked_tracks")
data class PickedTrackRecord(
    @PrimaryKey val uri: String,
    val name: String,
    val addedAtMs: Long,
)

@Entity(tableName = "playlists")
data class PlaylistRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val createdAtMs: Long,
)

/** 재생 목록의 곡. 파일이 사라져도 무엇이었는지 보여 줄 수 있게 이름을 함께 둔다. */
@Entity(
    tableName = "playlist_tracks",
    primaryKeys = ["playlistId", "position"],
    foreignKeys = [
        ForeignKey(
            entity = PlaylistRecord::class,
            parentColumns = ["id"],
            childColumns = ["playlistId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class PlaylistTrackRecord(
    val playlistId: Long,
    val position: Int,
    val uri: String,
    val name: String,
)

data class PlaylistSummary(
    @Embedded val playlist: PlaylistRecord,
    @ColumnInfo(name = "trackCount") val trackCount: Int,
)

/** 마지막 대기열. 앱을 다시 열면 이 순서로 돌아온다. */
@Entity(tableName = "queue_items")
data class QueueItemRecord(
    @PrimaryKey val position: Int,
    val uri: String,
    val name: String,
    val tagTitle: String?,
)

/** 대기열에서 재생하던 곡과 위치. 한 줄만 둔다. */
@Entity(tableName = "playback_state")
data class PlaybackStateRecord(
    @PrimaryKey val id: Int = 0,
    val currentIndex: Int,
    val positionMs: Long,
    val shuffle: Boolean,
    val repeatMode: Int,
    val updatedAtMs: Long,
)

@Dao
interface PickedTrackDao {
    @Query("SELECT * FROM picked_tracks")
    suspend fun all(): List<PickedTrackRecord>

    @Upsert
    suspend fun save(records: List<PickedTrackRecord>)
}

@Dao
interface PlaylistDao {
    @Query(
        """
        SELECT playlists.*, (SELECT COUNT(*) FROM playlist_tracks WHERE playlistId = playlists.id) AS trackCount
        FROM playlists ORDER BY createdAtMs
        """,
    )
    fun summaries(): Flow<List<PlaylistSummary>>

    @Query("SELECT * FROM playlist_tracks WHERE playlistId = :playlistId ORDER BY position")
    fun tracks(playlistId: Long): Flow<List<PlaylistTrackRecord>>

    @Query("SELECT * FROM playlist_tracks WHERE playlistId = :playlistId ORDER BY position")
    suspend fun currentTracks(playlistId: Long): List<PlaylistTrackRecord>

    @Insert
    suspend fun create(playlist: PlaylistRecord): Long

    @Query("UPDATE playlists SET name = :name WHERE id = :playlistId")
    suspend fun rename(playlistId: Long, name: String)

    @Query("DELETE FROM playlists WHERE id = :playlistId")
    suspend fun delete(playlistId: Long)

    @Query("DELETE FROM playlist_tracks WHERE playlistId = :playlistId")
    suspend fun clearTracks(playlistId: Long)

    @Insert
    suspend fun insertTracks(tracks: List<PlaylistTrackRecord>)

    /** 곡 넣기, 빼기, 순서 바꾸기를 모두 목록 전체를 바꿔 쓰는 한 가지 방법으로 처리한다. */
    @Transaction
    suspend fun replaceTracks(playlistId: Long, uris: List<Pair<String, String>>) {
        clearTracks(playlistId)
        insertTracks(uris.mapIndexed { index, (uri, name) -> PlaylistTrackRecord(playlistId, index, uri, name) })
    }
}

@Dao
interface QueueDao {
    @Query("SELECT * FROM queue_items ORDER BY position")
    suspend fun items(): List<QueueItemRecord>

    @Query("SELECT * FROM playback_state WHERE id = 0")
    suspend fun state(): PlaybackStateRecord?

    @Query("DELETE FROM queue_items")
    suspend fun clearItems()

    @Insert
    suspend fun insertItems(items: List<QueueItemRecord>)

    @Upsert
    suspend fun saveState(state: PlaybackStateRecord)

    @Transaction
    suspend fun saveQueue(items: List<QueueItemRecord>, state: PlaybackStateRecord) {
        clearItems()
        insertItems(items)
        saveState(state)
    }
}

@Database(
    entities = [
        PickedTrackRecord::class,
        PlaylistRecord::class,
        PlaylistTrackRecord::class,
        QueueItemRecord::class,
        PlaybackStateRecord::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class MusicDatabase : RoomDatabase() {
    abstract fun pickedTracks(): PickedTrackDao
    abstract fun playlists(): PlaylistDao
    abstract fun queue(): QueueDao

    companion object {
        @Volatile private var instance: MusicDatabase? = null

        /** 화면과 재생 서비스가 같은 프로세스에서 한 연결을 나눠 쓴다. */
        fun get(context: Context): MusicDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, MusicDatabase::class.java, "music.db")
                .build()
                .also { instance = it }
        }
    }
}
