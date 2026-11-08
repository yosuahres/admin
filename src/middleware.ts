// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { canAccess, isProtectedRoute, isRole, ROLE_HOME } from "@/constants/roles";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));

  if (pathname === "/") return redirectTo("/login");

  const isProtected = isProtectedRoute(pathname);
  const isLogin = pathname.startsWith("/login");

  if (!user) {
    return isProtected ? redirectTo("/login") : response;
  }

  if (!isProtected && !isLogin) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  // A user needs both a valid role and an organization to use the app.
  const profileRole = profile?.role;
  const role =
    isRole(profileRole) && profile?.organization_id ? profileRole : null;

  if (isLogin) {
    // Signed-in users with a valid role skip the login page. Users without a
    // valid role or organization stay here so they see the error instead of
    // looping.
    return role ? redirectTo(ROLE_HOME[role]) : response;
  }

  if (!role) return redirectTo("/login?error=unauthorized");

  if (!canAccess(role, pathname)) return redirectTo(ROLE_HOME[role]);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
