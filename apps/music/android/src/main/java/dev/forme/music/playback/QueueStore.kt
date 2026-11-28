package dev.forme.music.playback

import android.util.Log
import dev.forme.music.data.PlaybackStateRecord
import dev.forme.music.data.QueueDao
import dev.forme.music.data.QueueItemRecord
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch

/** 재생기에서 읽어 낸 대기열과 위치. 저장과 복원이 같은 모양을 쓴다. */
data class QueueSnapshot(
    val items: List<QueueItemRecord>,
    val currentIndex: Int,
    val positionMs: Long,
    val shuffle: Boolean,
    val repeatMode: Int,
)

/**
 * 대기열과 재생 위치를 저장하고 되살린다.
 *
 * 저장과 복원은 프로세스 전체에서 요청한 순서대로 하나씩 실행한다. 그래서 마지막에 요청한 저장이 남고,
 * 서비스가 끝나며 남긴 저장이 끝나기 전에 다시 시작한 서비스가 옛 기록을 읽지 않는다.
 * 저장 작업은 서비스보다 오래 살아야 하므로(서비스가 끝날 때의 저장) 프로세스 전체의 범위에서 돈다.
 */
class QueueStore(private val dao: QueueDao, private val clock: () -> Long = System::currentTimeMillis) {
    /** 저장된 대기열이 없으면 null. 위치 값이 대기열 범위를 벗어나면 범위 안으로 줄인다. */
    suspend fun restore(): QueueSnapshot? {
        val result = CompletableDeferred<QueueSnapshot?>()
        tasks.send {
            try {
                result.complete(read())
            } catch (error: Exception) {
                result.completeExceptionally(error)
            }
        }
        return result.await()
    }

    private suspend fun read(): QueueSnapshot? {
        val items = dao.items()
        if (items.isEmpty()) return null
        val state = dao.state()
        return QueueSnapshot(
            items = items,
            currentIndex = (state?.currentIndex ?: 0).coerceIn(0, items.lastIndex),
            positionMs = (state?.positionMs ?: 0).coerceAtLeast(0),
            shuffle = state?.shuffle ?: false,
            repeatMode = state?.repeatMode ?: 0,
        )
    }

    fun saveQueue(snapshot: QueueSnapshot) {
        tasks.trySend { dao.saveQueue(snapshot.items, stateOf(snapshot)) }
    }

    fun savePosition(snapshot: QueueSnapshot) {
        tasks.trySend { dao.saveState(stateOf(snapshot)) }
    }

    private fun stateOf(snapshot: QueueSnapshot) = PlaybackStateRecord(
        currentIndex = snapshot.currentIndex,
        positionMs = snapshot.positionMs,
        shuffle = snapshot.shuffle,
        repeatMode = snapshot.repeatMode,
        updatedAtMs = clock(),
    )

    private companion object {
        val tasks = Channel<suspend () -> Unit>(Channel.UNLIMITED)

        init {
            CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
                for (task in tasks) {
                    try {
                        task()
                    } catch (error: Exception) {
                        // 저장 하나가 실패해도 다음 저장은 이어 간다. 재생은 멈추지 않는다.
                        Log.e("QueueStore", "대기열 저장 실패", error)
                    }
                }
            }
        }
    }
}
