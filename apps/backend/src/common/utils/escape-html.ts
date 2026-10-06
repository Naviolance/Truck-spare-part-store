// For interpolating user-supplied text (names, descriptions, addresses) into
// email HTML. Without it, a customer named `<a href=...>` controls the markup
// of an email we send from our own domain.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
