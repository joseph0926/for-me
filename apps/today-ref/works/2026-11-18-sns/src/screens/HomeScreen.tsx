import { InlineComposer } from "../components/InlineComposer";
import { PostList } from "../components/PostRow";
import type { Post } from "../data";

export function HomeScreen({ posts, onPublish }: { posts: Post[]; onPublish: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-11 shrink-0 items-center justify-center">
        <h1 className="text-[21px] font-extrabold tracking-[-0.04em]">말결</h1>
      </header>
      <div className="scroll-y min-h-0 flex-1">
        <InlineComposer placeholder="새로운 소식이 있나요?" onSubmit={onPublish} />
        <PostList posts={posts} />
        <div className="h-8" />
      </div>
    </div>
  );
}
