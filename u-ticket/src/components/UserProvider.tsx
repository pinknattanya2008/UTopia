"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type ListUser } from "@/lib/client";

interface UserCtx {
  users: ListUser[];
  userId: string;
  user: ListUser | undefined;
  setUserId: (id: string) => void;
  /** โหลดรายชื่อ/Tier ใหม่ และเพิ่ม version ให้หน้าต่าง ๆ โหลดข้อมูลใหม่ */
  refresh: () => Promise<void>;
  version: number;
  warming: boolean;
}

const Ctx = createContext<UserCtx | null>(null);
const STORAGE_KEY = "uticket:userId";
const PREWARM_KEY = "uticket:prewarmed";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<ListUser[]>([]);
  const [userId, setUserIdState] = useState("u01");
  const [version, setVersion] = useState(0);
  const [warming, setWarming] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setUsers(await api<ListUser[]>("/api/users"));
    } catch {
      /* แสดงผลเดิมต่อ */
    }
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUserIdState(saved);
    } catch {}

    (async () => {
      const list = await api<ListUser[]>("/api/users").catch(() => [] as ListUser[]);
      setUsers(list);
      // Pre-warm: ให้ AI ประเมิน trust ของทุกคนไว้ก่อน หน้า presale จะขึ้นผลทันที
      let warmed = false;
      try {
        warmed = sessionStorage.getItem(PREWARM_KEY) === "1";
      } catch {}
      if (warmed || list.length === 0) return;
      setWarming(true);
      await Promise.allSettled(list.map((u) => api(`/api/trust/${u.id}`, { json: {} })));
      try {
        sessionStorage.setItem(PREWARM_KEY, "1");
      } catch {}
      setWarming(false);
      await refresh();
    })();
  }, [refresh]);

  const setUserId = useCallback((id: string) => {
    setUserIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ users, userId, user: users.find((u) => u.id === userId), setUserId, refresh, version, warming }),
    [users, userId, setUserId, refresh, version, warming],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
