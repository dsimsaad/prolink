# Portal integration

- /admin: authenticated staff only (profiles.role = admin); overview, users, verification, jobs/offers, and matching.
- /user: authenticated account dashboard; overview, post-job, jobs, and job details.
- The User dashboard uses BecomeProfessionalCta, which links to /become-professional. That existing server page loads saved application state and renders BecomeProfessionalForm; its Supabase submit handler is shared with the sign-in/onboarding entry point. Pending, approved, rejected, and suspended states use the existing flow. There is no second application form.
- Portal screens are adapted from the design & plan prototype. The marketplace API and analytics remain sample data in browser memory; verification actions in this preview do not review real professional applications. The banner makes this visible. Authentication, role checks, sign-out, and the professional application use the existing Supabase integration.
- Browser-only prototype code is loaded through a client-only dynamic boundary. Navigation uses Next's router, including browser back/forward and direct URL loading.
- Only implemented design sections appear in the sidebar. Original design references are retained; no temporary mockup files are required.
