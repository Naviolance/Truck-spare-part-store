// Admin input "FL-2045, 51.05504-0107\n A1234" -> ["FL-2045", "51.05504-0107", "A1234"]
// (comma or newline separated, trimmed, duplicates removed).
export function parseCrossReferences(text: string): string[] {
  return Array.from(new Set(text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)));
}
