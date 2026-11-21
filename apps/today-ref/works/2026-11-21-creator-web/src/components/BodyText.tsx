import { creatorAccent } from "./tone";

// 본문의 #해시태그만 크리에이터 색으로 칠한다.
export function BodyText({ text, hue, className }: { text: string; hue: number; className: string }) {
  const parts = text.split(/(#\S+)/);
  return (
    <p className={className}>
      {parts.map((part, index) =>
        part.startsWith("#") ? (
          <span key={index} className="font-medium" style={{ color: creatorAccent(hue) }}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}
