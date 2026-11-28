package dev.forme.music.redesign

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.forme.music.R
import dev.forme.music.data.PlaylistRecord
import dev.forme.music.data.PlaylistSummary

/**
 * 고른 곡이나 묶음을 재생 목록에 담는 시트. 맨 위 '새 재생 목록'은 묶음 이름을 미리 넣어 두어
 * 폴더나 가수 묶음을 한 번에 재생 목록으로 만들 수 있다.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddToPlaylistSheet(
    request: AddRequest,
    playlists: List<PlaylistSummary>,
    onAdd: (PlaylistRecord) -> Unit,
    onCreate: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var creating by rememberSaveable { mutableStateOf(false) }
    if (creating) {
        NameDialog("새 재생 목록", request.suggestedName, "만들고 담기", onConfirm = onCreate, onDismiss = { creating = false })
        return
    }
    val single = request.tracks.singleOrNull()
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Sokji.Raised,
        scrimColor = Color.Black.copy(alpha = 0.18f),
        shape = Sokji.Corner,
    ) {
        Column(Modifier.navigationBarsPadding()) {
            Text(
                if (single != null) "재생 목록에 추가" else "${request.tracks.size}곡 담기",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
            if (single != null) {
                Text(single.name, style = MaterialTheme.typography.bodyMedium, color = Sokji.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 20.dp))
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .clickable { creating = true }
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(painterResource(R.drawable.ic_add), contentDescription = null, tint = Sokji.Ink, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(14.dp))
                Text("새 재생 목록", style = MaterialTheme.typography.bodyLarge)
            }
            LazyColumn {
                items(playlists, key = { it.playlist.id }) { summary ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { onAdd(summary.playlist) }
                            .padding(horizontal = 20.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(summary.playlist.name, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        Text("${summary.trackCount}곡", style = MaterialTheme.typography.bodyMedium, color = Sokji.Muted)
                    }
                }
            }
            Spacer(Modifier.size(12.dp))
        }
    }
}
