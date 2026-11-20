package dev.forme.video.player

import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.nio.ByteBuffer

internal const val MAX_SRT_BYTES = 2 * 1024 * 1024
private val timing = Regex("""(\d{1,4}):([0-5]\d):([0-5]\d),(\d{3})\s*-->\s*(\d{1,4}):([0-5]\d):([0-5]\d),(\d{3})(?:\s+.*)?""")
private val blocks = Regex("""\n(?:[ \t]*\n)+""")
private val styleTag = Regex("""</?(?:i|b|u|font)\b[^>]*>""", RegexOption.IGNORE_CASE)
private val positionTag = Regex("""\{\\[^}]*}""")

internal class SrtSubtitles private constructor(private val cues: List<Cue>) {
    private data class Cue(val start: Long, val end: Long, val text: String)
    private val latestEnd = LongArray(cues.size).apply {
        for (index in indices) this[index] = maxOf(cues[index].end, getOrElse(index - 1) { 0L })
    }

    fun textAt(timeMs: Long): String {
        var low = 0
        var high = cues.size
        while (low < high) {
            val middle = (low + high) / 2
            if (cues[middle].start <= timeMs) low = middle + 1 else high = middle
        }
        var index = low - 1
        val active = mutableListOf<String>()
        while (index >= 0 && latestEnd[index] > timeMs) {
            if (cues[index].end > timeMs) active.add(cues[index].text)
            index--
        }
        return active.asReversed().joinToString("\n")
    }

    companion object {
        fun read(input: InputStream): SrtSubtitles {
            val bytes = ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                require(bytes.size() + count <= MAX_SRT_BYTES)
                bytes.write(buffer, 0, count)
            }
            val content = Charsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes.toByteArray()))
                .toString().removePrefix("\uFEFF").replace("\r\n", "\n").replace('\r', '\n').trim()
            // 편집기가 남긴 빈 대사, 길이 0인 대사, 대사 속 빈 줄 뒤의 조각은 건너뛰고 읽을 수 있는 대사만 쓴다.
            val cues = blocks.splitToSequence(content).mapNotNull(::readCue).sortedBy { it.start }.toList()
            require(cues.isNotEmpty())
            return SrtSubtitles(cues)
        }

        private fun readCue(block: String): Cue? {
            val lines = block.lines()
            val timeLine = if (lines.first().trim().toIntOrNull() != null) 1 else 0
            val match = timing.matchEntire(lines.getOrNull(timeLine)?.trim().orEmpty()) ?: return null
            fun milliseconds(first: Int): Long {
                val parts = match.groupValues
                return ((parts[first].toLong() * 60 + parts[first + 1].toInt()) * 60 +
                    parts[first + 2].toInt()) * 1000 + parts[first + 3].toInt()
            }
            val start = milliseconds(1)
            val end = milliseconds(5)
            val text = lines.drop(timeLine + 1)
                .map { it.replace(styleTag, "").replace(positionTag, "").trim() }
                .filter { it.isNotEmpty() }
                .joinToString("\n")
            return if (end > start && text.isNotEmpty()) Cue(start, end, text) else null
        }
    }
}
