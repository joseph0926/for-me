// 노브 설정 콘솔. 왼쪽 띠 메뉴(r1)와 두 화면(설정 목록, 게시)을 주소의 # 뒤로 고른다.
import { useReducer, useSyncExternalStore } from "react";

import { initialSettings } from "./data";
import { PublishScreen } from "./screens/PublishScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { copiedConfig, type EnvId, type FieldId, type Setting } from "./settings";
import { Icon } from "./ui";

export type SettingsAction =
  | { type: "save"; setting: Setting; originalKey: string | null }
  | { type: "bulk"; keys: string[]; change: "enable" | "disable" | "archive"; env: EnvId }
  | { type: "publish"; key: string; source: EnvId; target: EnvId; fields: FieldId[] };

function settingsReducer(settings: Setting[], action: SettingsAction): Setting[] {
  switch (action.type) {
    case "save": {
      const saved = { ...action.setting, updatedMinutesAgo: 0 };
      if (action.originalKey === null) return [saved, ...settings];
      return settings.map((setting) => (setting.key === action.originalKey ? saved : setting));
    }
    case "bulk": {
      const keys = new Set(action.keys);
      return settings.map((setting) => {
        if (!keys.has(setting.key)) return setting;
        if (action.change === "archive") return { ...setting, archived: true, updatedMinutesAgo: 0 };
        const enabled = action.change === "enable";
        const current = setting.envs[action.env];
        // 비율 0%로 켜면 아무도 켜짐 값을 받지 않으므로, 그때는 모두에게 켠다.
        const rollout = enabled && current.rollout === 0 ? 100 : current.rollout;
        const config = { ...current, enabled, rollout };
        return { ...setting, envs: { ...setting.envs, [action.env]: config }, updatedMinutesAgo: 0 };
      });
    }
    case "publish":
      return settings.map((setting) => {
        if (setting.key !== action.key) return setting;
        const target = copiedConfig(setting.envs[action.source], setting.envs[action.target], action.fields);
        return { ...setting, envs: { ...setting.envs, [action.target]: target }, updatedMinutesAgo: 0 };
      });
  }
}

type Route = { screen: "settings" } | { screen: "publish"; key: string | null };

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readRoute(hash: string): Route {
  const [screen, key] = hash.replace(/^#\/?/, "").split("/");
  if (screen === "publish") return { screen: "publish", key: key ? decodeURIComponent(key) : null };
  return { screen: "settings" };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function App() {
  const [settings, dispatch] = useReducer(settingsReducer, initialSettings);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash);
  const route = readRoute(hash);

  return (
    <div className="flex min-h-dvh">
      <nav
        aria-label="콘솔 메뉴"
        className="sticky top-0 flex h-dvh w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-3 sm:w-16"
      >
        <span
          aria-label="노브 설정 콘솔"
          className="mb-3 grid size-8 place-items-center rounded-work bg-accent font-mono text-[13px] font-semibold text-accent-ink"
        >
          노
        </span>
        <SideLink label="설정" icon="sliders" current={route.screen === "settings"} href="#/settings" />
        <SideLink label="게시" icon="upload" current={route.screen === "publish"} href="#/publish" />
      </nav>
      <div className="min-w-0 flex-1">
        {route.screen === "settings" ? (
          <SettingsScreen settings={settings} dispatch={dispatch} />
        ) : (
          <PublishScreen settings={settings} dispatch={dispatch} openKey={route.key} />
        )}
      </div>
    </div>
  );
}

function SideLink({ label, icon, current, href }: { label: string; icon: string; current: boolean; href: string }) {
  return (
    <a
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex w-12 flex-col items-center gap-0.5 rounded-work py-1.5 text-[12px] ${
        current ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      <Icon name={icon} className="size-[18px]" />
      {label}
    </a>
  );
}
