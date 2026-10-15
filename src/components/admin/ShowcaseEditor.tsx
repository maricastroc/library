"use client";

import { useActionState, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { saveShowcase } from "@/app/admin/actions";
import { StillLife } from "@/components/shelf/StillLife";
import { normalizeText } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { Showcase, ShowcaseItem } from "@/lib/showcase";
import { changesBetween, draftOf, moveItem, reasonKey, sharedReasons, type ShowcaseDraft, type SuggestionReason } from "@/lib/showcase/curation";
import { SHOWCASE_PALETTES, type ShowcasePalette } from "@/lib/showcase/palettes";
import { KRAFT, spineIdentity, type SpineIdentity } from "@/lib/shelf/identity";
import { Stamp } from "./Counter";
import { FormFeedback, INITIAL_FORM_STATE } from "./FormParts";
import { RailedTextarea } from "./RailedTextarea";
import { useLeaveGuard } from "./useLeaveGuard";

type Suggestion = { id: number; title: string; author: string; matches?: SuggestionReason[]; reasons: string[]; quote?: string | null; caveat?: string | null };
type Drag = { bookId: number; from: number; to: number; startY: number; dy: number; moved: boolean; middles: number[]; height: number };
type Suggestions =
  | { status: "idle" }
  | { status: "loading"; idea: string }
  | { status: "done"; idea: string; list: Suggestion[]; message: string | null }
  | { status: "error"; idea: string; message: string; hint?: boolean };

const PREVIEW_BOOKS = 12;
const FIRST_SUGGESTIONS = 5;
const SEARCH_RESULTS = 6;

const focusSoon = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());

function Spine({ book, identity }: { book: ShelfBook; identity: SpineIdentity | undefined }) {
  const height = identity ? Math.round(14 + (identity.height - 160) / 4.5) : 22;
  return <span aria-hidden className="cur-spine" style={{ background: book.semanticStatus === "ready" ? identity?.color : KRAFT, height }} />;
}

export function ShowcaseEditor({ showcase, books, shopName }: { showcase: Showcase | null; books: ShelfBook[]; shopName: string }) {
  const [state, dispatch, pending] = useActionState(saveShowcase, INITIAL_FORM_STATE);
  const [draft, setDraft] = useState<ShowcaseDraft>(() => draftOf(showcase));
  const [saved, setSaved] = useState<ShowcaseDraft>(() => draftOf(showcase));
  const [submitted, setSubmitted] = useState<ShowcaseDraft | null>(null);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok && submitted) setSaved(submitted);
  }

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions>({ status: "idle" });
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<{ bookId: number; before: string } | null>(null);
  const [removed, setRemoved] = useState<{ item: ShowcaseItem; index: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [drag, setDrag] = useState<Drag | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );

  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const identities = useMemo(() => new Map(books.map((book) => [book.id, spineIdentity(book)])), [books]);
  const { title, intro, palette, published, items } = draft;
  const chosen = useMemo(() => new Set(items.map((item) => item.bookId)), [items]);
  const selection = useMemo(() => items.map((item) => byId.get(item.bookId)).filter((book): book is ShelfBook => Boolean(book)), [items, byId]);
  const found = useMemo(() => {
    const folded = normalizeText(query);
    if (folded.length < 2) return [];
    return books.filter((book) => normalizeText(`${book.title} ${book.author}`).includes(folded)).slice(0, SEARCH_RESULTS);
  }, [books, query]);

  const changes = changesBetween(draft, saved);
  const dirty = changes.length > 0;
  useLeaveGuard(dirty, "Leave this showcase? The changes you haven’t saved will be lost.");

  const update = (patch: Partial<ShowcaseDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const setItems = (next: (current: ShowcaseItem[]) => ShowcaseItem[]) => setDraft((current) => ({ ...current, items: next(current.items) }));
  const titleOf = (bookId: number) => byId.get(bookId)?.title ?? "the book";

  const add = (bookId: number, focus: string) => {
    if (chosen.has(bookId)) return;
    setItems((current) => [...current, { bookId, caption: null }]);
    setRemoved(null);
    setAnnouncement(`${titleOf(bookId)} added, at position ${items.length + 1}.`);
    focusSoon(focus);
  };
  const remove = (bookId: number) => {
    const index = items.findIndex((item) => item.bookId === bookId);
    if (index < 0) return;
    setRemoved({ item: items[index], index });
    setItems((current) => current.filter((item) => item.bookId !== bookId));
    if (editing?.bookId === bookId) setEditing(null);
    setAnnouncement(`${titleOf(bookId)} taken off the showcase. Undo is available.`);
    focusSoon("undo-removal");
  };
  const undo = () => {
    if (!removed) return;
    setItems((current) => {
      const next = [...current];
      next.splice(Math.min(removed.index, next.length), 0, removed.item);
      return next;
    });
    setAnnouncement(`${titleOf(removed.item.bookId)} is back, at position ${removed.index + 1}.`);
    focusSoon(`grip-${removed.item.bookId}`);
    setRemoved(null);
  };
  const place = (from: number, to: number, focus: string) => {
    if (from === to || to < 0 || to >= items.length) return;
    const bookId = items[from].bookId;
    setItems((current) => moveItem(current, from, to));
    setAnnouncement(`${titleOf(bookId)} moved to position ${to + 1} of ${items.length}.`);
    focusSoon(focus);
  };
  const caption = (bookId: number, value: string) => setItems((current) => current.map((item) => (item.bookId === bookId ? { ...item, caption: value } : item)));
  const closeCaption = (restore: boolean) => {
    if (!editing) return;
    if (restore) caption(editing.bookId, editing.before);
    focusSoon(`caption-action-${editing.bookId}`);
    setEditing(null);
  };

  const onGripKey = (event: KeyboardEvent<HTMLButtonElement>, index: number, bookId: number) => {
    const target = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
    if (target === null) return;
    event.preventDefault();
    place(index, Math.max(0, Math.min(items.length - 1, target)), `grip-${bookId}`);
  };
  const moveBy = (index: number, delta: number, bookId: number) => {
    const target = index + delta;
    const edge = target === 0 || target === items.length - 1;
    place(index, target, `${edge ? (delta < 0 ? "down" : "up") : delta < 0 ? "up" : "down"}-${bookId}`);
  };
  const startDrag = (event: PointerEvent<HTMLButtonElement>, index: number, bookId: number) => {
    if (event.button !== 0 || items.length < 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const boxes = [...(listRef.current?.querySelectorAll<HTMLElement>(".cur-item") ?? [])].map((row) => row.getBoundingClientRect());
    dragRef.current = {
      bookId,
      from: index,
      to: index,
      startY: event.clientY + window.scrollY,
      dy: 0,
      moved: false,
      middles: boxes.map((box) => box.top + window.scrollY + box.height / 2),
      height: boxes[index]?.height ?? 0,
    };
    setDrag(dragRef.current);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const y = event.clientY + window.scrollY;
    const dy = y - drag.startY;
    if (!drag.moved && Math.abs(dy) < 5) return;
    const to = drag.middles.filter((middle, index) => index !== drag.from && middle < y).length;
    if (event.clientY < 56) window.scrollBy(0, -14);
    else if (event.clientY > window.innerHeight - 56) window.scrollBy(0, 14);
    dragRef.current = { ...drag, to, dy, moved: true };
    setDrag(dragRef.current);
  };
  const endDrag = (commit: boolean) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (commit && drag.moved) place(drag.from, drag.to, `grip-${drag.bookId}`);
    setDrag(null);
  };

  const idea = `${title} ${intro}`.replace(/\s+/g, " ").trim();
  const suggest = async () => {
    if (idea.length < 3) {
      setSuggestions({ status: "error", idea, message: "Give the showcase a title or an introduction first: the suggestions start from the idea.", hint: true });
      return;
    }
    setSuggestions({ status: "loading", idea });
    setShowAll(false);
    try {
      const response = await fetch(`/api/admin/compare?n=12&q=${encodeURIComponent(idea.slice(0, 240))}`);
      const data = (await response.json()) as { semantic?: { results: Suggestion[]; message: string | null } | null; error?: string };
      if (!response.ok || !data.semantic) {
        setSuggestions({ status: "error", idea, message: data.error ?? "The semantic search did not answer." });
        return;
      }
      setSuggestions({ status: "done", idea, list: data.semantic.results, message: data.semantic.message });
    } catch {
      setSuggestions({ status: "error", idea, message: "No connection while asking for suggestions." });
    }
  };

  const suggestionList = useMemo(() => (suggestions.status === "done" ? suggestions.list : []), [suggestions]);
  const { keys: shared, labels: sharedLabels } = useMemo(() => sharedReasons(suggestionList.map((item) => item.matches ?? [])), [suggestionList]);
  const visibleSuggestions = showAll ? suggestionList : suggestionList.slice(0, FIRST_SUGGESTIONS);
  const stale = suggestions.status === "done" && suggestions.idea !== idea;

  const submit = (data: FormData) => {
    setSubmitted(draft);
    setRemoved(null);
    dispatch(data);
  };

  const colors = SHOWCASE_PALETTES[palette];
  const sharePath = showcase ? `/showcase/${showcase.slug}` : null;
  const shareUrl = sharePath ? `${origin}${sharePath}` : null;
  const saveLabel = showcase ? "Save the showcase" : "Create the showcase";

  return (
    <form action={submit} className="cur" noValidate>
      {showcase ? <input type="hidden" name="id" value={showcase.id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="palette" value={palette} />
      <input type="hidden" name="published" value={published ? "1" : "0"} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="cur-main">
        <section className="cur-idea" aria-label="The idea">
          <label htmlFor="title" className="eyebrow counter-field-label">
            The idea
          </label>
          <input
            id="title"
            name="title"
            className="field cur-title"
            value={title}
            onChange={(event) => update({ title: event.target.value })}
            maxLength={90}
            required
            placeholder="Books for rainy days"
            aria-invalid={state.fields?.title ? true : undefined}
            aria-describedby={state.fields?.title ? "title-error" : undefined}
          />
          {state.fields?.title ? (
            <p id="title-error" className="counter-field-error">
              {state.fields.title}
            </p>
          ) : null}
          <label htmlFor="intro" className="sr-only">
            Introduction
          </label>
          <RailedTextarea
            id="intro"
            name="intro"
            className="field cur-intro"
            rows={3}
            maxLength={900}
            value={intro}
            onChange={(event) => update({ intro: event.target.value })}
            placeholder="A few sentences, in your own words, on what brings these books together."
          />
          {dirty ? (
            <p className="cur-quicksave">
              <Stamp tone="vermilion">unsaved · {changes.join(", ")}</Stamp>
              <button type="submit" className="button-quiet" disabled={pending}>
                {pending ? "Saving…" : saveLabel}
              </button>
            </p>
          ) : null}
        </section>

        <section className="cur-selection" aria-labelledby="selection-heading">
          <div className="cur-head">
            <h2 id="selection-heading" className="counter-section-title">
              The selection<span className="counter-count">{items.length}</span>
            </h2>
            <p className="eyebrow cur-head-aside">{items.length > 1 ? "in the order they stand · drag to reorder" : "in the order they stand"}</p>
          </div>

          {removed ? (
            <p className="slip slip-enter cur-undo">
              Took “{titleOf(removed.item.bookId)}” off the table.{" "}
              <button id="undo-removal" type="button" className="button-quiet" onClick={undo}>
                Undo
              </button>
            </p>
          ) : null}

          {items.length === 0 ? (
            <div className="blank cur-blank">
              <p className="blank-line">No books on the table yet.</p>
              <p className="blank-hint">Find them by title or author just below, or ask the collection for books close to the idea.</p>
            </div>
          ) : (
            <ol ref={listRef} className="cur-list" data-sorting={drag?.moved ? "" : undefined}>
              {items.map((item, index) => {
                const book = byId.get(item.bookId);
                if (!book) return null;
                const text = (item.caption ?? "").trim();
                const shownNote = book.note && book.noteOrigin === "bookseller" ? book.note : null;
                const sampleNote = book.note && book.noteOrigin === "example" ? book.note : null;
                const lifted = drag?.moved && drag.bookId === item.bookId;
                const shift = !drag?.moved || lifted ? 0 : drag.from < drag.to && index > drag.from && index <= drag.to ? -drag.height : drag.to < drag.from && index >= drag.to && index < drag.from ? drag.height : 0;
                return (
                  <li
                    key={item.bookId}
                    className="cur-item"
                    data-dragging={lifted ? "" : undefined}
                    style={lifted ? { translate: `0 ${drag!.dy}px` } : shift ? { translate: `0 ${shift}px` } : undefined}
                  >
                    <button
                      id={`grip-${item.bookId}`}
                      type="button"
                      className="cur-grip"
                      aria-label={`Position ${index + 1} of ${items.length}: ${book.title}. Press the up or down arrow to move it.`}
                      onKeyDown={(event) => onGripKey(event, index, item.bookId)}
                      onPointerDown={(event) => startDrag(event, index, item.bookId)}
                      onPointerMove={moveDrag}
                      onPointerUp={() => endDrag(true)}
                      onPointerCancel={() => endDrag(false)}
                      onLostPointerCapture={() => endDrag(true)}
                    >
                      <span className="cur-number">{String(index + 1).padStart(2, "0")}</span>
                      <span aria-hidden className="cur-grip-dots" />
                    </button>
                    <Spine book={book} identity={identities.get(book.id)} />
                    <div className="cur-text">
                      <p className="cur-book">
                        <span className="cur-book-title">{book.title}</span>
                        <span className="cur-book-author">{book.author}</span>
                      </p>
                      {editing?.bookId === item.bookId ? (
                        <span className="cur-caption-edit">
                          <label htmlFor={`caption-${item.bookId}`} className="sr-only">
                            Caption for {book.title}
                          </label>
                          <input
                            id={`caption-${item.bookId}`}
                            className="handwriting cur-caption-field"
                            value={item.caption ?? ""}
                            maxLength={280}
                            autoFocus
                            onChange={(event) => caption(item.bookId, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === "Escape") {
                                event.preventDefault();
                                closeCaption(event.key === "Escape");
                              }
                            }}
                            onBlur={() => setEditing(null)}
                            placeholder="Why is this book on the table?"
                            aria-describedby={`caption-hint-${item.bookId}`}
                          />
                          <span id={`caption-hint-${item.bookId}`} className="cur-caption-hint">
                            Enter keeps it · Esc undoes
                          </span>
                        </span>
                      ) : (
                        <p className="cur-caption">
                          {text ? (
                            <span className="handwriting cur-caption-text">{text}</span>
                          ) : shownNote ? (
                            <span className="cur-caption-fallback">
                              uses your note: <span className="handwriting">{shownNote}</span>
                            </span>
                          ) : sampleNote ? (
                            <span className="cur-caption-fallback">uses the sample note</span>
                          ) : null}
                          <button
                            id={`caption-action-${item.bookId}`}
                            type="button"
                            className="cur-caption-action"
                            onClick={() => setEditing({ bookId: item.bookId, before: item.caption ?? "" })}
                            aria-label={`${text ? "Edit the caption" : "Write a caption"} for ${book.title}`}
                          >
                            {text ? "edit" : "write a caption"}
                          </button>
                        </p>
                      )}
                    </div>
                    <span className="cur-tools">
                      <button id={`up-${item.bookId}`} type="button" className="cur-tool" disabled={index === 0} onClick={() => moveBy(index, -1, item.bookId)} aria-label={`Move ${book.title} up`}>
                        ↑
                      </button>
                      <button id={`down-${item.bookId}`} type="button" className="cur-tool" disabled={index === items.length - 1} onClick={() => moveBy(index, 1, item.bookId)} aria-label={`Move ${book.title} down`}>
                        ↓
                      </button>
                      <button type="button" className="cur-tool" data-tone="danger" onClick={() => remove(item.bookId)} aria-label={`Take ${book.title} off the showcase`}>
                        ×
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="cur-add" role="group" aria-labelledby="add-heading">
            <div className="cur-add-row">
              <h3 id="add-heading" className="eyebrow cur-add-title">
                Add books
              </h3>
              <label htmlFor="book-search" className="sr-only">
                Find a book by title or author
              </label>
              <input
                id="book-search"
                type="search"
                className="field cur-search"
                placeholder="by title or author"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  const first = found.find((book) => !chosen.has(book.id));
                  if (first) add(first.id, "book-search");
                }}
                autoComplete="off"
              />
              <button type="button" className="button-quiet cur-suggest" onClick={() => void suggest()} disabled={suggestions.status === "loading"}>
                {suggestions.status === "loading" ? "Reading the shelves…" : suggestions.status === "done" ? "Suggest again from the idea" : "Suggest from the idea"}
              </button>
            </div>

            {query.trim().length >= 2 ? (
              <ul className="cur-results" aria-label="Books found in the catalogue">
                {found.length === 0 ? <li className="cur-none">No book by that title or author.</li> : null}
                {found.map((book) => (
                  <li key={book.id} className="cur-result" data-chosen={chosen.has(book.id) ? "" : undefined}>
                    <Spine book={book} identity={identities.get(book.id)} />
                    <span className="cur-result-text">
                      <span className="cur-book-title">{book.title}</span>
                      <span className="cur-book-author">{book.author}</span>
                    </span>
                    {chosen.has(book.id) ? (
                      <Stamp tone="faint">in the showcase</Stamp>
                    ) : (
                      <button type="button" className="cur-add-button" onClick={() => add(book.id, "book-search")} aria-label={`Add ${book.title}`}>
                        + add
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}

            {suggestions.status !== "idle" ? (
              <div className="cur-suggestions" aria-busy={suggestions.status === "loading"}>
                <div className="cur-suggestions-head">
                  <p className="eyebrow">Suggested from the idea</p>
                  <p aria-live="polite" className="cur-suggestions-count">
                    {suggestions.status === "done" && suggestionList.length > 0 ? `${suggestionList.length} ${suggestionList.length === 1 ? "book" : "books"}` : ""}
                  </p>
                  <button type="button" className="cur-caption-action" onClick={() => setSuggestions({ status: "idle" })}>
                    hide
                  </button>
                </div>
                {suggestions.status === "loading" ? (
                  <p role="status" className="cur-waiting">
                    Reading the shelves for “{suggestions.idea.length > 80 ? `${suggestions.idea.slice(0, 80)}…` : suggestions.idea}”
                  </p>
                ) : null}
                {suggestions.status === "error" ? (
                  <p role={suggestions.hint ? "status" : "alert"} className="slip" data-tone={suggestions.hint ? undefined : "error"}>
                    {suggestions.message}{" "}
                    {idea.length >= 3 && !suggestions.hint ? (
                      <button type="button" className="button-quiet" onClick={() => void suggest()}>
                        Try again
                      </button>
                    ) : null}
                  </p>
                ) : null}
                {suggestions.status === "done" ? (
                  <>
                    {stale ? (
                      <p className="cur-stale">
                        The idea has changed since.{" "}
                        <button type="button" className="cur-caption-action" onClick={() => void suggest()}>
                          suggest again
                        </button>
                      </p>
                    ) : null}
                    {suggestions.message ? <p className="slip">{suggestions.message}</p> : null}
                    {suggestionList.length === 0 && !suggestions.message ? <p className="cur-none">The collection found no books close to this idea. A more concrete introduction may help.</p> : null}
                    {sharedLabels.length > 0 ? (
                      <p className="cur-shared">
                        <span className="eyebrow">most of them</span> {sharedLabels.join(" · ")}
                      </p>
                    ) : null}
                    <ul className="cur-results">
                      {visibleSuggestions.map((suggestion) => {
                        const book = byId.get(suggestion.id);
                        const own = (suggestion.matches ?? []).filter((match) => match.kind !== "note" && !shared.has(reasonKey(match))).map((match) => match.label);
                        return (
                          <li key={suggestion.id} id={`suggestion-${suggestion.id}`} tabIndex={-1} className="cur-result" data-chosen={chosen.has(suggestion.id) ? "" : undefined}>
                            {book ? <Spine book={book} identity={identities.get(book.id)} /> : <span className="cur-spine" />}
                            <span className="cur-result-text">
                              <span className="cur-book-title">{suggestion.title}</span>
                              <span className="cur-book-author">{suggestion.author}</span>
                              {own.length > 0 ? <span className="cur-result-why">{own.slice(0, 2).join(" · ")}</span> : null}
                              {suggestion.quote ? <q className="cur-result-quote">{suggestion.quote}</q> : null}
                              {suggestion.caveat ? <span className="cur-result-caveat">{suggestion.caveat}</span> : null}
                            </span>
                            {chosen.has(suggestion.id) ? (
                              <Stamp tone="faint">in the showcase</Stamp>
                            ) : (
                              <button type="button" className="cur-add-button" onClick={() => add(suggestion.id, `suggestion-${suggestion.id}`)} aria-label={`Add ${suggestion.title}`}>
                                + add
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {suggestionList.length > FIRST_SUGGESTIONS ? (
                      <button type="button" className="cur-caption-action cur-more" onClick={() => setShowAll((current) => !current)}>
                        {showAll ? "show fewer" : `show ${suggestionList.length - FIRST_SUGGESTIONS} more`}
                      </button>
                    ) : null}
                    {suggestionList.length > 0 ? (
                      <p className="counter-field-hint">
                        Found by meaning, from the title and the introduction. They are only suggestions: the reasons come from each book’s reading{suggestionList.some((item) => item.quote) ? ", and the quoted lines are the parts of the synopsis closest to the idea" : ""}.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <aside className="cur-side" aria-label="How the showcase looks and who sees it">
        <p className="eyebrow cur-side-title">{published ? "On the home page" : "On the home page, once on display"}</p>
        <div className="cur-preview" style={{ background: colors.background, color: colors.ink }}>
          <span className="eyebrow" style={{ color: colors.accent }}>
            showcase · {selection.length} {selection.length === 1 ? "book" : "books"}
          </span>
          <span className="cur-preview-title">{title || "Title of the showcase"}</span>
          {intro ? <span className="cur-preview-intro">{intro}</span> : null}
          <span className="cur-preview-books">
            {selection.length > 0 ? (
              <StillLife books={selection.slice(0, PREVIEW_BOOKS)} identities={identities} width={260} shopName={shopName} />
            ) : (
              <span className="cur-preview-empty">the books stand here</span>
            )}
          </span>
        </div>

        <dl className="cur-controls">
          <div className="cur-control">
            <dt>
              <span className="eyebrow">Colour</span>
              <span className="cur-swatch-name">{SHOWCASE_PALETTES[palette].label}</span>
            </dt>
            <dd className="cur-palettes">
              {(Object.entries(SHOWCASE_PALETTES) as [ShowcasePalette, (typeof SHOWCASE_PALETTES)[ShowcasePalette]][]).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={palette === key}
                  aria-label={value.label}
                  title={value.label}
                  onClick={() => update({ palette: key })}
                  className="cur-swatch"
                  style={{ background: value.background, color: value.accent }}
                >
                  <span aria-hidden />
                </button>
              ))}
            </dd>
          </div>
          <div className="cur-control">
            <dt className="eyebrow">Display</dt>
            <dd>
              <label className="cur-publish">
                <input type="checkbox" role="switch" aria-label="On display" aria-describedby="publish-hint" checked={published} onChange={(event) => update({ published: event.target.checked })} />
                <span aria-hidden className="cur-switch" />
                <span>
                  <span aria-hidden className="cur-publish-label">{published ? "On display" : "Draft"}</span>
                  <span id="publish-hint" className="cur-publish-hint">
                    {published ? "On the home page, and the link works for anyone." : "Only you can open it."}
                    {published !== saved.published ? " Takes effect when you save." : ""}
                  </span>
                </span>
              </label>
            </dd>
          </div>
          <div className="cur-control">
            <dt className="eyebrow">Link</dt>
            <dd>
              {showcase && sharePath ? (
                <>
                  <p className="cur-url" title={shareUrl ?? undefined}>
                    {sharePath}
                  </p>
                  <p className="cur-link-actions">
                    <button
                      type="button"
                      className="button-quiet"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareUrl ?? sharePath);
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 2200);
                        } catch {
                          setCopied(false);
                        }
                      }}
                    >
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                    <a className="button-quiet" href={sharePath} target="_blank" rel="noreferrer">
                      Open ↗
                    </a>
                    {!saved.published ? <span className="cur-link-note">works for others once on display</span> : null}
                  </p>
                </>
              ) : (
                <p className="cur-link-note">The link appears after the first save.</p>
              )}
            </dd>
          </div>
        </dl>

        <div className="cur-save" data-dirty={dirty ? "" : undefined}>
          <button type="submit" className="button" disabled={pending}>
            {pending ? "Saving…" : saveLabel}
          </button>
          {dirty ? <Stamp tone="vermilion">unsaved · {changes.join(", ")}</Stamp> : state.message || !showcase ? null : <Stamp tone="faint">all saved</Stamp>}
          <FormFeedback state={state} />
          <p className="cur-save-note">Saved changes reach the shop at once; the display switch decides who can see them.</p>
        </div>
      </aside>
    </form>
  );
}
