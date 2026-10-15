"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PublishIcon from "@mui/icons-material/Publish";
import UnpublishedOutlinedIcon from "@mui/icons-material/UnpublishedOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Kpi from "@/components/admin/Kpi";
import TierBadge from "@/components/TierBadge";
import VenueMap from "@/components/VenueMap";
import { api, fmtDate, fmtPct, fmtTHB, fmtTime } from "@/lib/client";
import type { Concert, TierName } from "@/lib/types";
import { PLANS } from "@/lib/venue";

interface Stats {
  capacity: number;
  available: number;
  held: number;
  ticketsSold: number;
  sellThrough: number;
  gross: number;
  commissionRate: number;
  commission: number;
  serviceFees: number;
  discounts: number;
  platformRevenue: number;
  organizerPayout: number;
  byZone: { zoneId: string; name: string; color: string; capacity: number; sold: number; gross: number }[];
  sections: Record<string, { capacity: number; available: number }>;
  ordersInApp: number;
  buyersByTier: Record<TierName, number>;
  blockedAttempts: number;
  riskyAccounts: number;
  checkedIn: number;
}

export default function AdminConcertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<{ concert: Concert; stats: Stats } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<{ concert: Concert; stats: Stats }>(`/api/admin/concerts/${id}`)
        .then(setData)
        .catch((e) => setError((e as Error).message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: "draft" | "published") {
    setError(null);
    try {
      await api(`/api/admin/concerts/${id}`, { method: "PATCH", json: { status } });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    if (!confirm("ลบคอนเสิร์ตนี้?")) return;
    try {
      await api(`/api/admin/concerts/${id}`, { method: "DELETE" });
      router.push("/admin");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!data) return error ? <p className="text-danger">{error}</p> : <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  const { concert: c, stats: s } = data;
  const hasSales = s.ticketsSold > 0 || s.held > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowBackIcon fontSize="inherit" /> ภาพรวม
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === "published" ? "bg-ok/15 text-ok" : "bg-surface-2 text-muted"}`}
              >
                {c.status === "published" ? "เผยแพร่แล้ว" : "ร่าง"}
              </span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                แพ็กเกจ {PLANS[c.plan].name} · {PLANS[c.plan].commissionRate * 100}%
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold">{c.title}</h1>
            <p className="text-sm text-muted">
              {c.venue} · แสดง {fmtDate(c.date)} · เปิดขาย {fmtDate(c.salesOpenAt)} {fmtTime(c.salesOpenAt)} น.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/concert/${c.id}`} className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:border-brand">
              <OpenInNewIcon fontSize="small" /> หน้าขาย
            </Link>
            <Link
              href={`/admin/concerts/${c.id}/edit`}
              className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:border-brand"
            >
              <EditOutlinedIcon fontSize="small" /> แก้ไข
            </Link>
            {c.status === "draft" ? (
              <button
                onClick={() => setStatus("published")}
                className="flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white"
              >
                <PublishIcon fontSize="small" /> เผยแพร่
              </button>
            ) : (
              <button
                onClick={() => setStatus("draft")}
                disabled={hasSales}
                title={hasSales ? "มียอดขายแล้ว" : undefined}
                className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:border-brand disabled:opacity-40"
              >
                <UnpublishedOutlinedIcon fontSize="small" /> ยกเลิกเผยแพร่
              </button>
            )}
            {c.status === "draft" && !hasSales && (
              <button onClick={remove} className="flex items-center gap-1 rounded-md border border-danger/40 px-3 py-2 text-sm text-danger">
                <DeleteOutlineIcon fontSize="small" /> ลบ
              </button>
            )}
          </div>
        </div>
        {error && <p className="mt-2 rounded-md bg-danger/10 p-2 text-sm text-danger">{error}</p>}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={PaymentsOutlinedIcon} label="ยอดขายบัตร" value={fmtTHB(s.gross)} />
        <Kpi
          icon={ConfirmationNumberOutlinedIcon}
          label="ขายแล้ว"
          value={`${s.ticketsSold.toLocaleString("th-TH")} ใบ`}
          sub={`${fmtPct(s.sellThrough)} จาก ${s.capacity.toLocaleString("th-TH")} ที่${s.held ? ` · ล็อกอยู่ ${s.held}` : ""} · เช็คอินแล้ว ${s.checkedIn}`}
        />
        <Kpi icon={AccountBalanceOutlinedIcon} label="ผู้จัดได้รับ" value={fmtTHB(s.organizerPayout)} tone="ok" sub={`หักคอมมิชชัน ${fmtTHB(s.commission)}`} />
        <Kpi
          icon={ShieldOutlinedIcon}
          label="AI กันบัญชีเสี่ยง"
          value={c.plan === "pro" ? `${s.riskyAccounts} บัญชี` : "—"}
          sub={c.plan === "pro" ? `เข้ามาซื้อแล้วถูกกัน ${s.blockedAttempts} บัญชี` : "เฉพาะแพ็กเกจ Pro"}
          tone={c.plan === "pro" ? "danger" : "default"}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-2 font-bold">ที่ว่างตาม section</h2>
          <VenueMap concert={c} availability={s.sections} />
        </div>
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 font-bold">ยอดขายตามโซน</h2>
            <div className="space-y-3">
              {s.byZone.map((z) => (
                <div key={z.zoneId}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: z.color }} /> {z.name}
                    </span>
                    <span className="tabular-nums text-muted">
                      {z.sold.toLocaleString("th-TH")}/{z.capacity.toLocaleString("th-TH")} · {fmtTHB(z.gross)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full" style={{ width: `${(z.sold / Math.max(1, z.capacity)) * 100}%`, backgroundColor: z.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 text-sm">
            <h2 className="mb-2 font-bold">การแบ่งรายได้</h2>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-muted">ยอดขายบัตร</dt>
                <dd className="tabular-nums">{fmtTHB(s.gross)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">ค่าคอมมิชชัน ({s.commissionRate * 100}%)</dt>
                <dd className="tabular-nums text-danger">-{fmtTHB(s.commission)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-semibold">
                <dt>ผู้จัดได้รับ</dt>
                <dd className="tabular-nums text-ok">{fmtTHB(s.organizerPayout)}</dd>
              </div>
              <div className="flex justify-between pt-2 text-muted">
                <dt>ค่าบริการจากผู้ซื้อ (ของแพลตฟอร์ม)</dt>
                <dd className="tabular-nums">{fmtTHB(s.serviceFees)}</dd>
              </div>
            </dl>
          </div>
          {c.plan === "pro" && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-1 font-bold">Fan insights</h2>
              <p className="mb-3 text-xs text-muted">ผู้ซื้อผ่านแอป {s.ordersInApp} คำสั่งซื้อ แยกตาม Tier</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(s.buyersByTier) as TierName[]).map((t) => (
                  <span key={t} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm">
                    <TierBadge tier={t} size="sm" /> {s.buyersByTier[t]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
