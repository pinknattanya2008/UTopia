"use client";

import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TierBadge from "./TierBadge";
import UserAvatar from "./UserAvatar";
import { fmtTime } from "@/lib/client";
import type { TierName } from "@/lib/types";

export interface QueueRowView {
  rank: number;
  baselineRank: number;
  userId: string;
  displayName: string;
  avatar: string;
  finalScore: number;
  tier: TierName;
  entryTime: string;
  flagged: boolean;
  flagReason?: string;
  totalTx30d: number;
  trustMultiplier: number;
  isLikelyBot: boolean;
}

const ROW_H = 68;

/**
 * ตารางคิว presale แบบมี animation:
 * mode "baseline" = เรียงตามจำนวนธุรกรรม (ไม่มี AI) → mode "final" = เรียงตาม Tier + Fan Score หลัง AI ตรวจ
 * แต่ละแถววางแบบ absolute แล้วเลื่อนด้วย transform เพื่อให้เห็นการสลับลำดับ
 */
export default function QueueTable({
  rows,
  mode,
  currentUserId,
}: {
  rows: QueueRowView[];
  mode: "baseline" | "final";
  currentUserId: string;
}) {
  const final = mode === "final";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-line px-3 py-2 text-xs text-muted sm:grid-cols-[3rem_1fr_7rem_5rem_5rem]">
        <span>คิว</span>
        <span>ผู้ใช้</span>
        <span className="hidden sm:block">Tier</span>
        <span className="text-right">{final ? "Fan Score" : "ธุรกรรม"}</span>
        <span className="hidden text-right sm:block">เข้าคิว</span>
      </div>
      <div className="relative" style={{ height: rows.length * ROW_H }}>
        {rows.map((r) => {
          const pos = (final ? r.rank : r.baselineRank) - 1;
          const red = final && r.flagged;
          const me = r.userId === currentUserId;
          return (
            <div
              key={r.userId}
              className={`absolute inset-x-0 grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b px-3 transition-[transform,background-color] duration-1000 ease-in-out sm:grid-cols-[3rem_1fr_7rem_5rem_5rem] ${
                red ? "border-danger/30 bg-danger/10" : "border-line/60"
              } ${me ? "ring-2 ring-inset ring-brand" : ""}`}
              style={{ height: ROW_H, transform: `translateY(${pos * ROW_H}px)` }}
            >
              <span className={`text-lg font-bold tabular-nums ${red ? "text-danger" : me ? "text-brand" : ""}`}>{pos + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserAvatar name={r.displayName} color={r.avatar} size="sm" />
                  <span className={`truncate font-medium ${red ? "text-danger line-through decoration-danger/60" : ""}`}>
                    {r.displayName}
                  </span>
                  {me && <span className="shrink-0 rounded bg-brand px-1.5 text-[10px] font-bold text-white">คุณ</span>}
                  <span className="sm:hidden">{final && <TierBadge tier={r.tier} size="sm" />}</span>
                </div>
                {red && r.flagReason ? (
                  <p className="flex items-center gap-1 text-xs text-danger/90">
                    {r.isLikelyBot ? (
                      <SmartToyOutlinedIcon fontSize="inherit" className="shrink-0" />
                    ) : (
                      <WarningAmberIcon fontSize="inherit" className="shrink-0" />
                    )}
                    <span className="truncate">{r.flagReason}</span>
                  </p>
                ) : (
                  <p className="truncate text-xs text-muted">
                    {final ? `Trust ×${r.trustMultiplier.toFixed(2)}` : `${r.totalTx30d} รายการใน 30 วัน`}
                  </p>
                )}
              </div>
              <span className="hidden sm:block">{final ? <TierBadge tier={r.tier} size="sm" /> : <span className="text-muted">—</span>}</span>
              <span className={`text-right font-semibold tabular-nums ${red ? "text-danger" : ""}`}>
                {final ? r.finalScore.toFixed(1) : r.totalTx30d}
              </span>
              <span className="hidden text-right text-sm tabular-nums text-muted sm:block">{final ? fmtTime(r.entryTime) : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
