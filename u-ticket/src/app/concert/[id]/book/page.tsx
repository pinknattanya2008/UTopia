"use client";

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DemoClock from "@/components/DemoClock";
import Stepper from "@/components/Stepper";
import SeatDetail from "@/components/SeatDetail";
import SeatPlan, { type SeatPick } from "@/components/SeatPlan";
import TierBadge from "@/components/TierBadge";
import VenueMap from "@/components/VenueMap";
import { useUser } from "@/components/UserProvider";
import { api, fmtDate, fmtTHB, fmtTime } from "@/lib/client";
import type { Booking, Concert, Section, TierName } from "@/lib/types";
import { parseSeatId, SERVICE_FEE_PER_TICKET } from "@/lib/venue";

interface Access {
  allowed: boolean;
  code: "ok" | "not_published" | "blocked_trust" | "not_yet";
  message: string;
  tier: TierName;
  finalScore: number;
  presale: boolean;
  opensAt: string;
  now: string;
  maxTickets: number;
  ticketsUsed: number;
}
interface ConcertRes {
  concert: Concert;
  availability: Record<string, { capacity: number; available: number }>;
  access: Access | null;
}
type SeatState = { sold: string[]; held: string[]; mine: string[] };

/** รายละเอียดที่กำลังดู: ที่นั่ง (seated) หรือโซนยืน */
type Focus = { kind: "seat"; pick: SeatPick } | { kind: "standing"; section: Section } | null;

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { userId, user, clock } = useUser();
  const [data, setData] = useState<ConcertRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seatState, setSeatState] = useState<SeatState | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [standing, setStanding] = useState<Record<string, number>>({});
  const [focus, setFocus] = useState<Focus>(null);
  const [hover, setHover] = useState<SeatPick | null>(null);
  const [busy, setBusy] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [d, st] = await Promise.all([
        api<ConcertRes>(`/api/concerts/${id}?userId=${userId}&clock=${clock}`),
        api<SeatState>(`/api/concerts/${id}/seats?userId=${userId}`),
      ]);
      setData(d);
      setSeatState(st);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, userId, clock]);

  useEffect(() => {
    load();
    // อัปเดตสถานะที่นั่งทุก 20 วินาที (คนอื่นซื้อ/ล็อก)
    const t = setInterval(() => {
      api<SeatState>(`/api/concerts/${id}/seats?userId=${userId}`).then(setSeatState).catch(() => {});
    }, 20_000);
    return () => clearInterval(t);
  }, [load, id, userId]);

  // เปลี่ยนผู้ใช้ = ล้างที่เลือก
  useEffect(() => {
    setSeats([]);
    setStanding({});
    setFocus(null);
  }, [userId]);

  const concert = data?.concert;
  const access = data?.access;
  const zoneOf = useCallback((zid: string) => concert?.zones.find((z) => z.id === zid), [concert]);
  // ที่นั่งที่คนอื่นซื้อ/ล็อกแล้ว (ที่ล็อกโดยตัวเองถือว่าว่าง เพราะล็อกใหม่จะแทนของเดิม)
  const unavailable = useMemo(() => new Set([...(seatState?.sold ?? []), ...(seatState?.held ?? [])]), [seatState]);
  const count = seats.length + Object.values(standing).reduce((n, q) => n + q, 0);
  const remaining = access ? access.maxTickets - access.ticketsUsed - count : 0;
  const canSelect = !!access?.allowed;

  function showDetail(f: Focus) {
    setFocus(f);
    if (window.innerWidth < 1024) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function toggleSeat(sid: string) {
    setSeats((xs) => (xs.includes(sid) ? xs.filter((x) => x !== sid) : remaining > 0 ? [...xs, sid] : xs));
  }

  const cart = useMemo(() => {
    if (!concert) return [];
    const items: { key: string; label: string; price: number; color: string; remove: () => void }[] = [];
    for (const sid of seats) {
      const p = parseSeatId(sid);
      const sec = concert.sections.find((s) => s.id === p?.sectionId);
      const z = sec && zoneOf(sec.zoneId);
      items.push({
        key: sid,
        label: `${z?.name} · ${sec?.name} แถว ${p?.row} ที่ ${p?.num}`,
        price: z?.priceTHB ?? 0,
        color: z?.color ?? "#fff",
        remove: () => setSeats((xs) => xs.filter((x) => x !== sid)),
      });
    }
    for (const [sid, q] of Object.entries(standing)) {
      const sec = concert.sections.find((s) => s.id === sid);
      const z = sec && zoneOf(sec.zoneId);
      for (let i = 0; i < q; i++) {
        items.push({
          key: `${sid}-${i}`,
          label: `${z?.name} (บัตรยืน)`,
          price: z?.priceTHB ?? 0,
          color: z?.color ?? "#fff",
          remove: () => setStanding((st) => ({ ...st, [sid]: Math.max(0, (st[sid] ?? 0) - 1) })),
        });
      }
    }
    return items;
  }, [concert, seats, standing, zoneOf]);

  const subtotal = cart.reduce((n, it) => n + it.price, 0);
  const fee = cart.length * SERVICE_FEE_PER_TICKET;

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const b = await api<Booking>("/api/bookings", {
        json: {
          userId,
          concertId: id,
          seats,
          standing: Object.entries(standing).map(([sectionId, qty]) => ({ sectionId, qty })),
          clock,
        },
      });
      router.push(`/checkout/${b.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      // ที่นั่งอาจถูกคนอื่นจองไปแล้ว: โหลดสถานะใหม่และเอาที่ไม่ว่างออกจากตะกร้า
      const st = await api<SeatState>(`/api/concerts/${id}/seats?userId=${userId}`).catch(() => null);
      if (st) {
        setSeatState(st);
        const taken = new Set([...st.sold, ...st.held]);
        setSeats((xs) => xs.filter((x) => !taken.has(x)));
      }
      load();
    }
  }

  if (!data || !concert || !seatState) {
    return error ? (
      <Alert severity="error">{error}</Alert>
    ) : (
      <div className="grid place-items-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
      </div>
    );
  }

  // การ์ดรายละเอียด: hover (เมาส์) มาก่อน แล้วค่อยเป็นที่กดล่าสุด
  const shown: Focus = hover ? { kind: "seat", pick: hover } : focus;
  const shownSeat = shown?.kind === "seat" ? shown.pick : null;
  const shownSection = shown?.kind === "seat" ? shown.pick.section : shown?.kind === "standing" ? shown.section : null;
  const seatStatus = shownSeat
    ? seats.includes(shownSeat.seat.id)
      ? "selected"
      : unavailable.has(shownSeat.seat.id)
        ? "unavailable"
        : "available"
    : undefined;

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/concert/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowBackIcon fontSize="inherit" /> รายละเอียดงาน
        </Link>
        <h1 className="text-xl font-bold sm:text-2xl">{concert.title}</h1>
        <p className="text-sm text-muted">
          {concert.venue} · {fmtDate(concert.date)}
        </p>
      </div>

      <Stepper current={0} />

      {concert.plan === "pro" && <DemoClock salesOpenAt={concert.salesOpenAt} />}

      {access && <AccessBanner access={access} name={user?.displayName ?? ""} />}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-surface p-2 sm:p-3">
            {canSelect ? (
              <SeatPlan
                concert={concert}
                availability={data.availability}
                unavailable={unavailable}
                selected={seats}
                focusId={shownSeat?.seat.id ?? null}
                onSeatHover={setHover}
                onSeatClick={(pick) => {
                  toggleSeat(pick.seat.id);
                  showDetail({ kind: "seat", pick });
                }}
                onStandingClick={(section) => showDetail({ kind: "standing", section })}
              />
            ) : (
              <VenueMap concert={concert} availability={data.availability} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {concert.zones.map((z) => (
              <span key={z.id} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                {z.name} <span className="font-semibold">{fmtTHB(z.priceTHB)}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs text-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--map-sold)]" /> ไม่ว่าง
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs text-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--map-selected)] ring-2 ring-surface" /> ที่คุณเลือก
            </span>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          {canSelect && (
            <div ref={detailRef} className="scroll-mt-28">
              <SeatDetail
                concert={concert}
                section={shownSection}
                zone={shownSection ? zoneOf(shownSection.zoneId) : undefined}
                seat={shownSeat?.seat}
                status={seatStatus}
                canAdd={remaining > 0}
                onToggle={shownSeat ? () => toggleSeat(shownSeat.seat.id) : undefined}
                standingQty={shownSection ? (standing[shownSection.id] ?? 0) : 0}
                standingAvailable={shownSection ? (data.availability[shownSection.id]?.available ?? 0) : 0}
                onStandingChange={(q) => shownSection && setStanding((st) => ({ ...st, [shownSection.id]: q }))}
              />
            </div>
          )}

          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-1 font-bold">ตะกร้าของคุณ</h2>
            {access && (
              <p className="mb-3 text-xs text-muted">
                ซื้อได้สูงสุด {access.maxTickets} ใบ/บัญชี{access.ticketsUsed > 0 && ` · มีแล้ว ${access.ticketsUsed} ใบ`}
              </p>
            )}
            {cart.length === 0 ? (
              <p className="rounded-md bg-surface-2 p-4 text-center text-sm text-muted">ยังไม่ได้เลือกที่นั่ง</p>
            ) : (
              <ul className="space-y-2">
                {cart.map((it) => (
                  <li key={it.key} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    <span className="tabular-nums">{it.price.toLocaleString("th-TH")}</span>
                    <button onClick={it.remove} aria-label="เอาออก" className="text-muted hover:text-danger">
                      <CloseIcon fontSize="inherit" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">ค่าบัตร</dt>
                <dd className="tabular-nums">{fmtTHB(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">ค่าบริการ ({SERVICE_FEE_PER_TICKET} บาท/ใบ)</dt>
                <dd className="tabular-nums">{fmtTHB(fee)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold">
                <dt>รวม</dt>
                <dd className="tabular-nums text-brand">{fmtTHB(subtotal + fee)}</dd>
              </div>
            </dl>
            {error && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {error}
              </Alert>
            )}
            <button
              onClick={checkout}
              disabled={busy || cart.length === 0 || !canSelect}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LockOutlinedIcon fontSize="small" />
              {busy ? "กำลังล็อกที่นั่ง…" : "ล็อกที่นั่งและชำระเงิน"}
            </button>
            <p className="mt-2 text-center text-xs text-muted">ที่นั่งจะถูกล็อกไว้ให้ 10 นาทีระหว่างชำระเงิน</p>
          </div>
        </aside>
      </div>

      {/* มือถือ: แถบสรุปยอดติดด้านล่าง กดล็อกที่นั่งได้โดยไม่ต้องเลื่อนลงไปที่ตะกร้า */}
      {canSelect && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
          {error && (
            <Alert severity="error" sx={{ mb: 1, py: 0 }}>
              {error}
            </Alert>
          )}
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">
                {cart.length ? `${cart.length} ใบ · ${cart.map((c) => c.label).join(", ")}` : "ยังไม่ได้เลือกที่นั่ง"}
              </p>
              <p className="text-lg font-bold tabular-nums text-brand">{fmtTHB(subtotal + fee)}</p>
            </div>
            <button
              type="button"
              onClick={checkout}
              disabled={busy || cart.length === 0}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              <LockOutlinedIcon fontSize="small" />
              {busy ? "กำลังล็อก…" : "ล็อกที่นั่ง"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccessBanner({ access, name }: { access: Access; name: string }) {
  if (access.code === "ok") {
    return (
      <Alert severity="success" variant="outlined">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">{access.message}</span>
          {access.presale && (
            <span className="flex items-center gap-1.5 text-muted">
              · {name} <TierBadge tier={access.tier} size="sm" /> Fan Score {access.finalScore}
            </span>
          )}
        </span>
      </Alert>
    );
  }
  if (access.code === "blocked_trust") {
    return (
      <Alert severity="error" variant="outlined">
        <AlertTitle sx={{ fontWeight: 700 }}>{name} ซื้อบัตรงานนี้ไม่ได้</AlertTitle>
        {access.message}
        <span className="mt-1 block text-muted">ถ้าเป็นการใช้งานจริง สามารถยื่นตรวจสอบบัญชีกับ U-topia ได้</span>
      </Alert>
    );
  }
  if (access.code === "not_yet") {
    return (
      <Alert severity="warning" variant="outlined">
        <AlertTitle sx={{ fontWeight: 700 }}>
          {access.message} — รอบของคุณเปิด {fmtTime(access.opensAt)} น. (ตอนนี้ {fmtTime(access.now)} น.)
        </AlertTitle>
        {access.presale && (
          <span className="flex flex-wrap items-center gap-1.5 text-muted">
            {name} <TierBadge tier={access.tier} size="sm" /> Fan Score {access.finalScore} ·
            <Link href="/dashboard" className="font-semibold text-brand hover:underline">
              เพิ่ม Fan Score เพื่อได้รอบที่เร็วขึ้น
            </Link>
          </span>
        )}
      </Alert>
    );
  }
  return <Alert severity="info" variant="outlined">{access.message}</Alert>;
}
