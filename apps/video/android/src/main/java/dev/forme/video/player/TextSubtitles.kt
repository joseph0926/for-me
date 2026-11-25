package dev.forme.video.player

import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.Charset
import java.nio.charset.CodingErrorAction
import java.util.Locale

/** 직접 고른 자막과 폴더에서 찾은 자막이 함께 쓰는 크기 상한이다. */
internal const val MAX_SUBTITLE_BYTES = 2 * 1024 * 1024

private val blocks = Regex("""\n(?:[ \t]*\n)+""")
private val htmlTag = Regex("""<[^>]*>""")
private val srtStyleTag = Regex("""</?(?:i|b|u|font)\b[^>]*>""", RegexOption.IGNORE_CASE)
// Android의 ICU 정규식은 PC의 자바와 달리 이스케이프하지 않은 닫는 중괄호를 문법 오류로 거부한다.
private val overrideBlock = Regex("""\{[^}]*\}""")

internal data class SubtitleLanguage(val id: String, val label: String, val tag: String? = null) {
    val korean: Boolean get() = tag?.substringBefore('-')?.equals("ko", ignoreCase = true)
        ?: (id.startsWith("kr", ignoreCase = true) || id.startsWith("ko", ignoreCase = true))
}

internal data class SubtitleFrame(val text: String, val nextChangeMs: Long?)

internal class TextSubtitles private constructor(tracks: Map<SubtitleLanguage, CueTimeline>) {
    val languages = tracks.keys.toList()
    val defaultLanguage = languages.firstOrNull { it.tag != null && it.korean }
        ?: languages.firstOrNull { it.korean } ?: languages.first()
    private val timelines = tracks.mapKeys { it.key.id }

    fun frameAt(timeMs: Long, languageId: String = defaultLanguage.id): SubtitleFrame =
        timelines.getValue(languageId).frameAt(timeMs)

    companion object {
        fun read(input: InputStream): TextSubtitles {
            val content = decode(readLimited(input)).removePrefix("\uFEFF")
                .replace("\r\n", "\n").replace('\r', '\n').trim()
            val tracks = if (samiRoot.containsMatchIn(content)) {
                readSami(content)
            } else {
                val cues = if (vttHeader.matches(content.lineSequence().first())) {
                    readWebVtt(content)
                } else {
                    readSrt(content).ifEmpty { readAss(content) }
                }
                mapOf(SubtitleLanguage("", "") to cues)
            }
            val timelines = tracks.mapNotNull { (language, cues) ->
                val usable = cues.filter { it.end > it.start && it.text.isNotEmpty() }.sortedBy { it.start }
                if (usable.isEmpty()) null else language to CueTimeline(usable)
            }.toMap()
            require(timelines.isNotEmpty())
            return TextSubtitles(timelines)
        }
    }
}

private val vttHeader = Regex("""WEBVTT(?:[ \t].*)?""")
private val samiRoot = Regex("""^\s*(?:(?:<\?xml[^>]*\?>|<!--.*?-->|<!DOCTYPE\s+[^>]*>)\s*)*<SAMI(?:\s[^>]*)?>""",
    setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))

private class CueTimeline(private val cues: List<Cue>) {
    private val latestEnd = LongArray(cues.size).apply {
        for (index in indices) this[index] = maxOf(cues[index].end, getOrElse(index - 1) { 0L })
    }

    fun frameAt(timeMs: Long): SubtitleFrame {
        var low = 0
        var high = cues.size
        while (low < high) {
            val middle = (low + high) / 2
            if (cues[middle].start <= timeMs) low = middle + 1 else high = middle
        }
        var next = cues.getOrNull(low)?.start
        var index = low - 1
        val active = mutableListOf<String>()
        while (index >= 0 && latestEnd[index] > timeMs) {
            val cue = cues[index]
            if (cue.end > timeMs) {
                active.add(cue.text)
                next = minOf(next ?: cue.end, cue.end)
            }
            index--
        }
        return SubtitleFrame(active.asReversed().joinToString("\n"), next)
    }
}

private data class Cue(val start: Long, val end: Long, val text: String)

private fun readLimited(input: InputStream): ByteArray {
    val bytes = ByteArrayOutputStream()
    val buffer = ByteArray(8192)
    while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        require(bytes.size() + count <= MAX_SUBTITLE_BYTES)
        bytes.write(buffer, 0, count)
    }
    return bytes.toByteArray()
}

/**
 * BOM이 있으면 그 인코딩을, 없으면 UTF-8을 먼저 시도한다.
 * UTF-8로 읽을 수 없으면 한국어 Windows에서 만든 자막에 흔한 CP949로 읽는다.
 */
private fun decode(bytes: ByteArray): String {
    fun startsWith(vararg prefix: Int) = bytes.size >= prefix.size && prefix.indices.all { bytes[it] == prefix[it].toByte() }
    return when {
        startsWith(0xEF, 0xBB, 0xBF) -> strict(Charsets.UTF_8, bytes, 3)
        startsWith(0xFF, 0xFE) -> strict(Charsets.UTF_16LE, bytes, 2)
        startsWith(0xFE, 0xFF) -> strict(Charsets.UTF_16BE, bytes, 2)
        else -> try {
            strict(Charsets.UTF_8, bytes, 0)
        } catch (_: CharacterCodingException) {
            strict(koreanWindows ?: throw CharacterCodingException(), bytes, 0)
        }
    }
}

private fun strict(charset: Charset, bytes: ByteArray, offset: Int): String = charset.newDecoder()
    .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
    .decode(ByteBuffer.wrap(bytes, offset, bytes.size - offset)).toString()

// 플랫폼마다 CP949의 이름이 달라 쓸 수 있는 이름을 차례로 찾는다. EUC-KR은 확장 한글을 읽지 못하는 마지막 대안이다.
private val koreanWindows: Charset? = listOf("x-windows-949", "windows-949", "MS949", "EUC-KR")
    .firstNotNullOfOrNull { name -> runCatching { Charset.forName(name) }.getOrNull() }

private fun decodeEntities(text: String): String = text
    .replace("&nbsp;", " ", ignoreCase = true)
    .replace("&lt;", "<", ignoreCase = true)
    .replace("&gt;", ">", ignoreCase = true)
    .replace("&quot;", "\"", ignoreCase = true)
    .replace("&#39;", "'")
    .replace("&lrm;", "", ignoreCase = true)
    .replace("&rlm;", "", ignoreCase = true)
    .replace("&amp;", "&", ignoreCase = true)

private fun joinLines(lines: List<String>): String = lines.map { it.trim() }.filter { it.isNotEmpty() }.joinToString("\n")

private fun milliseconds(hours: String?, minutes: String, seconds: String, fraction: String): Long {
    val fractionMs = fraction.padEnd(3, '0').take(3).toLong()
    return ((hours.orEmpty().ifEmpty { "0" }.toLong() * 60 + minutes.toLong()) * 60 + seconds.toLong()) * 1000 + fractionMs
}

private val srtTiming = Regex("""(\d{1,4}):([0-5]\d):([0-5]\d)[,.](\d{3})\s*-->\s*(\d{1,4}):([0-5]\d):([0-5]\d)[,.](\d{3})(?:\s+.*)?""")
private val srtPositionTag = Regex("""\{\\[^}]*\}""")

private fun readSrt(content: String): List<Cue> = blocks.splitToSequence(content).mapNotNull { block ->
    val lines = block.lines()
    val timeLine = if (lines.first().trim().toIntOrNull() != null) 1 else 0
    val match = srtTiming.matchEntire(lines.getOrNull(timeLine)?.trim().orEmpty()) ?: return@mapNotNull null
    val time = match.groupValues
    Cue(milliseconds(time[1], time[2], time[3], time[4]), milliseconds(time[5], time[6], time[7], time[8]),
        joinLines(lines.drop(timeLine + 1).map { it.replace(srtStyleTag, "").replace(srtPositionTag, "") }))
}.toList()

private val vttTiming = Regex("""(?:(\d+):)?([0-5]\d):([0-5]\d)\.(\d{3})\s+-->\s+(?:(\d+):)?([0-5]\d):([0-5]\d)\.(\d{3})(?:\s+.*)?""")

private fun readWebVtt(content: String): List<Cue> = blocks.splitToSequence(content).drop(1).mapNotNull { block ->
    val lines = block.lines()
    // 시각 줄 앞에는 대사 이름이 올 수 있고, NOTE, STYLE, REGION 블록에는 시각 줄이 없다.
    val timeLine = lines.indexOfFirst { it.contains("-->") }.takeIf { it in 0..1 } ?: return@mapNotNull null
    val match = vttTiming.matchEntire(lines[timeLine].trim()) ?: return@mapNotNull null
    val time = match.groupValues
    Cue(milliseconds(time[1], time[2], time[3], time[4]), milliseconds(time[5], time[6], time[7], time[8]),
        joinLines(lines.drop(timeLine + 1).map { decodeEntities(it.replace(htmlTag, "")) }))
}.toList()

private val samiSync = Regex("""<SYNC\b[^>]*?\bStart\s*=\s*["']?(\d+)[^>]*>""", RegexOption.IGNORE_CASE)
private val samiParagraph = Regex("""<P\b([^>]*)>""", RegexOption.IGNORE_CASE)
private val samiClass = Regex("""\bClass\s*=\s*["']?([\w-]+)""", RegexOption.IGNORE_CASE)
private val samiLineBreak = Regex("""<br\s*/?>""", RegexOption.IGNORE_CASE)
private val samiBodyEnd = Regex("""</BODY>.*""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
private const val LAST_SAMI_LINE_MS = 5_000L

/** SYNC마다 언어(P의 Class)별 문장을 모으고, 같은 언어의 다음 SYNC에서 그 문장을 끝낸다. 한국어가 있으면 한국어를 고른다. */
private fun readSami(content: String): Map<SubtitleLanguage, List<Cue>> {
    val syncs = samiSync.findAll(content).toList()
    val lines = syncs.mapIndexed { index, sync ->
        val bodyEnd = syncs.getOrNull(index + 1)?.range?.first ?: content.length
        val body = content.substring(sync.range.last + 1, bodyEnd).replace(samiBodyEnd, "")
        val start = sync.groupValues[1].toLong()
        val paragraphs = samiParagraph.findAll(body).toList()
        if (paragraphs.isEmpty()) {
            listOf(Triple("", start, samiText(body)))
        } else {
            paragraphs.mapIndexed { paragraphIndex, paragraph ->
                val language = samiClass.find(paragraph.groupValues[1])?.groupValues?.get(1).orEmpty()
                val textEnd = paragraphs.getOrNull(paragraphIndex + 1)?.range?.first ?: body.length
                Triple(language, start, samiText(body.substring(paragraph.range.last + 1, textEnd)))
            }
        }
    }.flatten()
    val declarations = samiLanguages(content.substring(0, syncs.firstOrNull()?.range?.first ?: content.length))
    return lines.groupBy { it.first.lowercase() }.map { (id, timeline) ->
        val language = declarations[id] ?: SubtitleLanguage(id, timeline.first().first)
        language to timeline.mapIndexed { index, (_, start, text) ->
            Cue(start, timeline.getOrNull(index + 1)?.second ?: (start + LAST_SAMI_LINE_MS), text)
        }
    }.toMap()
}

private val styleElement = Regex("""<style\b[^>]*>(.*?)</style\s*>""",
    setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
private val classRule = Regex("""\.([\w-]+)\s*\{([^}]*)\}""")
private fun samiLanguages(header: String): Map<String, SubtitleLanguage> = buildMap {
    for (style in styleElement.findAll(header)) {
        for (rule in classRule.findAll(style.groupValues[1])) {
            val (id, body) = rule.destructured
            val fields = body.split(';').associate {
                it.substringBefore(':').trim().lowercase() to it.substringAfter(':', "").trim().trim('\'', '"')
            }
            val tag = fields["lang"]?.takeIf(String::isNotBlank)
            val label = fields["name"]?.takeIf(String::isNotBlank)
                ?: tag?.let { Locale.forLanguageTag(it).getDisplayLanguage(Locale.KOREAN) }?.takeIf(String::isNotBlank)
                ?: id
            put(id.lowercase(), SubtitleLanguage(id.lowercase(), label, tag))
        }
    }
}

private fun samiText(html: String): String =
    joinLines(decodeEntities(html.replace(samiLineBreak, "\n").replace(htmlTag, "")).lines())

private val assTime = Regex("""(\d+):([0-5]\d):([0-5]\d)[.:](\d{1,3})""")
private val assDrawing = Regex("""\\p[1-9]""")
private val defaultAssFormat = listOf("layer", "start", "end", "style", "name", "marginl", "marginr", "marginv", "effect", "text")

/** [Events]의 Format 줄로 칸 순서를 정한다. 마지막 칸인 Text에는 쉼표가 들어갈 수 있다. */
private fun readAss(content: String): List<Cue> {
    var format = defaultAssFormat
    var inEvents = false
    return content.lines().mapNotNull { raw ->
        val line = raw.trim()
        when {
            line.startsWith("[") -> {
                inEvents = line.equals("[Events]", ignoreCase = true)
                null
            }
            !inEvents -> null
            line.startsWith("Format:", ignoreCase = true) -> {
                format = line.substringAfter(':').split(',').map { it.trim().lowercase() }
                null
            }
            line.startsWith("Dialogue:", ignoreCase = true) -> assCue(line.substringAfter(':').trim(), format)
            else -> null
        }
    }
}

private fun assCue(fields: String, format: List<String>): Cue? {
    val values = fields.split(',', limit = format.size)
    fun field(name: String) = format.indexOf(name).takeIf { it >= 0 }?.let(values::getOrNull)?.trim()
    val start = field("start")?.let(assTime::matchEntire) ?: return null
    val end = field("end")?.let(assTime::matchEntire) ?: return null
    val text = values.getOrNull(format.indexOf("text")) ?: return null
    // 벡터 그림(\p1 이상)은 글자가 아니므로 대사로 쓰지 않는다.
    if (overrideBlock.findAll(text).any { assDrawing.containsMatchIn(it.value) }) return null
    fun ms(match: MatchResult) = match.groupValues.let { milliseconds(it[1], it[2], it[3], it[4].padEnd(2, '0') + "0") }
    val plain = text.replace(overrideBlock, "").replace("\\N", "\n").replace("\\n", "\n").replace("\\h", " ")
    return Cue(ms(start), ms(end), joinLines(plain.lines()))
}
