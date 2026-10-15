"use client";

import { useActionState, useMemo, useState, useSyncExternalStore } from "react";
import { saveShowcase } from "@/app/admin/actions";
import { StillLife } from "@/components/shelf/StillLife";
import { normalizeText } from "@/lib/catalog/text";
import type { ShelfBook } from "@/lib/catalog/types";
import type { Showcase, ShowcaseItem } from "@/lib/showcase";
import { SHOWCASE_PALETTES, type ShowcasePalette } from "@/lib/showcase/palettes";
import { KRAFT, spineIdentity } from "@/lib/shelf/identity";
import { Field, SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";
import { RailedTextarea } from "./RailedTextarea";

type Suggestion = { id: number; title: string; author: string; reasons: string[] };

export function ShowcaseEditor({ showcase, books, shopName }: { showcase: Showcase | null; books: ShelfBook[]; shopName: string }) {
  const [state, action] = useActionState(saveShowcase, INITIAL_FORM_STATE);
  const [title, setTitle] = useState(showcase?.title ?? "");
  const [intro, setIntro] = useState(showcase?.intro ?? "");
  const [palette, setPalette] = useState<ShowcasePalette>(showcase?.palette ?? "ink");
  const [published, setPublished] = useState(showcase?.published ?? false);
  const [items, setItems] = useState<ShowcaseItem[]>(showcase?.items ?? []);
  const [filter, setFilter] = useState("");
  const [suggestions, setSuggestions] = useState<{ status: "idle" | "loading" | "done" | "error"; list: Suggestion[]; message: string | null }>({
    status: "idle",
    list: [],
    message: null,
  });
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );

  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const identities = useMemo(() => new Map(books.map((book) => [book.id, spineIdentity(book)])), [books]);
  const chosen = useMemo(() => new Set(items.map((item) => item.bookId)), [items]);
  const selection = useMemo(() => items.map((item) => byId.get(item.bookId)).filter((book): book is ShelfBook => Boolean(book)), [items, byId]);
  const filtered = useMemo(() => {
    const folded = normalizeText(filter);
    if (folded.length < 2) return [];
    return books.filter((book) => !chosen.has(book.id) && normalizeText(`${book.title} ${book.author}`).includes(folded)).slice(0, 8);
  }, [books, chosen, filter]);

  const add = (bookId: number) => setItems((current) => (current.some((item) => item.bookId === bookId) ? current : [...current, { bookId, caption: null }]));
  const remove = (bookId: number) => setItems((current) => current.filter((item) => item.bookId !== bookId));
  const move = (index: number, delta: number) =>
    setItems((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const caption = (bookId: number, value: string) =>
    setItems((current) => current.map((item) => (item.bookId === bookId ? { ...item, caption: value } : item)));

  const suggest = async () => {
    const idea = `${title} ${intro}`.trim();
    if (idea.length < 3) {
      setSuggestions({ status: "error", list: [], message: "Write the showcase’s title or idea so the collection can suggest books." });
      return;
    }
    setSuggestions({ status: "loading", list: [], message: null });
    try {
      const response = await fetch(`/api/admin/compare?n=12&q=${encodeURIComponent(idea.slice(0, 240))}`);
      const data = (await response.json()) as { semantic?: { results: Suggestion[]; message: string | null } | null; error?: string };
      if (!response.ok || !data.semantic) {
        setSuggestions({ status: "error", list: [], message: data.error ?? "Semantic search didn’t respond." });
        return;
      }
      setSuggestions({
        status: "done",
        list: data.semantic.results,
        message: data.semantic.results.length === 0 ? (data.semantic.message ?? "The collection found no books close to this idea.") : data.semantic.message,
      });
    } catch {
      setSuggestions({ status: "error", list: [], message: "Connection failed while asking for suggestions." });
    }
  };

  const colors = SHOWCASE_PALETTES[palette];
  const sharePath = showcase ? `/showcase/${showcase.slug}` : null;
  const shareUrl = sharePath ? `${origin}${sharePath}` : null;

  return (
    <form action={action} className="arrange">
      {showcase ? <input type="hidden" name="id" value={showcase.id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="palette" value={palette} />
      <input type="hidden" name="published" value={published ? "1" : "0"} />

      <div className="arrange-main">
        <div className="arrange-words">
          <Field label="Title of the showcase" name="title" error={state.fields?.title}>
            <input
              id="title"
              name="title"
              className="field arrange-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={90}
              required
              placeholder="Books for rainy days"
            />
          </Field>
          <Field label="Introduction, in your own words" name="intro" hint="A short paragraph about the idea that brings these books together.">
            <RailedTextarea id="intro" name="intro" className="field leading-relaxed" rows={4} maxLength={900} value={intro} onChange={(event) => setIntro(event.target.value)} />
          </Field>
        </div>

        <section aria-labelledby="selected-books-heading" className="arrange-section">
          <div className="counter-section-head">
            <h2 id="selected-books-heading" className="counter-section-title">
              The selection<span className="counter-count">{items.length}</span>
            </h2>
            <p className="eyebrow counter-section-aside">in the order they stand</p>
          </div>
          {items.length === 0 ? (
            <div className="blank">
              <p className="blank-line">No books on the table yet.</p>
              <p className="blank-hint">Search the catalogue by title below, or ask the collection for books close to the idea.</p>
            </div>
          ) : (
            <ol className="arrange-list">
              {items.map((item, index) => {
                const book = byId.get(item.bookId);
                if (!book) return null;
                const identity = identities.get(book.id);
                return (
                  <li key={item.bookId} className="arrange-item slip-enter">
                    <span className="arrange-number">{String(index + 1).padStart(2, "0")}</span>
                    <span aria-hidden className="arrange-spine" style={{ background: book.semanticStatus === "ready" ? identity?.color : KRAFT }} />
                    <div className="min-w-0">
                      <p className="arrange-book">{book.title}</p>
                      <p className="arrange-author">{book.author}</p>
                      <label htmlFor={`caption-${item.bookId}`} className="sr-only">
                        Caption for {book.title}
                      </label>
                      <input
                        id={`caption-${item.bookId}`}
                        className="handwriting arrange-caption"
                        value={item.caption ?? ""}
                        maxLength={280}
                        onChange={(event) => caption(item.bookId, event.target.value)}
                        placeholder={book.note ? "no caption: your note for the book is used" : "why is this book here? (optional)"}
                      />
                    </div>
                    <div className="arrange-tools">
                      <button type="button" className="arrange-tool" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${book.title} up`}>
                        ↑
                      </button>
                      <button type="button" className="arrange-tool" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${book.title} down`}>
                        ↓
                      </button>
                      <button type="button" className="arrange-tool" data-tone="danger" onClick={() => remove(item.bookId)} aria-label={`Remove ${book.title} from the showcase`}>
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="add-books-heading" className="arrange-section">
          <div className="counter-section-head">
            <h2 id="add-books-heading" className="counter-section-title">
              Bring books to the table
            </h2>
          </div>
          <div className="arrange-sources">
            <div>
              <label htmlFor="book-search" className="eyebrow counter-field-label">
                From the catalogue, by title or author
              </label>
              <input id="book-search" type="search" className="field" value={filter} onChange={(event) => setFilter(event.target.value)} autoComplete="off" />
              <ul className="arrange-found" aria-live="polite">
                {filtered.map((book) => (
                  <li key={book.id}>
                    <span className="min-w-0">
                      <span className="arrange-found-title">{book.title}</span>
                      <span className="arrange-found-author">{book.author}</span>
                    </span>
                    <button type="button" className="button-quiet" onClick={() => add(book.id)}>
                      + add
                    </button>
                  </li>
                ))}
                {filter.trim().length >= 2 && filtered.length === 0 ? <li className="arrange-found-none">No book by that name outside the showcase.</li> : null}
              </ul>
            </div>
            <div>
              <p className="eyebrow counter-field-label">Ask the collection</p>
              <p className="counter-field-hint">The semantic search looks for books close to the title and the introduction. It only suggests; the choice is yours.</p>
              <button type="button" className="button button-outline mt-3" onClick={() => void suggest()} disabled={suggestions.status === "loading"}>
                {suggestions.status === "loading" ? "Looking through the shelves…" : "Suggest books for this idea"}
              </button>
              <div aria-live="polite">
                {suggestions.message ? (
                  <p className="slip mt-3" data-tone={suggestions.status === "error" ? "error" : undefined}>
                    {suggestions.message}
                  </p>
                ) : null}
                <ul className="arrange-found">
                  {suggestions.list.map((book) => (
                    <li key={book.id}>
                      <span className="min-w-0">
                        <span className="arrange-found-title">{book.title}</span>
                        <span className="arrange-found-author">{book.author}</span>
                        {book.reasons.length > 0 ? <span className="arrange-found-reason">{book.reasons.slice(0, 2).join(" · ")}</span> : null}
                      </span>
                      {chosen.has(book.id) ? (
                        <span className="stamp">on the table</span>
                      ) : (
                        <button type="button" className="button-quiet" onClick={() => add(book.id)}>
                          + add
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="save-bar">
          <SubmitButton>{showcase ? "Save the showcase" : "Create the showcase"}</SubmitButton>
          <FormFeedback state={state} />
        </div>
      </div>

      <aside className="arrange-side" aria-label="How the showcase looks">
        <p className="eyebrow arrange-side-title">{published ? "On the home page" : "On the home page, once on display"}</p>
        <div className="arrange-preview" style={{ background: colors.background, color: colors.ink }}>
          <span className="eyebrow" style={{ color: colors.accent }}>
            showcase · {selection.length} {selection.length === 1 ? "book" : "books"}
          </span>
          <span className="arrange-preview-title">{title || "Title of the showcase"}</span>
          {intro ? <span className="arrange-preview-intro">{intro}</span> : null}
          <span className="arrange-preview-books">
            {selection.length > 0 ? <StillLife books={selection} identities={identities} width={250} shopName={shopName} /> : <span className="arrange-preview-empty">the books stand here</span>}
          </span>
        </div>

        <fieldset className="arrange-palettes">
          <legend className="eyebrow counter-field-label">Colour</legend>
          <div>
            {(Object.entries(SHOWCASE_PALETTES) as [ShowcasePalette, (typeof SHOWCASE_PALETTES)[ShowcasePalette]][]).map(([key, value]) => (
              <button
                key={key}
                type="button"
                aria-pressed={palette === key}
                aria-label={value.label}
                title={value.label}
                onClick={() => setPalette(key)}
                className="arrange-swatch"
                style={{ background: value.background, color: value.accent }}
              >
                <span aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>

        <label className="arrange-publish">
          <input type="checkbox" role="switch" aria-label="On display" aria-describedby="publish-hint" checked={published} onChange={(event) => setPublished(event.target.checked)} />
          <span aria-hidden className="arrange-switch" />
          <span>
            <span aria-hidden className="arrange-publish-label">{published ? "On display" : "Draft"}</span>
            <span id="publish-hint" className="arrange-publish-hint">{published ? "Appears on the home page and the link works for anyone." : "Only you can see it until you put it on display."}</span>
          </span>
        </label>

        {showcase && sharePath ? (
          <div className="arrange-link">
            <p className="eyebrow">{showcase.published ? "link to share" : "link, for when it is on display"}</p>
            <p className="arrange-url">{shareUrl}</p>
            <p className="flex flex-wrap gap-x-4">
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
                {copied ? "Copied ✓" : "Copy the link"}
              </button>
              <a className="button-quiet" href={sharePath} target="_blank" rel="noreferrer">
                Open it ↗
              </a>
            </p>
          </div>
        ) : null}
      </aside>
    </form>
  );
}
