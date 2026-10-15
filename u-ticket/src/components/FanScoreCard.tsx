"use client";

import Link from "next/link";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { useUser } from "./UserProvider";
import TierBadge from "./TierBadge";
import UserAvatar from "./UserAvatar";
import { tierInfo } from "@/lib/scoring";

/** การ์ดสรุป Fan Score ของผู้ใช้ปัจจุบัน (หน้าแรก) — บอกทันทีว่าได้รอบไหน */
export default function FanScoreCard() {
  const { user } = useUser();
  if (!user) return <div className="h-64 animate-pulse rounded-3xl bg-white/70" />;
  const info = tierInfo(user.tier);
  const pct = Math.min(100, user.finalScore);
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <UserAvatar name={user.displayName} color={user.avatar} size="lg" />
        <div className="min-w-0">
          <p className="text-xs text-muted">สวัสดี</p>
          <p className="truncate text-lg font-bold">{user.displayName}</p>
        </div>
        <span className="ml-auto">
          <TierBadge tier={user.tier} />
        </span>
      </div>
      <div className="mt-5">
        <div className="flex items-end justify-between">
          <p className="text-sm text-muted">Fan Score ของคุณ</p>
          <p className="text-3xl font-bold tabular-nums text-brand">
            {user.finalScore.toFixed(1)}
            <span className="text-sm font-normal text-muted"> / 100</span>
          </p>
        </div>
        <div className="relative mt-2 h-3 rounded-full bg-[#f3e6d9]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#ffb27a] to-brand" style={{ width: `${pct}%` }} />
          {[40, 60, 80].map((v) => (
            <span key={v} className="absolute top-0 h-3 w-0.5 bg-white" style={{ left: `${v}%` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>General</span>
          <span>Silver 40</span>
          <span>Gold 60</span>
          <span>Diamond 80</span>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-soft px-3 py-2.5 text-sm">
        <ScheduleIcon fontSize="small" className="text-brand" />
        {info.leadMinutes > 0 ? (
          <span>
            คุณ<span className="font-semibold">เข้าคิวซื้อบัตรก่อน {info.leadMinutes} นาที</span>
          </span>
        ) : (
          <span>ตอนนี้เข้าคิวพร้อมรอบขายทั่วไป</span>
        )}
      </p>
      <Link href="/dashboard" className="mt-3 flex items-center justify-center gap-1 text-sm font-semibold text-brand hover:underline">
        ดูวิธีเพิ่มคะแนน <ArrowForwardIcon fontSize="inherit" />
      </Link>
    </div>
  );
}
