"use client";

import { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import type { ThemeChoice } from "@/lib/theme";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemeChoice, string> = { light: "ธีมสว่าง", dark: "ธีมมืด", system: "ธีมตามเครื่อง" };

/** ปุ่มสลับธีม: ตามเครื่อง → สว่าง → มืด (MUI จัดการ data-theme + จำค่าไว้) */
export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const choice: ThemeChoice = mounted && mode ? mode : "system";
  const Icon = choice === "light" ? LightModeOutlinedIcon : choice === "dark" ? DarkModeOutlinedIcon : SettingsBrightnessOutlinedIcon;
  return (
    <Tooltip title={`${LABEL[choice]} — กดเพื่อเปลี่ยนเป็น${LABEL[NEXT[choice]]}`}>
      <IconButton
        size="small"
        onClick={() => setMode(NEXT[choice])}
        aria-label={`${LABEL[choice]} — กดเพื่อเปลี่ยนเป็น${LABEL[NEXT[choice]]}`}
        sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, width: 36, height: 36, color: "text.secondary" }}
      >
        <Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
