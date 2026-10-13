export function cleanIsbn(value: string): string {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn10(isbn: string): boolean {
  if (!/^[0-9]{9}[0-9X]$/.test(isbn)) return false;
  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    const char = isbn[index];
    const digit = char === "X" ? 10 : Number(char);
    sum += digit * (10 - index);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(isbn: string): boolean {
  if (!/^[0-9]{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let index = 0; index < 13; index += 1) {
    sum += Number(isbn[index]) * (index % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function isbn10To13(isbn10: string): string {
  const core = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(core[index]) * (index % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${core}${check}`;
}

export type IsbnResult = { ok: true; isbn: string } | { ok: false; reason: string };

export function normalizeIsbn(value: string): IsbnResult {
  const cleaned = cleanIsbn(value);
  if (cleaned.length === 13) {
    return isValidIsbn13(cleaned) ? { ok: true, isbn: cleaned } : { ok: false, reason: "dígito verificador inválido" };
  }
  if (cleaned.length === 10) {
    return isValidIsbn10(cleaned)
      ? { ok: true, isbn: isbn10To13(cleaned) }
      : { ok: false, reason: "dígito verificador inválido" };
  }
  return { ok: false, reason: "o ISBN deve ter 10 ou 13 dígitos" };
}

export function pickIsbn(candidates: string[]): string | null {
  const normalized = candidates
    .map((candidate) => normalizeIsbn(candidate))
    .filter((result): result is { ok: true; isbn: string } => result.ok)
    .map((result) => result.isbn);
  if (normalized.length === 0) return null;
  const lusophone = normalized.find((isbn) => /^978(85|65|972|989)/.test(isbn));
  return lusophone ?? normalized[0];
}

export function formatIsbn(isbn: string | null): string | null {
  if (!isbn || isbn.length !== 13) return isbn;
  return `${isbn.slice(0, 3)}-${isbn.slice(3, 5)}-${isbn.slice(5, 9)}-${isbn.slice(9, 12)}-${isbn.slice(12)}`;
}
