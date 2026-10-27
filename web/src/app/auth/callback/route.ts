import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { getSignInDestination } from "@/utils/auth-destination";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const cookieNext = cookieStore.get("prolink_oauth_next")?.value;
  const rawNext = searchParams.get("next") || cookieNext || null;

  const next = getSignInDestination(rawNext, searchParams.get("role"));

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  function buildTarget(path: string): string {
    if (isLocalEnv) return `${origin}${path}`;
    if (forwardedHost) return `https://${forwardedHost}${path}`;
    return `${origin}${path}`;
  }

  if (code) {
    const supabase = createClient(cookieStore);
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_suspended, suspended_reason")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.is_suspended) {
          await supabase.auth.signOut();
          const suspendedMsg = profile.suspended_reason
            ? `Your account has been suspended: ${profile.suspended_reason}`
            : "Your account has been suspended. Please contact support.";
          const suspendedRes = NextResponse.redirect(
            buildTarget(`/sign-in?error=${encodeURIComponent(suspendedMsg)}`)
          );
          suspendedRes.cookies.delete("prolink_oauth_next");
          return suspendedRes;
        }

        const destination =
          profile?.role === "admin" ? "/admin" : next;

        const res = NextResponse.redirect(buildTarget(destination));
        res.cookies.delete("prolink_oauth_next");
        return res;
      }
    }
  }

  const res = NextResponse.redirect(
    buildTarget("/sign-in?error=Could+not+authenticate+user")
  );
  res.cookies.delete("prolink_oauth_next");
  return res;
}
