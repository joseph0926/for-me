package dev.forme.video.ui

import android.net.Uri
import android.provider.DocumentsContract
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LifecycleResumeEffect
import dev.forme.video.R
import dev.forme.video.data.FolderEntry
import dev.forme.video.data.FolderListing
import dev.forme.video.data.FolderQueue
import dev.forme.video.data.VideoFolders
import dev.forme.video.data.folderQueue
import dev.forme.video.data.readVideoFolder
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException

/**
 * 보관함이나 홈에서 고른 폴더 하나의 내용을 연다. 그 폴더의 맨 위에서 뒤로 가면 연 곳으로 바로 돌아간다.
 * [initialTemporary]는 방금 추가했지만 영구 권한을 받지 못한 폴더라는 뜻이다.
 */
@Composable
internal fun FolderBrowser(folders: VideoFolders, initialTree: Uri, initialTemporary: Boolean,
    play: (Uri, FolderQueue) -> Unit, close: () -> Unit, modifier: Modifier) {
    var tree by rememberSaveable { mutableStateOf(initialTree) }
    var path by rememberSaveable { mutableStateOf<List<String>>(emptyList()) }
    var temporaryAccess by rememberSaveable { mutableStateOf(initialTemporary) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            temporaryAccess = !folders.add(uri)
            path = emptyList()
            tree = uri
        }
    }
    val back = { if (path.isNotEmpty()) path = path.dropLast(1) else close() }
    BackHandler(onBack = back)
    val current = tree
    val rootId = DocumentsContract.getTreeDocumentId(current)
    val directoryId = path.lastOrNull() ?: rootId
    Column(modifier.fillMaxSize()) {
        key(current, directoryId) {
            val fallbackTitle = if (path.isEmpty()) folders.roots[current].orEmpty() else stringResource(R.string.folder)
            DirectoryContents(current, directoryId, fallbackTitle, temporaryAccess, back,
                rename = { if (path.isEmpty()) folders.updateTitle(current, it) },
                reselect = { picker.launch(current) },
                enter = { if (it != rootId && it !in path) path = path + it },
                play = { id, entries ->
                    play(DocumentsContract.buildDocumentUriUsingTree(current, id), folderQueue(current, entries, id))
                })
        }
    }
}

@Composable
private fun DirectoryContents(tree: Uri, directoryId: String, rootTitle: String, temporaryAccess: Boolean, back: () -> Unit,
    rename: (String) -> Unit, reselect: () -> Unit, enter: (String) -> Unit, play: (String, List<FolderEntry>) -> Unit) {
    val resolver = LocalContext.current.contentResolver
    var revision by remember { mutableIntStateOf(0) }
    var listing by remember { mutableStateOf<FolderListing?>(null) }
    var failed by remember { mutableStateOf(false) }
    val scroll = rememberLazyListState()
    LifecycleResumeEffect(Unit) {
        revision++
        onPauseOrDispose {}
    }
    LaunchedEffect(revision) {
        // 첫 조회는 화면이 resume될 때 시작한다. 진입 직후 resume으로 같은 목록을 두 번 읽지 않는다.
        if (revision == 0) return@LaunchedEffect
        failed = false
        try {
            val read = withContext(Dispatchers.IO) { readVideoFolder(resolver, tree, directoryId) }
            listing = read
            rename(read.title)
        } catch (_: IOException) {
            failed = true
        } catch (error: CancellationException) {
            throw error
        } catch (_: RuntimeException) {
            // 파일 제공자는 권한 회수나 분리된 저장소의 조회 실패를 런타임 예외로 돌려줄 수 있다.
            failed = true
        }
        if (failed) listing = null
    }
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        VideoIconButton(back, Modifier.size(48.dp)) {
            Icon(painterResource(R.drawable.ic_back), stringResource(R.string.folder_back))
        }
        Text(listing?.title ?: rootTitle, Modifier.weight(1f).padding(horizontal = 4.dp), maxLines = 2,
            overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleLarge)
        TextButton(onClick = { revision++ }) { Text(stringResource(R.string.refresh_folder)) }
    }
    if (temporaryAccess) Text(stringResource(R.string.folder_temporary), Modifier.padding(horizontal = 24.dp))
    val current = listing
    when {
        failed -> Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.folder_unavailable))
            VideoButton(stringResource(R.string.reselect_folder), reselect)
        }
        current == null -> LinearProgressIndicator(Modifier.fillMaxWidth())
        else -> {
            if (current.loading) Text(stringResource(R.string.folder_loading), Modifier.padding(horizontal = 24.dp))
            if (!current.loading && current.entries.isEmpty()) Text(stringResource(R.string.folder_empty), Modifier.padding(24.dp))
            LazyColumn(state = scroll) {
                items(current.entries, key = { it.id }) { entry ->
                    FolderRow(entry.title, entry.isFolder) {
                        if (entry.isFolder) enter(entry.id) else play(entry.id, current.entries)
                    }
                }
            }
        }
    }
}

@Composable
internal fun FolderRow(label: String, isFolder: Boolean, click: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = click).heightIn(min = 56.dp)
        .padding(horizontal = 24.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Icon(painterResource(if (isFolder) R.drawable.ic_folder else R.drawable.ic_play),
            stringResource(if (isFolder) R.string.folder else R.string.folder_video), Modifier.size(24.dp))
        Text(label, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}
