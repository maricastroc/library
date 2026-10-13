import { SPINE_MAX_HEIGHT, type SpineIdentity } from "./identity";
import type { ShelfGroup } from "./arrange";

export type LayoutMetrics = {
  scale: number;
  gap: number;
  headroom: number;
  shelfHeight: number;
  board: number;
  hang: number;
  hangEmpty: number;
  dividerWidth: number;
  talkerWidth: number;
  captionWidth: number;
  slotGap: number;
};

export type SpineState = "normal" | "match" | "dim";

export type PlacedSpine = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  state: SpineState;
  rank: number | null;
};

export type PlacedDivider = { key: string; label: string; count: number; x: number; y: number; w: number; h: number };
export type PlacedTalker = { id: number; x: number; y: number; w: number; tilt: number; anchor: number };
export type PlacedCaption = { id: number; x: number; y: number; w: number; h: number; rank: number };
export type PlacedBoard = { key: string; x: number; y: number; w: number };
export type PlacedLabel = { key: "answer" | "rest"; y: number };

export type ShelfLayout = {
  width: number;
  height: number;
  metrics: LayoutMetrics;
  spines: Map<number, PlacedSpine>;
  dividers: PlacedDivider[];
  talkers: PlacedTalker[];
  captions: PlacedCaption[];
  boards: PlacedBoard[];
  labels: PlacedLabel[];
  order: number[];
};

export function metricsFor(width: number): LayoutMetrics {
  const compact = width < 560;
  const medium = width < 960;
  const scale = compact ? 0.84 : medium ? 0.94 : 1;
  const shelfHeight = Math.round(SPINE_MAX_HEIGHT * scale);
  return {
    scale,
    gap: compact ? 1.5 : 2,
    headroom: 30,
    shelfHeight,
    board: 3,
    hang: compact ? 124 : 118,
    hangEmpty: compact ? 46 : 58,
    dividerWidth: compact ? 18 : 22,
    talkerWidth: compact ? 170 : 160,
    captionWidth: compact ? Math.max(180, width - 74) : medium ? 220 : 232,
    slotGap: compact ? 18 : 34,
  };
}

export type LayoutInput = {
  groups: ShelfGroup[];
  identities: Map<number, SpineIdentity>;
  noted: Set<number>;
  width: number;
  matches?: number[];
  ranks?: Map<number, number>;
  showDividers?: boolean;
};

const TILTS = [-2.2, 1.4, -0.8, 2.4, -1.6, 0.9];
const MIN_TOUCH_WIDTH = 24;

export function layoutShelf(input: LayoutInput): ShelfLayout {
  const { groups, identities, noted, width } = input;
  const metrics = metricsFor(width);
  const matches = (input.matches ?? []).filter((id) => identities.has(id));
  const searching = matches.length > 0;
  const matchSet = new Set(matches);

  const spines = new Map<number, PlacedSpine>();
  const dividers: PlacedDivider[] = [];
  const talkers: PlacedTalker[] = [];
  const captions: PlacedCaption[] = [];
  const boards: PlacedBoard[] = [];
  const labels: PlacedLabel[] = [];
  const order: number[] = [];

  let cursorY = 0;
  let row = 0;
  const rowBody = metrics.headroom + metrics.shelfHeight;

  if (searching) {
    labels.push({ key: "answer", y: cursorY });
    cursorY += 18;
    let x = 0;
    let rowStartX = 0;
    let rowEndX = 0;
    const flushBoard = () => {
      boards.push({ key: `r${row}`, x: rowStartX, y: cursorY + rowBody, w: Math.max(0, rowEndX - rowStartX) });
    };
    matches.forEach((id, index) => {
      const identity = identities.get(id);
      if (!identity) return;
      const w = Math.max(MIN_TOUCH_WIDTH, identity.width * metrics.scale);
      const h = identity.height * metrics.scale;
      const slot = w + 14 + metrics.captionWidth;
      if (x > 0 && x + slot > width + 0.5) {
        flushBoard();
        cursorY += rowBody + metrics.board + 8;
        row += 1;
        x = 0;
        rowStartX = 0;
        rowEndX = 0;
      }
      const rank = input.ranks?.get(id) ?? index + 1;
      spines.set(id, { id, x, y: cursorY + metrics.headroom + (metrics.shelfHeight - h), w, h, row, state: "match", rank });
      captions.push({
        id,
        x: x + w + 14,
        y: cursorY + metrics.headroom,
        w: Math.min(metrics.captionWidth, width - (x + w + 14)),
        h: metrics.shelfHeight,
        rank,
      });
      order.push(id);
      rowEndX = Math.min(width, x + slot);
      x += slot + metrics.slotGap;
    });
    flushBoard();
    cursorY += rowBody + metrics.board + 64;
    row += 1;
    labels.push({ key: "rest", y: cursorY });
    cursorY += 14;
  }

  let x = 0;
  let rowUsed = false;
  let rowHasTalker = false;
  let lastTalkerRight = -Infinity;
  let talkerCount = 0;

  const newRow = () => {
    boards.push({ key: `m${row}`, x: 0, y: cursorY + rowBody, w: width });
    cursorY += rowBody + metrics.board + (searching ? 30 : rowHasTalker ? metrics.hang : metrics.hangEmpty);
    row += 1;
    x = 0;
    rowUsed = false;
    rowHasTalker = false;
    lastTalkerRight = -Infinity;
  };

  for (const group of groups) {
    const books = group.books.filter((book) => !matchSet.has(book.id) && identities.has(book.id));
    if (books.length === 0) continue;

    if (input.showDividers !== false && !searching) {
      const firstWidth = Math.max(MIN_TOUCH_WIDTH, (identities.get(books[0].id)?.width ?? 30) * metrics.scale);
      if (x > 0 && x + metrics.dividerWidth + metrics.gap + firstWidth > width + 0.5) newRow();
      dividers.push({
        key: group.id,
        label: group.label,
        count: books.length,
        x,
        y: cursorY + metrics.headroom - 14,
        w: metrics.dividerWidth,
        h: metrics.shelfHeight + 14,
      });
      x += metrics.dividerWidth + metrics.gap;
      rowUsed = true;
    }

    for (const book of books) {
      const identity = identities.get(book.id);
      if (!identity) continue;
      const w = Math.max(MIN_TOUCH_WIDTH, identity.width * metrics.scale);
      const h = identity.height * metrics.scale;
      if (x > 0 && x + w > width + 0.5) newRow();
      spines.set(book.id, {
        id: book.id,
        x,
        y: cursorY + metrics.headroom + (metrics.shelfHeight - h),
        w,
        h,
        row,
        state: searching ? "dim" : "normal",
        rank: null,
      });
      order.push(book.id);
      if (!searching && noted.has(book.id)) {
        const talkerX = Math.min(width - metrics.talkerWidth, Math.max(0, x + w / 2 - metrics.talkerWidth / 2));
        if (talkerX >= lastTalkerRight + 12) {
          talkers.push({
            id: book.id,
            x: talkerX,
            y: cursorY + rowBody + metrics.board,
            w: metrics.talkerWidth,
            tilt: TILTS[talkerCount % TILTS.length],
            anchor: x + w / 2 - talkerX,
          });
          lastTalkerRight = talkerX + metrics.talkerWidth;
          talkerCount += 1;
          rowHasTalker = true;
        }
      }
      x += w + metrics.gap;
      rowUsed = true;
    }
  }
  if (rowUsed) newRow();

  return { width, height: Math.max(0, cursorY), metrics, spines, dividers, talkers, captions, boards, labels, order };
}

export function neighborInDirection(
  layout: ShelfLayout,
  currentId: number,
  direction: "left" | "right" | "up" | "down",
): number | null {
  const index = layout.order.indexOf(currentId);
  if (index === -1) return layout.order[0] ?? null;
  if (direction === "left") return layout.order[index - 1] ?? null;
  if (direction === "right") return layout.order[index + 1] ?? null;
  const current = layout.spines.get(currentId);
  if (!current) return null;
  const targetRow = current.row + (direction === "down" ? 1 : -1);
  const center = current.x + current.w / 2;
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const spine of layout.spines.values()) {
    if (spine.row !== targetRow) continue;
    const distance = Math.abs(spine.x + spine.w / 2 - center);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = spine.id;
    }
  }
  return best;
}
