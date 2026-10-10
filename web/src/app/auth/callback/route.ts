import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");

  // Validate "next" parameter to prevent open redirect vulnerabilities
  let next = "/";
  if (
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
  ) {
    next = rawNext;
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && user) {
        // Look up the profile to inspect onboarding status
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        const targetPath =
          profile?.onboarding_completed === false ? "/onboarding" : next;

        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${targetPath}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${targetPath}`);
        } else {
          return NextResponse.redirect(`${origin}${targetPath}`);
        }
      }
    }
  }

  // Return the user to the sign-in page with a generic error message
  const errorRedirect = "/sign-in?error=Could+not+authenticate+user";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${errorRedirect}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${errorRedirect}`);
  } else {
    return NextResponse.redirect(`${origin}${errorRedirect}`);
  }
}
