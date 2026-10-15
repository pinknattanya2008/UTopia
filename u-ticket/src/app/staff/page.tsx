"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import HistoryIcon from "@mui/icons-material/History";
import { api, fmtDateTime } from "@/lib/client";

type Result =
  | { status: "ok" | "already"; ticketId: string; concert: string; seat: string; holder: string; at: string }
  | { status: "error"; message: string };

interface Summary {
  concerts: { id: string; title: string; ticketsInApp: number; checkedIn: number }[];
  recent: { ticketId: string; concert: string; at: string }[];
}

export default function StaffPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => api<Summary>("/api/staff/checkins").then(setSummary).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      setResult(await api<Result>("/api/staff/checkin", { json: { ticketId: code } }));
      setCode("");
      load();
    } catch (err) {
      setResult({ status: "error", message: (err as Error).message });
    }
    setBusy(false);
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">เช็คอินหน้างาน</h1>
        <p className="text-sm text-muted">สแกน QR หรือพิมพ์รหัสบัตร เช่น UT-ABC123-1 (รหัสอยู่ใต้ QR บน e-ticket)</p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={inputRef}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="UT-XXXXXX-1"
          aria-label="รหัสบัตร"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 py-3 font-mono text-lg tracking-wider focus:border-brand focus:outline-none"
        />
        <button type="submit" disabled={busy || !code.trim()} className="rounded-lg bg-brand px-6 font-bold text-white hover:bg-brand-dark disabled:opacity-50">
          {busy ? "กำลังตรวจ…" : "เช็คอิน"}
        </button>
      </form>

      {result && (
        <div
          className={`animate-fade-up flex gap-3 rounded-xl border p-4 ${
            result.status === "ok" ? "border-ok/40 bg-ok/10" : result.status === "already" ? "border-brand/40 bg-brand-soft" : "border-danger/40 bg-danger/10"
          }`}
          role="status"
        >
          {result.status === "error" ? (
            <ErrorOutlinedIcon className="shrink-0 text-danger" />
          ) : (
            <CheckCircleIcon className={`shrink-0 ${result.status === "ok" ? "text-ok" : "text-brand"}`} />
          )}
          {result.status === "error" ? (
            <p className="font-semibold text-danger">{result.message}</p>
          ) : (
            <div className="min-w-0">
              <p className="text-lg font-bold">{result.status === "ok" ? "เข้างานได้" : `เช็คอินไปแล้วเมื่อ ${fmtDateTime(result.at)}`}</p>
              <p className="text-sm">
                {result.holder} · {result.seat}
              </p>
              <p className="text-xs text-muted">
                {result.concert} · <span className="font-mono">{result.ticketId}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {summary && (
        <section className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">งานที่ดูแล</h2>
            {summary.concerts.length === 0 && <p className="text-sm text-muted">ยังไม่มีงานที่เผยแพร่</p>}
            {summary.concerts.map((c) => (
              <div key={c.id} className="rounded-lg border border-line bg-surface p-3">
                <p className="font-semibold">{c.title}</p>
                <p className="text-sm text-muted">
                  เช็คอินแล้ว <span className="font-semibold text-foreground tabular-nums">{c.checkedIn}</span> / {c.ticketsInApp} ใบ (บัตรที่ขายผ่านแอป)
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <h2 className="flex items-center gap-1 text-sm font-semibold">
              <HistoryIcon fontSize="inherit" /> ล่าสุด
            </h2>
            {summary.recent.length === 0 && <p className="text-sm text-muted">ยังไม่มีการเช็คอิน</p>}
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {summary.recent.map((r) => (
                <li key={r.ticketId} className="flex justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-mono">{r.ticketId}</span>
                  <span className="text-xs text-muted">{fmtDateTime(r.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
