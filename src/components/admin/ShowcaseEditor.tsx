"use client";

import { useActionState, useMemo, useState } from "react";
import { saveShowcase } from "@/app/admin/actions";
import { normalizeText } from "@/lib/catalog/text";
import type { Showcase, ShowcaseItem } from "@/lib/showcase";
import { SHOWCASE_PALETTES, type ShowcasePalette } from "@/lib/showcase/palettes";
import { Field, SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";

export type PickerBook = { id: number; title: string; author: string; color: string; note: string | null };
type Suggestion = { id: number; title: string; author: string; reasons: string[] };

export function ShowcaseEditor({ showcase, books }: { showcase: Showcase | null; books: PickerBook[] }) {
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

  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const chosen = useMemo(() => new Set(items.map((item) => item.bookId)), [items]);
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
      setSuggestions({ status: "error", list: [], message: "Write the showcase’s title or idea so the shelf can suggest books." });
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
        message: data.semantic.results.length === 0 ? (data.semantic.message ?? "The shelf found no books close to this idea.") : data.semantic.message,
      });
    } catch {
      setSuggestions({ status: "error", list: [], message: "Connection failed while asking for suggestions." });
    }
  };

  const shareUrl = showcase && typeof window !== "undefined" ? `${window.location.origin}/showcase/${showcase.slug}` : null;

  return (
    <form action={action} className="space-y-10">
      {showcase ? <input type="hidden" name="id" value={showcase.id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="palette" value={palette} />
      <input type="hidden" name="published" value={published ? "1" : "0"} />

      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Field label="Showcase title" name="title" error={state.fields?.title}>
            <input
              id="title"
              name="title"
              className="field display-italic text-[1.6rem]"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={90}
              required
              placeholder="Books for rainy days"
            />
          </Field>
          <Field label="Introduction, in your own words" name="intro" hint="A short paragraph about the idea that brings these books together.">
            <textarea id="intro" name="intro" className="field leading-relaxed" rows={4} maxLength={900} value={intro} onChange={(event) => setIntro(event.target.value)} />
          </Field>
        </div>
        <div className="space-y-5">
          <fieldset>
            <legend className="eyebrow text-ink-soft">Showcase color</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.entries(SHOWCASE_PALETTES) as [ShowcasePalette, (typeof SHOWCASE_PALETTES)[ShowcasePalette]][]).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={palette === key}
                  onClick={() => setPalette(key)}
                  className={`flex h-16 w-20 flex-col justify-end p-1.5 text-left outline-offset-2 ${palette === key ? "outline outline-2 outline-vermilion" : "outline outline-1 outline-ink/30"}`}
                  style={{ background: value.background, color: value.ink }}
                >
                  <span className="eyebrow text-[9px]">{value.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
            <span>
              <span className="font-label font-semibold">Publish</span>
              <span className="block text-[0.9rem] text-ink-soft">Once published, the showcase appears on the home page and the link can be shared.</span>
            </span>
          </label>
          {showcase && shareUrl ? (
            <div className="border border-ink/30 bg-paper-light p-3">
              <p className="eyebrow text-ink-soft">{showcase.published ? "link to share" : "link (visible only to you while it’s a draft)"}</p>
              <p className="mt-1 break-all font-mono text-[0.82rem]">{shareUrl}</p>
              <div className="mt-2 flex gap-4">
                <button
                  type="button"
                  className="eyebrow ink-link"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2200);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  {copied ? "copied" : "copy link"}
                </button>
                <a className="eyebrow ink-link" href={`/showcase/${showcase.slug}`} target="_blank" rel="noreferrer">
                  open showcase
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section aria-labelledby="selected-books-heading">
        <h2 id="selected-books-heading" className="eyebrow border-b border-ink pb-2 text-ink">
          Books in the showcase · {items.length}
        </h2>
        {items.length === 0 ? (
          <p className="py-6 text-ink-soft">No books yet. Search by title below or ask the shelf for suggestions.</p>
        ) : (
          <ol className="divide-y divide-ink/15">
            {items.map((item, index) => {
              const book = byId.get(item.bookId);
              if (!book) return null;
              return (
                <li key={item.bookId} className="grid grid-cols-[auto_1fr_auto] items-start gap-x-4 gap-y-2 py-3">
                  <span aria-hidden className="mt-1 h-12 w-3" style={{ background: book.color }} />
                  <div className="min-w-0">
                    <p className="display text-[1.15rem] leading-tight">{book.title}</p>
                    <p className="text-[0.9rem] italic text-ink-soft">{book.author}</p>
                    <label htmlFor={`caption-${item.bookId}`} className="sr-only">
                      Caption for {book.title}
                    </label>
                    <input
                      id={`caption-${item.bookId}`}
                      className="field handwriting mt-1 text-[1.25rem]"
                      value={item.caption ?? ""}
                      maxLength={280}
                      onChange={(event) => caption(item.bookId, event.target.value)}
                      placeholder={book.note ? "No caption: uses your note for the book" : "Why is this book here? (optional)"}
                    />
                  </div>
                  <div className="eyebrow flex items-center gap-1">
                    <button type="button" className="border border-ink/40 px-2 py-1.5 hover:border-ink disabled:opacity-30" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${book.title} up`}>
                      ↑
                    </button>
                    <button type="button" className="border border-ink/40 px-2 py-1.5 hover:border-ink disabled:opacity-30" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${book.title} down`}>
                      ↓
                    </button>
                    <button type="button" className="border border-ink/40 px-2 py-1.5 text-vermilion hover:border-vermilion" onClick={() => remove(item.bookId)} aria-label={`Remove ${book.title} from the showcase`}>
                      remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="add-books-heading" className="grid gap-10 lg:grid-cols-2">
        <h2 id="add-books-heading" className="sr-only">
          Add books
        </h2>
        <div>
          <label htmlFor="book-search" className="eyebrow text-ink-soft">
            Search the catalog by title or author
          </label>
          <input id="book-search" className="field" value={filter} onChange={(event) => setFilter(event.target.value)} autoComplete="off" />
          <ul className="mt-2 divide-y divide-ink/15" aria-live="polite">
            {filtered.map((book) => (
              <li key={book.id} className="flex items-center justify-between gap-4 py-2">
                <span className="min-w-0">
                  <span className="font-label font-semibold">{book.title}</span>
                  <span className="block text-[0.88rem] italic text-ink-soft">{book.author}</span>
                </span>
                <button type="button" className="eyebrow ink-link shrink-0" onClick={() => add(book.id)}>
                  + add
                </button>
              </li>
            ))}
            {filter.trim().length >= 2 && filtered.length === 0 ? <li className="py-2 text-ink-soft">No book by that name outside the showcase.</li> : null}
          </ul>
        </div>
        <div>
          <p className="eyebrow text-ink-soft">Suggestions from the shelf</p>
          <p className="mt-1 text-[0.92rem] text-ink-soft">
            Semantic search looks for books close to the title and the introduction. It only suggests: the choice is yours.
          </p>
          <button type="button" className="button button-outline mt-3" onClick={() => void suggest()} disabled={suggestions.status === "loading"}>
            {suggestions.status === "loading" ? "Searching…" : "Ask for suggestions"}
          </button>
          <div aria-live="polite">
            {suggestions.message ? <p className="mt-3 border-l-2 border-vermilion pl-3 text-[0.92rem]">{suggestions.message}</p> : null}
            <ul className="mt-2 divide-y divide-ink/15">
              {suggestions.list.map((book) => (
                <li key={book.id} className="flex items-start justify-between gap-4 py-2">
                  <span className="min-w-0">
                    <span className="font-label font-semibold">{book.title}</span>
                    <span className="block text-[0.88rem] italic text-ink-soft">{book.author}</span>
                    <span className="block text-[0.82rem] text-ink-soft">{book.reasons.slice(0, 2).join(" · ")}</span>
                  </span>
                  {chosen.has(book.id) ? (
                    <span className="eyebrow shrink-0 text-ink-soft">in the showcase</span>
                  ) : (
                    <button type="button" className="eyebrow ink-link shrink-0" onClick={() => add(book.id)}>
                      + add
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink pt-5">
        <SubmitButton>{showcase ? "Save showcase" : "Create showcase"}</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
