"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalActivityOutlinedIcon from "@mui/icons-material/LocalActivityOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import type { SvgIconComponent } from "@mui/icons-material";
import { useUser } from "./UserProvider";

const TABS: { href: string; label: string; Icon: SvgIconComponent; match: (p: string) => boolean }[] = [
  { href: "/", label: "หน้าแรก", Icon: HomeOutlinedIcon, match: (p) => p === "/" },
  { href: "/concert/c1", label: "คอนเสิร์ต", Icon: LocalActivityOutlinedIcon, match: (p) => p.startsWith("/concert") },
  { href: "/tickets", label: "บัตรของฉัน", Icon: ConfirmationNumberOutlinedIcon, match: (p) => p.startsWith("/tickets") },
  { href: "/dashboard", label: "Fan Score", Icon: InsightsOutlinedIcon, match: (p) => p.startsWith("/dashboard") },
];

const MORE = [
  { href: "/presale", label: "จำลองเปิดขาย Presale" },
  { href: "/concierge", label: "AI Concierge" },
  { href: "/rewards", label: "แลกแต้ม" },
];

/** แถบเมนูด้านล่างบนมือถือ (ซ่อนระหว่างเลือกที่นั่ง/ชำระเงิน และในส่วนผู้จัด/staff) */
export default function MobileTabBar() {
  const pathname = usePathname();
  const { account, setUserId, warming } = useUser();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const hidden =
    pathname.startsWith("/admin") || pathname.startsWith("/staff") || pathname.startsWith("/checkout") || /^\/concert\/[^/]+\/book/.test(pathname);
  if (hidden) return null;

  const role = account?.role;
  const backOffice = role === "organizer" || role === "admin" ? { href: "/admin", label: "จัดการคอนเสิร์ต (ผู้จัด)" } : role === "staff" ? { href: "/staff", label: "เช็คอินหน้างาน" } : { href: "/admin", label: "สำหรับผู้จัดงาน" };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}
      {open && (
        <div
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 mx-3 rounded-xl border border-line bg-surface p-2 lg:hidden"
          role="dialog"
          aria-label="เมนูเพิ่มเติม"
        >
          {[...MORE, backOffice].map((m) => (
            <Link key={m.href + m.label} href={m.href} className="block rounded-lg px-3 py-3 text-sm hover:bg-surface-2">
              {m.label}
            </Link>
          ))}
          <div className="mt-1 border-t border-line px-3 pt-3 pb-1">
            <p className="mb-2 text-xs text-muted">สลับบัญชีเดโม {warming && "· AI กำลังเตรียมข้อมูล…"}</p>
            <div className="flex gap-2">
              {[
                { id: "u01", label: "มายด์" },
                { id: "u19", label: "ShopKing99" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setUserId(d.id)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${account?.id === d.id ? "border-brand text-brand" : "border-line text-muted"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="เมนูหลัก"
      >
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-semibold text-brand" : "text-muted"}`}
            >
              <Icon fontSize="small" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] ${open ? "font-semibold text-brand" : "text-muted"}`}
        >
          {open ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          เมนู
        </button>
      </nav>
    </>
  );
}
