// 피처드 묶음 배너(r2): 왼쪽 위 구역 이름과 남은 시간, 큰 묶음 이름, 오른쪽 아래 가격과 구매.
import { ItemArt } from "../art";
import { featuredBundle, getItem, sectionEndsIn } from "../data";
import { bundleOwned, bundlePrice, type Purchase } from "../shop";
import { Button, Price, Remaining, useShop } from "../ui";
import type { DetailTarget } from "./ItemDetail";

export function FeaturedBanner({ onOpen, onBuy }: { onOpen: (target: DetailTarget) => void; onBuy: (purchase: Purchase) => void }) {
  const { state } = useShop();
  const [home, away, keeper, ball] = featuredBundle.itemIds.map(getItem);
  const owned = bundleOwned(state);
  const price = bundlePrice(state);
  const short = state.balance.points < price;

  return (
    <section
      aria-labelledby="featured-title"
      className="relative h-[340px] overflow-hidden rounded-work border border-line sm:h-[380px]"
      style={{
        background: "radial-gradient(70% 120% at 82% 20%, #2a3242 0%, #1a1c21 60%, #15161a 100%)",
      }}
    >
      {/* 배너 전체가 상세로 들어가는 버튼이다. 가격과 구매 버튼은 그 위에 따로 놓인다. */}
      <button
        type="button"
        className="absolute inset-0 z-0"
        aria-label={`${featuredBundle.name} 자세히 보기`}
        onClick={() => onOpen({ kind: "bundle", itemId: home.id })}
      />
      {/* 휴대폰에서는 제목과 가격 사이 띠에, 넓은 화면에서는 오른쪽 절반에 그림을 둔다. */}
      <div
        className="pointer-events-none absolute inset-x-[6%] top-[38%] bottom-[22%] sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:w-[58%]"
        aria-hidden="true"
      >
        <ItemArt art={keeper.art} className="absolute top-[10%] right-[54%] w-[30%] -rotate-12 sm:top-[20%] sm:right-[50%] sm:w-[40%]" />
        <ItemArt art={away.art} className="absolute top-[6%] right-[14%] w-[30%] rotate-12 sm:top-[12%] sm:right-[-8%] sm:w-[46%]" />
        <ItemArt art={home.art} className="absolute top-0 right-[30%] w-[40%] sm:top-[-4%] sm:right-[18%] sm:w-[58%]" />
        <ItemArt art={ball.art} className="absolute right-[2%] bottom-0 w-[18%] sm:right-[46%] sm:bottom-[-6%] sm:w-[24%]" />
      </div>
      <div className="pointer-events-none relative flex h-full flex-col justify-between p-5 sm:p-8">
        <div>
          <div className="flex items-center gap-3 text-[14px] text-white/85">
            <span className="font-extrabold text-white">피처드</span>
            <span className="h-3.5 w-px bg-white/40" />
            <Remaining endsIn={sectionEndsIn.featured} />
          </div>
          <h2 id="featured-title" className="mt-3 max-w-[9em] font-title text-[38px] leading-[1.05] text-white sm:text-[48px]">
            {featuredBundle.name}
          </h2>
          <p className="mt-2 text-[14px] text-white/80">유니폼 3벌, 공, 걸개</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-3 self-end">
          {owned ? (
            <span className="rounded-work bg-strip px-4 py-2.5 text-[15px] font-extrabold text-white">보유</span>
          ) : (
            <>
              <Price
                currency="points"
                amount={price}
                className={`rounded-work bg-strip px-4 py-2.5 text-[17px] ${short ? "text-warn" : "text-white"}`}
              />
              <Button variant="primary" onClick={() => onBuy({ kind: "bundle", bundleId: featuredBundle.id })}>
                묶음 구매
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
