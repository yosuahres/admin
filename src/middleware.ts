// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    !user &&
    (pathname.startsWith("/admin") ||
      pathname.startsWith("/leader") ||
      pathname.startsWith("/usher") ||
      pathname.startsWith("/finance") ||
      pathname.startsWith("/pastor"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (
      !role &&
      (pathname.startsWith("/admin") ||
        pathname.startsWith("/leader") ||
        pathname.startsWith("/usher") ||
        pathname.startsWith("/finance") ||
        pathname.startsWith("/pastor"))
    ) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url),
      );
    }

    // Redirect admin away from non-admin routes
    if (role === "admin" && (pathname.startsWith("/leader") || pathname.startsWith("/usher"))) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Redirect leader away from non-leader routes
    if (role === "leader" && (pathname.startsWith("/admin") || pathname.startsWith("/usher"))) {
      return NextResponse.redirect(new URL("/leader", request.url));
    }

    // Redirect usher away from non-usher routes
    if (role === "usher" && (pathname.startsWith("/admin") || pathname.startsWith("/leader"))) {
      return NextResponse.redirect(new URL("/usher", request.url));
    }

    // Redirect pastor away from non-pastor routes
    if (role === "pastor" && (pathname.startsWith("/admin") || pathname.startsWith("/leader") || pathname.startsWith("/usher") || pathname.startsWith("/finance"))) {
      return NextResponse.redirect(new URL("/pastor", request.url));
    }

    // Guard /pastor route — only pastor role allowed
    if (pathname.startsWith("/pastor") && role !== "pastor") {
      const dest =
        role === "admin" ? "/admin"
        : role === "leader" ? "/leader"
        : role === "finance" ? "/finance"
        : role === "usher" ? "/usher"
        : "/login?error=unauthorized";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Guard /finance route — only admin and finance roles allowed
    if (
      pathname.startsWith("/finance") &&
      role !== "admin" &&
      role !== "finance"
    ) {
      const dest =
        role === "leader"
          ? "/leader"
          : role === "usher"
          ? "/usher"
          : "/login?error=unauthorized";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Guard /usher route — only usher (and optionally admin) allowed
    if (
      pathname.startsWith("/usher") &&
      role !== "usher" &&
      role !== "admin"
    ) {
      const dest =
        role === "leader"
          ? "/leader"
          : role === "finance"
          ? "/finance"
          : "/login?error=unauthorized";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Redirect logged-in users away from /login
    if (pathname.startsWith("/login")) {
      const dest =
        role === "admin"
          ? "/admin"
          : role === "leader"
          ? "/leader"
          : role === "usher"
          ? "/usher"
          : role === "finance"
          ? "/finance"
          : role === "pastor"
          ? "/pastor"
          : "/login";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};