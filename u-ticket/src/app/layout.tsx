import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Sora } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import "./globals.css";
import MobileTabBar from "@/components/MobileTabBar";
import MuiProvider from "@/components/MuiProvider";
import Navbar from "@/components/Navbar";
import { UserProvider } from "@/components/UserProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

// ฟอนต์ของโลโก้ U Ticket (ใช้กับโลโก้และตัวละตินในหัวข้อ)
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "U Ticket — ใช้ทุกวัน ได้บัตรก่อนใคร",
  description: "แอปกดบัตรคอนเสิร์ตบน U-topia ที่ให้สิทธิ์ presale กับแฟนตัวจริง และใช้ AI คัดบอทออก",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a30" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* ตั้งธีมก่อนหน้าแสดงผล กันหน้ากะพริบ */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${plexThai.variable} ${sora.variable} font-sans antialiased`}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <MuiProvider>
        <UserProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
          <footer className="border-t border-line px-4 pt-6 pb-28 text-center text-xs text-muted lg:pb-6">
            U Ticket · U-Hackathon 2026 Track 1: AI · ข้อมูลทั้งหมดเป็นข้อมูลจำลอง
          </footer>
          <MobileTabBar />
        </UserProvider>
        </MuiProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
