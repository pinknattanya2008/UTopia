"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "./UserProvider";
import TierBadge from "./TierBadge";

/** ปุ่มเชื่อมกระเป๋า U-topia (จำลอง) */
export default function ConnectWallet() {
  const { user } = useUser();
  const [state, setState] = useState<"idle" | "connecting" | "done">("idle");

  if (state === "done" && user) {
    return (
      <div className="animate-fade-up flex flex-wrap items-center gap-3 rounded-2xl border border-ok/40 bg-ok/10 px-4 py-3">
        <span className="text-ok">✓ เชื่อมกระเป๋าแล้ว</span>
        <span className="font-semibold">
          {user.avatar} {user.displayName}
        </span>
        <TierBadge tier={user.tier} size="sm" />
        <Link href="/dashboard" className="ml-auto text-sm font-semibold text-brand hover:underline">
          ดู Fan Score →
        </Link>
      </div>
    );
  }
  return (
    <button
      onClick={() => {
        setState("connecting");
        setTimeout(() => setState("done"), 900);
      }}
      disabled={state === "connecting"}
      className="rounded-2xl bg-brand px-6 py-3 font-bold text-black transition hover:bg-brand-dark disabled:opacity-70"
    >
      {state === "connecting" ? "กำลังเชื่อมต่อ…" : "🔗 เชื่อมกระเป๋า U-topia"}
    </button>
  );
}
