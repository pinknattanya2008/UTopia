"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useUser } from "@/components/UserProvider";
import Stepper from "@/components/Stepper";
import ETicket from "@/components/ETicket";
import { api, fmtDate, fmtTHB } from "@/lib/client";
import type { Booking, Reward } from "@/lib/types";

interface Res {
  booking: Booking;
  concert: { id: string; title: string; artist: string; venue: string; date: string } | null;
  points: number;
  discounts: (Reward & { amountTHB: number })[];
}

export default function CheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const router = useRouter();
  const { userId, refresh } = useUser();
  const [data, setData] = useState<Res | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discountId, setDiscountId] = useState("");
  const [paying, setPaying] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    api<Res>(`/api/bookings/${bookingId}?userId=${userId}`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [bookingId, userId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (error && !data) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-danger">{error}</p>
        <Link href="/" className="text-brand hover:underline">
          กลับหน้าแรก
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid place-items-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
      </div>
    );
  }

  const b = data.booking;
  const discount = data.discounts.find((d) => d.id === discountId);
  const discountAmt = b.status === "paid" ? b.discount : Math.min(discount?.amountTHB ?? 0, b.subtotal);
  const total = b.subtotal - discountAmt + b.serviceFee;
  const left = Math.max(0, Date.parse(b.holdExpiresAt) - now);
  const expired = b.status === "expired" || (b.status === "held" && left === 0);

  async function pay() {
    setPaying(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 1200)); // จำลองการตัดบัตร U-Card
    try {
      const paid = await api<Booking>(`/api/bookings/${bookingId}/confirm`, { json: { userId, discountRewardId: discountId } });
      setData((d) => d && { ...d, booking: paid });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
    setPaying(false);
  }

  async function cancel() {
    await api(`/api/bookings/${bookingId}/cancel`, { json: { userId } }).catch(() => null);
    router.push(`/concert/${b.concertId}/book`);
  }

  if (b.status === "paid") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Stepper current={2} />
        <div className="animate-fade-up rounded-xl border border-ok/40 bg-ok/10 p-6 text-center">
          <CheckCircleIcon className="text-ok" sx={{ fontSize: 56 }} />
          <h1 className="mt-2 text-2xl font-bold">ชำระเงินสำเร็จ</h1>
          <p className="text-muted">
            รหัสการจอง <span className="font-mono font-semibold text-foreground">{b.code}</span> · ชำระ {fmtTHB(b.total)}
          </p>
        </div>
        <div className="space-y-4">
          {b.items.map((it, i) => (
            <ETicket
              key={i}
              eventName={data.concert?.title ?? ""}
              dateVenue={`${data.concert ? fmtDate(data.concert.date) : ""} · ${data.concert?.venue ?? ""}`}
              seat={it.label}
              ticketId={`${b.code}-${i + 1}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/tickets" className="rounded-lg bg-brand px-5 py-2.5 font-bold text-white">
            ดูบัตรของฉัน
          </Link>
          <Link href="/" className="rounded-lg border border-line px-5 py-2.5">
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Stepper current={1} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ชำระเงิน</h1>
          <p className="text-sm text-muted">
            {data.concert?.title} · {data.concert && fmtDate(data.concert.date)}
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ${
            expired ? "bg-danger/15 text-danger" : left < 120_000 ? "bg-danger/15 text-danger" : "bg-brand/15 text-brand"
          }`}
        >
          <TimerOutlinedIcon fontSize="small" />
          {expired ? "หมดเวลา" : `${mm}:${String(ss).padStart(2, "0")}`}
        </span>
      </div>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-2 font-semibold">ที่นั่งที่ล็อกไว้ ({b.items.length} ใบ)</h2>
        <ul className="divide-y divide-line text-sm">
          {b.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>{it.label}</span>
              <span className="tabular-nums">{fmtTHB(it.priceTHB)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-1 flex items-center gap-1.5 font-semibold">
          <LocalOfferOutlinedIcon fontSize="small" className="text-brand" /> ใช้แต้มแลกส่วนลด
        </h2>
        <p className="mb-3 text-sm text-muted">แต้มคงเหลือ {data.points.toLocaleString("th-TH")} แต้ม</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[{ id: "", name: "ไม่ใช้ส่วนลด", costPoints: 0, amountTHB: 0 }, ...data.discounts].map((d) => {
            const enough = data.points >= d.costPoints;
            return (
              <label
                key={d.id || "none"}
                className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                  discountId === d.id ? "border-brand bg-brand/10" : "border-line"
                } ${!enough ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <input
                  type="radio"
                  name="discount"
                  value={d.id}
                  disabled={!enough || expired}
                  checked={discountId === d.id}
                  onChange={() => setDiscountId(d.id)}
                  className="sr-only"
                />
                <p className="font-semibold">{d.id ? `ลด ${fmtTHB(d.amountTHB)}` : d.name}</p>
                {d.id && <p className="text-xs text-muted">ใช้ {d.costPoints.toLocaleString("th-TH")} แต้ม</p>}
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">ค่าบัตร</dt>
            <dd className="tabular-nums">{fmtTHB(b.subtotal)}</dd>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between text-ok">
              <dt>ส่วนลดจากแต้ม</dt>
              <dd className="tabular-nums">-{fmtTHB(discountAmt)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">ค่าบริการ</dt>
            <dd className="tabular-nums">{fmtTHB(b.serviceFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
            <dt>ยอดชำระ</dt>
            <dd className="tabular-nums text-brand">{fmtTHB(total)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-surface-2 p-3 text-sm">
          <CreditCardIcon className="text-brand" />
          <div>
            <p className="font-semibold">U-Card Visa •••• 4821</p>
            <p className="text-xs text-muted">ตัดเป็นเงินบาท (จำลอง)</p>
          </div>
        </div>
        {error && <p className="mt-3 rounded-md bg-danger/10 p-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            onClick={pay}
            disabled={paying || expired}
            className="flex-1 rounded-lg bg-brand py-3 font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {paying ? "กำลังชำระเงิน…" : `ชำระ ${fmtTHB(total)}`}
          </button>
          <button onClick={cancel} disabled={paying} className="rounded-lg border border-line px-5 py-3 text-muted hover:text-foreground">
            {expired ? "เลือกที่นั่งใหม่" : "ยกเลิก"}
          </button>
        </div>
      </section>
    </div>
  );
}
