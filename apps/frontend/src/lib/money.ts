// XAF (Central African CFA franc) has no decimal subunits — always render as a whole number.
export function formatMoney(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `FCFA ${Math.round(value).toLocaleString("fr-FR")}`;
}
