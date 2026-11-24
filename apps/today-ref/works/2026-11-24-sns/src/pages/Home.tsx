// 홈: 추천, 팔로잉과 내가 고정한 주제 피드가 한 줄에 있는 탭(r4 Threads), 새 글 알약, 글 목록.
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "../app-context";
import { Avatar } from "../components/Avatar";
import { Logo } from "../components/Navigation";
import { PageHeader } from "../components/PageHeader";
import { PostItem } from "../components/PostItem";
import { TabPanel } from "../components/TabPanel";
import { Tabs, type TabItem } from "../components/Tabs";
import { pinnedFeeds } from "../data";
import { easeOutCubic } from "../motion";
import { href } from "../router";
import { feed, type FeedId } from "../store";

const tabs: TabItem[] = [
  { id: "for-you", label: "추천", href: href({ name: "home", feed: "for-you" }) },
  { id: "following", label: "팔로잉", href: href({ name: "home", feed: "following" }) },
  ...pinnedFeeds.map((item) => ({ id: item.id, label: item.label, href: href({ name: "home", feed: item.id }) })),
];
const tabOrder = tabs.map((tab) => tab.id);

export function Home({ feedId }: { feedId: FeedId }) {
  const { state, dispatch } = useApp();
  const items = feed(state, feedId);

  const showPending = () => {
    dispatch({ type: "showPending" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <span className="md:hidden">
              <Logo size={22} />
            </span>
            홈
          </span>
        }
      >
        <Tabs items={tabs} current={feedId} label="피드" />
      </PageHeader>

      <div className="pointer-events-none sticky top-[112px] z-10 h-0">
        <AnimatePresence>
          {state.pending.length > 0 && (
            <motion.button
              type="button"
              onClick={showPending}
              initial={{ opacity: 0, y: -8, scale: 0.97, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, scale: 0.97, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: easeOutCubic }}
              className="pointer-events-auto mx-auto mt-3 flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] pr-4 pl-1.5 text-[14px] font-semibold text-white shadow-[var(--shadow)] dark:text-[#06201c]"
            >
              <span className="flex -space-x-2">
                {[...new Set(state.pending.map((post) => post.authorId))].slice(0, 3).map((id) => (
                  <span key={id} className="rounded-full ring-2 ring-[var(--accent)]">
                    <Avatar user={state.users[id]} size={28} />
                  </span>
                ))}
              </span>
              새 글 {state.pending.length}개
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <TabPanel order={tabOrder} current={feedId}>
        <FeedList items={items} />
      </TabPanel>
    </>
  );
}

function FeedList({ items }: { items: ReturnType<typeof feed> }) {
  return (
    <div>
      {/* 새로 붙은 글과 지운 글만 움직인다. 처음 그린 목록은 그대로 보인다. */}
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
            exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: easeOutCubic }}
            className="overflow-hidden"
          >
            <PostItem post={item.post} repostedBy={item.repostedBy} />
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && <p className="px-4 py-16 text-center text-[15px] text-[var(--muted)]">아직 글이 없어요</p>}
    </div>
  );
}
