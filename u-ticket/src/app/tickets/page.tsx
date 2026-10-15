"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import ETicket from "@/components/ETicket";
import { useUser } from "@/components/UserProvider";
import { api, fmtDate, fmtDateTime, fmtTHB } from "@/lib/client";
import type { Booking } from "@/lib/types";

type Row = Booking & { checkedIn?: (string | null)[];  concert: { id: string; title: string; artist: string; venue: string; date: string } | null };

export default function TicketsPage() {
  const { userId, user } = useUser();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!userId) return;
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
        <div className="h-40 animate-pulse rounded-xl bg-surface" />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
          ยังไม่มีบัตร{" "}
          <Link href="/" className="font-semibold text-brand hover:underline">
            เลือกคอนเสิร์ต
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {rows.map((b) => (
          <section key={b.id} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
              <div>
                <h2 className="font-bold">{b.concert?.title}</h2>
                <p className="text-xs text-muted">
                  {b.concert && fmtDate(b.concert.date)} · {b.concert?.venue}
                </p>
              </div>
              <p className="text-right text-xs text-muted">
                รหัสจอง <span className="font-mono text-sm font-semibold text-foreground">{b.code}</span> · ชำระ {fmtTHB(b.total)}
                {b.paidAt && ` · ${fmtDateTime(b.paidAt)}`}
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {b.items.map((it, i) => (
                <ETicket
                  key={i}
                  eventName={b.concert?.title ?? ""}
                  dateVenue={`${b.concert ? fmtDate(b.concert.date) : ""} · ${b.concert?.venue ?? ""}`}
                  seat={it.label}
                  ticketId={`${b.code}-${i + 1}`}
                  checkedInAt={b.checkedIn?.[i]}
                />
              ))}
            </div>
          </section>
          ))}
        </div>
      )}
    </div>
  );
}
