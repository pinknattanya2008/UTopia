"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import StraightenIcon from "@mui/icons-material/Straighten";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import { fmtTHB } from "@/lib/client";
import type { Concert, Section, Zone } from "@/lib/types";
import { MAP } from "@/lib/theme";
import { sectionBounds, stageOf, viewFrom, type SeatPos } from "@/lib/venue";

/** ภาพจำลองมุมมองจากที่นั่ง: ขนาดเวทีตามระยะ เลื่อนซ้าย/ขวาตามมุม และจำนวนแถวด้านหน้า */
function SeatView({ meters, angle, rowsAhead, color }: { meters: number; angle: number; rowsAhead: number; color: string }) {
  const W = 240;
  const H = 120;
  const scale = Math.max(0.25, Math.min(1.1, 14 / Math.max(6, meters)));
  const sw = 150 * scale;
  const sh = 34 * scale;
  const cx = W / 2 - Math.max(-70, Math.min(70, angle * 1.3));
  const skew = Math.max(-0.35, Math.min(0.35, angle / 120));
  const sy = 34 - scale * 8;
  const heads = Math.min(4, Math.ceil(rowsAhead / 5));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md bg-surface-2" aria-label="ภาพจำลองมุมมองจากที่นั่ง">
      {/* จอด้านข้างเวที */}
      <rect x={cx - sw / 2 - 26 * scale} y={sy - 18 * scale} width={20 * scale} height={14 * scale} fill={MAP.screen} opacity={0.8} />
      <rect x={cx + sw / 2 + 6 * scale} y={sy - 18 * scale} width={20 * scale} height={14 * scale} fill={MAP.screen} opacity={0.8} />
      {/* เวที (เอียงตามมุม) */}
      <polygon
        points={`${cx - sw / 2 + sw * skew * 0.3},${sy} ${cx + sw / 2 + sw * skew * 0.3},${sy} ${cx + sw / 2 + 10 * scale},${sy + sh} ${cx - sw / 2 - 10 * scale},${sy + sh}`}
        fill={MAP.stage}
      />
      <circle cx={cx} cy={sy + sh * 0.35} r={4 * scale} fill="#fff" />
      {/* ผู้ชมด้านหน้า */}
      {Array.from({ length: heads }, (_, row) =>
        Array.from({ length: 9 }, (_, i) => (
          <circle
            key={`${row}-${i}`}
            cx={10 + i * 28 + (row % 2) * 14}
            cy={H - 8 - (heads - 1 - row) * 9}
            r={9 - row * 0.8}
            fill={color}
            opacity={0.25 + row * 0.1}
          />
        )),
      )}
    </svg>
  );
}

export default function SeatDetail({
  concert,
  zone,
  section,
  seat,
  status,
  canAdd,
  onToggle,
  standingQty,
  standingAvailable,
  onStandingChange,
}: {
  concert: Pick<Concert, "template" | "stage">;
  zone?: Zone;
  section?: Section | null;
  seat?: SeatPos | null;
  status?: "available" | "unavailable" | "selected";
  canAdd: boolean;
  onToggle?: () => void;
  standingQty?: number;
  standingAvailable?: number;
  onStandingChange?: (qty: number) => void;
}) {
  if (!section || !zone) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
        <TouchAppOutlinedIcon className="text-brand" />
        <span>กดที่โซนบนผังเพื่อซูม แล้วกดที่นั่งเพื่อดูรายละเอียดและเลือก</span>
      </div>
    );
  }
  const stage = stageOf(concert);
  const sb = sectionBounds(section);
  const cx = seat?.cx ?? sb.x + sb.w / 2;
  const cy = seat?.cy ?? sb.y + sb.h / 2;
  const v = viewFrom(cx, cy, stage);
  const rowsAhead = seat ? seat.rowIndex : 0;

  return (
    <div className="animate-fade-up overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: zone.color }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">
            {zone.name} · Section {section.name}
          </p>
          {seat ? (
            <p className="text-lg font-bold">
              แถว {seat.row} · ที่นั่ง {seat.num}
            </p>
          ) : (
            <p className="text-lg font-bold">บัตรยืน (ไม่ระบุที่นั่ง)</p>
          )}
        </div>
        <p className="shrink-0 text-lg font-bold text-brand">{fmtTHB(zone.priceTHB)}</p>
      </div>

      <div className="space-y-3 p-4">
        <SeatView meters={v.meters} angle={v.angle} rowsAhead={rowsAhead} color={zone.color} />
        <dl className="grid grid-cols-3 divide-x divide-line text-center text-xs">
          <div className="px-2 py-1">
            <dt className="flex items-center justify-center gap-1 text-muted">
              <StraightenIcon fontSize="inherit" /> ห่างเวที
            </dt>
            <dd className="mt-0.5 text-sm font-semibold">~{v.meters} ม.</dd>
          </div>
          <div className="px-2 py-1">
            <dt className="flex items-center justify-center gap-1 text-muted">
              <ExploreOutlinedIcon fontSize="inherit" /> มุมมอง
            </dt>
            <dd className="mt-0.5 text-sm font-semibold">{v.angleLabel}</dd>
          </div>
          <div className="px-2 py-1">
            <dt className="text-muted">{seat ? "แถวด้านหน้า" : "ที่ว่าง"}</dt>
            <dd className="mt-0.5 text-sm font-semibold">
              {seat ? `${rowsAhead} แถว` : `${(standingAvailable ?? 0).toLocaleString("th-TH")} ใบ`}
            </dd>
          </div>
        </dl>
        <p className="flex items-start gap-1.5 text-sm text-muted">
          <VisibilityOutlinedIcon fontSize="small" className="shrink-0" /> {zone.view || "—"}
        </p>

        {seat ? (
          status === "unavailable" ? (
            <p className="flex items-center justify-center gap-1 rounded-lg bg-surface-2 py-2.5 text-sm text-muted">
              <CloseIcon fontSize="small" /> ที่นั่งนี้ไม่ว่าง
            </p>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              disabled={status === "available" && !canAdd}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 font-bold transition disabled:opacity-40 ${
                status === "selected" ? "border border-line hover:border-danger hover:text-danger" : "bg-brand text-white hover:bg-brand-dark"
              }`}
            >
              {status === "selected" ? (
                <>
                  <CheckIcon fontSize="small" /> เลือกแล้ว · กดเพื่อเอาออก
                </>
              ) : canAdd ? (
                <>
                  <AddIcon fontSize="small" /> เลือกที่นั่งนี้
                </>
              ) : (
                "ครบจำนวนที่ซื้อได้แล้ว"
              )}
            </button>
          )
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-surface-2 p-3">
            <span className="text-sm font-semibold">จำนวนบัตร</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="ลดจำนวน"
                onClick={() => onStandingChange?.(Math.max(0, (standingQty ?? 0) - 1))}
                disabled={!standingQty}
                className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40"
              >
                <RemoveIcon fontSize="small" />
              </button>
              <span className="w-6 text-center text-lg font-bold tabular-nums">{standingQty ?? 0}</span>
              <button
                type="button"
                aria-label="เพิ่มจำนวน"
                onClick={() => onStandingChange?.((standingQty ?? 0) + 1)}
                disabled={!canAdd || (standingQty ?? 0) >= (standingAvailable ?? 0)}
                className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white disabled:opacity-40"
              >
                <AddIcon fontSize="small" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
