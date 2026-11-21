import { useState } from "react";

import { CreatorAvatar } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { creatorAccent } from "../components/tone";
import { useApp } from "../context";
import { tiersFor } from "../data";
import { nextBillingDate, won } from "../format";
import { creatorById, tierOf } from "../store";

// 등급을 고른 뒤 여는 확인 창. 자동 결제 동의에 체크해야 버튼이 켜진다. 실제 결제는 없다.
export function JoinDialog({ creatorId, tierId, onClose }: { creatorId: string; tierId: "member" | "close"; onClose: () => void }) {
  const { state, dispatch, showToast } = useApp();
  const creator = creatorById(creatorId);
  const tier = tiersFor(creator).find((item) => item.id === tierId);
  const current = tierOf(state, creator.id);
  const isChange = current === "member" || current === "close";
  const [agreed, setAgreed] = useState(false);
  const accent = creatorAccent(creator.hue);
  if (!tier) throw new Error(`${creatorId}의 등급 ${tierId}가 없습니다`);

  const confirm = () => {
    dispatch({ type: "join", creatorId: creator.id, tier: tierId });
    showToast(isChange ? `${tier.name} 등급으로 바꿨어요` : `${creator.name} ${tier.name}가 되었어요`);
    onClose();
  };

  return (
    <Dialog title={isChange ? "멤버십 변경" : "멤버십 가입"} onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 pb-6 pt-5">
        <div className="flex items-center gap-3">
          <CreatorAvatar creator={creator} size={46} />
          <div>
            <p className="text-[13px] text-muted">{creator.name}</p>
            <p className="text-[18px] font-bold">{tier.name}</p>
          </div>
        </div>
        <dl className="divide-y divide-line rounded-2xl bg-sunken px-4 text-[14px]">
          <div className="flex justify-between py-3">
            <dt className="text-muted">월 금액</dt>
            <dd className="font-semibold">{won(tier.monthlyPrice)}</dd>
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
            className="mt-0.5 size-4 shrink-0"
            style={{ accentColor: accent }}
          />
          매달 자동 결제되며 언제든 '나'에서 해지할 수 있다는 데 동의합니다
        </label>
        <button
          type="button"
          disabled={!agreed}
          onClick={confirm}
          className="h-12 rounded-xl text-[15px] font-bold text-white disabled:opacity-40"
          style={{ background: accent }}
        >
          {won(tier.monthlyPrice)}로 {isChange ? "변경하기" : "가입하기"}
        </button>
      </div>
    </Dialog>
  );
}
