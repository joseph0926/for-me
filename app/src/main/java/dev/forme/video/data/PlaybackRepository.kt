package dev.forme.video.data

import android.database.sqlite.SQLiteException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class PlaybackRepository(private val database: PlaybackDatabase) {
    // Activity가 사라져도 마지막 저장은 마친다. Main.immediate와 Mutex로 저장 순서를 유지한다.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val writes = Mutex()
    private val mutableSaveFailed = MutableStateFlow(false)
    val saveFailed = mutableSaveFailed.asStateFlow()
    val recent = database.playback().recent()

    suspend fun find(uri: String): PlaybackRecord? = writes.withLock {
        database.playback().find(uri)
    }

    fun save(record: PlaybackRecord) {
        scope.launch {
            writes.withLock {
                try {
                    database.playback().save(record)
                    mutableSaveFailed.value = false
                } catch (_: SQLiteException) {
                    mutableSaveFailed.value = true
                }
            }
        }
    }
}
