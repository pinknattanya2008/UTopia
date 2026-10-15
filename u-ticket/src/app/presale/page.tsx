"use client";

import { useEffect, useRef, useState } from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import QueueTable, { type QueueRowView } from "@/components/QueueTable";
import TierBadge from "@/components/TierBadge";
import { useUser } from "@/components/UserProvider";
import { api, fmtTime, SOURCE_LABEL } from "@/lib/client";
import type { AiSource, TierName } from "@/lib/types";

interface SimResult {
  salesOpenAt: string;
  queue: QueueRowView[];
  summary: string;
  summarySource: AiSource;
  stats: { total: number; flagged: number; bots: number; farmers: number; byTier: Record<TierName, number> };
  notice?: string;
}

type Phase = "idle" | "loading" | "baseline" | "final" | "error";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PresalePage() {
  const { userId, refresh } = useUser();
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<SimResult | null>(null);
  const [count, setCount] = useState(0);
  const run = useRef(0);

  async function simulate() {
    const id = ++run.current;
    setPhase("loading");
    setCount(0);
    try {
      const [res] = await Promise.all([api<SimResult>("/api/presale/simulate", { json: { concertId: "c1" } }), wait(1400)]);
      if (id !== run.current) return;
      setData(res);
      setPhase("baseline");
      await wait(1800);
      if (id !== run.current) return;
      setPhase("final");
      refresh();
    } catch {
      setPhase("error");
    }
  }

  // ตัวนับบัญชีที่ถูกคัดออก
  useEffect(() => {
    if (phase !== "final" || !data) return;
    const target = data.stats.flagged;
    let n = 0;
    const t = setInterval(() => {
      n++;
      setCount(Math.min(n, target));
      if (n >= target) clearInterval(t);
    }, 160);
    return () => clearInterval(t);
  }, [phase, data]);

  const me = data?.queue.find((q) => q.userId === userId);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-brand">NOVA LUNE World Tour 2026 — Bangkok</p>
          <h1 className="text-2xl font-bold sm:text-3xl">จำลองการเปิดขาย Presale</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            ผู้ใช้ 24 บัญชีเข้าคิวพร้อมกัน AI ตรวจพฤติกรรมการใช้ U-topia 30 วัน แล้วจัดคิวตาม Tier ให้แฟนตัวจริงได้กดก่อน
          </p>
        </div>
        <button
          onClick={simulate}
          disabled={phase === "loading" || phase === "baseline"}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-white shadow-glow transition hover:bg-brand-dark disabled:opacity-60"
        >
          {phase === "idle" || phase === "error" ? (
            <>
              <PlayArrowIcon /> จำลองเปิดขาย presale
            </>
          ) : phase === "final" ? (
            <>
              <ReplayIcon /> จำลองอีกครั้ง
            </>
          ) : (
            "กำลังจัดคิว…"
          )}
        </button>
      </section>

      {phase === "error" && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          จำลองไม่สำเร็จ ลองกดอีกครั้ง
        </p>
      )}

      {phase === "loading" && (
        <div className="grid place-items-center gap-4 rounded-2xl border border-line bg-surface shadow-soft py-16 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
          <p className="text-lg font-semibold">AI กำลังตรวจสอบ 24 บัญชี…</p>
          <p className="text-sm text-muted">วิเคราะห์ความถี่ ความสม่ำเสมอ และรูปแบบธุรกรรมผิดปกติ</p>
        </div>
      )}

      {data && (phase === "baseline" || phase === "final") && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className={`rounded-2xl border p-4 transition-colors duration-700 sm:col-span-2 ${
                phase === "final" ? "border-brand/40 bg-brand/5" : "border-line bg-surface"
              }`}
            >
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-brand">
                <AutoAwesomeIcon fontSize="inherit" /> สรุปจาก AI
                {phase === "final" && <span className="font-normal text-muted">· {SOURCE_LABEL[data.summarySource]}</span>}
              </p>
              {phase === "final" ? (
                <p className="animate-fade-up leading-relaxed">{data.summary}</p>
              ) : (
                <p className="text-muted">ถ้าเรียงตามจำนวนธุรกรรมอย่างเดียว บัญชีปั๊มแต้มและบอทจะได้คิวแรก ๆ…</p>
              )}
              {phase === "final" && data.notice && <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                  <InfoOutlinedIcon fontSize="inherit" /> {data.notice}
                </p>}
            </div>
            <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4">
              <p className="text-xs font-semibold text-danger">บอท/ปั๊มแต้มที่ถูกคัดออก</p>
              <p className="text-5xl font-bold tabular-nums text-danger">{phase === "final" ? count : "?"}</p>
              <p className="text-xs text-muted">
                {phase === "final" ? `ปั๊มแต้ม ${data.stats.farmers} · บอท ${data.stats.bots} จาก ${data.stats.total} บัญชี` : "กำลังตรวจ…"}
              </p>
            </div>
          </div>

          {phase === "final" && (
            <div className="flex flex-wrap items-center gap-2 text-sm animate-fade-up">
              {(["Diamond", "Gold", "Silver", "General"] as TierName[]).map((t) => (
                <span key={t} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1">
                  <TierBadge tier={t} size="sm" />
                  <span className="tabular-nums">{data.stats.byTier[t]} คน</span>
                </span>
              ))}
              {me && (
                <span className="ml-auto rounded-full bg-brand px-3 py-1 font-semibold text-white">
                  {me.displayName}: คิวที่ {me.rank}/{data.stats.total} · เข้าคิว {fmtTime(me.entryTime)} น.
                </span>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm text-muted">
              {phase === "baseline" ? "① เรียงตามจำนวนธุรกรรม (ไม่มี AI)" : "② หลัง AI ตรวจ: เรียงตามเวลาเข้าคิวของ Tier แล้วตาม Fan Score"}
            </p>
            <QueueTable rows={data.queue} mode={phase === "final" ? "final" : "baseline"} currentUserId={userId} />
          </div>
        </>
      )}

      {phase === "idle" && (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
          กดปุ่ม <span className="font-semibold text-brand">จำลองเปิดขาย presale</span> เพื่อดู AI จัดคิวสด ๆ
        </div>
      )}
    </div>
  );
}
