"use client";

import Snackbar from "@mui/material/Snackbar";

import Alert from "@mui/material/Alert";

import { useEffect, useState } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import RedeemIcon from "@mui/icons-material/Redeem";
import { useUser } from "@/components/UserProvider";
import { api } from "@/lib/client";
import type { Reward } from "@/lib/types";

const ICON: Record<Reward["type"], SvgIconComponent> = {
  discount: LocalOfferOutlinedIcon,
  presale_boost: RocketLaunchOutlinedIcon,
  fan_membership: CardMembershipIcon,
  merch: CheckroomIcon,
};

type RewardsRes = { rewards: Reward[]; points: number; redeemed: { rewardId: string; at: string }[] };

export default function RewardsPage() {
  const { userId, user, refresh } = useUser();
  const [data, setData] = useState<RewardsRes | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
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
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <RedeemIcon className="text-brand" /> แลกแต้ม
          </h1>
          <p className="text-sm text-muted">แต้มได้จากธุรกรรมที่ผ่านการตรวจของ AI ว่าเป็นการใช้งานจริงเท่านั้น</p>
        </div>
        <div className="rounded-lg border border-brand/40 bg-brand/10 px-5 py-3 text-right">
          <p className="text-xs text-muted">แต้มคงเหลือของ {user?.displayName ?? "…"}</p>
          <p className="text-3xl font-bold tabular-nums text-brand">{data ? data.points.toLocaleString("th-TH") : "—"}</p>
        </div>
      </section>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={toast?.ok ? "success" : "error"} variant="filled" onClose={() => setToast(null)} sx={{ width: "100%" }}>
          {toast?.text}
        </Alert>
      </Snackbar>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.rewards.map((r) => {
          const enough = data.points >= r.costPoints;
          const count = data.redeemed.filter((x) => x.rewardId === r.id).length;
          const Icon = ICON[r.type];
          return (
            <div key={r.id} className="flex flex-col rounded-lg border border-line bg-surface p-5">
              <Icon className="text-brand" />
              <h2 className="mt-2 font-semibold">{r.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {r.costPoints.toLocaleString("th-TH")} แต้ม{count > 0 && ` · แลกแล้ว ${count} ครั้ง`}
              </p>
              <button
                onClick={() => redeem(r)}
                disabled={!enough || busy !== null}
                className="mt-4 rounded-md bg-brand py-2 font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
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
