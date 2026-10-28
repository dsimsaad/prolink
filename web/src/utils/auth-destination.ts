/** Shared destination rules for password and OAuth sign-in. */
export function getSignInDestination(next: string | null, role: string | null = null): string {
  if (role === "admin" || next === "/admin" || next?.startsWith("/admin/")) {
    return next && next.startsWith("/admin") ? next : "/admin";
  }
  if (
    role === "professional" ||
    next === "/become-professional" ||
    next?.startsWith("/become-professional/")
  ) {
    return "/become-professional";
  }
  // Missing, legacy landing-page, and untrusted destinations open My dashboard.
  return "/user";
}
