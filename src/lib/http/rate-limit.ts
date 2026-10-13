type Bucket = { count: number; resetAt: number };
type GlobalWithBuckets = typeof globalThis & { __entrelinhasBuckets?: Map<string, Bucket> };

function buckets(): Map<string, Bucket> {
  const scope = globalThis as GlobalWithBuckets;
  if (!scope.__entrelinhasBuckets) scope.__entrelinhasBuckets = new Map();
  return scope.__entrelinhasBuckets;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function allowRequest(scope: string, key: string, limit: number, windowMs: number): boolean {
  const store = buckets();
  const id = `${scope}:${key}`;
  const now = Date.now();
  const bucket = store.get(id);
  if (!bucket || bucket.resetAt <= now) {
    store.set(id, { count: 1, resetAt: now + windowMs });
    if (store.size > 5000) {
      for (const [entryKey, entry] of store) if (entry.resetAt <= now) store.delete(entryKey);
    }
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
