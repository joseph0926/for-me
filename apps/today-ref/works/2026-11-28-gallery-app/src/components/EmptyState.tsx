// 빈 상태: 선 아이콘, 할 일을 먼저 말하는 한 줄, 필요하면 행동 단추 하나(tastepin 빈 상태 값)
import { Icon, type IconName } from "./Icon";

export function EmptyState({ icon, text, action }: { icon: IconName; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center px-8 pt-20 text-center">
      <Icon name={icon} size={32} className="text-faint" />
      <p className="mt-3 text-[15px] leading-[1.55] text-muted">{text}</p>
      {action && (
        <button type="button" className="mt-4 h-10 rounded-work bg-accent px-4 text-[15px] font-semibold text-accent-ink" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
