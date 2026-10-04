# ProLink public pages

Only two routes are implemented: `/` and `/sign-in`.

The visual source is `design & plan/prolink-—-hire-trusted-professionals,-fast`: its theme, GuestHome, GuestShell, SignInPage, button styles, and original hero asset. The named `frontend/theme` and `design` folders do not exist in this checkout.

## Structure

- `src/components/prolink/brand.tsx`: shared brand and line icons.
- `src/components/prolink/landing-page.tsx`: landing sections and responsive navigation.
- `src/components/prolink/sign-in-form.tsx`: sign-in UI and local interaction state.
- `src/app/globals.css`: reference colors, typography, component styles, and breakpoints.
- `public/images/hero-technician.jpg`: copied reference image.

Figtree and JetBrains Mono load from Google Fonts, as in the reference. System fonts remain available as fallbacks. Layout adapts at 1100, 900, and 600 pixels; the sign-in visual panel is hidden below 900 pixels, matching the reference's mobile form approach.

## Integration

Run the existing `dev`, `lint`, and `build` scripts using your package manager. Public routes can render without Supabase environment variables.

Authentication is intentionally UI-only. Replace the submit handler and social-provider actions in `sign-in-form.tsx` with your auth adapter. The remember checkbox is available as `remember` in form data; credentials are not persisted. Connect the password recovery link when adding that flow. Until then, these actions display clear status messages and do not simulate successful authentication.

Job and service CTAs route to sign-in. Navigation links use landing-page anchors. No dashboards, registration, job posting, recovery pages, or OAuth callback routes are scaffolded.

Reference marketplace statistics and testimonial copy are retained as design content; verify them before production publication.
