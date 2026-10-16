"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import TierBadge from "@/components/TierBadge";
import UserAvatar from "@/components/UserAvatar";
import { useUser } from "@/components/UserProvider";
import { api, ROLE_LABEL, type DemoAccount } from "@/lib/client";
import { STAFF_ACCOUNTS } from "@/lib/mappers";
import { browserClient } from "@/lib/supabase/browser";

/** ผู้ซื้อเดโมที่ใช้โชว์บ่อย พร้อมคำอธิบายสั้น ๆ */
const FEATURED: Record<string, string> = {
  u01: "แฟนตัวจริง ใช้ U-topia ทุกวัน (streak 18 วัน)",
  u03: "แฟนตัวยง ใช้เยอะและหลากหลาย",
  u15: "ผู้ใช้ใหม่ สมัครได้ 12 วัน",
  u19: "ธุรกรรมเยอะ แต่โอนเงินวนกับบัญชีเดิม",
  u23: "ทำรายการถี่เป็นจังหวะเดียวกันแบบเครื่องจักร",
};

function homeFor(role: DemoAccount["role"], next: string | null) {
  if (role === "organizer" || role === "admin") return next?.startsWith("/admin") ? next : "/admin";
  if (role === "staff") return next?.startsWith("/staff") ? next : "/staff";
  return next && !next.startsWith("/admin") && !next.startsWith("/staff") ? next : "/dashboard";
}

function LoginInner() {
  const next = useSearchParams().get("next");
  const { demoAccounts } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState("");

  async function done(role: DemoAccount["role"]) {
    // โหลดหน้าใหม่ทั้งหน้า: ล้าง cache ของ router ที่ prefetch ไว้ตอนยังไม่ล็อกอิน (ซึ่งจำ redirect ไป /login ไว้)
    window.location.assign(homeFor(role, next));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("form");
    setError(null);
    const { error } = await browserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setBusy(null);
      return;
    }
    const me = await api<{ account: { role: DemoAccount["role"] } | null }>("/api/me");
    await done(me.account?.role ?? "buyer");
  }

  async function demo(a: DemoAccount) {
    if (!a.email) return;
    setBusy(a.id);
    setError(null);
    try {
      await api("/api/auth/demo", { json: { email: a.email } });
      await done(a.role);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  const buyers = demoAccounts.filter((a) => a.role === "buyer");
  const featured = buyers.filter((a) => FEATURED[a.id]);
  const others = demoAccounts.filter((a) => a.role !== "buyer");

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className="min-w-0 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
          <p className="text-sm text-muted">ใช้บัญชี U Ticket หรือเลือกบัญชีเดโม<span className="lg:hidden">ด้านล่าง</span><span className="hidden lg:inline">ด้านขวา</span></p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-surface p-5">
          <label className="block space-y-1 text-sm">
            <span className="text-muted">อีเมล</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line bg-background px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">รหัสผ่าน</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line bg-background px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          {error && <p className="rounded-md bg-danger/10 p-2 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy !== null} className="w-full rounded-lg bg-brand py-2.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60">
            {busy === "form" ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </section>

      {demoAccounts.length > 0 && (
        <section className="min-w-0 space-y-5">
          <div>
            <h2 className="text-lg font-bold">บัญชีเดโม</h2>
            <p className="text-sm text-muted">กดเพื่อเข้าสู่ระบบทันที — ทุกบัญชีอยู่ใน Supabase Auth จริง (รหัสผ่านคือค่า DEMO_PASSWORD ใน .env.local)</p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">ผู้ซื้อ</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {featured.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => demo(a)}
                  disabled={busy !== null}
                  className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3 text-left transition hover:border-brand disabled:opacity-60"
                >
                  <UserAvatar name={a.displayName} color={a.avatar} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      {a.displayName} {a.tier && <TierBadge tier={a.tier} size="sm" />}
                    </span>
                    <span className="block text-xs text-muted">{busy === a.id ? "กำลังเข้าสู่ระบบ…" : FEATURED[a.id]}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                className="w-0 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-2 text-sm focus:border-brand focus:outline-none"
                aria-label="ผู้ซื้อเดโมทั้งหมด"
              >
                <option value="">ผู้ซื้ออื่น ๆ ทั้งหมด {buyers.length} บัญชี…</option>
                {buyers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} · {a.tier}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!pick || busy !== null}
                onClick={() => {
                  const a = buyers.find((b) => b.id === pick);
                  if (a) demo(a);
                }}
                className="rounded-md border border-line px-4 text-sm hover:border-brand disabled:opacity-40"
              >
                เข้าสู่ระบบ
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">ผู้จัด / แอดมิน / Staff</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {others.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => demo(a)}
                  disabled={busy !== null}
                  className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3 text-left transition hover:border-brand disabled:opacity-60"
                >
                  <UserAvatar name={a.displayName} color={a.avatar} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{a.displayName}</span>
                    <span className="block text-xs text-muted">
                      {busy === a.id ? "กำลังเข้าสู่ระบบ…" : `${ROLE_LABEL[a.role]} · ${STAFF_ACCOUNTS.find((s) => s.id === a.id)?.note ?? a.email}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
