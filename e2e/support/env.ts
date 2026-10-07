export const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";
// Same key the frontend server uses: requests carrying it skip the rate
// limiter, so the suite can log in more than 5 times a minute.
export const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

export const ADMIN = { email: "admin@truckparts.local", password: "admin123" };
export const CUSTOMER = { email: "customer@truckparts.local", password: "customer123" };
