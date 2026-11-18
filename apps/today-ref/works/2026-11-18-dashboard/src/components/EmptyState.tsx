import { Icon, type IconName } from "../icons";

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="mt-6 grid min-h-[360px] place-items-center rounded-xl border border-dashed border-line">
      <div className="flex max-w-[340px] flex-col items-center px-6 text-center">
        <span className="grid size-9 place-items-center rounded-lg border border-line text-muted">
          <Icon name={icon} className="size-4" />
        </span>
        <p className="mt-4 text-[14px] font-medium text-ink">{title}</p>
        <p className="mt-1.5 text-[13px] leading-5 text-muted">{body}</p>
      </div>
    </div>
  );
}
