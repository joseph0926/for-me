// 입력창에 쓰는 중인 글, 첨부 이미지와 그 분석, 대상과 용도. 예시 칩과 입력창이 함께 바꾸므로 둘의 부모가 이 훅을 쓴다.
import { useEffect, useRef, useState } from "react";

import { analyzeImage, type ImageAnalysis } from "./analyzeImage";
import type { PurposeId, TargetId } from "./generate";
import { makeId, type SentImage, type Submission } from "./state";

export const MAX_IMAGES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

export type Attachment =
  | { id: string; name: string; url: string; owned: boolean; status: "reading" }
  | { id: string; name: string; url: string; owned: boolean; status: "ready"; analysis: ImageAnalysis }
  | { id: string; name: string; url: string; owned: boolean; status: "failed"; error: string };

export function useDraft(initial: { target: TargetId; purpose: PurposeId | null }) {
  const [text, setText] = useState("");
  const [target, setTarget] = useState<TargetId>(initial.target);
  const [purpose, setPurpose] = useState<PurposeId | null>(initial.purpose);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // 보내지 않고 떠난 첨부의 임시 주소를 화면이 사라질 때 정리한다.
  // 첫 요청을 보내면 새 세션으로 바뀌며 이 화면이 다시 그려지지 않고 사라지므로, 보낸 순간 takeSubmission에서 목록을 비운다.
  const unsent = useRef<Attachment[]>([]);
  useEffect(() => {
    unsent.current = attachments;
  }, [attachments]);
  useEffect(
    () => () => {
      for (const attachment of unsent.current) if (attachment.owned) URL.revokeObjectURL(attachment.url);
    },
    [],
  );

  function startAnalysis(attachment: Attachment) {
    analyzeImage(attachment.url).then(
      (analysis) => setAttachments((current) => current.map((item) => (item.id === attachment.id ? { ...item, status: "ready", analysis } : item))),
      (error: Error) => setAttachments((current) => current.map((item) => (item.id === attachment.id ? { ...item, status: "failed", error: error.message } : item))),
    );
  }

  function addFiles(files: File[]) {
    const room = MAX_IMAGES - attachments.length;
    const images = files.filter((file) => file.type.startsWith("image/"));
    const problems: string[] = [];
    if (images.length < files.length) problems.push("이미지 파일만 올릴 수 있어요.");
    const small = images.filter((file) => file.size <= MAX_BYTES);
    if (small.length < images.length) problems.push("10MB보다 큰 이미지는 뺐어요.");
    if (small.length > room) problems.push(`이미지는 ${MAX_IMAGES}장까지 붙일 수 있어요.`);
    setNotice(problems.length > 0 ? problems.join(" ") : null);

    const added: Attachment[] = small.slice(0, Math.max(0, room)).map((file) => ({
      id: makeId("image"),
      name: file.name,
      url: URL.createObjectURL(file),
      owned: true,
      status: "reading",
    }));
    if (added.length === 0) return;
    setAttachments((current) => [...current, ...added]);
    added.forEach(startAnalysis);
  }

  function addSample(url: string, name: string) {
    if (attachments.some((item) => item.url === url)) return;
    if (attachments.length >= MAX_IMAGES) {
      setNotice(`이미지는 ${MAX_IMAGES}장까지 붙일 수 있어요.`);
      return;
    }
    const attachment: Attachment = { id: makeId("image"), name, url, owned: false, status: "reading" };
    setAttachments((current) => [...current, attachment]);
    startAnalysis(attachment);
  }

  function remove(id: string) {
    const target = attachments.find((item) => item.id === id);
    if (target?.owned) URL.revokeObjectURL(target.url);
    setAttachments((current) => current.filter((item) => item.id !== id));
    setNotice(null);
  }

  const reading = attachments.some((item) => item.status === "reading");
  const ready: SentImage[] = attachments.flatMap((item) => (item.status === "ready" ? [{ id: item.id, name: item.name, url: item.url, analysis: item.analysis }] : []));
  const canSend = !reading && (text.trim() !== "" || ready.length > 0);

  // 보낸 첨부의 주소는 대화 기록이 계속 쓰므로 정리하지 않고 목록에서만 뺀다. 읽지 못한 첨부는 여기서 정리한다.
  function takeSubmission(): Submission | null {
    if (!canSend) return null;
    for (const item of attachments) if (item.status === "failed" && item.owned) URL.revokeObjectURL(item.url);
    const submission: Submission = { text: text.trim(), images: ready, target, purpose };
    unsent.current = [];
    setText("");
    setAttachments([]);
    setNotice(null);
    return submission;
  }

  return {
    text,
    setText,
    target,
    setTarget,
    purpose,
    setPurpose,
    attachments,
    notice,
    reading,
    canSend,
    addFiles,
    addSample,
    remove,
    takeSubmission,
  };
}

export type Draft = ReturnType<typeof useDraft>;
