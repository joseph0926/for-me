package dev.forme.music.redesign

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.forme.music.R
import dev.forme.music.data.Track
import dev.forme.music.data.singerOf
import dev.forme.music.ui.formatTime

/** 화면 제목(28)과 옆의 개수. 오른쪽에는 그 화면의 덜 중요한 동작을 둔다. */
@Composable
fun ScreenHeader(title: String, count: String?, trailing: @Composable RowScope.() -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp, top = 20.dp, bottom = 12.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Text(title, style = MaterialTheme.typography.headlineLarge)
        if (count != null) {
            Spacer(Modifier.width(8.dp))
            Text(count, style = MaterialTheme.typography.bodyMedium, color = Sokji.Muted, modifier = Modifier.padding(bottom = 4.dp))
        }
        Spacer(Modifier.weight(1f))
        trailing()
    }
}

/** 묶음 제목(18)과 오른쪽 덜 중요한 동작. 묶음 사이는 28dp를 띄운다. */
@Composable
fun SectionHeader(title: String, trailing: @Composable RowScope.() -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp, top = 28.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        trailing()
    }
}

/** 바탕 없이 보조색 글자와 1dp 밑줄로 쓰는 덜 중요한 동작(전체보기, 지우기, 취소). */
@Composable
fun TextAction(label: String, onClick: () -> Unit, color: Color = Sokji.Muted, enabled: Boolean = true) {
    Text(
        label,
        modifier = Modifier
            .clip(Sokji.Corner)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 10.dp),
        style = MaterialTheme.typography.bodyMedium.copy(textDecoration = TextDecoration.Underline),
        color = if (enabled) color else Sokji.Faint,
    )
}

/** 고른 것만 강조색으로 바뀌는 글자 단추. 정렬이나 묶음 기준처럼 하나만 고르는 곳에 쓴다. */
@Composable
fun ChoiceText(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        modifier = Modifier
            .clip(Sokji.Corner)
            .semantics { this.selected = selected }
            .clickable(role = Role.Tab, onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 10.dp),
        style = MaterialTheme.typography.bodyMedium,
        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        color = if (selected) Sokji.AccentText else Sokji.Muted,
    )
}

@Composable
fun EmptyLine(text: String) {
    Text(
        text,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 24.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = Sokji.Muted,
    )
}

/** 이름 찾기 칸. 높이 44dp, 1dp 선, 초점이 오면 강조색 2dp 선 하나만 그린다. */
@Composable
fun SearchField(value: String, onValueChange: (String) -> Unit, placeholder: String, modifier: Modifier = Modifier) {
    var focused by remember { mutableStateOf(false) }
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        textStyle = MaterialTheme.typography.bodyLarge.copy(color = Sokji.Ink, fontWeight = FontWeight.Normal),
        cursorBrush = SolidColor(Sokji.Accent),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        modifier = modifier
            .height(44.dp)
            .border(if (focused) 2.dp else 1.dp, if (focused) Sokji.Accent else Sokji.Line, Sokji.Corner)
            .background(Sokji.Raised, Sokji.Corner)
            .onFocusChanged { focused = it.isFocused },
        decorationBox = { field ->
            Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(painterResource(R.drawable.ic_search), contentDescription = null, tint = Sokji.Muted, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Box(Modifier.weight(1f)) {
                    if (value.isEmpty()) Text(placeholder, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Normal, color = Sokji.Faint)
                    field()
                }
                if (value.isNotEmpty()) {
                    Icon(
                        painterResource(R.drawable.ic_close),
                        contentDescription = "찾는 말 지우기",
                        tint = Sokji.Muted,
                        modifier = Modifier.size(20.dp).clip(CircleShape).clickable { onValueChange("") },
                    )
                }
            }
        },
    )
}

/** 곡 보조 줄: 가수를 알면 가수와 길이, 모르면 길이만. */
fun detailOf(track: Track): String? {
    val duration = track.durationMs.takeIf { it > 0 }?.let(::formatTime)
    return listOfNotNull(singerOf(track), duration).joinToString(", ").ifEmpty { null }
}

/**
 * 곡 한 줄: 커버 44dp, 제목과 보조 줄 두 줄, 오른쪽 끝 [trailing].
 * 고르는 중이면 왼쪽에 고름 표시가 붙고 누르면 고름이 바뀐다. 아니면 누르면 재생하고 길게 누르면 고르기를 시작한다.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun SongRow(
    uri: String,
    title: String,
    detail: String?,
    isCurrent: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    selection: Boolean? = null,
    onLongClick: (() -> Unit)? = null,
    trailing: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier
            .fillMaxWidth()
            .combinedClickable(enabled = enabled || selection != null, onClick = onClick, onLongClick = onLongClick)
            .padding(start = 20.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (selection != null) {
            Icon(
                painterResource(if (selection) R.drawable.ic_check_circle else R.drawable.ic_circle_outline),
                contentDescription = if (selection) "고름" else "고르지 않음",
                tint = if (selection) Sokji.Accent else Sokji.Faint,
                modifier = Modifier.size(22.dp),
            )
            Spacer(Modifier.width(12.dp))
        }
        TrackCover(uri, title, 44.dp, Modifier.padding(vertical = 10.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f).padding(vertical = 10.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.bodyLarge,
                color = when {
                    !enabled -> Sokji.Faint
                    isCurrent -> Sokji.AccentText
                    else -> Sokji.Ink
                },
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (detail != null) {
                Text(detail, style = MaterialTheme.typography.bodyMedium, color = if (enabled) Sokji.Muted else Sokji.Faint, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        trailing()
    }
}

/** 오른쪽 끝 더보기와 그 메뉴. 메뉴 항목은 [items]가 채우고 고른 뒤 닫는다. */
@Composable
fun MoreMenu(label: String, tint: Color = Sokji.Muted, items: @Composable (close: () -> Unit) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { open = true }) {
            Icon(painterResource(R.drawable.ic_more_vert), contentDescription = "$label 메뉴", tint = tint)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }, containerColor = Sokji.Raised) {
            items { open = false }
        }
    }
}

/** 상세 화면의 큰 재생 원(56dp, 강조색). 그림자는 두지 않는다. */
@Composable
fun PlayCircle(onClick: () -> Unit, enabled: Boolean, label: String = "재생", size: Dp = 56.dp) {
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .background(if (enabled) Sokji.Accent else Sokji.Sunken)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(R.drawable.ic_play), contentDescription = null, tint = if (enabled) Sokji.AccentInk else Sokji.Faint, modifier = Modifier.size(28.dp))
    }
}

/** 아이콘 위, 이름 아래로 놓는 상자 없는 바로가기(속지 보관함의 네 칸). */
@Composable
fun RowScope.Shortcut(icon: Int, label: String, onClick: () -> Unit) {
    Column(
        Modifier
            .weight(1f)
            .clip(Sokji.Corner)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(painterResource(icon), contentDescription = null, tint = Sokji.Ink, modifier = Modifier.size(24.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = Sokji.Muted)
    }
}

/** 이름 입력 칸. 찾기 칸과 같은 높이와 선이고 아이콘이 없다. */
@Composable
fun NameField(value: String, onValueChange: (String) -> Unit) {
    var focused by remember { mutableStateOf(false) }
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        textStyle = MaterialTheme.typography.bodyLarge.copy(color = Sokji.Ink, fontWeight = FontWeight.Normal),
        cursorBrush = SolidColor(Sokji.Accent),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
        modifier = Modifier
            .fillMaxWidth()
            .height(44.dp)
            .border(if (focused) 2.dp else 1.dp, if (focused) Sokji.Accent else Sokji.Line, Sokji.Corner)
            .onFocusChanged { focused = it.isFocused },
        decorationBox = { field ->
            Box(Modifier.padding(horizontal = 12.dp), contentAlignment = Alignment.CenterStart) { field() }
        },
    )
}
