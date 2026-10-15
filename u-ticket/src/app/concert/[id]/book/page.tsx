"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BlockIcon from "@mui/icons-material/Block";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DemoClock from "@/components/DemoClock";
import SeatMap, { type SeatState } from "@/components/SeatMap";
import TierBadge from "@/components/TierBadge";
import VenueMap from "@/components/VenueMap";
import { useUser } from "@/components/UserProvider";
import { api, fmtDate, fmtTHB, fmtTime } from "@/lib/client";
import type { Booking, Concert, TierName } from "@/lib/types";
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

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { userId, user, clock } = useUser();
  const [data, setData] = useState<ConcertRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [seatState, setSeatState] = useState<SeatState | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [standing, setStanding] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const seatPanel = useRef<HTMLDivElement>(null);

  function selectSection(sid: string) {
    setSectionId(sid);
    // จอเล็ก: เลื่อนลงไปที่ผังที่นั่งหลังเลือกโซน
    if (window.innerWidth < 1024) setTimeout(() => seatPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const load = useCallback(async () => {
    try {
      setData(await api<ConcertRes>(`/api/concerts/${id}?userId=${userId}&clock=${clock}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, userId, clock]);

  useEffect(() => {
    load();
  }, [load]);

  // เปลี่ยนผู้ใช้ = ล้างที่เลือก
  useEffect(() => {
    setSeats([]);
    setStanding({});
  }, [userId]);

  const concert = data?.concert;
  const section = concert?.sections.find((s) => s.id === sectionId) ?? null;

  useEffect(() => {
    if (!section || section.kind !== "seated") {
      setSeatState(null);
      return;
    }
    let alive = true;
    api<SeatState>(`/api/concerts/${id}/seats?section=${section.id}&userId=${userId}`)
      .then((s) => alive && setSeatState(s))
      .catch(() => alive && setSeatState({ sold: [], held: [], mine: [] }));
    return () => {
      alive = false;
    };
  }, [id, section, userId]);

  const access = data?.access;
  const zoneOf = useCallback((zid: string) => concert?.zones.find((z) => z.id === zid), [concert]);
  const count = seats.length + Object.values(standing).reduce((n, q) => n + q, 0);
  const remaining = access ? access.maxTickets - access.ticketsUsed - count : 0;

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
      load();
      if (section?.kind === "seated") {
        api<SeatState>(`/api/concerts/${id}/seats?section=${section.id}&userId=${userId}`).then(setSeatState).catch(() => {});
      }
    }
  }

  if (!data || !concert) {
    return error ? (
      <p className="text-danger">{error}</p>
    ) : (
      <div className="grid place-items-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
      </div>
    );
  }

  const canSelect = !!access?.allowed;

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

      {concert.plan === "pro" && <DemoClock salesOpenAt={concert.salesOpenAt} />}

      {access && <AccessBanner access={access} name={user?.displayName ?? ""} />}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-3 sm:p-4">
            <p className="mb-2 text-sm text-muted">{canSelect ? "1. เลือกโซนบนผัง" : "ผังสถานที่"}</p>
            <VenueMap
              concert={concert}
              availability={data.availability}
              selected={sectionId}
              onSelect={canSelect ? selectSection : undefined}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {concert.zones.map((z) => (
                <span key={z.id} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                  {z.name} <span className="font-semibold">{fmtTHB(z.priceTHB)}</span>
                </span>
              ))}
            </div>
          </div>

          {canSelect && section && (
            <div ref={seatPanel} className="animate-fade-up scroll-mt-28 rounded-3xl border border-line bg-surface p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-muted">2. เลือกที่นั่ง</p>
                <p className="font-semibold">
                  {zoneOf(section.zoneId)?.name} · {section.name}{" "}
                  <span className="text-brand">{fmtTHB(zoneOf(section.zoneId)?.priceTHB ?? 0)}</span>
                </p>
              </div>
              {section.kind === "seated" ? (
                seatState ? (
                  <SeatMap
                    section={section}
                    zone={zoneOf(section.zoneId)}
                    state={seatState}
                    selected={new Set(seats)}
                    canAddMore={remaining > 0}
                    onToggle={(sid) => setSeats((xs) => (xs.includes(sid) ? xs.filter((x) => x !== sid) : [...xs, sid]))}
                  />
                ) : (
                  <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
                )
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
                  <div>
                    <p className="font-semibold">บัตรยืน (ไม่ระบุที่นั่ง)</p>
                    <p className="text-sm text-muted">เหลือ {data.availability[section.id]?.available.toLocaleString("th-TH")} ใบ</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      aria-label="ลดจำนวน"
                      onClick={() => setStanding((st) => ({ ...st, [section.id]: Math.max(0, (st[section.id] ?? 0) - 1) }))}
                      disabled={!standing[section.id]}
                      className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40"
                    >
                      <RemoveIcon fontSize="small" />
                    </button>
                    <span className="w-6 text-center text-lg font-bold tabular-nums">{standing[section.id] ?? 0}</span>
                    <button
                      aria-label="เพิ่มจำนวน"
                      onClick={() => setStanding((st) => ({ ...st, [section.id]: (st[section.id] ?? 0) + 1 }))}
                      disabled={remaining <= 0 || (standing[section.id] ?? 0) >= (data.availability[section.id]?.available ?? 0)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-brand text-black disabled:opacity-40"
                    >
                      <AddIcon fontSize="small" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-line bg-surface p-4">
            <h2 className="mb-1 font-bold">ตะกร้าของคุณ</h2>
            {access && (
              <p className="mb-3 text-xs text-muted">
                ซื้อได้สูงสุด {access.maxTickets} ใบ/บัญชี{access.ticketsUsed > 0 && ` · มีแล้ว ${access.ticketsUsed} ใบ`}
              </p>
            )}
            {cart.length === 0 ? (
              <p className="rounded-xl bg-surface-2 p-4 text-center text-sm text-muted">ยังไม่ได้เลือกที่นั่ง</p>
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
            {error && <p className="mt-3 rounded-xl bg-danger/10 p-2 text-sm text-danger">{error}</p>}
            <button
              onClick={checkout}
              disabled={busy || cart.length === 0 || !canSelect}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 font-bold text-black transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LockOutlinedIcon fontSize="small" />
              {busy ? "กำลังล็อกที่นั่ง…" : "ล็อกที่นั่งและชำระเงิน"}
            </button>
            <p className="mt-2 text-center text-xs text-muted">ที่นั่งจะถูกล็อกไว้ให้ 10 นาทีระหว่างชำระเงิน</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AccessBanner({ access, name }: { access: Access; name: string }) {
  if (access.code === "ok") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ok/40 bg-ok/10 p-3 text-sm">
        <CheckCircleOutlinedIcon className="text-ok" fontSize="small" />
        <span className="font-semibold text-ok">{access.message}</span>
        {access.presale && (
          <span className="flex items-center gap-1.5 text-muted">
            · {name} <TierBadge tier={access.tier} size="sm" /> Fan Score {access.finalScore}
          </span>
        )}
      </div>
    );
  }
  if (access.code === "blocked_trust") {
    return (
      <div className="flex gap-2 rounded-2xl border border-danger/50 bg-danger/10 p-4 text-sm">
        <BlockIcon className="shrink-0 text-danger" />
        <div>
          <p className="font-semibold text-danger">{name} ซื้อบัตรงานนี้ไม่ได้</p>
          <p className="mt-1">{access.message}</p>
          <p className="mt-1 text-muted">ถ้าเป็นการใช้งานจริง สามารถยื่นตรวจสอบบัญชีกับ U-topia ได้</p>
        </div>
      </div>
    );
  }
  if (access.code === "not_yet") {
    return (
      <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-brand/40 bg-brand/10 p-4 text-sm">
        <HourglassTopIcon className="shrink-0 text-brand" />
        <div className="flex-1">
          <p className="font-semibold">
            {access.message} — รอบของคุณเปิด {fmtTime(access.opensAt)} น. (ตอนนี้ {fmtTime(access.now)} น.)
          </p>
          {access.presale && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-muted">
              {name} <TierBadge tier={access.tier} size="sm" /> Fan Score {access.finalScore} ·
              <Link href="/dashboard" className="font-semibold text-brand hover:underline">
                เพิ่ม Fan Score เพื่อได้รอบที่เร็วขึ้น
              </Link>
            </p>
          )}
        </div>
      </div>
    );
  }
  return <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">{access.message}</p>;
}
