"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import Kpi from "@/components/admin/Kpi";
import { useConfirm } from "@/components/ConfirmProvider";
import { api, fmtDate, fmtPct, fmtTHB } from "@/lib/client";
import type { OrganizerPlan } from "@/lib/types";

interface Overview {
  viewer: { role: "organizer" | "admin"; name: string };
  organizer: { id: string; name: string } | null;
  concerts: {
    id: string;
    title: string;
    artist: string;
    venue: string;
    date: string;
    status: "draft" | "published";
    plan: OrganizerPlan;
    organizer: string;
    stats: { capacity: number; ticketsSold: number; sellThrough: number; gross: number; platformRevenue: number; blockedAttempts: number };
  }[];
  totals: {
    concerts: number;
    published: number;
    ticketsSold: number;
    gross: number;
    commission: number;
    serviceFees: number;
    discounts: number;
    platformRevenue: number;
    organizerPayout: number;
    blockedAttempts: number;
  };
}

const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้าน` : n.toLocaleString("th-TH");

export default function AdminPage() {
  const confirm = useConfirm();
  const [data, setData] = useState<Overview | null>(null);
  const load = useCallback(() => api<Overview>("/api/admin").then(setData).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  async function reset() {
    const ok = await confirm({
      title: "ล้างข้อมูลเดโมทั้งหมด?",
      description: "การจอง เช็คอิน แต้มที่ใช้ และคอนที่สร้างเพิ่ม จะถูกล้างกลับเป็นค่าเริ่มต้นใน Supabase",
      confirmText: "ล้างข้อมูล",
      danger: true,
    });
    if (!ok) return;
    await api("/api/admin/reset", { json: {} });
    load();
  }

  if (!data) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  const t = data.totals;
  const revBase = Math.max(1, t.commission + t.serviceFees);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{data.viewer.role === "admin" ? "แอดมินแพลตฟอร์ม" : "ผู้จัดงาน"}</p>
          <h1 className="text-2xl font-bold">{data.organizer?.name ?? data.viewer.name}</h1>
        </div>
        <Link
          href="/admin/concerts/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 font-bold text-white hover:bg-brand-dark"
        >
          <AddIcon /> สร้างคอนเสิร์ต
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={PaymentsOutlinedIcon} label="ยอดขายบัตรรวม" value={`${short(t.gross)} บาท`} sub={`${t.published}/${t.concerts} งานเผยแพร่แล้ว`} />
        <Kpi icon={ConfirmationNumberOutlinedIcon} label="บัตรที่ขายได้" value={t.ticketsSold.toLocaleString("th-TH")} sub="ใบ" />
        <Kpi icon={AccountBalanceOutlinedIcon} label="ยอดโอนให้ผู้จัด" value={`${short(t.organizerPayout)} บาท`} tone="ok" sub="หลังหักค่าคอมมิชชัน" />
        <Kpi icon={ShieldOutlinedIcon} label="AI กันบัญชีเสี่ยงไม่ให้ซื้อ" value={t.blockedAttempts.toLocaleString("th-TH")} sub="บัญชีที่พยายามเข้าซื้อ" tone="danger" />
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">รายได้ U Ticket (2 ทาง)</h2>
          <p className="text-2xl font-bold tabular-nums text-brand">{fmtTHB(t.platformRevenue)}</p>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="bg-brand" style={{ width: `${(t.commission / revBase) * 100}%` }} />
          <div className="bg-sky-400" style={{ width: `${(t.serviceFees / revBase) * 100}%` }} />
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div className="flex gap-2">
            <StorefrontOutlinedIcon className="text-brand" fontSize="small" />
            <div>
              <p className="font-semibold">จากผู้จัด: ค่าคอมมิชชัน</p>
              <p className="tabular-nums">{fmtTHB(t.commission)}</p>
              <p className="text-xs text-muted">Basic 5% / Pro 8% ของยอดขายบัตร</p>
            </div>
          </div>
          <div className="flex gap-2">
            <PersonOutlineIcon className="text-sky-500" fontSize="small" />
            <div>
              <p className="font-semibold">จากผู้ซื้อ: ค่าบริการ</p>
              <p className="tabular-nums">{fmtTHB(t.serviceFees)}</p>
              <p className="text-xs text-muted">40 บาทต่อบัตร 1 ใบ</p>
            </div>
          </div>
          <div className="flex gap-2">
            <ConfirmationNumberOutlinedIcon className="text-muted" fontSize="small" />
            <div>
              <p className="font-semibold">หัก: ส่วนลดจากแต้ม</p>
              <p className={`tabular-nums ${t.discounts ? "text-danger" : ""}`}>{t.discounts ? `-${fmtTHB(t.discounts)}` : fmtTHB(0)}</p>
              <p className="text-xs text-muted">ต้นทุน loyalty ที่ดึงคนกลับมาใช้ U-topia</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">คอนเสิร์ตของคุณ</h2>
        <div className="space-y-3">
          {data.concerts.map((c) => (
            <Link
              key={c.id}
              href={`/admin/concerts/${c.id}`}
              className="grid gap-3 rounded-lg border border-line bg-surface p-4 transition hover:border-brand sm:grid-cols-[1fr_12rem_9rem] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.status === "published" ? "bg-ok/15 text-ok" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {c.status === "published" ? "เผยแพร่แล้ว" : "ร่าง"}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{c.plan === "pro" ? "Pro" : "Basic"}</span>
                  {data.viewer.role === "admin" && <span className="text-xs text-muted">{c.organizer}</span>}
                </div>
                <p className="mt-1 truncate font-semibold">{c.title}</p>
                <p className="truncate text-xs text-muted">
                  {c.venue} · {fmtDate(c.date)}
                </p>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>
                    {c.stats.ticketsSold.toLocaleString("th-TH")}/{c.stats.capacity.toLocaleString("th-TH")}
                  </span>
                  <span>{fmtPct(c.stats.sellThrough)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${c.stats.sellThrough * 100}%` }} />
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">{fmtTHB(c.stats.gross)}</p>
                <p className="text-xs text-muted">รายได้แพลตฟอร์ม {fmtTHB(c.stats.platformRevenue)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {data.viewer.role === "admin" && (
        <button onClick={reset} className="flex items-center gap-1.5 text-sm text-muted hover:text-danger">
          <RestartAltIcon fontSize="small" /> ล้างข้อมูลเดโม (การจอง เช็คอิน แต้ม คอนที่สร้างเพิ่ม)
        </button>
      )}
    </div>
  );
}
