"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import TicketQR from "@/components/TicketQR";
import { useUser } from "@/components/UserProvider";
import { api, fmtDate, fmtDateTime, fmtTHB } from "@/lib/client";
import type { Booking } from "@/lib/types";

type Row = Booking & { concert: { id: string; title: string; artist: string; venue: string; date: string } | null };

export default function TicketsPage() {
  const { userId, user } = useUser();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    setRows(null);
    api<Row[]>(`/api/bookings?userId=${userId}`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [userId]);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ConfirmationNumberOutlinedIcon className="text-brand" /> บัตรของ{user?.displayName ?? "ฉัน"}
      </h1>
      {rows === null ? (
        <div className="h-40 animate-pulse rounded-3xl bg-surface" />
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-10 text-center text-muted">
          ยังไม่มีบัตร{" "}
          <Link href="/" className="font-semibold text-brand hover:underline">
            เลือกคอนเสิร์ต
          </Link>
        </div>
      ) : (
        rows.map((b) => (
          <section key={b.id} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
              <div>
                <p className="font-bold">{b.concert?.title}</p>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <EventOutlinedIcon fontSize="inherit" /> {b.concert && fmtDate(b.concert.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <PlaceOutlinedIcon fontSize="inherit" /> {b.concert?.venue}
                  </span>
                </p>
              </div>
              <p className="text-right text-xs text-muted">
                <span className="font-mono text-sm font-semibold text-foreground">{b.code}</span>
                <br />
                ชำระ {fmtTHB(b.total)} · {b.paidAt && fmtDateTime(b.paidAt)}
              </p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {b.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-3">
                  <TicketQR value={`${b.code}-${i}`} size={72} />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{it.label}</p>
                    <p className="font-mono text-xs text-muted">
                      {b.code}-{i + 1}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
