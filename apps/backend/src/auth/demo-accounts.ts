// Demo accounts: logins whose credentials are published on purpose (README,
// login page) so visitors can explore the admin panel. They keep their real
// role, so every admin page works, but DemoReadOnlyInterceptor blocks any
// request that would change data.
//
// Override with DEMO_ACCOUNT_EMAILS (comma-separated). The default is the
// seeded admin, whose password is already public in the README.
const DEFAULT_DEMO_EMAILS = "admin@truckparts.local";

export function demoEmails(): string[] {
  return (process.env.DEMO_ACCOUNT_EMAILS ?? DEFAULT_DEMO_EMAILS)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && demoEmails().includes(email.trim().toLowerCase());
}

export const DEMO_READ_ONLY_MESSAGE =
  "This is a read-only demo account. You can look around, but changes are disabled.";
