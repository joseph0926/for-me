import { kindNames } from './model.mjs';

export function exportMarkdown(state, { appId, from = '', to = '9999-12-31' } = {}) {
  const records = state.records.filter(record => !record.deleted && (!appId || record.appId === appId) && record.occurredOn >= from && record.occurredOn <= to)
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.createdAt.localeCompare(b.createdAt));
  const lines = ['# for-me 사용과 개발 기록', '', `기간: ${from || '처음'} ~ ${to === '9999-12-31' ? '현재' : to}`, '', '미기록 기간은 사용 0회를 뜻하지 않습니다.', ''];
  for (const record of records) {
    const app = state.apps.find(item => item.id === record.appId);
    const appName = record.appNameAtCreation === app.name ? app.name : `${record.appNameAtCreation} (현재 ${app.name})`;
    lines.push(`## ${record.occurredOn} | ${appName} | ${kindNames[record.kind]} | ${record.title}`, '', record.body, '',
      `기록 ID: ${record.id}`, `작성일: ${record.createdAt}`, `근거: ${record.authority} / ${record.context}`, `진행: ${record.stage}`);
    for (const key of ['originalQuote', 'source', 'version', 'build', 'device', 'details', 'parentId']) if (record[key]) lines.push(`${key}: ${record[key]}`);
    if (record.kind === 'release') lines.push(`버전 상태: ${record.releaseState}`);
    for (const key of ['minutes', 'count', 'effortMinutes']) if (record[key] !== null) lines.push(`${key}: ${record[key]}`);
    if (record.minutes !== null || record.count !== null) lines.push(`측정 구분: ${record.measurement}`);
    lines.push('');
  }
  return lines.join('\n');
}
