"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "./UserProvider";
import TierBadge from "./TierBadge";

const LINKS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/concert/c1", label: "คอนเสิร์ต" },
  { href: "/dashboard", label: "Fan Score" },
  { href: "/presale", label: "Presale" },
  { href: "/concierge", label: "Concierge" },
  { href: "/rewards", label: "แลกแต้ม" },
];

const DEMO = [
  { id: "u01", label: "มายด์" },
  { id: "u19", label: "ShopKing99" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { users, userId, user, setUserId, warming } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-black">U</span>
          <span>
            U<span className="text-brand">-Ticket</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor="user-select">
            เลือกผู้ใช้จำลอง
          </label>
          <select
            id="user-select"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="max-w-[11rem] rounded-lg border border-line bg-surface px-2 py-1.5 text-sm focus:border-brand focus:outline-none sm:max-w-none"
          >
            {users.length === 0 && <option value={userId}>กำลังโหลด…</option>}
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.avatar} {u.displayName} · {u.tier}
              </option>
            ))}
          </select>
          {user && (
            <span className="hidden sm:inline">
              <TierBadge tier={user.tier} size="sm" />
            </span>
          )}
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 text-sm [scrollbar-width:none]">
          <nav className="flex gap-1">
            {LINKS.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`whitespace-nowrap rounded-full px-3 py-1 transition ${
                    active ? "bg-brand font-semibold text-black" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
            {warming && <span className="mr-1 animate-pulse whitespace-nowrap text-xs text-muted">AI กำลังเตรียมข้อมูล…</span>}
            {DEMO.map((d) => (
              <button
                key={d.id}
                onClick={() => setUserId(d.id)}
                className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition ${
                  userId === d.id ? "border-brand text-brand" : "border-line text-muted hover:border-brand hover:text-brand"
                }`}
              >
                เดโม: {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
