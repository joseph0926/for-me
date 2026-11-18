import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";

import { HomeIndicator, StatusBar } from "./components/Chrome";
import { ComposeSheet } from "./components/ComposeSheet";
import { TabBar } from "./components/TabBar";
import { TabStack } from "./components/TabStack";
import { contentReducer, countReplies, createMyPost, initialContent } from "./content";
import { communities, me } from "./data";
import { initialNav, navReducer, TAB_IDS, type Screen, type TabId } from "./navigation";
import { PostActionsContext, ReplyCountsContext, type PostActions } from "./postActions";
import { ActivityScreen } from "./screens/ActivityScreen";
import { CommunityScreen } from "./screens/CommunityScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { PostDetailScreen } from "./screens/PostDetailScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SearchScreen } from "./screens/SearchScreen";

type Toast = { id: number; text: string };

const TOAST_MS = 1800;

async function copyLink(hash: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}#${hash}`);
    return true;
  } catch {
    return false;
  }
}

function copyResultText(copied: boolean): string {
  return copied ? "링크를 복사했어요" : "링크를 복사하지 못했어요";
}

export function App() {
  const [content, dispatch] = useReducer(contentReducer, initialContent);
  const [nav, navigate] = useReducer(navReducer, initialNav);
  const [isComposing, setIsComposing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // 글 줄이 어디에 놓이든 같은 동작을 쓰도록 한 번만 만든다. dispatch와 setState는 바뀌지 않는다.
  const postActions = useMemo<PostActions>(() => {
    const showToast = (text: string) => setToast({ id: Date.now(), text });
    return {
      toggleLike: (postId) => dispatch({ type: "toggleLike", postId }),
      toggleRepost: (postId) => dispatch({ type: "toggleRepost", postId }),
      vote: (postId, optionId) => dispatch({ type: "vote", postId, optionId }),
      share: async (postId) => showToast(copyResultText(await copyLink(postId))),
      openPost: (postId, focusReply = false) => navigate({ type: "push", screen: { name: "post", postId, focusReply } }),
      openCommunity: (communityId) => navigate({ type: "push", screen: { name: "community", communityId } }),
    };
  }, []);

  const topLevelPosts = content.posts.filter((post) => post.parentId === null);
  const replyCounts = countReplies(content.posts);

  function publish(fields: { text: string; parentId?: string; communityId?: string }) {
    dispatch({ type: "publish", post: createMyPost(fields) });
  }

  function publishFromSheet(text: string) {
    publish({ text });
    setIsComposing(false);
    navigate({ type: "showRoot", tab: "home" });
  }

  function renderRoot(tab: TabId): ReactNode {
    switch (tab) {
      case "home":
        return <HomeScreen posts={topLevelPosts} onPublish={(text) => publish({ text })} />;
      case "search":
        return (
          <SearchScreen
            posts={topLevelPosts}
            followingIds={content.followingIds}
            onToggleFollow={(userId) => dispatch({ type: "toggleFollow", userId })}
          />
        );
      case "activity":
        return (
          <ActivityScreen
            followingIds={content.followingIds}
            onToggleFollow={(userId) => dispatch({ type: "toggleFollow", userId })}
          />
        );
      case "profile":
        return (
          <ProfileScreen
            posts={content.posts}
            onShareProfile={async () => setToast({ id: Date.now(), text: copyResultText(await copyLink(me.handle)) })}
          />
        );
    }
  }

  function renderScreen(screen: Screen): ReactNode {
    const pop = () => navigate({ type: "pop" });

    switch (screen.name) {
      case "post": {
        const post = content.posts.find((candidate) => candidate.id === screen.postId);
        if (!post) return null;
        return (
          <PostDetailScreen
            post={post}
            replies={content.posts.filter((candidate) => candidate.parentId === post.id)}
            focusReply={screen.focusReply}
            isFollowingAuthor={content.followingIds.includes(post.authorId)}
            onToggleFollow={() => dispatch({ type: "toggleFollow", userId: post.authorId })}
            onBack={pop}
            onReply={(text) => publish({ text, parentId: post.id })}
          />
        );
      }
      case "community": {
        const community = communities[screen.communityId];
        return (
          <CommunityScreen
            community={community}
            posts={topLevelPosts.filter((post) => post.communityId === community.id)}
            isJoined={content.joinedCommunityIds.includes(community.id)}
            onToggleJoin={() => dispatch({ type: "toggleJoin", communityId: community.id })}
            onBack={pop}
            onPublish={(text) => publish({ text, communityId: community.id })}
          />
        );
      }
    }
  }

  return (
    <PostActionsContext value={postActions}>
      <ReplyCountsContext value={replyCounts}>
        <div className="relative flex h-full flex-col overflow-hidden bg-surface">
          <div className="relative z-30 h-[var(--safe-top)] shrink-0 bg-surface">
            <StatusBar />
          </div>
          <main className="relative min-h-0 flex-1 overflow-hidden">
            {TAB_IDS.map((tab) => (
              <TabStack
                key={tab}
                isActive={nav.tab === tab}
                root={renderRoot(tab)}
                stack={nav.stacks[tab]}
                renderScreen={renderScreen}
              />
            ))}
          </main>
          <TabBar
            activeTab={nav.tab}
            onSelect={(tab) => navigate({ type: "selectTab", tab })}
            onCompose={() => setIsComposing(true)}
          />
          <ComposeSheet isOpen={isComposing} onClose={() => setIsComposing(false)} onPublish={publishFromSheet} />
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                role="status"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--safe-bottom)+66px)] z-50 flex justify-center"
              >
                <span className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-surface shadow-lg">{toast.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <HomeIndicator />
        </div>
      </ReplyCountsContext>
    </PostActionsContext>
  );
}
