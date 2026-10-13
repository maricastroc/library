# Decisions and open items

## Conventions

- **Everything in English.** Files, routes, components, functions, internal values (statuses, taxonomy ids, sort keys), CSS classes and theme tokens are in English, and so are the interface texts, the prompts sent to the model, the catalog data (synopses, genres, notes) and the evaluation queries. The display label of each internal id lives in `src/lib/semantic/taxonomy.ts`.
- **Books carry the title of their English-language edition.** When a book was never published in English, it keeps its original title. The shop sells Brazilian editions, so ISBN, publisher and cover still belong to the Portuguese-language edition, and the cover shows the Portuguese title; `data/seed/catalog.json` keeps that title in `editionTitle`, which is also what the catalog fetch searches for.
- **Stored values were translated too.** On opening, `src/lib/db/migrations.ts` converts an earlier database to the current vocabulary: version 2 translates statuses and taxonomy ids, version 3 translates genres and synopsis sources and rebuilds the text index.

## Architecture

- **Next.js 16 (App Router) + SQLite (`better-sqlite3`)**. The catalog is read in Server Components; writes go through Server Actions and `/api/admin/*` routes. No paid services.
- **SQLite in `TRUNCATE` journal mode, not WAL.** In WAL, command-line scripts closing their connection deleted the `-wal` file while the development server still held it open; the server's writes ended up in an orphaned file. With a plain journal, every transaction ends in the main file.
- **Vectors in BLOBs and brute-force search in memory.** With 200 books (≈2,100 vectors of 768 dimensions, between books and synopsis sentences) the comparison takes milliseconds; a vector index would only add a dependency. The in-memory index is invalidated by a revision counter stored in the database.
- **Server modules are never imported by client components.** Shared constants live in pure modules (`import-types.ts`, `palettes.ts`, `taxonomy.ts`).

## AI

- **Embeddings: `embeddinggemma` (768d). Classification: `gemma4:e4b`.** Both local, through Ollama.
- **The language model works outside the query path.** It reads each synopsis once and stores atmosphere, pace, density, style, experience, themes and a reading portrait. Search uses only embeddings and rules, and answers in tens of milliseconds.
- **Classifier output without `format`/schema.** Measured on this machine: schema-constrained JSON generates ~7 tokens/s and does not scale in parallel; free text with four simultaneous requests reaches ~25 tokens/s. Validation is done in code.
- **Verified evidence.** The classifier must quote passages from the synopsis; each passage is located literally in the text (ignoring accents and case) and discarded if it does not exist. The confidence shown depends on the length of the synopsis and on how many passages survived.
- **A synopsis shorter than 140 characters is not classified.** The book stays in kraft paper and can only be found by keywords.
- **Search**: the query is split into a request and a restriction ("but without being…", "that isn't…", "nothing too…"); the request becomes a vector and is compared with each book's synopsis vector and reading vector; the final order adds requested attributes, penalizes avoided attributes and takes length, pace, genre and matching words into account. "For those who liked X" uses the centroid of the books by X that are in the catalog and excludes those books themselves.
- **When not to answer.** Below a similarity floor the shelf shows nothing; in an intermediate band it shows at most three books and warns that the match is weak. A reference to an author or book missing from the catalog is stated as such, without inventing a resemblance. The thresholds were calibrated with `data/eval/queries.json`.
- **If Ollama goes down**, the search route returns keyword results and says so in the interface.

## Data

- **Google Books was left out**: the anonymous daily quota was exhausted (HTTP 429) and there is no key configured.
- **Open Library** provides ISBN, publisher, pages, year and cover. Only Portuguese-language editions from regular publishers are accepted; print-on-demand reprints are discarded and the field stays empty. The year is the earliest among the records of the same work.
- **Portuguese Wikipedia (CC BY-SA 4.0)** provides the synopsis: the introduction plus the plot section, with attribution and a link on each book. The article is only accepted if it is about the work: the page title or the first sentence must carry the book's title, and author pages are refused. A first version without this rule stored biographies as synopses for about 40 books; they were fetched again and reclassified.
- **Synopses were translated into English** after the fetch; mentions of books that are in the catalog use their English titles, other works are named as in the source. The translation is a derivative of the Wikipedia text and stays under the same licence; the link on each book points to the original article.
- **Covers are neither downloaded nor redistributed**; the book page points to the Open Library image.
- **Price and stock in the initial catalog are demo values** and are marked as such. Once edited at the counter or imported by CSV, they count as real.
- **Bookseller's notes**: the 21 notes in the initial catalog were written for the demo and appear as "sample note". Real notes come from the counter or from the CSV. The AI never fills in this field.
- **CSV import** recognises the headers of `public/catalog-template.csv` and common English variants ("name", "description", "qty"). Headers in other languages are not mapped; a file without recognisable title and author columns is refused with a message listing the headers found.

## Interface

- **Spines positioned by `transform`, with a stable DOM order.** Reordering changes only coordinates, so nothing remounts and focus is not lost. The transition is CSS on the compositor; spines outside the visible area swap places without animating.
- **The shelf is a single Tab stop** (roving tabindex); arrow keys follow the visual order. Since the DOM order does not follow the visual order, there is the **Index** mode, a semantic list in the chosen order.
- **Spine rules** (`src/lib/shelf/identity.ts`): color = predominant atmosphere, slightly mixed with the second; thickness = pages; height = density and form; bands = pace; typeface = genre. The text color is chosen to keep a contrast of at least 4.5:1, checked in a test for every combination.
- **Open book**: a native modal `<dialog>`. A 3D volume (spine and cover) leaves the measured position of the spine, turns and lands; the cover opens on its hinge. Motion drives the choreography through `MotionValue`. With `prefers-reduced-motion`, or when the source spine is not visible, the transition is a fade.
- **State in the URL**: `?q=`, `?sort=` and `?book=`; the browser's back button closes the book.

## Counter

- A single password in `ADMIN_PASSWORD`; session in an `httpOnly` cookie signed with HMAC, 12 hours. `src/proxy.ts` guards `/admin/*` and `/api/admin/*`, and every Server Action and route checks the session again.
- CSV import in two steps: analysis with a preview, then writing in one transaction.

## Open items

- The evaluation uses a local model as the relevance judge. Human judgment of the same lists is still missing.
- 58 of the 326 titles researched had no usable article on Portuguese Wikipedia (or only had the author's page, which is refused). In the 200-book catalog, 163 have the ISBN of a Portuguese-language edition and 178 have a cover.
- No per-user authentication, no payment, no e-mail sending: a reservation only records the request for the bookshop to answer.
- Rule-based query interpretation covers the most common English negations; unusual constructions pass through as free text. Queries written in Portuguese are no longer interpreted.
- Rate limiting is in memory, per process.
- There are no automated browser tests; the flows were checked by hand.
