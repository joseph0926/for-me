import { useState } from "react";

import { CreatorAvatar } from "../components/Avatar";
import { CheckIcon } from "../components/Icons";
import { Sheet } from "../components/Sheet";
import { creatorAccent, creatorSoft } from "../components/tone";
import { useApp } from "../context";
import { TIER_ORDER, tiersFor, type Tier, type TierId } from "../data";
import { nextBillingDate, won } from "../format";
import { creatorById, tierOf } from "../store";

type PaidTierId = Exclude<TierId, "follow">;

// 등급 고르기 → 확인 두 단계. 확인 단계에서 동의해야 가입 버튼이 켜진다. 실제 결제는 없다.
export function MembershipSheet({ creatorId, onClose }: { creatorId: string; onClose: () => void }) {
  const { state, dispatch, showToast } = useApp();
  const creator = creatorById(creatorId);
  const tiers = tiersFor(creator);
  const current = tierOf(state, creator.id);
  const [picked, setPicked] = useState<PaidTierId | null>(null);
  const [agreed, setAgreed] = useState(false);
  const accent = creatorAccent(creator.hue);
  const pickedTier = tiers.find((tier) => tier.id === picked);
  const isChange = current === "member" || current === "close";

  const confirm = () => {
    if (!pickedTier || picked === null) return;
    dispatch({ type: "join", creatorId: creator.id, tier: picked });
    showToast(isChange ? `${pickedTier.name} 등급으로 바꿨어요` : `${creator.name} ${pickedTier.name}가 되었어요`);
    onClose();
  };

  return (
    <Sheet label={`${creator.name} 멤버십`} onClose={onClose}>
      {pickedTier ? (
        <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-6 pt-4">
          <button type="button" onClick={() => setPicked(null)} className="self-start text-[13px] text-muted">
            ← 등급 다시 고르기
          </button>
          <div className="flex items-center gap-3">
            <CreatorAvatar creator={creator} size={46} />
            <div>
              <p className="text-[13px] text-muted">{creator.name}</p>
              <p className="text-[18px] font-bold">{pickedTier.name}</p>
            </div>
          </div>
          <dl className="divide-y divide-line rounded-2xl bg-sunken px-4 text-[14px]">
            <div className="flex justify-between py-3">
              <dt className="text-muted">월 금액</dt>
              <dd className="font-semibold">{won(pickedTier.monthlyPrice)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-muted">다음 결제일</dt>
              <dd>{nextBillingDate(Date.now())}</dd>
            </div>
          </dl>
          <label className="flex items-start gap-2.5 text-[13px] leading-snug">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 size-4.5 shrink-0"
              style={{ accentColor: accent }}
            />
            매달 자동 결제되며 언제든 '나' 탭에서 해지할 수 있다는 데 동의합니다
          </label>
          <button
            type="button"
            disabled={!agreed}
            onClick={confirm}
            className="h-12 rounded-xl text-[15px] font-bold text-white disabled:opacity-40"
            style={{ background: accent }}
          >
            {won(pickedTier.monthlyPrice)}로 {isChange ? "변경하기" : "가입하기"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-6 pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <CreatorAvatar creator={creator} size={34} />
            <h2 className="text-[17px] font-bold">{creator.name} 멤버십</h2>
          </div>
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              hue={creator.hue}
              popular={tier.id === "member"}
              status={statusOf(tier.id, current)}
              isChange={isChange}
              onPick={() => {
                if (tier.id === "follow") return;
                setAgreed(false);
                setPicked(tier.id);
              }}
            />
          ))}
        </div>
      )}
    </Sheet>
  );
}

type TierStatus = "current" | "included" | "available";

function statusOf(tier: TierId, current: TierId | null): TierStatus {
  if (current === null) return "available";
  if (tier === current) return "current";
  return TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(current) ? "included" : "available";
}

function TierCard({
  tier,
  hue,
  popular,
  status,
  isChange,
  onPick,
}: {
  tier: Tier;
  hue: number;
  popular: boolean;
  status: TierStatus;
  isChange: boolean;
  onPick: () => void;
}) {
  const accent = creatorAccent(hue);
  const isFree = tier.monthlyPrice === 0;
  return (
    <section
      className="rounded-2xl border p-4"
      style={{ borderColor: status === "current" ? accent : "var(--line)", background: status === "current" ? creatorSoft(hue) : undefined }}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-[15.5px] font-bold">{tier.name}</h3>
        {popular && (
          <span className="rounded px-1.5 text-[11px] font-bold leading-[18px] text-white" style={{ background: accent }}>
            인기
          </span>
        )}
        <span className="ml-auto text-[15px] font-bold">
          {isFree ? "무료" : won(tier.monthlyPrice)}
          {!isFree && <span className="text-[12px] font-medium text-muted"> / 월</span>}
        </span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {tier.benefits.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2 text-[13px]">
            <CheckIcon size={15} style={{ color: accent }} />
            {benefit}
          </li>
        ))}
      </ul>
      {!isFree && (
        <button
          type="button"
          onClick={onPick}
          disabled={status !== "available"}
          className="mt-3.5 h-10 w-full rounded-xl text-[14px] font-semibold disabled:bg-sunken disabled:text-muted"
          style={status === "available" ? { background: popular ? accent : "var(--ink)", color: popular ? "white" : "var(--surface)" } : undefined}
        >
          {status === "current" ? "이용 중" : status === "included" ? "현재 등급에 포함" : isChange ? "이 등급으로 변경" : "이 등급으로 가입"}
        </button>
      )}
      {isFree && status === "current" && <p className="mt-3 text-[12.5px] text-muted">구독 중인 등급이에요</p>}
    </section>
  );
}
