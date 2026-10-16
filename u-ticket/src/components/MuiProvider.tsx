"use client";

import "dayjs/locale/th";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { thTH as coreThTH } from "@mui/material/locale";
import { thTH as pickersThTH } from "@mui/x-date-pickers/locales";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjsBuddhist } from "@mui/x-date-pickers/AdapterDayjsBuddhist";
import { THEME_KEY } from "@/lib/theme";
import { ConfirmProvider } from "./ConfirmProvider";

/**
 * ธีม MUI ตามแบรนด์ U Ticket — ใช้ data-theme บน <html> ตัวเดียวกับ Tailwind
 * และเก็บโหมดใน localStorage key เดียวกับปุ่มสลับธีม (light | dark | system)
 */
const theme = createTheme({
  cssVariables: { colorSchemeSelector: '[data-theme="%s"]' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#4f7bff", dark: "#3a63e6", contrastText: "#ffffff" },
        error: { main: "#e5484d" },
        success: { main: "#2f9e6b" },
        warning: { main: "#d9822b" },
        info: { main: "#4f7bff" },
        text: { primary: "#0f1a30", secondary: "#5b6784" },
        background: { default: "#f4f6fb", paper: "#ffffff" },
        divider: "#dce2f0",
      },
    },
    dark: {
      palette: {
        primary: { main: "#4f7bff", dark: "#3a63e6", contrastText: "#ffffff" },
        error: { main: "#f06469" },
        success: { main: "#45b883" },
        warning: { main: "#f0a35e" },
        info: { main: "#7d9dff" },
        text: { primary: "#f4f6fb", secondary: "#aeb8d0" },
        background: { default: "#0f1a30", paper: "#15223d" },
        divider: "#2a3a5e",
      },
    },
  },
  typography: {
    fontFamily: "var(--font-thai), ui-sans-serif, system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiMenu: {
      styleOverrides: { paper: ({ theme }) => ({ border: `1px solid ${theme.vars.palette.divider}`, marginTop: 4 }) },
    },
    MuiPopover: { defaultProps: { slotProps: { paper: { elevation: 3 } } } },
    MuiDialog: { styleOverrides: { paper: ({ theme }) => ({ border: `1px solid ${theme.vars.palette.divider}` }) } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8, alignItems: "center" } } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: "var(--surface)" } } },
  },
}, pickersThTH, coreThTH);

export default function MuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme} modeStorageKey={THEME_KEY} defaultMode="system" disableTransitionOnChange>
      <LocalizationProvider dateAdapter={AdapterDayjsBuddhist} adapterLocale="th">
        <ConfirmProvider>{children}</ConfirmProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
