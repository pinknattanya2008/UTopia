/**
 * สีที่ใช้ใน SVG (ผังที่นั่ง, เกจ, ภาพจำลอง) — อ้าง CSS variables ใน globals.css
 * จึงเปลี่ยนตามธีมสว่าง/มืดเอง (SVG fill/stroke รองรับ var())
 */
export const MAP = {
  bg: "var(--map-bg)",
  grid: "var(--map-grid)",
  stage: "var(--brand)",
  stageText: "#ffffff",
  sold: "var(--map-sold)",
  soldStroke: "var(--map-sold-stroke)",
  ink: "var(--map-ink)",
  inkMuted: "var(--map-ink-muted)",
  labelBg: "var(--map-label-bg)",
  selected: "var(--map-selected)",
  selectedRing: "var(--map-selected-ring)",
  focus: "var(--brand)",
  screen: "var(--map-screen)",
  track: "var(--map-track)",
  danger: "var(--danger)",
};

export const TIER_COLOR = {
  Diamond: "#0ea5e9",
  Gold: "#f59e0b",
  Silver: "#94a3b8",
  General: "#a1a1aa",
} as const;

export type ThemeChoice = "light" | "dark" | "system";
export const THEME_KEY = "uticket:theme";

/** สคริปต์ตั้ง data-theme ก่อนหน้าแสดงผล (กันหน้ากะพริบสีผิด) — ใส่ใน <head> */
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_KEY}");var d=c==="dark"||((!c||c==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`;
