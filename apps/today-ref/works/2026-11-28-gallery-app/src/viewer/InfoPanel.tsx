// 사진 정보(r1의 내용 순서): 날짜, 시각과 장소, 파일 이름, 형식 배지가 붙은 카메라 줄, 해상도와 용량, 노출 다섯 칸.
import type { MediaItem } from "../data";
import { duration, fullDateLabel, timeLabel } from "../format";

function cameraName(focal: number) {
  if (focal < 20) return "후면 초광각 카메라";
  if (focal > 50) return "후면 망원 카메라";
  return "후면 광각 카메라";
}

// 정보에 적는 원본 해상도. 사진은 데이터의 크기(3000 x 4000 등) 그대로, 녹화본 동영상은 1080p로 적는다.
function resolution(item: MediaItem) {
  if (item.kind === "photo") return { width: item.width, height: item.height };
  return item.width > item.height ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
}

export function InfoPanel({ item }: { item: MediaItem }) {
  const size = resolution(item);
  const megapixels = Math.round((size.width * size.height) / 1_000_000);
  const facts =
    item.kind === "video"
      ? [`${size.width} x ${size.height}`, duration(item.seconds ?? 0), `${item.sizeMB}MB`]
      : [`${megapixels}MP`, `${size.width} x ${size.height}`, `${item.sizeMB}MB`];
  const exposure = item.exposure;

  return (
    <div className="px-5 pt-4 pb-5">
      <p className="text-[17px] font-bold">{fullDateLabel(item.takenAt)}</p>
      <p className="mt-0.5 text-[14px] text-muted">
        {timeLabel(item.takenAt)} • {item.place}
      </p>
      <p className="num mt-1 text-[13px] text-muted">{item.fileName}</p>

      <div className="mt-4 overflow-hidden rounded-work bg-sunken">
        <div className="px-3.5 pt-3 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-semibold">{exposure ? cameraName(exposure.focal) : "후면 광각 카메라"}</span>
            <span className="rounded-[3px] border border-line px-1.5 py-px text-[11px] font-bold text-muted">
              {item.kind === "video" ? "MP4" : "HEIF"}
            </span>
          </div>
          {exposure && (
            <p className="num mt-1 text-[13px] text-muted">
              {exposure.focal}mm f/{exposure.aperture}
            </p>
          )}
          <p className="num mt-0.5 text-[13px] text-muted">{facts.join(" • ")}</p>
        </div>
        {exposure && (
          <dl className="num grid grid-cols-5 border-t border-line text-center text-[12px]">
            {[
              ["감도", `ISO ${exposure.iso}`],
              ["초점 거리", `${exposure.focal} mm`],
              ["노출", `${exposure.ev > 0 ? "+" : ""}${exposure.ev} ev`],
              ["조리개", `f/${exposure.aperture}`],
              ["셔터", exposure.shutter],
            ].map(([label, value], index) => (
              <div key={label} className={`py-2 ${index > 0 ? "border-l border-line" : ""}`}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-semibold text-muted">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
