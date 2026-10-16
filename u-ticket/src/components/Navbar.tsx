"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import LogoutIcon from "@mui/icons-material/Logout";
import { useUser } from "./UserProvider";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import TierBadge from "./TierBadge";
import UserAvatar from "./UserAvatar";
import { ROLE_LABEL } from "@/lib/client";
import AccountSelect from "./AccountSelect";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

const LINKS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/concert/c1", label: "คอนเสิร์ต" },
  { href: "/dashboard", label: "Fan Score" },
  { href: "/tickets", label: "บัตรของฉัน" },
  { href: "/presale", label: "Presale" },
  { href: "/concierge", label: "Concierge" },
  { href: "/rewards", label: "แลกแต้ม" },
];

const BACK_OFFICE_LINKS = {
  organizer: [
    { href: "/admin", label: "ภาพรวม", exact: true },
    { href: "/admin/concerts/new", label: "สร้างคอนเสิร์ต", exact: false },
  ],
  admin: [
    { href: "/admin", label: "ภาพรวม", exact: true },
    { href: "/admin/concerts/new", label: "สร้างคอนเสิร์ต", exact: false },
    { href: "/staff", label: "เช็คอินหน้างาน", exact: false },
  ],
  staff: [{ href: "/staff", label: "เช็คอินหน้างาน", exact: false }],
};

/** ปุ่มลัดบัญชีเดโมที่ใช้บ่อยบนเวที */
const QUICK_DEMO = [
  { id: "u01", label: "มายด์" },
  { id: "u19", label: "ShopKing99" },
];

/** บัญชีที่ล็อกอินอยู่ + สลับบัญชีเดโม + ออกจากระบบ */
function AccountArea() {
  const pathname = usePathname();
  const { account, user, demoAccounts, setUserId, logout } = useUser();

  if (account === undefined) return <span className="h-9 w-40 animate-pulse rounded-md bg-surface-2" />;
  return (
    <div className="flex items-center gap-2">
      {demoAccounts.length > 0 && (
        <AccountSelect
          accounts={demoAccounts}
          value={account?.id ?? ""}
          onChange={setUserId}
          label="สลับบัญชีเดโม"
          sx={{ width: { xs: 136, sm: "auto" }, minWidth: { sm: 180 }, maxWidth: { sm: 240 } }}
        />
      )}
      {account ? (
        <>
          <span className="hidden items-center gap-2 sm:flex">
            <UserAvatar name={account.displayName} color={account.avatar} size="sm" />
            {user ? <TierBadge tier={user.tier} size="sm" /> : <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">{ROLE_LABEL[account.role]}</span>}
          </span>
          <Tooltip title="ออกจากระบบ">
            <IconButton
              size="small"
              onClick={logout}
              aria-label="ออกจากระบบ"
              sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, width: 36, height: 36, color: "text.secondary", "&:hover": { color: "error.main", borderColor: "error.main" } }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="whitespace-nowrap rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          เข้าสู่ระบบ
        </Link>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { account, setUserId, warming } = useUser();
  const backOffice = pathname.startsWith("/admin") || pathname.startsWith("/staff");
  const role = account?.role;

  if (backOffice) {
    const links = role && role !== "buyer" ? BACK_OFFICE_LINKS[role] : [];
    return (
      <header className="sticky top-0 z-40 border-b border-line bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href={role === "staff" ? "/staff" : "/admin"} className="flex items-center gap-2">
            <Logo size={30} textClassName="hidden sm:inline" />
            <span className="hidden rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted sm:inline">
              {role === "staff" ? "Staff" : role === "admin" ? "Admin" : "Organizer"}
            </span>
          </Link>
          {account?.organizerName && <span className="hidden text-sm text-muted md:inline">{account.organizerName}</span>}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="hidden items-center gap-1 text-sm text-muted hover:text-brand sm:flex">
              <StorefrontOutlinedIcon fontSize="small" /> หน้าผู้ซื้อ
            </Link>
            <ThemeToggle />
            <AccountArea />
          </div>
          {links.length > 0 && (
            <nav className="flex w-full gap-1 text-sm">
              {links.map((l) => {
                const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`whitespace-nowrap rounded-md px-3 py-1 transition ${
                      active ? "bg-brand font-semibold text-white" : "text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="U Ticket หน้าแรก">
          <Logo size={28} textClassName="hidden sm:inline" />
        </Link>

        {role === "organizer" || role === "admin" ? (
          <Link href="/admin" className="hidden items-center gap-1 rounded-md border border-line px-3 py-1 text-xs text-muted hover:border-brand hover:text-brand sm:flex">
            <BusinessCenterOutlinedIcon fontSize="inherit" /> จัดการคอนเสิร์ต
          </Link>
        ) : role === "staff" ? (
          <Link href="/staff" className="hidden items-center gap-1 rounded-md border border-line px-3 py-1 text-xs text-muted hover:border-brand hover:text-brand sm:flex">
            <QrCodeScannerIcon fontSize="inherit" /> เช็คอินหน้างาน
          </Link>
        ) : (
          <Link href="/admin" className="hidden items-center gap-1 rounded-md border border-line px-3 py-1 text-xs text-muted hover:border-brand hover:text-brand sm:flex">
            <BusinessCenterOutlinedIcon fontSize="inherit" /> สำหรับผู้จัดงาน
          </Link>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <AccountArea />
        </div>

        <div className="hidden w-full items-center gap-2 overflow-x-auto pb-1 text-sm [scrollbar-width:none] lg:flex">
          <nav className="flex gap-1">
            {LINKS.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : l.href.startsWith("/concert") ? pathname.startsWith("/concert") : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`whitespace-nowrap rounded-md px-3 py-1 transition ${
                    active ? "bg-brand font-semibold text-white" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            <Link href={role === "staff" ? "/staff" : "/admin"} className="whitespace-nowrap rounded-md px-3 py-1 text-muted hover:text-brand sm:hidden">
              {role === "staff" ? "เช็คอิน" : "ผู้จัดงาน"}
            </Link>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
            {warming && <span className="mr-1 animate-pulse whitespace-nowrap text-xs text-muted">AI กำลังเตรียมข้อมูล…</span>}
            {QUICK_DEMO.map((d) => (
              <button
                key={d.id}
                onClick={() => setUserId(d.id)}
                className={`whitespace-nowrap rounded-md border px-2.5 py-1 text-xs transition ${
                  account?.id === d.id ? "border-brand text-brand" : "border-line text-muted hover:border-brand hover:text-brand"
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
