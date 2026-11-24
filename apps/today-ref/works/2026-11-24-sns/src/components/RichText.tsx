// 본문의 #주제와 @아이디를 링크로 바꾼다. 주제는 둘러보기 검색으로, 아이디는 프로필로 간다.
import { Fragment } from "react";

import { useApp } from "../app-context";
import { href } from "../router";

const token = /(#[\p{L}\p{N}_]+|@[a-z0-9._]+)/gu;

export function RichText({ text }: { text: string }) {
  const { state } = useApp();
  const handles = new Set(Object.values(state.users).map((user) => user.handle));

  return (
    <>
      {text.split(token).map((part, index) => {
        if (part.startsWith("#") && part.length > 1) {
          return (
            <a
              key={index}
              href={href({ name: "explore", q: part })}
              onClick={(event) => event.stopPropagation()}
              className="text-[var(--accent)] hover:underline"
            >
              {part}
            </a>
          );
        }
        const handle = part.slice(1);
        if (part.startsWith("@") && handles.has(handle)) {
          return (
            <a
              key={index}
              href={href({ name: "profile", handle, tab: "posts" })}
              onClick={(event) => event.stopPropagation()}
              className="text-[var(--accent)] hover:underline"
            >
              {part}
            </a>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}
