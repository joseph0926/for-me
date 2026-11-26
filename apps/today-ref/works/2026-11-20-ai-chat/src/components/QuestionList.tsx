// 눌러서 바로 보내는 질문 목록. 빈 대화의 추천 질문과 답 뒤의 이어서 물어보기가 같은 모양을 쓴다.
// 행은 선 없이 여백으로 나누고 오른쪽에 +를 둔다(r6).
import { Icon } from "./Icon";

export function QuestionList({
  label,
  questions,
  disabled,
  onPick,
}: {
  label: string;
  questions: string[];
  disabled: boolean;
  onPick: (question: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-1 text-[13px] font-semibold text-muted">{label}</h2>
      <ul className="-mx-2">
        {questions.map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onPick(question)}
              disabled={disabled}
              className="question-row flex w-full items-center gap-3 rounded-md px-2 py-[11px] text-left text-[15px] leading-[1.55] disabled:opacity-40"
            >
              <span className="flex-1">{question}</span>
              <Icon name="plus" size={18} className="shrink-0 text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
