import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { UserProvider } from "@/components/UserProvider";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "U-Ticket — ใช้ทุกวัน ได้บัตรก่อนใคร",
  description: "แอปกดบัตรคอนเสิร์ตบน U-topia ที่ให้สิทธิ์ presale กับแฟนตัวจริง และใช้ AI คัดบอทออก",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b10",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={`${plexThai.variable} font-sans antialiased`}>
        <UserProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
          <footer className="border-t border-line py-6 text-center text-xs text-muted">
            U-Ticket · U-Hackathon 2026 Track 1: AI · ข้อมูลทั้งหมดเป็นข้อมูลจำลอง
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
