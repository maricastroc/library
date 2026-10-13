export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeText(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, 80);
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function splitSentences(text: string): string[] {
  const prepared = text.replace(/\s+/g, " ").trim();
  if (!prepared) return [];
  const pieces = prepared.match(/[^.!?…]+(?:[.!?…]+["”»)]*|$)/g) ?? [prepared];
  const sentences: string[] = [];
  let buffer = "";
  for (const piece of pieces) {
    const candidate = `${buffer}${piece}`.trim();
    const endsWithAbbreviation = /(?:\b[A-ZÀ-Ý]|\bMr|\bMrs|\bMs|\bDr|\bSt|\bSr|\bSra|\bDra|\bno|\bp|\bvol|\bch|\bed|\bc|\bca|\betc)\.$/i.test(candidate);
    if (candidate.length < 40 || endsWithAbbreviation) {
      buffer = `${candidate} `;
      continue;
    }
    sentences.push(candidate);
    buffer = "";
  }
  if (buffer.trim()) {
    if (sentences.length > 0) sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${buffer.trim()}`;
    else sentences.push(buffer.trim());
  }
  return sentences;
}

export function formatPrice(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function authorSortKey(author: string): string {
  const tokens = author.trim().split(/\s+/);
  const last = tokens[tokens.length - 1] ?? author;
  return normalizeText(`${last} ${tokens.slice(0, -1).join(" ")}`);
}

export function titleSortKey(title: string): string {
  return normalizeText(title).replace(/^(the|an|o|a|os|as|um|uma|uns|umas) /, "");
}
