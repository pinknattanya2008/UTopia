"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type Account, type DemoAccount, type ListUser } from "@/lib/client";
import { DEFAULT_CLOCK } from "@/lib/clock";
import { browserClient } from "@/lib/supabase/browser";

interface UserCtx {
  /** บัญชีที่ล็อกอินอยู่ (null = ยังไม่ล็อกอิน, undefined = กำลังโหลด) */
  account: Account | null | undefined;
  /** ข้อมูลผู้ซื้อ + Fan Score (เฉพาะบัญชีผู้ซื้อ) */
  user: ListUser | undefined;
  /** id ของผู้ซื้อที่ล็อกอินอยู่ (ใช้เรียก API ของตัวเอง) */
  userId: string;
  /** บัญชีเดโมทั้งหมด (ว่างถ้าปิด DEMO_LOGIN) */
  demoAccounts: DemoAccount[];
  /** ผู้ซื้อเดโม (สำหรับ dropdown สลับบัญชี) */
  users: DemoAccount[];
  /** ล็อกอินบัญชีเดโมตาม id ในคลิกเดียว */
  setUserId: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  /** โหลดบัญชี/คะแนนใหม่ และเพิ่ม version ให้หน้าต่าง ๆ โหลดข้อมูลใหม่ */
  refresh: () => Promise<void>;
  version: number;
  warming: boolean;
  /** เวลาจำลองสำหรับเดโมการเปิดขาย (นาที เทียบกับเวลาเปิดขายทั่วไป) */
  clock: number;
  setClock: (offset: number) => void;
}

const Ctx = createContext<UserCtx | null>(null);
const PREWARM_KEY = "uticket:prewarmed";
const CLOCK_KEY = "uticket:clock";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [user, setUser] = useState<ListUser | undefined>(undefined);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [version, setVersion] = useState(0);
  const [warming, setWarming] = useState(false);
  const [clock, setClockState] = useState<number>(DEFAULT_CLOCK);

  const loadMe = useCallback(async () => {
    const me = await api<{ account: Account | null; user?: ListUser }>("/api/me").catch(() => ({ account: null }) as { account: null; user?: ListUser });
    setAccount(me.account);
    setUser(me.user);
    return me.account;
  }, []);

  const refresh = useCallback(async () => {
    await loadMe();
    api<DemoAccount[]>("/api/users").then(setDemoAccounts).catch(() => {});
    setVersion((v) => v + 1);
  }, [loadMe]);

  useEffect(() => {
    try {
      const savedClock = localStorage.getItem(CLOCK_KEY);
      if (savedClock !== null && Number.isFinite(Number(savedClock))) setClockState(Number(savedClock));
    } catch {}
    api<DemoAccount[]>("/api/users").then(setDemoAccounts).catch(() => {});

    (async () => {
      const acc = await loadMe();
      if (!acc) return;
      // Pre-warm: ให้ AI ประเมิน trust ของผู้ซื้อทุกคนไว้ก่อน หน้า presale/ซื้อบัตรจะขึ้นผลทันที
      let warmed = false;
      try {
        warmed = sessionStorage.getItem(PREWARM_KEY) === "1";
      } catch {}
      if (warmed) return;
      setWarming(true);
      await api("/api/prewarm", { json: {} }).catch(() => null);
      try {
        sessionStorage.setItem(PREWARM_KEY, "1");
      } catch {}
      setWarming(false);
      await loadMe();
    })();

    // ล็อกอิน/ล็อกเอาต์จากแท็บอื่นหรือหน้า login
    const { data } = browserClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") loadMe();
    });
    return () => data.subscription.unsubscribe();
  }, [loadMe]);

  const setUserId = useCallback(
    async (id: string) => {
      const target = demoAccounts.find((a) => a.id === id);
      if (!target?.email) return;
      await api("/api/auth/demo", { json: { email: target.email } });
      // โหลดหน้าใหม่ทั้งหน้า เพื่อให้ทุกหน้า/cache ของ router ใช้บัญชีใหม่
      window.location.reload();
    },
    [demoAccounts],
  );

  const logout = useCallback(async () => {
    await browserClient().auth.signOut();
    window.location.assign("/");
  }, []);

  const setClock = useCallback((offset: number) => {
    setClockState(offset);
    try {
      localStorage.setItem(CLOCK_KEY, String(offset));
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      account,
      user,
      userId: user?.id ?? "",
      demoAccounts,
      users: demoAccounts.filter((a) => a.role === "buyer"),
      setUserId,
      logout,
      refresh,
      version,
      warming,
      clock,
      setClock,
    }),
    [account, user, demoAccounts, setUserId, logout, refresh, version, warming, clock, setClock],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
