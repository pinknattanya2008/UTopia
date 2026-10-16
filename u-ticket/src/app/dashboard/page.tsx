"use client";

import Alert from "@mui/material/Alert";

import { useEffect, useState } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import UserAvatar from "@/components/UserAvatar";
import MissionCard from "@/components/MissionCard";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import ScoreGauge from "@/components/ScoreGauge";
import TierBadge from "@/components/TierBadge";
import TrustBadge from "@/components/TrustBadge";
import { useUser } from "@/components/UserProvider";
import {
  api,
  fmtDateTime,
  fmtTHB,
  SOURCE_LABEL,
  type ExplainResponse,
  type MissionsResponse,
  type ScoreDetail,
} from "@/lib/client";
import type { Transaction } from "@/lib/types";

const TX_LABEL: Record<Transaction["type"], { label: string; Icon: SvgIconComponent }> = {
  card_purchase: { label: "U-Card", Icon: CreditCardIcon },
  upay_transfer: { label: "U-Pay", Icon: SendOutlinedIcon },
  swap: { label: "Swap", Icon: SwapHorizIcon },
  self_transfer: {
    label: "โอนเข้ากระเป๋าตัวเอง",
    Icon: AccountBalanceWalletOutlinedIcon,
  },
};

export default function DashboardPage() {
  const { userId, version } = useUser();
  const [detail, setDetail] = useState<ScoreDetail | null>(null);
  const [missions, setMissions] = useState<MissionsResponse | null>(null);
  const [explain, setExplain] = useState<ExplainResponse | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) return; // รอโหลดบัญชีก่อน
    let alive = true;
    setExplain(null);
    setMissions(null);
    setError(false);
    (async () => {
      try {
        // ให้ AI ประเมิน trust ก่อน (ใช้ cache ถ้ามี) แล้วค่อยดึงคะแนน
        await api(`/api/trust/${userId}`, { json: {} }).catch(() => null);
        const d = await api<ScoreDetail>(`/api/score/${userId}`);
        if (!alive) return;
        setDetail(d);
        const m = await api<MissionsResponse>(`/api/missions/${userId}`, {
          json: {},
        });
        if (alive) setMissions(m);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, version]);

  async function askExplain() {
    setExplaining(true);
    try {
      setExplain(await api<ExplainResponse>(`/api/explain/${userId}`, { json: {} }));
    } catch {
      setExplain({
        explanation: "AI กำลังยุ่ง ลองใหม่อีกครั้ง",
        source: "fallback",
      });
    }
    setExplaining(false);
  }

  if (error) return <Alert severity="error">โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้า</Alert>;
  if (!detail || detail.user.id !== userId) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
        <p className="mt-3">กำลังโหลด Fan Score…</p>
      </div>
    );
  }

  const d = detail;
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-3">
        <UserAvatar name={d.user.displayName} color={d.user.avatar} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{d.user.displayName}</h1>
          <p className="text-sm text-muted">
            U-center {d.user.uCenterPackage} · สมาชิกตั้งแต่ {d.user.joinedAt} · แต้ม{" "}
            {d.user.points.toLocaleString("th-TH")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-5 text-center">
          <ScoreGauge score={d.finalScore} tier={d.tier} />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <TierBadge tier={d.tier} size="lg" />
            <span className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
              <LocalFireDepartmentIcon fontSize="inherit" /> streak {d.currentStreakDays} วัน
            </span>
          </div>
          <p className="mt-3 text-sm text-muted">
            {d.tierLeadMinutes > 0 ? `เข้าคิว presale ก่อน ${d.tierLeadMinutes} นาที` : "เข้าคิวพร้อมรอบขายทั่วไป"}
            {d.nextTier && (
              <>
                <br />
                อีก <span className="font-semibold text-brand">{d.nextTier.pointsNeeded}</span> คะแนนจะขึ้น{" "}
                {d.nextTier.tier}
              </>
            )}
          </p>
          {d.presaleBoost > 0 && <p className="mt-1 text-xs text-brand">รวม Presale Boost +{d.presaleBoost}</p>}
          <div className="mt-4 grid grid-cols-2 divide-x divide-line border-t border-line pt-3 text-sm">
            <div>
              <p className="text-lg font-bold tabular-nums">{d.totalTxCount30d}</p>
              <p className="text-xs text-muted">ธุรกรรมทั้งหมด 30 วัน</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{d.validTxCount30d}</p>
              <p className="text-xs text-muted">ธุรกรรมที่นับคะแนน</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-bold">คะแนนแยกตามองค์ประกอบ</h2>
          <ScoreBreakdown score={d} />
        </div>

        <div className="space-y-4">
          <TrustBadge trust={d.trust} source={d.trustSource} />
          <div className="rounded-xl border border-line bg-surface p-5">
            <button
              onClick={askExplain}
              disabled={explaining}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {explaining ? "AI กำลังคิด…" : "AI อธิบายคะแนน"}
            </button>
            {explain && (
              <div className="animate-fade-up mt-3">
                <p className="whitespace-pre-line text-sm leading-relaxed">{explain.explanation}</p>
                <p className="mt-2 text-xs text-muted">
                  {SOURCE_LABEL[explain.source]}
                  {explain.notice && ` · ${explain.notice}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">AI Missions สำหรับคุณ</h2>
          {missions && <span className="text-xs text-muted">{SOURCE_LABEL[missions.source]}</span>}
        </div>
        {missions ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {missions.missions.map((m, i) => (
              <MissionCard key={`${userId}-${i}`} mission={m} index={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">ธุรกรรมล่าสุด</h2>
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {d.recentTransactions.map((t) => {
            const { label, Icon } = TX_LABEL[t.type];
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                  <Icon fontSize="small" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {label} {t.merchant ? `· ${t.merchant}` : t.counterpartyId ? `ถึง ${t.counterpartyId}` : ""}
                  </p>
                  <p className="text-xs text-muted">{fmtDateTime(t.timestamp)}</p>
                </div>
                <span className="shrink-0 tabular-nums">{fmtTHB(t.amountTHB)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
