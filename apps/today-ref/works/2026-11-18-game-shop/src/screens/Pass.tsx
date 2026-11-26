import { useEffect, useRef } from "react";

import { CurrencyAmount } from "../components/Currency";
import { Icon } from "../components/Icon";
import { passBenefits, passTiers, passTrack, season, type PassTier, type Wallet } from "../data";
import { passUpgradeCost } from "../shop";

export function Pass({ current, wallet, onBuy }: { current: PassTier; wallet: Wallet; onBuy: (tier: Exclude<PassTier, "free">) => void }) {
  return (
    <div className="space-y-10">
      <RewardTrack hasPass={current !== "free"} />
      <TierTable current={current} wallet={wallet} onBuy={onBuy} />
    </div>
  );
}

// 시즌 패스의 본체. 지금 단계가 보이도록 가로 목록을 그 칸으로 옮겨 둔다.
function RewardTrack({ hasPass }: { hasPass: boolean }) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const currentStep = list?.querySelector<HTMLElement>("[aria-current='step']");
    // 왼쪽에 고정한 줄 머리(무료, 패스) 칸 폭만큼 더 비켜서 지금 단계가 가려지지 않게 한다.
    if (list && currentStep) list.scrollLeft = currentStep.offsetLeft - 56 - list.clientWidth / 4;
  }, []);

  return (
    <section aria-labelledby="reward-track">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="reward-track" className="text-xl font-bold">
          단계 보상
        </h2>
        <p className="text-[13px] text-muted tabular">
          {season.name}, {season.endsLabel}, 단계 {season.level} / {season.maxLevel}
        </p>
      </div>
      <ol ref={listRef} className="no-scrollbar relative mt-4 flex gap-2 overflow-x-auto pb-1">
        <li aria-hidden="true" className="sticky left-0 z-10 w-12 shrink-0 bg-surface py-3 text-[12px] text-muted">
          <p className="invisible">단계</p>
          <p className="mt-2 leading-snug">무료</p>
          <p className="mt-2 leading-snug">패스</p>
        </li>
        {passTrack.map((step) => {
          const reached = step.level <= season.level;
          const isCurrent = step.level === season.level;
          return (
            <li
              key={step.level}
              aria-current={isCurrent ? "step" : undefined}
              className={`w-32 shrink-0 rounded-md p-3 ${isCurrent ? "bg-panel-raised" : "bg-panel"}`}
            >
              <p className={`text-[12px] font-semibold tabular ${reached ? "text-ink" : "text-muted"}`}>
                단계 {step.level}
                {reached ? <Icon name="check" className="ml-1 inline size-3.5 align-[-2px] text-accent" /> : null}
              </p>
              <p className="mt-2 text-[13px] leading-snug">
                <span className="sr-only">무료 </span>
                {step.free}
              </p>
              <p className={`mt-2 text-[13px] leading-snug ${hasPass ? "" : "text-muted"}`}>
                <span className="sr-only">패스 </span>
                {hasPass ? null : <Icon name="lock" className="mr-1 inline size-3.5 align-[-2px]" />}
                {step.pass}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TierTable({ current, wallet, onBuy }: { current: PassTier; wallet: Wallet; onBuy: (tier: Exclude<PassTier, "free">) => void }) {
  const currentIndex = passTiers.findIndex((tier) => tier.id === current);

  return (
    <section aria-labelledby="tier-table">
      <h2 id="tier-table" className="text-xl font-bold">
        등급 비교
      </h2>
      <div className="mt-4 overflow-hidden rounded-md bg-panel">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col className="w-[34%] sm:w-[40%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="p-3 text-left align-bottom text-[12px] font-medium text-muted sm:p-4">
                <span className="sr-only">혜택</span>
              </th>
              {passTiers.map((tier) => (
                <th key={tier.id} scope="col" className={`p-2 align-bottom sm:p-4 ${tier.id === current ? "bg-panel-raised" : ""}`}>
                  <span className="block text-[13px] font-bold sm:text-[15px]">{tier.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {passBenefits.map((benefit) => (
              <tr key={benefit.label} className="border-t border-line">
                <th scope="row" className="p-3 text-left font-medium sm:p-4">
                  {benefit.label}
                </th>
                {passTiers.map((tier) => {
                  const value = benefit.values[tier.id];
                  return (
                    <td key={tier.id} className={`p-2 text-center sm:p-4 ${tier.id === current ? "bg-panel-raised" : ""}`}>
                      {value === true ? (
                        <>
                          <Icon name="check" className="inline size-4" />
                          <span className="sr-only">포함</span>
                        </>
                      ) : value === false ? (
                        <span className="text-muted/60" aria-label="없음">
                          –
                        </span>
                      ) : (
                        <span className="text-[12px] font-semibold sm:text-[13px]">{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <th scope="row" className="p-3 text-left font-medium sm:p-4">
                가격
              </th>
              {passTiers.map((tier, index) => {
                const owned = index <= currentIndex;
                const paidTier = tier.id === "free" ? null : tier.id;
                const cost = paidTier === null ? null : passUpgradeCost(current, paidTier);
                const upgrade = current !== "free" && cost !== null;
                const short = cost !== null && wallet.point < cost;
                return (
                  <td key={tier.id} className={`p-2 text-center sm:p-4 ${tier.id === current ? "bg-panel-raised" : ""}`}>
                    {tier.id === current ? (
                      <span className="text-[12px] font-semibold text-muted">지금 등급</span>
                    ) : owned ? (
                      <span className="text-[12px] font-semibold text-muted">포함됨</span>
                    ) : paidTier !== null && cost !== null ? (
                      <button
                        type="button"
                        onClick={() => onBuy(paidTier)}
                        aria-label={`${tier.name} ${upgrade ? "올리기, 차액" : "구매"} 포인트 ${cost.toLocaleString("ko-KR")}${short ? ", 잔액 부족" : ""}`}
                        className="btn btn-secondary w-full px-1 text-[13px]"
                      >
                        <CurrencyAmount currency="point" amount={cost} className={short ? "text-danger" : ""} />
                      </button>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
