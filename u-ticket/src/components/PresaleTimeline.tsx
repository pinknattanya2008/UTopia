"use client";

import Link from "next/link";
import { useUser } from "./UserProvider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TierBadge from "./TierBadge";
import { fmtTime } from "@/lib/client";
import { TIERS } from "@/lib/scoring";

/** ไทม์ไลน์รอบ presale ตาม Tier พร้อมไฮไลต์รอบของผู้ใช้ปัจจุบัน */
export default function PresaleTimeline({ salesOpenAt }: { salesOpenAt: string }) {
  const { user } = useUser();
  const open = Date.parse(salesOpenAt);
  return (
    <div className="space-y-3">
      <ol className="relative space-y-3 border-l-2 border-line pl-5">
        {TIERS.map((t) => {
          const mine = user?.tier === t.name;
          return (
            <li key={t.name} className="relative">
              <span
                className={`absolute -left-[1.72rem] top-4 h-3 w-3 rounded-full ${mine ? "bg-brand ring-4 ring-brand/30" : "bg-line"}`}
              />
              <div className={`rounded-lg border p-4 ${mine ? "border-brand bg-brand/10" : "border-line bg-surface"}`}>
                <div className="flex items-center justify-between gap-2">
                  <TierBadge tier={t.name} />
                  <span className="text-lg font-bold tabular-nums">{fmtTime(new Date(open - t.leadMinutes * 60_000).toISOString())} น.</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {t.name === "General" ? "Fan Score < 40 · " : `Fan Score ≥ ${t.min} · `}
                  {t.label}
                </p>
                {mine && user && (
                  <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand">
                    <ArrowBackIcon fontSize="inherit" /> รอบของ {user.displayName} (Fan Score {user.finalScore.toFixed(1)})
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <Link href="/dashboard" className="flex items-center justify-center gap-1 rounded-lg bg-brand py-3 font-bold text-white hover:bg-brand-dark">
        เพิ่ม Fan Score ให้ได้รอบที่เร็วขึ้น <ArrowForwardIcon fontSize="small" />
      </Link>
    </div>
  );
}
