const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const kindNames = { use: '사용', request: '불편과 요청', change: '변경', verification: '검증', release: '버전', followup: '후속 사용', origin: '만든 이유', status: '상태 변경' };
const statusNames = { unknown: '사용 상태 미확인', active: '계속 사용', occasional: '필요할 때 사용', waiting: '개선 대기', stopped: '사용 중단' };
const stageNames = { unknown: '미확인', open: '열림', in_progress: '진행 중', waiting: '확인 대기', done: '완료' };
const authorityNames = { user: '사용자 경험과 발언', interpretation: 'AI 해석 또는 제안', verified: '검사로 확인' };
const releaseNames = { development: '개발 중', built: '빌드 확인', installed: '설치 확인', used: '실사용 확인' };
const documentNames = { 'README.md': '앱 소개', 'docs/scope.md': '개발 범위', 'docs/research.md': '선택 근거', 'docs/qa-issues.md': '결함 기록', 'docs/verification.md': '검증 기록' };
const detailHints = { video: '이어보기 경험, 다른 재생기로 옮긴 이유', 'screen-gif': 'GIF를 활용한 곳, 다시 녹화한 이유', termkeys: '줄 이동 결과, 다른 입력을 방해한 상황', viewgrain: '적용한 작업, 레퍼런스 ID와 버전, 채택한 부분' };
const form = $('#record-form');
const appForm = $('#app-form');
const draftKey = 'for-me-journal-draft-v1';
const pendingKey = 'for-me-journal-pending-v1';
let state, token, links = [], selected = '', editingId = null, formRevision = 0, appRevision = 0, editingApp = false, saving = false;

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function notice(message, error = false) {
  $('#notice').hidden = false;
  $('#notice').className = `notice${error ? ' error' : ''}`;
  $('#notice').textContent = message;
}

function saved(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}

function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { notice('브라우저에 초안을 보관하지 못했습니다. 닫기 전에 기록을 저장해 주세요.', true); }
}

async function load() {
  const response = await fetch('/api/state');
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error);
  ({ state, token, connections: links } = payload);
  if (!state.apps.some(app => app.id === selected)) selected = state.apps[0]?.id ?? '';
  render();
}

async function command(commandName, data, revision = state.revision) {
  const signature = JSON.stringify([commandName, data, revision]);
  let pending = saved(pendingKey);
  if (!pending || pending.signature !== signature) {
    pending = { signature, request: { operationId: crypto.randomUUID(), actor: 'user', expectedRevision: revision, command: commandName, data } };
    persist(pendingKey, pending);
  }
  let response;
  try {
    response = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Journal-Token': token }, body: JSON.stringify(pending.request) });
  } catch { throw new Error('서버 연결을 확인하세요. 입력은 보존됩니다. 같은 내용으로 다시 저장해도 중복 생성하지 않습니다.'); }
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 409 || response.status === 403) {
      localStorage.removeItem(pendingKey);
      await load();
    }
    const error = new Error(result.error);
    error.status = response.status;
    throw error;
  }
  await load();
  localStorage.removeItem(pendingKey);
  return result;
}

function periodStart() {
  if ($('#period').value === 'all') return '';
  const date = new Date();
  date.setDate(date.getDate() - ($('#period').value === 'week' ? 6 : 29));
  return localDate(date);
}

function recordsForApp() { return state.records.filter(record => record.appId === selected); }

function render() {
  $('#apps').innerHTML = state.apps.map(app => {
    const records = state.records.filter(record => record.appId === app.id && !record.deleted);
    const last = records.map(record => record.occurredOn).sort().at(-1);
    const open = records.filter(record => record.kind === 'request' && record.stage !== 'done').length;
    return `<button class="${app.id === selected ? 'active' : ''}" data-app="${escape(app.id)}" ${app.id === selected ? 'aria-current="page"' : ''}><span class="app-monogram">${escape(app.name.slice(0, 1))}</span><span class="app-nav-copy"><span>${escape(app.name)}</span><small>${statusNames[app.status]} / ${last ? last.slice(5) : '미기록'}${open ? ` / 요청 ${open}` : ''}</small></span></button>`;
  }).join('');
  const app = state.apps.find(item => item.id === selected);
  if (!app) { $('#app-title').textContent = '첫 앱을 등록하세요'; $('#overview').innerHTML = ''; $('#timeline').innerHTML = ''; return; }
  $('#app-title').textContent = app.name;
  $('#app-subtitle').textContent = `${app.platform || '플랫폼 미입력'} / ${statusNames[app.status]}`;
  const records = recordsForApp().filter(record => !record.deleted).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  const origins = records.filter(record => record.kind === 'origin');
  const origin = [...origins].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const connection = links.find(item => item.appId === selected);
  $('#overview').innerHTML = `
    <div class="overview-grid">
      <section class="panel"><div class="panel-top"><h2>이 앱을 만든 이유</h2><span class="badge ${origin ? '' : 'warn'}">${origin ? '첫 기록 보존' : '작성 대기'}</span></div>
        ${origin ? `<div class="origin-body">${escape(origin.body)}</div><p class="muted">작성 ${escape(origin.createdAt.slice(0, 10))} / 사건 ${escape(origin.occurredOn)} / ${authorityNames[origin.authority]}</p>` : '<p class="origin-empty">어떤 불편에서 시작했나요?<br>당시의 이유를 천천히 남겨 주세요.</p>'}
        <button class="text-link" data-new="origin">${origin ? '방향이 달라진 이유 덧붙이기' : '시작 이유 작성하기'} ↗</button>
      </section>
      <section class="panel"><div class="panel-top"><h2>버전별 확인 범위</h2><button class="text-link" id="edit-app">앱 정보 수정 ↗</button></div>
        <div class="versions">${Object.entries(releaseNames).map(([key, label]) => {
          const record = records.find(item => item.kind === 'release' && item.releaseState === key);
          return `<div class="version-item"><small>${label}</small><strong>${record ? escape(record.version || '버전 미입력') : '기록 없음'}</strong>${record ? `<small>${escape(record.device || '기기 미확인')} / ${escape(record.occurredOn)}</small>` : ''}</div>`;
        }).join('')}</div>
        <p class="muted">각 범위의 최신 기록입니다. 현재 설치 상태를 자동 추정하지 않습니다.</p>
      </section>
    </div>
    <div class="connections">${connection?.documents.map(doc => doc.available ? `<a target="_blank" rel="noopener" href="/api/document?appId=${encodeURIComponent(app.id)}&name=${encodeURIComponent(doc.name)}">${documentNames[doc.name]} ↗</a>` : `<span>${documentNames[doc.name]} 연결 확인 필요</span>`).join('') || '<span>연결된 문서가 없습니다.</span>'}</div>`;
  const pending = records.filter(record => record.kind === 'change' && !records.some(other => other.kind === 'followup' && isDescendant(other, record.id)));
  if (pending.length) $('#overview').insertAdjacentHTML('beforeend', `<div class="pending"><strong>바꾼 뒤 사용해 보셨나요?</strong><span>후속 사용 기록이 없는 변경 ${pending.length}건</span><button class="text-link" data-follow="${pending[0].id}">첫 변경에 결과 남기기 →</button></div>`);
  renderTimeline();
}

function isDescendant(record, id) {
  let parent = record.parentId;
  const visited = new Set();
  while (parent && !visited.has(parent)) {
    if (parent === id) return true;
    visited.add(parent);
    parent = state.records.find(item => item.id === parent)?.parentId;
  }
  return false;
}

function renderTimeline() {
  const from = periodStart();
  const to = $('#period').value === 'all' ? '9999-12-31' : localDate();
  const search = $('#search').value.toLocaleLowerCase();
  const periodRecords = recordsForApp().filter(record => !record.deleted && record.occurredOn >= from && record.occurredOn <= to);
  const useRecords = periodRecords.filter(record => record.kind === 'use' && record.context === 'daily');
  const days = new Set(useRecords.map(record => record.occurredOn)).size;
  const sums = ['measured', 'estimate'].map(measurement => {
    const items = useRecords.filter(record => record.measurement === measurement);
    const parts = [];
    if (items.some(record => record.minutes !== null)) parts.push(`${items.reduce((total, record) => total + (record.minutes ?? 0), 0)}분`);
    if (items.some(record => record.count !== null)) parts.push(`${items.reduce((total, record) => total + (record.count ?? 0), 0)}회`);
    return parts.length ? `${measurement === 'measured' ? '실측' : '추정'} ${parts.join(' / ')}` : '';
  }).filter(Boolean);
  const effort = periodRecords.filter(record => record.effortMinutes !== null);
  const unresolved = recordsForApp().filter(record => !record.deleted && record.kind === 'request' && record.stage !== 'done').length;
  $('#summary').textContent = `기간 내 기록 ${periodRecords.length}건 / 실사용 기록이 있는 날 ${days}일 / 완료되지 않은 요청 ${unresolved}건${sums.length ? ' / ' + sums.join(' / ') : ''}${effort.length ? ' / 기록된 유지보수 시간 ' + effort.reduce((total, record) => total + record.effortMinutes, 0) + '분' : ''}`;
  $('#export').href = `/api/export?${new URLSearchParams({ appId: selected, from, to })}`;
  const records = recordsForApp().filter(record => record.deleted === $('#trash-filter').checked && record.occurredOn >= from && record.occurredOn <= to
    && (!$('#kind-filter').value || record.kind === $('#kind-filter').value)
    && (!search || [record.title, record.body, record.version, record.device, record.details].join(' ').toLocaleLowerCase().includes(search)))
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  $('#timeline').innerHTML = records.length ? records.map(recordCard).join('') : `<div class="empty"><div class="empty-symbol">↗</div><h3>${$('#trash-filter').checked ? '휴지통에 기록이 없습니다' : '아직 이 범위의 기록이 없습니다'}</h3><p>사용한 순간이나 바꾸고 싶은 점을 한 줄로 남겨 보세요.<br>개발 AI가 남긴 기록도 이곳에 이어집니다.</p><button class="text-link" data-new="use">첫 기록 남기기 →</button></div>`;
}

function recordCard(record) {
  const parent = state.records.find(item => item.id === record.parentId);
  const children = state.records.filter(item => !item.deleted && item.parentId === record.id);
  return `<article class="entry" id="record-${record.id}">
    <div class="entry-date"><strong>${escape(record.occurredOn.slice(5).replace('-', '.'))}</strong>${escape(record.occurredOn.slice(0, 4))}</div>
    <div class="entry-card"><div class="entry-top"><span class="badge">${kindNames[record.kind]}</span><span class="badge gray">${authorityNames[record.authority]}</span>${record.context === 'test' ? '<span class="badge warn">테스트</span>' : ''}${record.stage !== 'unknown' ? `<span class="badge gray">${stageNames[record.stage]}</span>` : ''}</div>
      <h3>${escape(record.title)}</h3><p class="entry-body">${escape(record.body)}</p>
      ${record.details ? `<p class="entry-body muted">${escape(record.details)}</p>` : ''}
      ${parent ? `<button class="text-link" data-jump="${parent.id}">이전 기록: ${escape(parent.title)}${parent.deleted ? ' (휴지통)' : ''} ↗</button>` : ''}
      ${children.length ? `<p class="muted">이어진 기록: ${children.map(child => `<button class="text-link" data-jump="${child.id}">${escape(child.title)}</button>`).join(' / ')}</p>` : ''}
      <div class="entry-meta">${[record.appNameAtCreation !== state.apps.find(app => app.id === record.appId)?.name && `당시 앱 이름: ${record.appNameAtCreation}`, record.version && `버전 ${record.version}`, record.kind === 'release' && releaseNames[record.releaseState], record.device, `작성 ${record.createdAt.slice(0, 10)}`].filter(Boolean).map(escape).join(' / ')}</div>
      <details><summary>근거와 측정 정보</summary>${record.originalQuote ? `<blockquote>${escape(record.originalQuote)}</blockquote>` : ''}<p class="entry-body">${escape(record.source || '추가 출처 없음')}</p><p>빌드: ${escape(record.build || '미확인')}</p><p>사용 시간: ${record.minutes ?? '미기록'} / 횟수: ${record.count ?? '미기록'} / ${record.measurement === 'measured' ? '실측' : record.measurement === 'estimate' ? '추정' : '숫자 없음'}</p><p>직접 유지보수한 시간: ${record.effortMinutes ?? '미기록'}분</p><p class="muted">ID ${record.id}</p></details>
      <div class="entry-actions">${record.deleted ? `<button class="text-link" data-restore="${record.id}">휴지통에서 복원</button>` : `<button class="text-link" data-follow="${record.id}">후속 기록</button><button class="text-link" data-edit="${record.id}">수정</button><button class="text-link" data-trash="${record.id}">휴지통으로</button>`}<button class="text-link" data-history="${record.id}">변경 이력</button></div>
    </div></article>`;
}

function fillParents(value = '') {
  const appId = form.elements.appId.value;
  form.elements.parentId.innerHTML = '<option value="">연결하지 않음</option>' + state.records.filter(record => record.appId === appId && record.id !== editingId)
    .map(record => `<option value="${record.id}">${escape(record.title)}${record.deleted ? ' (휴지통)' : ''}</option>`).join('');
  form.elements.parentId.value = value;
  $('#app-detail-title').textContent = detailHints[appId] || '결과와 덧붙일 내용';
}

function formValues() { return Object.fromEntries(new FormData(form)); }

function saveDraft() {
  persist(draftKey, { editingId, revision: formRevision, values: { ...formValues(), appId: form.elements.appId.value, originalQuote: form.elements.originalQuote.value } });
}

function openRecord(kind = 'use', parentId = '', record = null, useDraft = false) {
  if (!state?.apps.length) return openApp();
  form.reset();
  editingId = record?.id ?? null;
  formRevision = state.revision;
  form.elements.appId.disabled = false;
  form.elements.originalQuote.disabled = false;
  form.elements.appId.innerHTML = state.apps.map(app => `<option value="${escape(app.id)}">${escape(app.name)}</option>`).join('');
  form.elements.kind.innerHTML = Object.entries(kindNames).map(([key, name]) => `<option value="${key}">${name}</option>`).join('');
  let values = record ?? { appId: selected, kind, parentId, occurredOn: localDate() };
  const draft = useDraft && saved(draftKey);
  if (draft && state.apps.some(app => app.id === draft.values?.appId)) {
    values = draft.values;
    editingId = draft.editingId;
    formRevision = draft.revision;
  }
  for (const [key, value] of Object.entries(values)) if (form.elements[key] && key !== 'parentId') form.elements[key].value = value ?? '';
  fillParents(values.parentId ?? '');
  form.elements.appId.disabled = Boolean(editingId);
  form.elements.originalQuote.disabled = Boolean(editingId);
  $('#form-title').textContent = editingId ? '기록 수정' : '기록 남기기';
  $('#draft-message').textContent = draft ? '저장하지 않은 초안을 복원했습니다.' : '한 줄로 남기고, 필요한 정보만 덧붙이세요.';
  $('#origin-help').hidden = form.elements.kind.value !== 'origin';
  $('#form-error').textContent = '';
  $('#extra-fields').open = Boolean(record || parentId);
  $('#record-dialog').showModal();
  form.elements.body.focus();
}

function openApp(app = null) {
  appForm.reset(); editingApp = Boolean(app); appRevision = state.revision;
  appForm.elements.id.readOnly = editingApp;
  if (app) for (const [key, value] of Object.entries(app)) if (appForm.elements[key]) appForm.elements[key].value = value;
  $('#app-form-title').textContent = app ? '앱 정보와 연결 수정' : '앱 등록';
  $('#app-error').textContent = '';
  $('#app-dialog').showModal();
}

form.addEventListener('input', saveDraft);
form.addEventListener('change', event => {
  if (event.target.name === 'appId') fillParents();
  $('#origin-help').hidden = form.elements.kind.value !== 'origin';
  saveDraft();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving) return;
  saving = true;
  const button = form.querySelector('[type="submit"]'); button.disabled = true;
  saveDraft();
  try {
    const data = formValues();
    data.title = data.title.trim() || data.body.trim().split('\n')[0].slice(0, 120);
    data.parentId = data.parentId || null;
    for (const key of ['minutes', 'count', 'effortMinutes']) data[key] = data[key] === '' ? null : Number(data[key]);
    if (editingId) { delete data.appId; delete data.originalQuote; }
    await command(editingId ? 'record.update' : 'record.create', editingId ? { id: editingId, patch: data } : data, formRevision);
    localStorage.removeItem(draftKey);
    $('#record-dialog').close();
    notice('기록을 저장했습니다.');
  } catch (error) {
    $('#form-error').textContent = error.message;
    if (error.status === 409) {
      $('#form-error').textContent += ' 입력은 남겨 두었습니다. 변경 이력을 확인하고 다시 저장하세요.';
      formRevision = state.revision;
      saveDraft();
    }
  } finally { saving = false; button.disabled = false; }
});
appForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = appForm.querySelector('[type="submit"]'); button.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(appForm));
    await command(editingApp ? 'app.update' : 'app.create', data, appRevision);
    selected = data.id; render(); $('#app-dialog').close(); notice('앱 정보를 저장했습니다.');
    if (!editingApp) openRecord('origin');
  } catch (error) { $('#app-error').textContent = error.message; if (error.status === 409) appRevision = state.revision; }
  finally { button.disabled = false; }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  try {
    if (button.dataset.app) { selected = button.dataset.app; render(); }
    if (button.dataset.close) $( '#' + button.dataset.close).close();
    if (button.dataset.new) openRecord(button.dataset.new);
    if (button.dataset.follow) openRecord('followup', button.dataset.follow);
    if (button.dataset.edit) openRecord(null, null, state.records.find(record => record.id === button.dataset.edit));
    if (button.dataset.trash || button.dataset.restore) {
      if (button.dataset.trash && !confirm('기록을 휴지통으로 옮길까요? 나중에 복원할 수 있습니다.')) return;
      button.disabled = true;
      await command(button.dataset.trash ? 'record.trash' : 'record.restore', { id: button.dataset.trash || button.dataset.restore });
      notice(button.dataset.trash ? '휴지통으로 옮겼습니다.' : '기록을 복원했습니다.');
    }
    if (button.dataset.jump) {
      const target = state.records.find(record => record.id === button.dataset.jump);
      $('#kind-filter').value = ''; $('#period').value = 'all'; $('#search').value = ''; $('#trash-filter').checked = target.deleted;
      renderTimeline(); location.hash = `record-${target.id}`;
    }
    if (button.dataset.history) {
      const entries = state.history.filter(item => item.after?.id === button.dataset.history || item.before?.id === button.dataset.history);
      $('#history-content').innerHTML = entries.map(item => `<section class="history-item"><p>${escape(item.at)} / ${escape(item.actor)} / ${escape(item.command)}</p><pre>${escape(JSON.stringify({ before: item.before, after: item.after }, null, 2))}</pre></section>`).join('') || '<p>개별 변경 이력이 없습니다. 백업 복원으로 가져온 기록일 수 있습니다.</p>';
      $('#history-dialog').showModal();
    }
    if (button.id === 'edit-app') openApp(state.apps.find(app => app.id === selected));
  } catch (error) { notice(error.message, true); button.disabled = false; }
});
$('#quick-record').addEventListener('click', () => openRecord('use', '', null, true));
$('#add-app').addEventListener('click', () => openApp());
$('#refresh').addEventListener('click', () => load().then(() => notice('최신 기록을 불러왔습니다.')).catch(error => notice(error.message, true)));
for (const id of ['kind-filter', 'period', 'trash-filter']) $('#' + id).addEventListener('change', renderTimeline);
$('#search').addEventListener('input', renderTimeline);
$('#discard-draft').addEventListener('click', () => {
  if (!confirm('현재 초안을 비울까요? 저장된 기록은 바뀌지 않습니다.')) return;
  localStorage.removeItem(draftKey); $('#record-dialog').close();
});
$('#restore-backup').addEventListener('click', () => $('#backup-file').click());
$('#backup-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 32 * 1024 * 1024) throw new Error('백업은 32 MiB 이하여야 합니다.');
    const snapshot = JSON.parse(await file.text());
    if (!confirm(`백업의 앱 ${snapshot.apps?.length ?? '?'}개와 기록 ${snapshot.records?.length ?? '?'}건으로 복원할까요? 현재 기록은 변경 이력에 보존됩니다. 먼저 백업 받기로 별도 사본도 보관하세요.`)) return;
    await command('backup.restore', { snapshot, confirm: 'restore' });
    notice('백업을 복원했습니다. 복원 전 기록도 변경 이력에 보존했습니다.');
  } catch (error) { notice(error.message, true); }
  finally { event.target.value = ''; }
});
window.addEventListener('focus', () => {
  if (state && !document.querySelector('dialog[open]') && !saving) load().catch(error => notice(error.message, true));
});
$('#today').textContent = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
load().catch(error => { $('#app-title').textContent = '기록을 불러오지 못했습니다'; notice(error.message, true); });
