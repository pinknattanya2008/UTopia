"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CheckIcon from "@mui/icons-material/Check";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VenueMap from "@/components/VenueMap";
import { api, fmtTHB, fromLocalInput, toLocalInput } from "@/lib/client";
import type { Concert, OrganizerPlan, Section, VenueTemplateId, Zone } from "@/lib/types";
import {
  buildFromTemplate,
  MAX_ROWS,
  MAX_SEATS_PER_ROW,
  PLANS,
  sectionCapacity,
  SERVICE_FEE_PER_TICKET,
  TEMPLATES,
  withZoneCapacity,
} from "@/lib/venue";

type Form = {
  artist: string;
  title: string;
  venue: string;
  date: string; // datetime-local
  salesOpenAt: string; // datetime-local
  description: string;
  template: VenueTemplateId;
  plan: OrganizerPlan;
  maxTicketsPerUser: number;
  zones: Zone[];
  sections: Section[];
};

function initialForm(concert?: Concert): Form {
  if (concert) {
    return {
      artist: concert.artist,
      title: concert.title,
      venue: concert.venue,
      date: toLocalInput(concert.date),
      salesOpenAt: toLocalInput(concert.salesOpenAt),
      description: concert.description ?? "",
      template: concert.template,
      plan: concert.plan,
      maxTicketsPerUser: concert.maxTicketsPerUser,
      zones: concert.zones,
      sections: concert.sections,
    };
  }
  const t = buildFromTemplate("arena");
  return {
    artist: "",
    title: "",
    venue: "",
    date: "2027-01-23T19:00",
    salesOpenAt: "2026-11-20T12:00",
    description: "",
    template: "arena",
    plan: "pro",
    maxTicketsPerUser: 4,
    ...t,
  };
}

const input =
  "w-full rounded-xl border border-line bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:opacity-50";

export default function ConcertForm({ concert, layoutLocked = false }: { concert?: Concert; layoutLocked?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => initialForm(concert));
  const [busy, setBusy] = useState<"draft" | "published" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const setZone = (id: string, patch: Partial<Zone>) =>
    setF((x) => ({ ...x, zones: x.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }));
  const setSection = (id: string, patch: Partial<Section>) =>
    setF((x) => ({
      ...x,
      sections: x.sections.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        return { ...next, capacity: sectionCapacity(next) };
      }),
    }));

  const zones = useMemo(() => withZoneCapacity(f.zones, f.sections), [f.zones, f.sections]);
  const capacity = zones.reduce((n, z) => n + z.capacity, 0);
  const potentialGross = zones.reduce((n, z) => n + z.capacity * z.priceTHB, 0);
  const rate = PLANS[f.plan].commissionRate;

  function pickTemplate(id: VenueTemplateId) {
    if (layoutLocked) return;
    setF((x) => ({ ...x, template: id, ...buildFromTemplate(id) }));
  }

  async function save(status: "draft" | "published") {
    setBusy(status);
    setError(null);
    try {
      const payload = {
        ...f,
        date: fromLocalInput(f.date),
        salesOpenAt: fromLocalInput(f.salesOpenAt),
        zones,
        status,
      };
      const saved = concert
        ? await api<Concert>(`/api/admin/concerts/${concert.id}`, { method: "PUT", json: payload })
        : await api<Concert>("/api/admin/concerts", { json: payload });
      router.push(`/admin/concerts/${saved.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* 1. ข้อมูลงาน */}
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-bold">1. ข้อมูลงาน</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted">ศิลปิน</span>
              <input className={input} value={f.artist} onChange={(e) => set("artist", e.target.value)} placeholder="เช่น NOVA LUNE" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted">ชื่องาน</span>
              <input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="เช่น World Tour 2027 — Bangkok" />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-muted">สถานที่</span>
              <input className={input} value={f.venue} onChange={(e) => set("venue", e.target.value)} placeholder="เช่น Impact Arena, Bangkok" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted">วันและเวลาแสดง</span>
              <input type="datetime-local" className={input} value={f.date} onChange={(e) => set("date", e.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted">เวลาเปิดขายทั่วไป</span>
              <input type="datetime-local" className={input} value={f.salesOpenAt} onChange={(e) => set("salesOpenAt", e.target.value)} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-muted">รายละเอียด</span>
              <textarea className={`${input} min-h-20`} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </label>
          </div>
        </section>

        {/* 2. ผังและโซน */}
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="mb-1 font-bold">2. ผังสถานที่และโซนราคา</h2>
          {layoutLocked && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-brand">
              <InfoOutlinedIcon fontSize="inherit" /> มียอดขายแล้ว ผังที่นั่งถูกล็อก แก้ได้เฉพาะชื่อโซน ราคา และข้อมูลงาน
            </p>
          )}
          <div className="mb-4 mt-3 grid gap-2 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t.id)}
                disabled={layoutLocked && f.template !== t.id}
                className={`rounded-2xl border p-3 text-left transition disabled:opacity-40 ${
                  f.template === t.id ? "border-brand bg-brand/10" : "border-line hover:border-brand/60"
                }`}
              >
                <p className="flex items-center justify-between font-semibold">
                  {t.name} {f.template === t.id && <CheckIcon fontSize="small" className="text-brand" />}
                </p>
                <p className="mt-0.5 text-xs text-muted">{t.description}</p>
              </button>
            ))}
          </div>

          <h3 className="mb-2 text-sm font-semibold">โซนราคา</h3>
          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.id} className="grid grid-cols-[auto_1fr_8rem] items-center gap-2 sm:grid-cols-[auto_1fr_1.4fr_8rem_5rem]">
                <input
                  type="color"
                  value={z.color}
                  onChange={(e) => setZone(z.id, { color: e.target.value })}
                  aria-label={`สีของ ${z.name}`}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-line bg-transparent"
                />
                <input className={input} value={z.name} onChange={(e) => setZone(z.id, { name: e.target.value })} aria-label="ชื่อโซน" />
                <input
                  className={`${input} hidden sm:block`}
                  value={z.view}
                  onChange={(e) => setZone(z.id, { view: e.target.value })}
                  placeholder="มุมมอง (ให้ AI Concierge ใช้)"
                  aria-label="คำอธิบายมุมมอง"
                />
                <label className="relative">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    className={`${input} pr-10 text-right`}
                    value={z.priceTHB}
                    onChange={(e) => setZone(z.id, { priceTHB: Number(e.target.value) })}
                    aria-label={`ราคา ${z.name}`}
                  />
                  <span className="pointer-events-none absolute right-3 top-2 text-xs text-muted">บาท</span>
                </label>
                <span className="hidden text-right text-xs text-muted sm:block">{z.capacity.toLocaleString("th-TH")} ที่</span>
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-semibold">Section บนผัง</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs text-muted">
                <tr className="text-left">
                  <th className="py-1 font-normal">Section</th>
                  <th className="py-1 font-normal">โซนราคา</th>
                  <th className="py-1 font-normal">แถว</th>
                  <th className="py-1 font-normal">ที่นั่ง/แถว</th>
                  <th className="py-1 text-right font-normal">ความจุ</th>
                </tr>
              </thead>
              <tbody>
                {f.sections.map((s) => (
                  <tr key={s.id} className="border-t border-line/60">
                    <td className="py-1.5 pr-2 font-semibold">
                      {s.name}
                      <span className="ml-1 text-xs font-normal text-muted">{s.kind === "standing" ? "ยืน" : "ที่นั่ง"}</span>
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        className={input}
                        value={s.zoneId}
                        disabled={layoutLocked}
                        onChange={(e) => setSection(s.id, { zoneId: e.target.value })}
                        aria-label={`โซนของ ${s.name}`}
                      >
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    {s.kind === "seated" ? (
                      <>
                        <td className="w-20 py-1.5 pr-2">
                          <input
                            type="number"
                            min={1}
                            max={MAX_ROWS}
                            className={input}
                            disabled={layoutLocked}
                            value={s.rows}
                            onChange={(e) => setSection(s.id, { rows: Math.min(MAX_ROWS, Math.max(1, Number(e.target.value))) })}
                            aria-label={`จำนวนแถว ${s.name}`}
                          />
                        </td>
                        <td className="w-24 py-1.5 pr-2">
                          <input
                            type="number"
                            min={1}
                            max={MAX_SEATS_PER_ROW}
                            className={input}
                            disabled={layoutLocked}
                            value={s.seatsPerRow}
                            onChange={(e) =>
                              setSection(s.id, { seatsPerRow: Math.min(MAX_SEATS_PER_ROW, Math.max(1, Number(e.target.value))) })
                            }
                            aria-label={`ที่นั่งต่อแถว ${s.name}`}
                          />
                        </td>
                      </>
                    ) : (
                      <td colSpan={2} className="py-1.5 pr-2">
                        <input
                          type="number"
                          min={1}
                          className={input}
                          disabled={layoutLocked}
                          value={s.capacity}
                          onChange={(e) => setSection(s.id, { capacity: Math.max(1, Number(e.target.value)) })}
                          aria-label={`ความจุ ${s.name}`}
                        />
                      </td>
                    )}
                    <td className="py-1.5 text-right tabular-nums">{s.capacity.toLocaleString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. แพ็กเกจและการขาย */}
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-bold">3. แพ็กเกจและเงื่อนไขการขาย</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(PLANS) as OrganizerPlan[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("plan", p)}
                className={`rounded-2xl border p-4 text-left transition ${f.plan === p ? "border-brand bg-brand/10" : "border-line hover:border-brand/60"}`}
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-lg font-bold">{PLANS[p].name}</p>
                  <p className="text-sm">
                    <span className="text-xl font-bold text-brand">{PLANS[p].commissionRate * 100}%</span> ของยอดขาย
                  </p>
                </div>
                <p className="text-xs text-muted">{PLANS[p].tagline}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {PLANS[p].features.map((x) => (
                    <li key={x} className="flex gap-1.5">
                      <CheckIcon fontSize="small" className="shrink-0 text-ok" /> {x}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-muted">ซื้อได้สูงสุดต่อบัญชี</span>
            <input
              type="number"
              min={1}
              max={10}
              className={`${input} w-20`}
              value={f.maxTicketsPerUser}
              onChange={(e) => set("maxTicketsPerUser", Math.min(10, Math.max(1, Number(e.target.value))))}
            />
            <span className="text-muted">ใบ</span>
          </label>
        </section>
      </div>

      {/* Preview + สรุป */}
      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-3xl border border-line bg-surface p-3">
          <p className="mb-2 px-1 text-xs text-muted">ตัวอย่างผัง</p>
          <VenueMap concert={{ template: f.template, zones, sections: f.sections }} />
        </div>
        <div className="rounded-3xl border border-line bg-surface p-4 text-sm">
          <p className="mb-2 font-semibold">ประมาณการเมื่อขายหมด</p>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted">ความจุรวม</dt>
              <dd className="tabular-nums">{capacity.toLocaleString("th-TH")} ที่</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">ยอดขายบัตร</dt>
              <dd className="tabular-nums">{fmtTHB(potentialGross)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">ค่าคอมมิชชัน {PLANS[f.plan].name} ({rate * 100}%)</dt>
              <dd className="tabular-nums text-danger">-{fmtTHB(Math.round(potentialGross * rate))}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1 font-bold">
              <dt>ผู้จัดได้รับ</dt>
              <dd className="tabular-nums text-ok">{fmtTHB(Math.round(potentialGross * (1 - rate)))}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">ผู้ซื้อจ่ายค่าบริการเพิ่ม {SERVICE_FEE_PER_TICKET} บาท/ใบ ไม่หักจากยอดของผู้จัด</p>
        </div>
        {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => save("draft")}
            disabled={busy !== null}
            className="flex-1 rounded-2xl border border-line py-3 font-semibold hover:border-brand disabled:opacity-50"
          >
            {busy === "draft" ? "กำลังบันทึก…" : "บันทึกร่าง"}
          </button>
          <button
            onClick={() => save("published")}
            disabled={busy !== null}
            className="flex-1 rounded-2xl bg-brand py-3 font-bold text-black hover:bg-brand-dark disabled:opacity-50"
          >
            {busy === "published" ? "กำลังเผยแพร่…" : concert?.status === "published" ? "บันทึก" : "เผยแพร่"}
          </button>
        </div>
      </aside>
    </div>
  );
}
