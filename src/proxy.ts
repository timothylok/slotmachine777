import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { readSupabaseEnv } from "@/lib/supabase/config";

/**
 * Refreshes the Supabase auth cookie on every navigation. Without this the
 * access token expires and server components see a logged-out user.
 * (Next.js 16 renamed the middleware convention to `proxy`.)
 */
export default async function proxy(request: NextRequest) {
  const { url, anonKey, configured } = readSupabaseEnv();
  if (!configured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|webp)$).*)"],
};
