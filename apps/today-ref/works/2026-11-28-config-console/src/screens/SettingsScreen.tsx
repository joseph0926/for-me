// 설정 목록(r1): 범위 거르기 한 줄, 정렬 메뉴, 조건 토큰이 남는 검색 줄, 행을 고르면 머리 줄이 묶음 작업으로 바뀌는 표.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type Dispatch } from "react";

import type { SettingsAction } from "../App";
import { EditPanel } from "../components/EditPanel";
import { collapse, quick } from "../motion";
import {
  callsIn,
  envLabel,
  envs,
  filterSettings,
  kindLabel,
  periods,
  projectLabel,
  projects,
  relativeTime,
  sortOptions,
  type EnvId,
  type ListQuery,
  type Setting,
} from "../settings";
import { Button, Checkbox, Dropdown, Icon, IconButton } from "../ui";

const defaultQuery: ListQuery = { text: "", activeOnly: true, project: "all", env: "prod", period: "24h", sort: "recent" };
// 입력을 잠깐 멈추면 거른다(tastepin 검색 값).
const searchPause = 250;

type Editing = { mode: "new" } | { mode: "edit"; key: string } | null;

const columns = "grid-cols-[1fr_92px] sm:grid-cols-[1fr_92px_104px] md:grid-cols-[1fr_100px_76px_92px_104px]";

export function SettingsScreen({ settings, dispatch }: { settings: Setting[]; dispatch: Dispatch<SettingsAction> }) {
  const [query, setQuery] = useState<ListQuery>(defaultQuery);
  const [typed, setTyped] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Editing>(null);
  const searchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const rows = filterSettings(settings, query);
  // 거르기를 바꿔 안 보이게 된 행은 묶음 작업에서 뺀다.
  const selectedRows = rows.filter((row) => selected.has(row.key));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const isDefaultSearch = typed === "" && query.activeOnly;
  const env = envLabel(query.env);
  const update = (patch: Partial<ListQuery>) => setQuery((current) => ({ ...current, ...patch }));

  const type = (text: string) => {
    setTyped(text);
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => update({ text }), searchPause);
  };
  const resetSearch = () => {
    window.clearTimeout(searchTimer.current);
    setTyped("");
    update({ text: "", activeOnly: true });
  };

  const toggleRow = (key: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });

  const runBulk = (change: "enable" | "disable" | "archive") => {
    dispatch({ type: "bulk", keys: selectedRows.map((row) => row.key), change, env: query.env });
    setSelected(new Set());
  };

  const editingSetting = editing?.mode === "edit" ? settings.find((setting) => setting.key === editing.key) ?? null : null;

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold">설정</h1>
        <Button tone="primary" onClick={() => setEditing({ mode: "new" })}>
          새 설정
        </Button>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex">
          <Dropdown
            ariaLabel="프로젝트"
            value={query.project}
            options={[{ value: "all", label: "모든 프로젝트" }, ...projects.map((p) => ({ value: p.id, label: p.label }))]}
            onChange={(project) => update({ project })}
            joined="rounded-l-work"
          />
          <Dropdown
            ariaLabel="환경"
            value={query.env}
            options={envs.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(next) => update({ env: next })}
            joined="-ml-px"
          />
          <Dropdown
            ariaLabel="기간"
            value={query.period}
            options={periods.map((period) => ({ value: period.id, label: period.label }))}
            onChange={(period) => update({ period })}
            joined="-ml-px rounded-r-work"
          />
        </div>
        <div className="ml-auto">
          <Dropdown
            ariaLabel="정렬"
            value={query.sort}
            prefix={<Icon name="sort" className="size-3.5 text-muted" />}
            options={sortOptions.map((option) => ({ value: option.id, label: option.label }))}
            onChange={(sort) => update({ sort })}
            align="end"
          />
        </div>
      </div>

      <div className="mt-2 flex h-10 items-center gap-2 rounded-work border border-line-strong bg-panel pr-0.5 pl-3 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        <Icon name="search" className="size-4 shrink-0 text-muted" />
        {query.activeOnly && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-[3px] bg-accent-soft py-0.5 pr-0.5 pl-1.5 text-[13px] text-accent">
            상태: 사용 중
            <button
              type="button"
              aria-label="상태 조건 빼기"
              onClick={() => update({ activeOnly: false })}
              className="grid size-5 place-items-center rounded-[3px] hover:bg-panel"
            >
              <Icon name="close" className="size-3" />
            </button>
          </span>
        )}
        <input
          value={typed}
          onChange={(event) => type(event.target.value)}
          placeholder="이름이나 키로 찾기"
          aria-label="설정 찾기"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] placeholder:text-muted"
        />
        {!isDefaultSearch && <IconButton label="검색 초기화" icon="close" onClick={resetSearch} />}
      </div>

      <section aria-label="설정 목록" className="mt-3">
        {/* 휴대폰 너비에서는 묶음 작업 버튼 셋이 한 줄에 들어가지 않아 두 줄로 접힌다. 넓은 화면은 44px 한 줄 그대로다. */}
        <div className="sticky top-0 z-10 flex min-h-11 items-center gap-3 border-b border-line bg-surface px-3 py-1">
          <Checkbox
            label="보이는 설정 모두 고르기"
            checked={allSelected}
            indeterminate={selectedRows.length > 0 && !allSelected}
            onChange={(checked) => setSelected(checked ? new Set(rows.map((row) => row.key)) : new Set())}
          />
          <AnimatePresence mode="wait" initial={false}>
            {selectedRows.length > 0 ? (
              <motion.div
                key="bulk"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={quick}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
              >
                <span className="mr-1.5 inline-flex shrink-0 overflow-hidden text-[14px] font-semibold whitespace-nowrap">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={selectedRows.length}
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -8, opacity: 0 }}
                      transition={quick}
                      className="tabular-nums"
                    >
                      {selectedRows.length}
                    </motion.span>
                  </AnimatePresence>
                  개 선택
                </span>
                <Button onClick={() => runBulk("enable")}>{env}에서 켜기</Button>
                <Button onClick={() => runBulk("disable")}>{env}에서 끄기</Button>
                <Button onClick={() => runBulk("archive")}>
                  보관
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="columns"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={quick}
                className={`grid min-w-0 flex-1 items-center text-[12px] font-medium tracking-[0.02em] text-muted ${columns}`}
              >
                <span>설정</span>
                <span className="hidden md:block">마지막 변경</span>
                <span className="hidden md:block">종류</span>
                <span>{env} 상태</span>
                <span className="hidden text-right sm:block">
                  호출 수 {periods.find((period) => period.id === query.period)!.label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {rows.length === 0 ? (
          <div className="grid place-items-center gap-2 px-4 py-14 text-center">
            <Icon name="search" className="size-8 text-muted" />
            <p className="text-[15px]">검색어를 바꾸거나 지우세요</p>
            <Button tone="primary" className="mt-1" onClick={resetSearch}>
              검색어 지우기
            </Button>
          </div>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <SettingRow
                  key={row.key}
                  setting={row}
                  env={query.env}
                  match={query.text.trim().toLowerCase()}
                  calls={callsIn(row, query.env, query.period)}
                  checked={selected.has(row.key)}
                  onCheck={(checked) => toggleRow(row.key, checked)}
                  onOpen={() => setEditing({ mode: "edit", key: row.key })}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
      <p className="mt-2 text-right text-[13px] text-muted">
        {rows.length}개 보기, 전체 {settings.length}개
      </p>

      <AnimatePresence>
        {editing && (
          <EditPanel
            key={editing.mode === "edit" ? editing.key : "new"}
            setting={editingSetting}
            defaultProject={query.project === "all" ? "order-web" : query.project}
            existingKeys={settings.map((setting) => setting.key)}
            onClose={() => setEditing(null)}
            onSave={(setting) => {
              dispatch({ type: "save", setting, originalKey: editingSetting?.key ?? null });
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function SettingRow({
  setting,
  env,
  match,
  calls,
  checked,
  onCheck,
  onOpen,
}: {
  setting: Setting;
  env: EnvId;
  match: string;
  calls: number;
  checked: boolean;
  onCheck: (checked: boolean) => void;
  onOpen: () => void;
}) {
  const config = setting.envs[env];
  return (
    <motion.li
      exit={{ height: 0, opacity: 0 }}
      transition={collapse}
      className={`overflow-hidden border-b border-line transition-colors duration-120 ${checked ? "bg-accent-soft" : "hover:bg-panel"}`}
    >
      <div className="flex items-center gap-3 px-3 py-[11px]">
        <Checkbox label={`${setting.name} 고르기`} checked={checked} onChange={onCheck} />
        <div className={`grid min-w-0 flex-1 items-center ${columns}`}>
          <div className="min-w-0 pr-3">
            <button
              type="button"
              onClick={onOpen}
              className={`block max-w-full truncate text-left text-[15px] font-semibold hover:text-accent hover:underline ${setting.archived ? "text-muted" : ""}`}
            >
              {setting.name}
            </button>
            <div className="mt-0.5 flex min-w-0 items-center gap-2.5 text-[13px] text-muted">
              <span className="truncate font-mono text-[12.5px]">
                <Highlighted text={setting.key} match={match} />
              </span>
              <span className="hidden shrink-0 sm:inline">{projectLabel(setting.project)}</span>
              {config.rules.length > 0 && <span className="hidden shrink-0 sm:inline">규칙 {config.rules.length}개</span>}
              {setting.archived && <span className="shrink-0">보관됨</span>}
            </div>
          </div>
          <span className="hidden text-[14px] text-muted md:block">{relativeTime(setting.updatedMinutesAgo)}</span>
          <span className="hidden text-[14px] text-muted md:block">{kindLabel(setting.kind)}</span>
          <span className="flex items-center gap-1.5 text-[14px] font-medium">
            <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${config.enabled ? "bg-accent" : "bg-line-strong"}`} />
            {config.enabled ? (
              <>
                켜짐<span className="font-normal text-muted tabular-nums">{config.rollout}%</span>
              </>
            ) : (
              <span className="text-muted">꺼짐</span>
            )}
          </span>
          <span className="hidden text-right text-[14px] tabular-nums sm:block">{calls.toLocaleString("ko-KR")}</span>
        </div>
      </div>
    </motion.li>
  );
}

// 찾는 말과 맞는 글자만 본문색 굵게 보인다.
function Highlighted({ text, match }: { text: string; match: string }) {
  const at = match === "" ? -1 : text.toLowerCase().indexOf(match);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-bold text-ink">{text.slice(at, at + match.length)}</strong>
      {text.slice(at + match.length)}
    </>
  );
}
