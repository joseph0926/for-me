// 클럽. 상점에서 산 결과가 돌아오는 곳이다. 이번 접속에서 받은 것을 앞에 둔다.
import { ItemArt, PlayerCard } from "../art";
import { getItem, getPlayer, rarityStyle } from "../data";
import { useShop } from "../ui";

export function ClubScreen() {
  const { state } = useShop();
  // 이미 있는 선수를 팩에서 다시 받으면 클럽에 두 장이 된다. 그래서 "새"는 선수 id가 아니라
  // 이번 접속에서 뒤에 더해진 자리로 정한다(받은 선수는 clubPlayerIds 끝에 붙는다).
  const newCount = state.recent.filter((entry) => entry.kind === "player").length;
  const firstNewIndex = state.clubPlayerIds.length - newCount;
  const clubPlayers = state.clubPlayerIds
    .map((id, index) => ({ key: `${id}-${index}`, player: getPlayer(id), isNew: index >= firstNewIndex }))
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.player.rating - a.player.rating);

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-10 px-4 pt-6 pb-16 sm:px-8 sm:pt-8">
      <section aria-labelledby="club-items">
        <h2 id="club-items" className="font-title text-[28px]">
          아이템 <span className="text-muted tabular">{state.ownedItemIds.length}</span>
        </h2>
        {state.ownedItemIds.length === 0 ? (
          <p className="mt-3 text-[15px] text-muted">아직 없습니다.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {state.ownedItemIds.map((id) => {
              const item = getItem(id);
              return (
                <li key={id} className="overflow-hidden rounded-work" style={{ background: rarityStyle[item.rarity].ground }}>
                  <ItemArt art={item.art} className="mx-auto h-[120px] w-[120px]" />
                  <div className="bg-strip px-3 py-2">
                    <div className="truncate text-[14px] font-extrabold">{item.name}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="club-players">
        <h2 id="club-players" className="font-title text-[28px]">
          선수 <span className="text-muted tabular">{clubPlayers.length}</span>
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {clubPlayers.map(({ key, player, isNew }) => (
            <li key={key} className="relative">
              <PlayerCard player={player} />
              {isNew && (
                <span className="absolute -top-2 -right-2 rounded-work bg-accent px-1.5 py-0.5 text-[11px] font-extrabold text-accent-ink">
                  새
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
