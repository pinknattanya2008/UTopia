"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { api } from "@/lib/client";
import type { Reward } from "@/lib/types";

const ICON: Record<Reward["type"], string> = { discount: "🏷️", presale_boost: "🚀", fan_membership: "🌙", merch: "👕" };

type RewardsRes = { rewards: Reward[]; points: number; redeemed: { rewardId: string; at: string }[] };

export default function RewardsPage() {
  const { userId, user, refresh } = useUser();
  const [data, setData] = useState<RewardsRes | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setToast(null);
    api<RewardsRes>(`/api/rewards?userId=${userId}`).then(setData).catch(() => setData(null));
  }, [userId]);

  async function redeem(r: Reward) {
    setBusy(r.id);
    const res = await fetch("/api/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, rewardId: r.id }),
    });
    const out = (await res.json()) as { ok: boolean; pointsLeft?: number; error?: string };
    setToast(out.ok ? { ok: true, text: `แลก “${r.name}” สำเร็จ เหลือ ${out.pointsLeft?.toLocaleString("th-TH")} แต้ม` } : { ok: false, text: out.error ?? "แลกไม่สำเร็จ" });
    setData(await api<RewardsRes>(`/api/rewards?userId=${userId}`));
    await refresh();
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">🎁 แลกแต้ม</h1>
          <p className="text-sm text-muted">แต้มได้จากธุรกรรมที่ผ่านการตรวจของ AI ว่าเป็นการใช้งานจริงเท่านั้น</p>
        </div>
        <div className="rounded-2xl border border-brand/40 bg-brand/10 px-5 py-3 text-right">
          <p className="text-xs text-muted">แต้มคงเหลือของ {user?.displayName ?? "…"}</p>
          <p className="text-3xl font-bold tabular-nums text-brand">{data ? data.points.toLocaleString("th-TH") : "—"}</p>
        </div>
      </section>

      {toast && (
        <p className={`animate-fade-up rounded-xl border p-3 text-sm ${toast.ok ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"}`}>
          {toast.ok ? "✓ " : "✕ "}
          {toast.text}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.rewards.map((r) => {
          const enough = data.points >= r.costPoints;
          const count = data.redeemed.filter((x) => x.rewardId === r.id).length;
          return (
            <div key={r.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
              <p className="text-3xl">{ICON[r.type]}</p>
              <h2 className="mt-2 font-semibold">{r.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {r.costPoints.toLocaleString("th-TH")} แต้ม{count > 0 && ` · แลกแล้ว ${count} ครั้ง`}
              </p>
              <button
                onClick={() => redeem(r)}
                disabled={!enough || busy !== null}
                className="mt-4 rounded-xl bg-brand py-2 font-bold text-black transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
              >
                {busy === r.id ? "กำลังแลก…" : enough ? "แลกเลย" : `ขาดอีก ${(r.costPoints - data.points).toLocaleString("th-TH")} แต้ม`}
              </button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
