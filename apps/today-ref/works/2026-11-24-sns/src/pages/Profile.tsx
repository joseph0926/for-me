// 프로필(r3 Bluesky): 배너에 걸친 아바타, 이름과 아이디, 팔로워와 팔로잉과 게시물 수 한 줄, 소개, 균등 폭 탭, 맨 위 고정 글.
import { useApp } from "../app-context";
import { Avatar, bannerBackground } from "../components/Avatar";
import { FollowButton } from "../components/FollowButton";
import { PageHeader } from "../components/PageHeader";
import { PostItem } from "../components/PostItem";
import { RollingNumber } from "../components/RollingNumber";
import { TabPanel } from "../components/TabPanel";
import { Tabs } from "../components/Tabs";
import { meId, type Photo } from "../data";
import { href, type ProfileTab } from "../router";
import { followerCount, followingCount, type StoredPost } from "../store";

const profileTabs = ["posts", "replies", "media"] as const;

export function Profile({ handle, tab }: { handle: string; tab: ProfileTab }) {
  const { state, openViewer } = useApp();
  const user = Object.values(state.users).find((item) => item.handle === handle);

  if (!user) {
    return (
      <>
        <PageHeader title="프로필" back />
        <p className="px-4 py-16 text-center text-[15px] text-[var(--muted)]">@{handle} 계정을 찾을 수 없어요</p>
      </>
    );
  }

  const own = Object.values(state.posts)
    .filter((post) => post.authorId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  const topLevel = own.filter((post) => !post.replyToId);
  const replies = own.filter((post) => post.replyToId);
  const pinned = user.pinnedPostId ? state.posts[user.pinnedPostId] : undefined;

  // 게시물 탭: 고정 글을 맨 위에 두고, 쓴 글과 재게시한 글을 시각 순서로 섞는다.
  const shared = user.id === meId ? Object.entries(state.reposted).map(([postId, at]) => ({ postId, at })) : state.reposts.filter((item) => item.userId === user.id);
  const postItems = [
    ...topLevel.filter((post) => post.id !== pinned?.id).map((post) => ({ key: post.id, post, repostedBy: undefined as string | undefined, at: post.createdAt })),
    ...shared.filter((item) => state.posts[item.postId]).map((item) => ({ key: `r:${item.postId}`, post: state.posts[item.postId], repostedBy: user.id, at: item.at })),
  ].sort((a, b) => b.at - a.at);

  const media = topLevel.flatMap((post) => post.photos.map((photo) => ({ photo, post })));
  const tabs = profileTabs.map((id) => ({
    id,
    label: { posts: "게시물", replies: "답글", media: "미디어" }[id],
    href: href({ name: "profile", handle, tab: id }),
  }));

  return (
    <>
      <PageHeader title={user.name} back />

      <div className="h-36 md:h-44" style={{ background: bannerBackground(user.hue) }} />
      <div className="px-4">
        <div className="flex items-end justify-between">
          <div className="-mt-11 rounded-full">
            <Avatar user={user} size={88} ring />
          </div>
          {user.id !== meId && (
            <div className="pt-3">
              <FollowButton userId={user.id} />
            </div>
          )}
        </div>
        <h2 className="mt-3 text-[22px] leading-tight font-[650]">{user.name}</h2>
        <div className="mt-0.5 text-[15px] text-[var(--muted)]">@{user.handle}</div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-[var(--muted)]">
          <span>
            팔로워 <RollingNumber value={followerCount(state, user)} className="font-[650] text-[var(--ink)]" />
          </span>
          <span>
            팔로잉 <RollingNumber value={followingCount(state, user)} className="font-[650] text-[var(--ink)]" />
          </span>
          <span>
            게시물 <strong className="font-[650] text-[var(--ink)]">{topLevel.length}</strong>
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-[1.55]">{user.bio}</p>
        <p className="mt-2 text-[14px] text-[var(--faint)]">{user.joined} 가입</p>
      </div>

      <div className="mt-3 border-b border-[var(--line)]">
        <Tabs items={tabs} current={tab} fill label="프로필 보기" />
      </div>

      <TabPanel order={profileTabs} current={tab}>
      {tab === "posts" && (
        <>
          {pinned && <PostItem post={pinned} pinned />}
          {postItems.map((item) => (
            <PostItem key={item.key} post={item.post} repostedBy={item.repostedBy} />
          ))}
          {!pinned && postItems.length === 0 && <Empty>아직 쓴 글이 없어요</Empty>}
        </>
      )}
      {tab === "replies" && (
        <>
          {replies.map((post) => (
            <PostItem key={post.id} post={post} />
          ))}
          {replies.length === 0 && <Empty>아직 남긴 답글이 없어요</Empty>}
        </>
      )}
      {tab === "media" && <MediaGrid items={media} onOpen={(photos, index) => openViewer(photos, index)} />}
      </TabPanel>
    </>
  );
}

function MediaGrid({ items, onOpen }: { items: { photo: Photo; post: StoredPost }[]; onOpen: (photos: Photo[], index: number) => void }) {
  if (items.length === 0) return <Empty>아직 올린 사진이 없어요</Empty>;
  const photos = items.map((item) => item.photo);
  return (
    <div className="grid grid-cols-3 gap-0.5 p-0.5">
      {items.map(({ photo, post }, index) => (
        <button
          key={`${post.id}-${index}`}
          type="button"
          onClick={() => onOpen(photos, index)}
          aria-label={`사진 크게 보기: ${photo.alt}`}
          className="relative aspect-square overflow-hidden bg-[var(--hover)]"
        >
          <img src={photo.src} alt={photo.alt} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
        </button>
      ))}
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="px-4 py-16 text-center text-[15px] text-[var(--muted)]">{children}</p>;
}
