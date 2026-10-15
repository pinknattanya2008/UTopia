import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Supabase client ที่อ่าน/เขียน session จาก cookie (anon key) — ใช้ตรวจว่าใครล็อกอินอยู่ */
export async function authClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // เรียกจาก Server Component เขียน cookie ไม่ได้ — middleware ต่ออายุ session ให้แล้ว
        }
      },
    },
  });
}
