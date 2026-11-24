// 저장함. 저장한 순서로 보이고, 여기서 저장을 풀어도 화면을 떠날 때까지 행은 그대로 두어 다시 누를 수 있게 한다.
import { useState } from "react";

import { useApp } from "../app-context";
import { PageHeader } from "../components/PageHeader";
import { PostItem } from "../components/PostItem";

export function Saved() {
  const { state } = useApp();
  // 이 화면을 열 때 저장돼 있던 글. 저장 시각 순서로 고정한다.
  const [initialIds] = useState(() =>
    Object.entries(state.saved)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id),
  );
  const posts = initialIds.map((id) => state.posts[id]).filter((post) => post !== undefined);

  return (
    <>
      <PageHeader title="저장함" subtitle={`${Object.keys(state.saved).length}개`} />
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
      {posts.length === 0 && <p className="px-4 py-16 text-center text-[15px] text-[var(--muted)]">글 아래 책갈피를 누르면 여기에 모여요</p>}
    </>
  );
}
