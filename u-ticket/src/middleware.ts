import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** หน้าที่ต้องล็อกอินก่อน (สิทธิ์ตาม role ตรวจซ้ำใน layout/API) */
const PROTECTED = [/^\/dashboard/, /^\/tickets/, /^\/rewards/, /^\/checkout/, /^\/concierge/, /^\/presale/, /^\/concert\/[^/]+\/book/, /^\/admin/, /^\/staff/];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  // ต่ออายุ session (ต้องเรียกทุก request ตามแนวทางของ @supabase/ssr)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  if (!user && PROTECTED.some((r) => r.test(path))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // ไม่ต้องผ่าน middleware: ไฟล์ static, ไอคอน, API (API ตรวจสิทธิ์เอง)
  matcher: ["/((?!_next/static|_next/image|api/|icon.svg|apple-icon|manifest.webmanifest|favicon.ico).*)"],
};
