package dev.forme.gallery.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.forme.gallery.GalleryViewModel
import dev.forme.gallery.LibraryState
import dev.forme.gallery.MediaAccess
import dev.forme.gallery.R
import dev.forme.gallery.library.Labels
import dev.forme.gallery.library.Library
import dev.forme.gallery.library.LibraryRow
import dev.forme.gallery.library.LibraryUnit
import dev.forme.gallery.library.MediaItem
import dev.forme.gallery.library.MediaKind
import dev.forme.gallery.library.drillDown
import dev.forme.gallery.library.libraryRows
import dev.forme.gallery.library.rowIndexOf
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * 보관함. 연, 월, 일, 전체 네 단위로 같은 사진을 다르게 묶는다(화면 레퍼런스 "낱장"의 Library.tsx).
 * 추억 줄과 장소 이름은 첫 버전에서 뺐다(docs/scope.md#첫-버전).
 */
@Composable
fun LibraryScreen(
    viewModel: GalleryViewModel,
    access: MediaAccess,
    canAskAccess: Boolean,
    onRequestAccess: () -> Unit,
) {
    val state by viewModel.library.collectAsStateWithLifecycle()
    val library = (state as? LibraryState.Loaded)?.library
    Box(Modifier.fillMaxSize().background(GalleryColors.Surface)) {
        when {
            access == MediaAccess.NONE -> Column {
                LibraryHeader(subtitle = null)
                if (canAskAccess) {
                    Message("기기의 사진과 동영상을 날짜별로 보려면 접근을 허용해 주세요.", "허용하기", onRequestAccess)
                } else {
                    Message("사진과 동영상 접근이 꺼져 있습니다. 설정의 권한에서 허용해 주세요.", "설정 열기", onRequestAccess)
                }
            }
            // 처음 읽는 동안은 머리줄만 둔다. 빈 보관함 안내가 잠깐 보였다 사라지지 않게 하기 위해서다.
            library == null -> LibraryHeader(subtitle = null)
            else -> LibraryContent(library, access, viewModel.thumbnails, onRequestAccess)
        }
    }
}

@Composable
private fun LibraryContent(library: Library, access: MediaAccess, thumbnails: ThumbnailLoader, onRequestAccess: () -> Unit) {
    var unit by rememberSaveable { mutableStateOf(LibraryUnit.DAY) }
    // 카드를 눌러 단위를 바꿀 때 새 단위에서 처음 보여 줄 묶음
    var anchor by remember { mutableStateOf<String?>(null) }
    val rows = remember(library, unit) { libraryRows(library, unit) }
    val labels = remember(library) { Labels(LocalDate.now()) }
    val zone = remember(library) { ZoneId.systemDefault() }
    val widthPx = LocalWindowInfo.current.containerSize.width.coerceAtLeast(1)

    fun switchTo(next: LibraryUnit, groupKey: String?) {
        anchor = groupKey
        unit = next
    }

    Box(Modifier.fillMaxSize()) {
        // 단위마다 새 스크롤 상태를 만들어, 바꾼 단위의 맨 위나 고른 묶음에서 시작한다.
        key(unit) {
            val gridState = rememberLazyGridState(
                initialFirstVisibleItemIndex = if (anchor == null) 0 else HEADER_ROWS + rowIndexOf(rows, anchor),
            )
            val bottomInset = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                state = gridState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = bottomInset + 88.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                item(key = "header", span = { GridItemSpan(maxLineSpan) }) {
                    Column {
                        LibraryHeader(subtitle = Labels.count(library.photoCount, library.videoCount))
                        if (access == MediaAccess.PARTIAL) PartialAccessBar(onRequestAccess)
                    }
                }
                if (rows.isEmpty()) {
                    item(key = "empty", span = { GridItemSpan(maxLineSpan) }) {
                        if (access == MediaAccess.PARTIAL) {
                            Message("고른 사진과 동영상이 없습니다.", null, null)
                        } else {
                            Message("사진을 찍으면 여기에 날짜별로 모입니다.", null, null)
                        }
                    }
                }
                itemsIndexed(
                    rows,
                    key = { _, row -> row.key },
                    span = { _, row -> if (row is LibraryRow.Tile) GridItemSpan(1) else GridItemSpan(maxLineSpan) },
                    contentType = { _, row -> row::class },
                ) { index, row ->
                    when (row) {
                        is LibraryRow.Tile -> MediaTile(row.item, labels, zone, thumbnails, widthPx / 3)
                        is LibraryRow.DayHero -> DayHero(row, labels, zone, thumbnails, widthPx, first = index == 0)
                        is LibraryRow.Card -> GroupCard(row, labels, thumbnails, widthPx) {
                            val (next, groupKey) = drillDown(row)
                            switchTo(next, groupKey)
                        }
                    }
                }
            }
        }
        if (library.items.isNotEmpty()) {
            UnitSwitcher(
                current = unit,
                onSelect = { switchTo(it, null) },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(bottom = 12.dp),
            )
        }
    }
}

/** 격자 맨 앞의 머리줄 수. 카드에서 내려갈 때 줄 번호를 맞추는 데 쓴다. */
private const val HEADER_ROWS = 1

@Composable
private fun LibraryHeader(subtitle: String?) {
    Column(
        Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 10.dp),
    ) {
        Text("보관함", fontSize = 30.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.025).em, color = GalleryColors.Ink)
        if (subtitle != null) Text(subtitle, fontSize = 13.sp, color = GalleryColors.Muted)
    }
}

/** 부분 허용일 때 머리줄 아래에 두는 안내. 누르면 시스템 창에서 사진을 더 고르거나 모두 허용할 수 있다. */
@Composable
private fun PartialAccessBar(onRequestAccess: () -> Unit) {
    Row(
        Modifier
            .padding(start = 16.dp, end = 16.dp, bottom = 10.dp)
            .fillMaxWidth()
            .background(GalleryColors.Raised, WorkShape)
            .padding(start = 14.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("고른 사진과 동영상만 보입니다.", Modifier.weight(1f), fontSize = 14.sp, color = GalleryColors.Muted)
        TextButton(onClick = onRequestAccess) { Text("더 고르기", fontWeight = FontWeight.SemiBold) }
    }
}

/** 빈 상태와 권한 안내: 할 일을 먼저 말하는 한 줄과 필요하면 단추 하나. */
@Composable
private fun Message(text: String, action: String?, onAction: (() -> Unit)?) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(start = 32.dp, end = 32.dp, top = 80.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(text, fontSize = 15.sp, lineHeight = 23.sp, color = GalleryColors.Muted, textAlign = TextAlign.Center)
        if (action != null && onAction != null) {
            Button(onClick = onAction, modifier = Modifier.padding(top = 16.dp), shape = WorkShape) {
                Text(action, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private val OnPhoto = TextStyle(color = Color.White, shadow = Shadow(Color.Black.copy(alpha = 0.35f), blurRadius = 6f))

private fun accessibleLabel(item: MediaItem, labels: Labels, zone: ZoneId): String {
    val taken = Instant.ofEpochMilli(item.takenAtMillis).atZone(zone)
    val kind = if (item.kind == MediaKind.VIDEO) "동영상" else "사진"
    return "$kind, ${labels.day(taken.toLocalDate())} ${Labels.time(taken.toLocalTime())}"
}

@Composable
private fun MediaTile(item: MediaItem, labels: Labels, zone: ZoneId, thumbnails: ThumbnailLoader, sizePx: Int) {
    Box(
        Modifier
            .aspectRatio(1f)
            .semantics { contentDescription = accessibleLabel(item, labels, zone) },
    ) {
        MediaThumbnail(item, thumbnails, sizePx, Modifier.fillMaxSize())
        if (item.kind == MediaKind.VIDEO) {
            Row(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(Labels.duration(item.durationMillis), style = OnPhoto, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Image(painterResource(R.drawable.ic_play), contentDescription = null, modifier = Modifier.size(12.dp))
            }
        }
    }
}

/** 일 단위에서 하루의 첫 사진을 화면 폭으로 크게 두고 그 위에 날짜를 얹는다. */
@Composable
private fun DayHero(row: LibraryRow.DayHero, labels: Labels, zone: ZoneId, thumbnails: ThumbnailLoader, sizePx: Int, first: Boolean) {
    Box(
        Modifier
            .padding(top = if (first) 0.dp else 10.dp)
            .fillMaxWidth()
            .aspectRatio(4f / 3f)
            .semantics { contentDescription = accessibleLabel(row.item, labels, zone) },
    ) {
        MediaThumbnail(row.item, thumbnails, sizePx, Modifier.fillMaxSize())
        Box(
            Modifier
                .fillMaxWidth()
                .height(96.dp)
                .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.45f), Color.Transparent))),
        )
        Text(
            labels.day(row.group.date),
            modifier = Modifier.padding(start = 16.dp, top = 12.dp),
            style = OnPhoto,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.02).em,
        )
    }
}

/** 월과 연 카드: 대표 사진 한 장에 제목과 개수를 얹는다. 누르면 한 단계 아래 단위로 내려간다. */
@Composable
private fun GroupCard(row: LibraryRow.Card, labels: Labels, thumbnails: ThumbnailLoader, sizePx: Int, onOpen: () -> Unit) {
    val large = row.unit == LibraryUnit.YEAR
    val title = if (large) labels.year(row.group.date) else labels.month(row.group.date)
    Box(Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp)) {
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(if (large) 4f / 5f else 3f / 2f)
                .clip(WorkShape)
                .clickable(onClickLabel = "$title 열기", onClick = onOpen),
        ) {
            MediaThumbnail(row.cover, thumbnails, sizePx, Modifier.fillMaxSize())
            Box(
                Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Black.copy(alpha = 0.5f),
                            0.45f to Color.Transparent,
                            1f to Color.Black.copy(alpha = 0.4f),
                        ),
                    ),
            )
            Text(
                title,
                modifier = Modifier.padding(start = 16.dp, top = 14.dp),
                style = OnPhoto,
                fontSize = if (large) 40.sp else 26.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.025).em,
            )
            Text(
                Labels.count(row.group.items),
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 16.dp, bottom = 12.dp),
                style = OnPhoto,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

/** 아래에 떠 있는 연, 월, 일, 전체 전환. 고른 칸은 강조색으로 채운다. */
@Composable
private fun UnitSwitcher(current: LibraryUnit, onSelect: (LibraryUnit) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier
            .shadow(12.dp, WorkShape)
            .background(GalleryColors.Raised.copy(alpha = 0.94f), WorkShape)
            .padding(4.dp)
            .selectableGroup(),
    ) {
        LibraryUnit.entries.forEach { option ->
            val active = option == current
            Box(
                Modifier
                    .heightIn(min = 36.dp)
                    .widthIn(min = 56.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(if (active) GalleryColors.Accent else Color.Transparent)
                    .selectable(selected = active, role = Role.Tab, onClick = { onSelect(option) })
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    option.label,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (active) GalleryColors.AccentInk else GalleryColors.Muted,
                )
            }
        }
    }
}
