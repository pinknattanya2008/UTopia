"use client";

import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import type { SxProps, Theme } from "@mui/material/styles";
import TierBadge from "./TierBadge";
import UserAvatar from "./UserAvatar";
import { ROLE_LABEL, type DemoAccount } from "@/lib/client";

/** Dropdown เลือกบัญชีเดโม (MUI Select) แบ่งกลุ่มผู้ซื้อ / ผู้จัด-แอดมิน-staff */
export default function AccountSelect({
  accounts,
  value,
  onChange,
  placeholder = "เลือกบัญชีเดโม…",
  buyersOnly = false,
  sx,
  label,
}: {
  accounts: DemoAccount[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  buyersOnly?: boolean;
  sx?: SxProps<Theme>;
  label: string;
}) {
  const buyers = accounts.filter((a) => a.role === "buyer");
  const others = buyersOnly ? [] : accounts.filter((a) => a.role !== "buyer");
  const item = (a: DemoAccount) => (
    <MenuItem key={a.id} value={a.id} sx={{ gap: 1.25, py: 1 }}>
      <UserAvatar name={a.displayName} color={a.avatar} size="sm" />
      <span className="min-w-0 flex-1 truncate">{a.displayName}</span>
      {a.tier ? <TierBadge tier={a.tier} size="sm" /> : <span className="text-xs text-muted">{ROLE_LABEL[a.role]}</span>}
    </MenuItem>
  );
  return (
    <Select
      size="small"
      value={value}
      displayEmpty
      onChange={(e) => onChange(String(e.target.value))}
      inputProps={{ "aria-label": label }}
      renderValue={(v) => {
        const a = accounts.find((x) => x.id === v);
        if (!a) return <span className="text-muted">{placeholder}</span>;
        return (
          <span className="block truncate">
            {a.displayName}
            {a.tier ? ` · ${a.tier}` : ""}
          </span>
        );
      }}
      MenuProps={{ slotProps: { paper: { sx: { maxHeight: 440, minWidth: 260 } } } }}
      sx={{ fontSize: 14, ...sx }}
    >
      {[
        <ListSubheader key="h-buyer" sx={{ lineHeight: "32px", fontWeight: 600 }}>
          ผู้ซื้อ
        </ListSubheader>,
        ...buyers.map(item),
        ...(others.length
          ? [
              <ListSubheader key="h-staff" sx={{ lineHeight: "32px", fontWeight: 600 }}>
                ผู้จัด / แอดมิน / Staff
              </ListSubheader>,
              ...others.map(item),
            ]
          : []),
      ]}
    </Select>
  );
}
