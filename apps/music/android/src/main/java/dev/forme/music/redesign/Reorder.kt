package dev.forme.music.redesign

import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput

/**
 * 손잡이를 잡고 끌어 줄 순서를 바꾼다. 끄는 동안에는 화면의 순서만 바꾸고, 손을 떼면 [onMove]로 처음 위치와 놓은 위치를 한 번 알린다.
 * 재생 목록과 대기열은 저장이나 재생기 응답을 거쳐 순서가 돌아오므로, 끄는 도중마다 저장하지 않는다.
 *
 * 줄의 key는 [keys]와 같아야 한다. 같은 곡이 두 번 들어 있을 수 있어 key는 곡 주소가 아니라 [occurrenceKeys]로 만든다.
 */
@Stable
class ReorderState(private val listState: LazyListState) {
    var draggingKey by mutableStateOf<String?>(null)
        private set
    var dragOffset by mutableFloatStateOf(0f)
        private set
    private var order by mutableStateOf<List<String>>(emptyList())
    private var startIndex = -1

    /** 손을 뗀 뒤 저장된 순서가 돌아올 때까지 놓은 순서를 보여 준다. 그 사이 순서가 돌아오면 원래 순서로 튀었다 돌아오기 때문이다. */
    private var sourceAtStart: List<String> = emptyList()
    private var settled: Pair<List<String>, List<String>>? = null

    /** 화면에 그릴 순서. 끄는 중이거나 놓은 순서가 아직 저장되지 않았으면 그 순서, 아니면 [source] 그대로다. */
    fun shown(source: List<String>): List<String> {
        if (draggingKey != null) return order
        val (sourceAtEnd, dropped) = settled ?: return source
        // 저장이 끝났거나, 다른 변경으로 저장된 순서가 바뀌었으면 저장된 순서를 따른다.
        return if (source == sourceAtEnd) dropped else source
    }

    internal fun start(key: String, source: List<String>) {
        settled = null
        sourceAtStart = source
        order = source
        startIndex = source.indexOf(key)
        draggingKey = key
        dragOffset = 0f
    }

    internal fun drag(deltaY: Float) {
        val key = draggingKey ?: return
        dragOffset += deltaY
        val visible = listState.layoutInfo.visibleItemsInfo
        val current = visible.firstOrNull { it.key == key } ?: return
        val center = current.offset + dragOffset + current.size / 2f
        val target = visible.firstOrNull { item ->
            item.key != key && item.key in order && center > item.offset && center < item.offset + item.size
        } ?: return
        val from = order.indexOf(key)
        val to = order.indexOf(target.key)
        order = order.toMutableList().apply { add(to, removeAt(from)) }
        // 끄는 줄이 목표 자리로 옮겨 그려지므로 그만큼 손가락 아래 위치를 되돌린다.
        dragOffset -= (target.offset - current.offset)
    }

    internal fun end(onMove: (from: Int, to: Int) -> Unit) {
        val key = draggingKey ?: return
        val to = order.indexOf(key)
        if (startIndex >= 0 && to >= 0 && to != startIndex) {
            settled = sourceAtStart to order
            onMove(startIndex, to)
        }
        draggingKey = null
        dragOffset = 0f
    }
}

@Composable
fun rememberReorderState(listState: LazyListState) = remember(listState) { ReorderState(listState) }

/** 끌기 손잡이에 붙인다. [source]는 지금 저장된 순서의 key 목록이다. */
@Composable
fun Modifier.reorderHandle(
    state: ReorderState,
    key: String,
    source: List<String>,
    onMove: (from: Int, to: Int) -> Unit,
): Modifier {
    val latestSource by rememberUpdatedState(source)
    val latestOnMove by rememberUpdatedState(onMove)
    return pointerInput(state, key) {
        detectDragGestures(
            onDragStart = { state.start(key, latestSource) },
            onDrag = { change, amount ->
                change.consume()
                state.drag(amount.y)
            },
            onDragEnd = { state.end(latestOnMove) },
            onDragCancel = { state.end(latestOnMove) },
        )
    }
}

/** 같은 곡이 여러 번 들어 있어도 줄마다 다른 key가 되도록 "주소#몇 번째"로 만든다. */
fun occurrenceKeys(uris: List<String>): List<String> {
    val seen = HashMap<String, Int>()
    return uris.map { uri ->
        val count = seen.getOrDefault(uri, 0)
        seen[uri] = count + 1
        "$uri#$count"
    }
}
