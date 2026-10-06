// Backend twin of the frontend's formatMoney() (apps/frontend/src/lib/money.ts)
// for emails. XAF has no decimal subunits, so always a whole number.
export function formatXaf(amount: number | string | { toString(): string }): string {
  const value = Number(typeof amount === "object" ? amount.toString() : amount);
  return `FCFA ${Math.round(value).toLocaleString("fr-FR")}`;
}
