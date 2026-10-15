"use client";

import { useEffect, useState } from "react";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import { THEME_KEY, type ThemeChoice } from "@/lib/theme";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemeChoice, string> = { light: "ธีมสว่าง", dark: "ธีมมืด", system: "ธีมตามเครื่อง" };

function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** ปุ่มสลับธีม: ตามเครื่อง → สว่าง → มืด (จำค่าที่เลือกไว้) */
export default function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeChoice | null;
      if (saved === "light" || saved === "dark" || saved === "system") setChoice(saved);
    } catch {}
  }, []);

  // ตามเครื่อง: เปลี่ยนตามเมื่อเครื่องสลับโหมด
  useEffect(() => {
    apply(choice);
    if (choice !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  function cycle() {
    const next = NEXT[choice];
    setChoice(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  const Icon = choice === "light" ? LightModeOutlinedIcon : choice === "dark" ? DarkModeOutlinedIcon : SettingsBrightnessOutlinedIcon;
  return (
    <button
      type="button"
      onClick={cycle}
      title={`${LABEL[choice]} (กดเพื่อเปลี่ยน)`}
      aria-label={`${LABEL[choice]} — กดเพื่อเปลี่ยนเป็น${LABEL[NEXT[choice]]}`}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line text-muted transition hover:border-brand hover:text-brand"
    >
      <Icon fontSize="small" />
    </button>
  );
}
