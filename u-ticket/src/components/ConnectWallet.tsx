"use client";

import Alert from "@mui/material/Alert";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "./UserProvider";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LinkIcon from "@mui/icons-material/Link";
import TierBadge from "./TierBadge";
import UserAvatar from "./UserAvatar";

/** ปุ่มเชื่อมกระเป๋า U-topia (จำลอง) */
export default function ConnectWallet() {
  const { user } = useUser();
  const [state, setState] = useState<"idle" | "connecting" | "done">("idle");

  if (state === "done" && user) {
    return (
      <Alert
        severity="success"
        variant="outlined"
        className="animate-fade-up"
        action={
          <Link href="/dashboard" className="flex items-center gap-1 self-center px-2 text-sm font-semibold text-brand hover:underline">
            ดู Fan Score <ArrowForwardIcon fontSize="inherit" />
          </Link>
        }
      >
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">เชื่อมกระเป๋าแล้ว</span>
        <span className="flex items-center gap-2 font-semibold">
          <UserAvatar name={user.displayName} color={user.avatar} size="sm" />
          {user.displayName}
        </span>
        <TierBadge tier={user.tier} size="sm" />
        </span>
      </Alert>
    );
  }
  return (
    <button
      onClick={() => {
        setState("connecting");
        setTimeout(() => setState("done"), 900);
      }}
      disabled={state === "connecting"}
      className="flex items-center gap-2 rounded-lg border border-brand/40 bg-surface px-5 py-3 font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-70"
    >
      {state === "connecting" ? (
        "กำลังเชื่อมต่อ…"
      ) : (
        <>
          <LinkIcon /> เชื่อมกระเป๋า U-topia
        </>
      )}
    </button>
  );
}
