// 구매 확인 창(r4): 뒤 화면을 흐리게 가리고, 무엇을 사는지 한 줄, 비용을 가장 크게,
// 취소와 구매를 같은 폭으로 두며, 맨 아래에 현재 잔액과 충전 연결을 모은다.
// 머리줄의 포인트 + 버튼으로 열면 구매 없이 충전 화면만 보여 준다(purchase가 null).
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { currencyName, pointOffers } from "../data";
import { fade, pop } from "../motion";
import { costOf, purchaseName, type Cost, type Purchase } from "../shop";
import { Button, numberFormat, Price, useShop } from "../ui";

export function ConfirmDialog({
  purchase,
  onCancel,
  onConfirm,
}: {
  purchase: Purchase | null;
  onCancel: () => void;
  onConfirm: (purchase: Purchase) => void;
}) {
  const { state, dispatch } = useShop();
  const [view, setView] = useState<"confirm" | "charge">(purchase ? "confirm" : "charge");
  const cost = purchase ? costOf(purchase, state) : null;
  const missing = cost ? cost.amount - state.balance[cost.currency] : 0;

  return (
    // 뒤 게임 화면을 8px 흐리게 하고 검정 40%로 덮는다(tastepin 게임 상점 모달 값).
    <motion.div {...fade} transition={{ duration: 0.2 }} className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4 backdrop-blur-[8px]">
      <motion.div
        {...pop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-[420px] rounded-work border border-line px-6 pt-7 pb-6 text-center shadow-[0_24px_60px_rgb(0_0_0/0.5)]"
        style={{ background: "var(--raised)" }}
      >
        {purchase && cost && view === "confirm" ? (
          <ConfirmView
            name={purchaseName(purchase)}
            cost={cost}
            balance={state.balance[cost.currency]}
            missing={missing}
            onCancel={onCancel}
            onConfirm={() => onConfirm(purchase)}
            onCharge={() => setView("charge")}
          />
        ) : (
          <ChargeView
            missing={missing}
            onCharge={(points) => {
              dispatch({ type: "charge", points });
              if (purchase) setView("confirm");
              else onCancel();
            }}
            backLabel={purchase ? "구매로 돌아가기" : "닫기"}
            onBack={() => (purchase ? setView("confirm") : onCancel())}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

function ConfirmView({
  name,
  cost,
  balance,
  missing,
  onCancel,
  onConfirm,
  onCharge,
}: {
  name: string;
  cost: Cost;
  balance: number;
  missing: number;
  onCancel: () => void;
  onConfirm: () => void;
  onCharge: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const short = missing > 0;

  // 살 수 있으면 구매에, 모자라면 취소에 초점을 둔다.
  useEffect(() => {
    (short ? cancelRef : confirmRef).current?.focus();
  }, [short]);

  return (
    <>
      <h2 id="confirm-title" className="text-[16px] font-bold">
        {name} 구매
      </h2>
      <p className="mt-5 text-[13px] text-muted">비용</p>
      <Price
        currency={cost.currency}
        amount={cost.amount}
        className={`mt-1 justify-center text-[40px] [&_svg]:size-7 ${short ? "text-warn" : ""}`}
      />
      {short && (
        <p className="mt-1 text-[14px] font-extrabold text-warn">
          {currencyName[cost.currency]} {numberFormat.format(missing)} 부족
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button ref={cancelRef} onClick={onCancel}>
          취소
        </Button>
        <Button ref={confirmRef} variant="primary" disabled={short} onClick={onConfirm}>
          구매
        </Button>
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 border-t border-line pt-4 text-[14px]">
        <span className="text-muted">현재 잔액</span>
        <Price currency={cost.currency} amount={balance} />
      </div>
      {cost.currency === "points" ? (
        <button
          type="button"
          onClick={onCharge}
          className={`mt-3 text-[14px] font-bold underline decoration-1 underline-offset-4 ${short ? "text-accent" : "text-muted hover:text-ink"}`}
        >
          포인트 충전
        </button>
      ) : (
        short && <p className="mt-3 text-[13px] text-muted">코인은 경기 보상으로만 받습니다.</p>
      )}
    </>
  );
}

function ChargeView({
  missing,
  onCharge,
  backLabel,
  onBack,
}: {
  missing: number;
  onCharge: (points: number) => void;
  backLabel: string;
  onBack: () => void;
}) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => firstRef.current?.focus(), []);
  return (
    <>
      <h2 id="confirm-title" className="text-[16px] font-bold">
        포인트 충전
      </h2>
      {missing > 0 && (
        <p className="mt-1 text-[13px] text-muted">포인트 {numberFormat.format(missing)} 부족</p>
      )}
      <ul className="mt-5 flex flex-col gap-2 text-left">
        {pointOffers.map((offer, index) => (
          <li key={offer.id}>
            <button
              ref={index === 0 ? firstRef : undefined}
              type="button"
              onClick={() => onCharge(offer.points)}
              className="flex h-14 w-full items-center gap-3 rounded-work border border-line px-4 transition-colors duration-150 hover:bg-raised"
            >
              <Price currency="points" amount={offer.points} className="text-[17px]" />
              {offer.bonusRate > 0 && (
                <span className="text-[13px] font-bold text-muted">보너스 {Math.round(offer.bonusRate * 100)}%</span>
              )}
              <span className="ml-auto text-[15px] font-extrabold tabular">{numberFormat.format(offer.won)}원</span>
            </button>
          </li>
        ))}
      </ul>
      <Button className="mt-5 w-full" onClick={onBack}>
        {backLabel}
      </Button>
    </>
  );
}
