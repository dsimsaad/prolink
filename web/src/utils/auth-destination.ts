/** Shared destination rules for password and OAuth sign-in. */
export function getSignInDestination(next: string | null, role: string | null = null): string {
  if (role === 'professional' || next === '/become-professional') return '/become-professional';
  if (next === '/admin') return '/admin';
  // Missing, legacy landing-page, and untrusted destinations open My dashboard.
  return '/user';
}
