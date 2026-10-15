import { hashString } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { ShelfGroup } from "./arrange";
import type { SpineIdentity } from "./identity";

export type Posture = "stand" | "lean" | "lie" | "face";
export type Role = "hero" | "face" | "run" | "lean" | "pile" | "topper" | "answer";

export type Pose = {
  posture: Posture;
  x: number;
  y: number;
  angle: number;
  scale: number;
  ox: number;
  oy: number;
  turn: number;
};

export type Rect = { x: number; y: number; w: number; h: number };

export type PlacedBook = {
  id: number;
  pose: Pose;
  rect: Rect;
  bay: number;
  row: number;
  role: Role;
  order: number;
  rank: number | null;
};

export type Plinth = { key: string; x: number; y: number; w: number; h: number; label: string | null; count: number | null; numeral: string | null; stage: boolean };
export type Easel = { key: string; x: number; y: number; w: number };
export type Caption = { key: string; ids: number[]; rank: number; x: number; y: number; w: number; h: number };
export type QuoteSpot = { id: number; x: number; y: number; w: number; h: number };
export type GroupLabel = { key: string; label: string; count: number | null; x: number; y: number };
export type NoteSpot = { id: number; x: number; y: number; w: number };
export type Density = "airy" | "balanced";
export type Shadow = { key: string; x: number; y: number; w: number };

export type Composition = {
  width: number;
  height: number;
  scale: number;
  books: Map<number, PlacedBook>;
  plinths: Plinth[];
  easels: Easel[];
  shadows: Shadow[];
  labels: GroupLabel[];
  notes: NoteSpot[];
  captions: Caption[];
  quote: QuoteSpot | null;
  restLabel: number | null;
  stageHeight: number;
  order: number[];
};

export type CompositionInput = {
  groups: ShelfGroup[];
  identities: Map<number, SpineIdentity>;
  width: number;
  answers?: number[];
  ranks?: Map<number, number>;
  confidence?: "high" | "medium" | "low" | "none";
  level?: boolean;
  density?: Density;
};

type Metrics = {
  scale: number;
  narrow: boolean;
  bayCapacity: number[];
  bayGap: number;
  groupGap: number;
  rowGap: number;
  settleGap: number;
  settled: boolean;
  pieceGap: number;
  runGap: number;
  heroSupports: number[];
  runSupports: number[];
  pileSupports: number[];
  plinthBody: number;
  labelRoom: number;
};

export function metricsFor(width: number, density: Density = "airy"): Metrics {
  const narrow = width < 760;
  const medium = width < 1100;
  const airy: Metrics = {
    scale: narrow ? 0.7 : medium ? 0.8 : 0.88,
    narrow,
    bayCapacity: narrow ? [7, 5, 8, 6] : [11, 8, 13, 9],
    bayGap: narrow ? 30 : 72,
    groupGap: narrow ? 30 : 72,
    rowGap: narrow ? 46 : 70,
    settleGap: 0,
    settled: false,
    pieceGap: narrow ? 12 : 22,
    runGap: 2,
    heroSupports: narrow ? [30, 46, 22, 38] : [58, 88, 42, 108, 70],
    runSupports: narrow ? [0, 10, 0, 16] : [0, 18, 0, 30, 10],
    pileSupports: narrow ? [12, 20] : [24, 40, 16],
    plinthBody: narrow ? 14 : 18,
    labelRoom: narrow ? 30 : 34,
  };
  if (density === "airy") return airy;
  return {
    ...airy,
    bayGap: narrow ? 18 : 34,
    groupGap: narrow ? 30 : 68,
    settleGap: narrow ? 20 : 22,
    settled: true,
    plinthBody: narrow ? 12 : 14,
    pieceGap: narrow ? 10 : 18,
    heroSupports: narrow ? [18, 28, 12, 24] : [30, 48, 22, 58, 40],
    runSupports: narrow ? [0, 8, 0, 12] : [0, 12, 0, 22, 6],
    pileSupports: narrow ? [10, 16] : [16, 28, 10],
    labelRoom: narrow ? 28 : 30,
  };
}

export const COVER_RATIO = 0.7;
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const numeral = (rank: number) => NUMERALS[rank - 1] ?? String(rank);

type Book = { book: ShelfBook; identity: SpineIdentity };

type Piece =
  | { kind: "run"; books: Book[]; lean: -1 | 0 | 1; angle: number; crown?: Book[] }
  | { kind: "pile"; books: Book[]; topper: Book | null }
  | { kind: "face"; book: Book; size: number; role: Role };

const thickness = (item: Book) => Math.max(24, item.identity.width);
const coverWidth = (item: Book) => Math.round(item.identity.height * COVER_RATIO);
const isSlim = (book: ShelfBook) => (book.pages !== null && book.pages <= 170) || book.genre === "Poetry" || book.genre === "Theater";
const radians = (degrees: number) => (degrees * Math.PI) / 180;

function chunk<T>(items: T[], sizes: number[]): T[][] {
  const out: T[][] = [];
  let index = 0;
  let turn = 0;
  while (index < items.length) {
    const size = sizes[turn % sizes.length];
    out.push(items.slice(index, index + size));
    index += size;
    turn += 1;
  }
  if (out.length > 1 && out[out.length - 1].length < 3) {
    const tail = out.pop() as T[];
    out[out.length - 1].push(...tail);
  }
  return out;
}

function splitEvenly<T>(items: T[], capacity: number[]): T[][] {
  const average = capacity.reduce((sum, value) => sum + value, 0) / capacity.length;
  const count = Math.max(1, Math.ceil(items.length / average));
  const size = Math.ceil(items.length / count);
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

function leanAngle(books: Book[]): number {
  const paces = books.map((item) => item.book.pace).filter((pace): pace is number => pace !== null);
  const pace = paces.length > 0 ? paces.reduce((sum, value) => sum + value, 0) / paces.length : 2.5;
  return Math.round((5 + pace * 2.2) * 10) / 10;
}

export function composeBay(books: Book[], seed: number, options: { narrow: boolean; crowns?: boolean; filler?: boolean }): Piece[] {
  const n = books.length;
  if (n === 0) return [];
  const angle = leanAngle(books);
  if (options.filler) {
    if (books.every((item) => isSlim(item.book))) return [{ kind: "pile", books: [...books].sort((a, b) => b.identity.height - a.identity.height), topper: null }];
    return [{ kind: "run", books, lean: n >= 3 ? -1 : 0, angle }];
  }
  const hero = books.find((item) => item.book.note) ?? books[0];
  const rest = books.filter((item) => item !== hero);
  const heroPiece: Piece = { kind: "face", book: hero, size: options.narrow ? 0.92 : 1, role: "hero" };

  if (n === 1) return [heroPiece];
  if (n === 2) {
    const [other] = rest;
    return isSlim(other.book) ? [heroPiece, { kind: "pile", books: [other], topper: null }] : [heroPiece, { kind: "run", books: [other], lean: -1, angle: angle + 4 }];
  }
  if (n === 3) {
    const slim = rest.filter((item) => isSlim(item.book));
    if (slim.length === 2) return [heroPiece, { kind: "pile", books: rest, topper: null }];
    return seed % 2 === 0 ? [heroPiece, { kind: "run", books: rest, lean: -1, angle }] : [{ kind: "run", books: rest, lean: 1, angle }, heroPiece];
  }

  const slim = rest.filter((item) => isSlim(item.book));
  const pileSize = Math.min(5, Math.max(n >= 8 ? 2 : 0, Math.round(n * 0.22)));
  const pileBooks = slim.slice(0, pileSize);
  if (pileBooks.length < pileSize && n >= 10) {
    const thin = rest.filter((item) => !pileBooks.includes(item)).sort((a, b) => thickness(a) - thickness(b));
    pileBooks.push(...thin.slice(0, pileSize - pileBooks.length));
  }
  if (pileBooks.length < 2) pileBooks.length = 0;
  const notedOthers = rest.filter((item) => item.book.note && !pileBooks.includes(item));
  const topper = n >= 9 && pileBooks.length >= 2 ? (notedOthers[0] ?? null) : null;
  const standing = rest.filter((item) => !pileBooks.includes(item) && item !== topper);
  const lengths = [[6, 4, 7], [5, 7, 4], [7, 5, 6]][seed % 3].map((value) => (options.narrow ? Math.max(3, value - 2) : value));
  const runs = standing.length > 0 ? chunk(standing, lengths) : [];
  const pile: Piece | null = pileBooks.length > 0 ? { kind: "pile", books: [...pileBooks].sort((a, b) => b.identity.height - a.identity.height), topper } : null;

  const runPieces: Piece[] = runs.map((run, index) => ({ kind: "run", books: run, lean: run.length >= 3 ? (index % 2 === 0 ? -1 : 1) : 0, angle }));
  const variant = seed % 3;
  const pieces: Piece[] = [];
  if (variant === 0) {
    if (runPieces[0]) pieces.push(runPieces[0]);
    pieces.push(heroPiece);
    pieces.push(...runPieces.slice(1));
    if (pile) pieces.push(pile);
  } else if (variant === 1) {
    pieces.push(heroPiece);
    if (runPieces[0]) pieces.push(runPieces[0]);
    if (pile) pieces.push(pile);
    pieces.push(...runPieces.slice(1));
  } else {
    if (runPieces[0]) pieces.push(runPieces[0]);
    if (pile) pieces.push(pile);
    pieces.push(heroPiece);
    pieces.push(...runPieces.slice(1));
  }
  const settled = pieces.map((piece, index) => {
    if (piece.kind !== "run" || piece.lean === 0) return piece;
    const next = pieces[index + 1];
    const previous = pieces[index - 1];
    if (piece.lean === 1 && !next) return { ...piece, lean: -1 as const };
    if (piece.lean === -1 && !previous && piece.books.length < 2) return { ...piece, lean: 0 as const };
    return piece;
  });
  if (!options.crowns) return settled;
  const pileIndex = settled.findIndex((piece) => piece.kind === "pile" && !piece.topper && piece.books.length <= 2);
  if (pileIndex === -1) return settled;
  const crownBooks = (settled[pileIndex] as Extract<Piece, { kind: "pile" }>).books;
  const longest = Math.max(...crownBooks.map((item) => item.identity.height));
  const runWidth = (piece: Piece) => (piece.kind === "run" ? piece.books.reduce((sum, item) => sum + thickness(item), 0) : 0);
  const host = settled
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => piece.kind === "run" && piece.books.length >= 4 && runWidth(piece) >= longest * 0.62)
    .sort((a, b) => runWidth(b.piece) - runWidth(a.piece))[0];
  if (!host) return settled;
  return settled
    .map((piece, index) => (index === host.index && piece.kind === "run" ? { ...piece, crown: crownBooks } : piece))
    .filter((_, index) => index !== pileIndex);
}

type Laid = { id: number; pose: Pose; rect: Rect; role: Role };
type LaidPiece = { width: number; height: number; books: Laid[]; easels: { x: number; w: number }[] };

function standPose(item: Book, x: number, ground: number, scale: number): Laid {
  const t = thickness(item) * scale;
  const h = item.identity.height * scale;
  return {
    id: item.book.id,
    role: "run",
    pose: { posture: "stand", x, y: ground, angle: 0, scale, ox: 0, oy: -item.identity.height, turn: 0 },
    rect: { x, y: ground - h, w: t, h },
  };
}

function lay(piece: Piece, scale: number): LaidPiece {
  if (piece.kind === "face") {
    const s = scale * piece.size;
    const w = coverWidth(piece.book) * s;
    const h = piece.book.identity.height * s;
    const t = thickness(piece.book);
    return {
      width: w,
      height: h + 8,
      easels: piece.role === "hero" || piece.role === "answer" ? [{ x: w * 0.2, w: w * 0.6 }] : [],
      books: [
        {
          id: piece.book.book.id,
          role: piece.role,
          pose: { posture: "face", x: w / 2 - (t * s) / 2, y: h, angle: 0, scale: s, ox: 0, oy: -piece.book.identity.height, turn: -90 },
          rect: { x: 0, y: 0, w, h },
        },
      ],
    };
  }
  if (piece.kind === "pile") {
    const books: Laid[] = [];
    let y = 0;
    const widest = Math.max(...piece.books.map((item) => item.identity.height * scale));
    const layers = [...piece.books].reverse();
    const heights: number[] = [];
    for (const item of layers) heights.push(thickness(item) * scale);
    const stack = heights.reduce((sum, value) => sum + value, 0);
    let topperHeight = 0;
    let topperWidth = 0;
    if (piece.topper) {
      topperHeight = piece.topper.identity.height * scale * 0.82;
      topperWidth = coverWidth(piece.topper) * scale * 0.82;
    }
    const total = stack + topperHeight;
    y = topperHeight;
    layers.forEach((item, index) => {
      const t = heights[index];
      const length = item.identity.height * scale;
      const seed = hashString(`pile-${item.book.id}`);
      const offset = ((seed % 13) - 6) * scale + (widest - length) / 2;
      const up = item.identity.orientation === "up";
      books.push({
        id: item.book.id,
        role: "pile",
        pose: up
          ? { posture: "lie", x: offset + length, y, angle: 90, scale, ox: 0, oy: 0, turn: 0 }
          : { posture: "lie", x: offset, y: y + t, angle: -90, scale, ox: 0, oy: 0, turn: 0 },
        rect: { x: offset, y, w: length, h: t },
      });
      y += t;
    });
    if (piece.topper) {
      const s = scale * 0.82;
      const t = thickness(piece.topper);
      const left = (widest - topperWidth) / 2;
      books.unshift({
        id: piece.topper.book.id,
        role: "topper",
        pose: { posture: "face", x: left + topperWidth / 2 - (t * s) / 2, y: topperHeight, angle: 0, scale: s, ox: 0, oy: -piece.topper.identity.height, turn: -90 },
        rect: { x: left, y: 0, w: topperWidth, h: topperHeight },
      });
    }
    return { width: widest + 8 * scale, height: total, books, easels: [] };
  }
  const books: Laid[] = [];
  let x = 0;
  const standingHeight = Math.max(...piece.books.map((item) => item.identity.height * scale));
  const crown = piece.crown ?? [];
  const crownLayers = [...crown].sort((a, b) => b.identity.height - a.identity.height);
  const crownHeight = crownLayers.reduce((sum, item) => sum + thickness(item) * scale, 0);
  const height = standingHeight + crownHeight;
  piece.books.forEach((item, index) => {
    const leaning = piece.lean !== 0 && ((piece.lean === -1 && index === piece.books.length - 1 && index > 0) || (piece.lean === 1 && index === piece.books.length - 1));
    const t = thickness(item) * scale;
    const h = item.identity.height * scale;
    if (!leaning) {
      books.push(standPose(item, x, height, scale));
      x += t + 2;
      return;
    }
    const a = radians(piece.angle);
    const footprint = t * Math.cos(a) + h * Math.sin(a);
    const rise = h * Math.cos(a) + t * Math.sin(a);
    if (piece.lean === -1) {
      const pivot = x + h * Math.sin(a);
      books.push({
        id: item.book.id,
        role: "lean",
        pose: { posture: "lean", x: pivot, y: height, angle: -piece.angle, scale, ox: 0, oy: -item.identity.height, turn: 0 },
        rect: { x, y: height - rise, w: footprint, h: rise },
      });
    } else {
      const pivot = x + t * Math.cos(a) + 2;
      books.push({
        id: item.book.id,
        role: "lean",
        pose: { posture: "lean", x: pivot, y: height, angle: piece.angle, scale, ox: -thickness(item), oy: -item.identity.height, turn: 0 },
        rect: { x: x + 2, y: height - rise, w: footprint, h: rise },
      });
    }
    x += footprint + 4;
  });
  const runWidth = Math.max(0, x - 2);
  if (crownLayers.length > 0) {
    const standing = books.filter((book) => book.role === "run");
    const left = Math.min(...standing.map((book) => book.rect.x));
    const right = Math.max(...standing.map((book) => book.rect.x + book.rect.w));
    let y = height - standingHeight;
    for (const item of crownLayers) {
      const t = thickness(item) * scale;
      const length = item.identity.height * scale;
      const seed = hashString(`crown-${item.book.id}`);
      const offset = Math.max(left - 6, Math.min(right - length + 6, left + (right - left - length) / 2 + ((seed % 15) - 7) * scale));
      const up = item.identity.orientation === "up";
      y -= t;
      books.push({
        id: item.book.id,
        role: "pile",
        pose: up
          ? { posture: "lie", x: offset + length, y, angle: 90, scale, ox: 0, oy: 0, turn: 0 }
          : { posture: "lie", x: offset, y: y + t, angle: -90, scale, ox: 0, oy: 0, turn: 0 },
        rect: { x: offset, y, w: length, h: t },
      });
    }
  }
  return { width: Math.max(runWidth, ...books.map((book) => book.rect.x + book.rect.w)), height, books, easels: [] };
}

function shift(laid: Laid, dx: number, dy: number): Laid {
  return { ...laid, pose: { ...laid.pose, x: laid.pose.x + dx, y: laid.pose.y + dy }, rect: { ...laid.rect, x: laid.rect.x + dx, y: laid.rect.y + dy } };
}

type Support = { x: number; w: number; h: number };

type Bay = {
  key: string;
  group: string;
  label: string | null;
  count: number | null;
  width: number;
  height: number;
  books: Laid[];
  easels: { x: number; y: number; w: number }[];
  supports: Support[];
  shadows: { x: number; w: number }[];
};

function supportFor(piece: Piece, index: number, seed: number, metrics: Metrics): number {
  const pick = (values: number[]) => values[(seed + index * 3) % values.length];
  if (piece.kind === "face") return pick(metrics.heroSupports);
  if (piece.kind === "pile") return piece.topper ? pick(metrics.pileSupports) : 0;
  return pick(metrics.runSupports);
}

function buildBay(key: string, group: string, items: Book[], metrics: Metrics, label: string | null, count: number | null, seed: number, filler = false): Bay {
  const pieces = composeBay(items, seed, { narrow: metrics.narrow, crowns: metrics.settled, filler });
  const laid = pieces.map((piece) => lay(piece, metrics.scale));
  const lifts = pieces.map((piece, index) => supportFor(piece, index, seed, metrics));
  const height = Math.max(...laid.map((piece, index) => piece.height + lifts[index]));
  const books: Laid[] = [];
  const easels: { x: number; y: number; w: number }[] = [];
  const supports: Support[] = [];
  const shadows: { x: number; w: number }[] = [];
  const pad = metrics.narrow ? 6 : 10;
  let x = 0;
  laid.forEach((piece, index) => {
    const lift = lifts[index];
    const ground = height - lift;
    const dy = ground - piece.height;
    for (const book of piece.books) books.push(shift(book, x, dy));
    for (const easel of piece.easels) easels.push({ x: x + easel.x, y: ground, w: easel.w });
    if (lift > 0) supports.push({ x: x - pad, w: piece.width + pad * 2, h: lift });
    else shadows.push({ x: x - pad, w: piece.width + pad * 2 });
    const next = pieces[index + 1];
    const together = next?.kind === "run" && pieces[index].kind === "run" && lifts[index + 1] === lift;
    const nextLift = lifts[index + 1] ?? 0;
    const bothRaised = metrics.settled && lift > 0 && nextLift > 0;
    const spacing = together ? metrics.pieceGap * 0.6 : metrics.pieceGap + (lift !== nextLift ? pad * 2 : 0);
    x += piece.width + (index < laid.length - 1 ? (bothRaised ? Math.max(spacing, pad * 2 + 6) : spacing) : 0);
  });
  return { key, group, label, count, width: x, height, books, easels, supports, shadows };
}

function flowBays(
  groups: ShelfGroup[],
  identities: Map<number, SpineIdentity>,
  answerSet: Set<number>,
  metrics: Metrics,
  width: number,
): Bay[][] {
  const most = metrics.narrow ? 8 : 13;
  const least = metrics.narrow ? 3 : 4;
  const rows: Bay[][] = [];
  let line: Bay[] = [];
  let used = 0;
  for (const group of groups) {
    const items = group.books.filter((book) => !answerSet.has(book.id) && identities.has(book.id)).map((book) => ({ book, identity: identities.get(book.id) as SpineIdentity }));
    if (items.length === 0) continue;
    const seed = hashString(`group-${group.id}`);
    let rest = items;
    let part = 0;
    while (rest.length > 0) {
      const probe = (count: number) =>
        buildBay(`${group.id}-${part}`, group.label, rest.slice(0, count), metrics, part === 0 ? group.label : null, part === 0 ? items.length : null, seed + part * 7);
      const previous = line[line.length - 1];
      const gap = previous ? (previous.group === group.label ? metrics.bayGap : metrics.groupGap) : 0;
      const room = width - used - gap;
      const floorCount = Math.min(rest.length, least);
      let chosen: Bay | null = null;
      let taken = 0;
      for (let count = Math.min(rest.length, most); count >= floorCount; count -= 1) {
        const remainder = rest.length - count;
        if (remainder > 0 && remainder < least) continue;
        const candidate = probe(count);
        if (candidate.width <= room) {
          chosen = candidate;
          taken = count;
          break;
        }
      }
      if (!chosen && line.length > 0) {
        for (let count = Math.min(rest.length, 5); count >= 2; count -= 1) {
          const remainder = rest.length - count;
          if (remainder > 0 && remainder < least) continue;
          const candidate = buildBay(`${group.id}-${part}`, group.label, rest.slice(0, count), metrics, part === 0 ? group.label : null, part === 0 ? items.length : null, seed + part * 7, true);
          if (candidate.width <= room) {
            chosen = candidate;
            taken = count;
            break;
          }
        }
      }
      if (chosen && line.length > 0 && taken < floorCount) {
        line.push(chosen);
        used += gap + chosen.width;
        rest = rest.slice(taken);
        part += 1;
        rows.push(line);
        line = [];
        used = 0;
        continue;
      }
      if (!chosen && line.length > 0) {
        rows.push(line);
        line = [];
        used = 0;
        continue;
      }
      if (!chosen) {
        taken = rest.length - floorCount > 0 && rest.length - floorCount < least ? rest.length : floorCount;
        chosen = probe(taken);
      }
      line.push(chosen);
      used += gap + chosen.width;
      rest = rest.slice(taken);
      part += 1;
    }
  }
  if (line.length > 0) rows.push(line);
  return rows;
}

export function breakRows<T extends { width: number }>(items: T[], width: number, gap: number | ((before: T, after: T) => number)): T[][] {
  const between = typeof gap === "number" ? () => gap : gap;
  const n = items.length;
  const best = new Array<number>(n + 1).fill(0);
  const next = new Array<number>(n).fill(n);
  for (let start = n - 1; start >= 0; start -= 1) {
    best[start] = Number.POSITIVE_INFINITY;
    let used = 0;
    for (let end = start; end < n; end += 1) {
      used += items[end].width + (end > start ? between(items[end - 1], items[end]) : 0);
      if (used > width && end > start) break;
      const slack = Math.max(0, width - used);
      const cost = (end === n - 1 ? 0 : slack * slack) + best[end + 1];
      if (cost < best[start]) {
        best[start] = cost;
        next[start] = end + 1;
      }
    }
  }
  const rows: T[][] = [];
  for (let start = 0; start < n; start = next[start]) rows.push(items.slice(start, next[start]));
  return rows;
}

function stagePieces(answers: Book[], ranks: Map<number, number>, confidence: string, narrow: boolean, level: boolean): { pieces: Piece[]; plinths: number[] } {
  if (confidence === "low" || level) {
    return { pieces: answers.map((book) => ({ kind: "face", book, size: narrow ? 0.9 : 1, role: "answer" })), plinths: answers.map(() => (narrow ? 14 : 24)) };
  }
  const sorted = [...answers].sort((a, b) => (ranks.get(a.book.id) ?? 99) - (ranks.get(b.book.id) ?? 99));
  const faces = sorted.slice(0, 3);
  const others = sorted.slice(3);
  const sizes = narrow ? [1.18, 0.9, 0.82] : [1.5, 1.06, 0.94];
  const heights = narrow ? [64, 40, 24] : [128, 84, 48];
  const pieces: Piece[] = faces.map((book, index) => ({ kind: "face", book, size: sizes[index], role: "answer" }));
  const plinths = faces.map((_, index) => heights[index]);
  if (others.length > 0) {
    pieces.push({ kind: "run", books: others, lean: others.length >= 2 ? -1 : 0, angle: 9 });
    plinths.push(narrow ? 12 : 22);
  }
  return { pieces, plinths };
}

export function compose(input: CompositionInput): Composition {
  const { groups, identities, width } = input;
  const metrics = metricsFor(width, input.density ?? "airy");
  const answerSet = new Set(input.answers ?? []);
  const books = new Map<number, PlacedBook>();
  const plinths: Plinth[] = [];
  const easels: Easel[] = [];
  const shadows: Shadow[] = [];
  const labels: GroupLabel[] = [];
  const notes: NoteSpot[] = [];
  const noteText = new Map(groups.flatMap((group) => group.books).filter((book) => book.note).map((book) => [book.id, book.note as string]));
  const captions: Caption[] = [];
  const order: number[] = [];
  let quote: QuoteSpot | null = null;
  let cursor = 0;
  let row = 0;
  let bayIndex = 0;

  const place = (laid: Laid, dx: number, dy: number, rank: number | null) => {
    const moved = shift(laid, dx, dy);
    books.set(laid.id, { id: laid.id, pose: moved.pose, rect: moved.rect, bay: bayIndex, row, role: laid.role, order: order.length, rank });
    order.push(laid.id);
  };

  const answers = (input.answers ?? []).map((id) => ({ id, identity: identities.get(id) })).filter((item): item is { id: number; identity: SpineIdentity } => Boolean(item.identity));
  let stageHeight = 0;
  if (answers.length > 0) {
    const byId = new Map(groups.flatMap((group) => group.books).map((book) => [book.id, book]));
    const items = answers.map((item) => ({ book: byId.get(item.id) as ShelfBook, identity: item.identity })).filter((item) => Boolean(item.book));
    const ranks = input.ranks ?? new Map(items.map((item, index) => [item.book.id, index + 1]));
    const { pieces, plinths: heights } = stagePieces(items, ranks, input.confidence ?? "high", metrics.narrow, Boolean(input.level));
    const stageScale = metrics.narrow ? 0.82 : 1;
    const laid = pieces.map((piece) => lay(piece, stageScale));
    const gap = metrics.narrow ? 26 : 56;
    const captionHeight = metrics.narrow ? 112 : 128;
    const lines: { items: { piece: LaidPiece; plinth: number; source: Piece }[]; width: number }[] = [];
    laid.forEach((piece, index) => {
      const last = lines[lines.length - 1];
      const captionWidth = Math.max(piece.width, metrics.narrow ? 140 : 190);
      if (!last || last.width + gap + captionWidth > width) lines.push({ items: [{ piece, plinth: heights[index], source: pieces[index] }], width: captionWidth });
      else {
        last.items.push({ piece, plinth: heights[index], source: pieces[index] });
        last.width += gap + captionWidth;
      }
    });
    const captionFor = (piece: LaidPiece) => (piece.books.length > 1 ? Math.max(captionHeight, 16 + piece.books.length * (metrics.narrow ? 40 : 44)) : captionHeight);
    for (const line of lines) {
      const tallest = Math.max(...line.items.map((item) => item.piece.height + item.plinth));
      const lineCaption = Math.max(...line.items.map((item) => captionFor(item.piece)));
      const floor = cursor + tallest;
      let x = 0;
      for (const { piece, plinth, source } of line.items) {
        const slot = Math.max(piece.width, metrics.narrow ? 140 : 190);
        const left = x + (slot - piece.width) / 2;
        const top = floor - plinth - piece.height;
        const ids = piece.books.map((book) => book.id);
        const rank = Math.min(...ids.map((id) => ranks.get(id) ?? 99));
        for (const book of piece.books) place(book, left, top, ranks.get(book.id) ?? null);
        for (const easel of piece.easels) easels.push({ key: `stage-${ids[0]}`, x: left + easel.x, y: floor - plinth, w: easel.w });
        plinths.push({ key: `stage-${ids[0]}`, x: x, y: floor - plinth, w: slot, h: plinth + metrics.plinthBody, label: null, count: null, numeral: source.kind === "run" ? `${numeral(rank)}–${numeral(rank + ids.length - 1)}` : numeral(rank), stage: true });
        captions.push({ key: `caption-${ids[0]}`, ids, rank, x, y: floor + metrics.plinthBody + 12, w: slot, h: captionFor(piece) });
        x += slot + gap;
      }
      const room = width - x;
      if (!quote && room >= (metrics.narrow ? 9999 : 250) && line === lines[0]) {
        quote = { id: line.items[0].piece.books[0].id, x: x + 16, y: cursor + 10, w: Math.min(room - 16, 460), h: tallest - 20 };
      }
      cursor = floor + metrics.plinthBody + 12 + lineCaption + (metrics.narrow ? 18 : 26);
      row += 1;
    }
    bayIndex += 1;
    stageHeight = cursor;
    cursor += metrics.narrow ? 36 : 56;
  }

  const restLabel = answers.length > 0 ? cursor : null;
  if (restLabel !== null) cursor += metrics.narrow ? 30 : 40;

  const gapBetween = (before: Bay, after: Bay) => (before.group === after.group ? metrics.bayGap : metrics.groupGap);
  const fitToWidth = (bay: Bay) => {
    if (bay.width <= width) return bay;
    const factor = width / bay.width;
    return {
      ...bay,
      books: bay.books.map((book) => ({
        ...book,
        pose: { ...book.pose, x: book.pose.x * factor, y: bay.height - (bay.height - book.pose.y) * factor, scale: book.pose.scale * factor },
        rect: { x: book.rect.x * factor, y: bay.height - (bay.height - book.rect.y) * factor, w: book.rect.w * factor, h: book.rect.h * factor },
      })),
      easels: bay.easels.map((easel) => ({ ...easel, x: easel.x * factor, y: bay.height - (bay.height - easel.y) * factor, w: easel.w * factor })),
      supports: bay.supports.map((support) => ({ x: support.x * factor, w: support.w * factor, h: support.h * factor })),
      shadows: bay.shadows.map((shadow) => ({ x: shadow.x * factor, w: shadow.w * factor })),
      width,
    };
  };

  let rows: Bay[][];
  if (metrics.settled) {
    rows = flowBays(groups, identities, answerSet, metrics, width).map((line) => line.map(fitToWidth));
  } else {
    const bays: Bay[] = [];
    for (const group of groups) {
      const items = group.books.filter((book) => !answerSet.has(book.id) && identities.has(book.id)).map((book) => ({ book, identity: identities.get(book.id) as SpineIdentity }));
      if (items.length === 0) continue;
      const seed = hashString(`group-${group.id}`);
      const parts = splitEvenly(items, metrics.bayCapacity);
      parts.forEach((part, index) => {
        bays.push(fitToWidth(buildBay(`${group.id}-${index}`, group.label, part, metrics, index === 0 ? group.label : null, index === 0 ? items.length : null, seed + index * 7)));
      });
    }
    rows = breakRows(bays, width, gapBetween);
  }
  const step = 6;
  const columns = Math.ceil(width / step) + 2;
  const skyline = new Array<number>(columns).fill(cursor);
  const range = (left: number, right: number) => [Math.max(0, Math.floor(left / step)), Math.min(columns - 1, Math.ceil(right / step))];

  const noteFor = (laid: Laid, dx: number, top: number): NoteSpot | null => {
    const text = laid.role === "hero" ? noteText.get(laid.id) : undefined;
    if (!text) return null;
    return { id: laid.id, x: Math.min(width - 154, dx + laid.rect.x + laid.rect.w * 0.42), y: top + laid.rect.y + laid.rect.h + 2, w: 150 };
  };
  const lastLabelAt = new Map<string, number>();
  const noteDepth = (id: number) => 30 + Math.ceil((noteText.get(id)?.length ?? 0) / 21) * 19;

  rows.forEach((line, lineIndex) => {
    const last = lineIndex === rows.length - 1;
    const gaps = line.slice(1).map((bay, index) => gapBetween(line[index], bay));
    const used = line.reduce((sum, bay) => sum + bay.width, 0) + gaps.reduce((sum, value) => sum + value, 0);
    const spare = width - used;
    const cap = metrics.settled ? (metrics.narrow ? 40 : 72) : metrics.narrow ? 80 : 320;
    const extra = line.length > 1 && !last ? Math.min(cap, spare / (line.length - 1)) : 0;
    const tallest = Math.max(...line.map((bay) => bay.height));
    let x = 0;
    const topAt = (left: number, bay: Bay) => {
      const [from, to] = range(left - 12, left + bay.width + 12);
      return Math.max(...skyline.slice(from, to + 1));
    };
    line.forEach((bay, index) => {
      const opensGroup = index > 0 && line[index - 1].group !== bay.group;
      if (metrics.settled && opensGroup) {
        const remaining = line.slice(index + 1).reduce((sum, next, offset) => sum + next.width + gaps[index + offset], 0);
        const latest = Math.min(width - bay.width - remaining, x + (metrics.narrow ? 60 : 170));
        let best = x;
        let bestTop = topAt(x, bay);
        for (let candidate = x + 12; candidate <= latest; candidate += 12) {
          const candidateTop = topAt(candidate, bay);
          if (candidateTop < bestTop - 24) {
            best = candidate;
            bestTop = candidateTop;
          }
        }
        x = best;
      }
      const settledTop = topAt(x, bay);
      const floor = metrics.settled ? settledTop + bay.height : cursor + tallest;
      const top = floor - bay.height;
      for (const book of bay.books) {
        place(book, x, top, null);
        const note = noteFor(book, x, top);
        if (note) notes.push(note);
      }
      for (const easel of bay.easels) easels.push({ key: `${bay.key}-${easel.x.toFixed(0)}`, x: x + easel.x, y: top + easel.y, w: easel.w });
      bay.supports.forEach((support, supportIndex) =>
        plinths.push({ key: `${bay.key}-${supportIndex}`, x: x + support.x, y: floor - support.h, w: support.w, h: support.h + metrics.plinthBody, label: null, count: null, numeral: null, stage: false }),
      );
      bay.shadows.forEach((shadow, shadowIndex) => shadows.push({ key: `${bay.key}-${shadowIndex}`, x: x + shadow.x, y: floor, w: shadow.w }));
      const bayNotes = notes.filter((note) => bay.books.some((book) => book.id === note.id));
      const noteBottom = Math.max(0, ...bayNotes.map((note) => note.y + noteDepth(note.id)));
      const lastLabel = lastLabelAt.get(bay.group);
      const remind = !metrics.settled || lastLabel === undefined || floor - lastLabel > (metrics.narrow ? 640 : 520);
      const labelText = bay.label !== null && bay.count !== null ? bay.label : index === 0 && remind ? `${bay.group}, continued` : null;
      const labelWidth = labelText ? labelText.length * 11 + 70 : 0;
      const underNote = bayNotes.some((note) => note.x < x + labelWidth && note.x + note.w > x);
      let labelY = Math.max(floor + metrics.plinthBody + 10, underNote ? noteBottom + 6 : 0);
      let labelX = x;
      if (labelText && x + labelWidth > width) {
        labelX = Math.max(0, width - labelWidth);
        const [from, to] = range(labelX, x);
        labelY = Math.max(labelY, ...skyline.slice(from, to).map((column) => column - metrics.settleGap + 4));
      }
      if (labelText) {
        labels.push({ key: bay.key, label: labelText, count: bay.label !== null ? bay.count : null, x: labelX, y: labelY });
        lastLabelAt.set(bay.group, labelY);
      }
      const noteRight = Math.max(x + bay.width, ...bayNotes.map((note) => note.x + note.w));
      const labelled = labelText !== null || !metrics.settled;
      const bottom = Math.max(labelled ? labelY - 10 + metrics.labelRoom : floor + metrics.plinthBody, noteBottom);
      const [left, right] = range(Math.min(x, labelX) - 12, noteRight + 12);
      for (let column = left; column <= right; column += 1) skyline[column] = bottom + metrics.settleGap;
      x += bay.width + (index < line.length - 1 ? gaps[index] + extra : 0);
      bayIndex += 1;
    });
    if (!metrics.settled) cursor = cursor + tallest + metrics.plinthBody + metrics.labelRoom + metrics.rowGap;
    row += 1;
  });
  if (metrics.settled) cursor = Math.max(...skyline) + (metrics.narrow ? 16 : 24);

  return { width, height: Math.max(0, cursor), scale: metrics.scale, books, plinths, easels, shadows, labels, notes, captions, quote, restLabel, stageHeight, order };
}

export function nearestInDirection(composition: Composition, id: number, direction: "left" | "right" | "up" | "down"): number | null {
  const index = composition.order.indexOf(id);
  if (index === -1) return composition.order[0] ?? null;
  if (direction === "left") return composition.order[index - 1] ?? null;
  if (direction === "right") return composition.order[index + 1] ?? null;
  const current = composition.books.get(id);
  if (!current) return null;
  const center = current.rect.x + current.rect.w / 2;
  const targetRow = current.row + (direction === "down" ? 1 : -1);
  let best: number | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const book of composition.books.values()) {
    if (book.row !== targetRow) continue;
    const gap = Math.abs(book.rect.x + book.rect.w / 2 - center);
    if (gap < distance) {
      distance = gap;
      best = book.id;
    }
  }
  return best;
}
