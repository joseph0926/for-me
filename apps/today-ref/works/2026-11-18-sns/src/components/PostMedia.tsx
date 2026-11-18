import type { Post } from "../data";
import { usePostActions } from "../postActions";
import { PollView } from "./PollView";
import { SceneImage } from "./SceneImage";

export function PostMedia({ post }: { post: Post }) {
  const { vote } = usePostActions();

  return (
    <>
      {post.scenes.length === 1 && <SceneImage scene={post.scenes[0]} className="mt-2.5 aspect-[4/5] w-[72%]" />}
      {post.scenes.length > 1 && (
        <div className="scroll-x -mr-4 mt-2.5 flex gap-1.5 pr-4">
          {post.scenes.map((scene) => (
            <SceneImage key={scene} scene={scene} className="aspect-[4/5] w-[210px] shrink-0" />
          ))}
        </div>
      )}
      {post.poll && <PollView poll={post.poll} onVote={(optionId) => vote(post.id, optionId)} />}
    </>
  );
}
