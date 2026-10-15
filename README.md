# Subtext

A collection on display for independent bookshops. The visitor describes what they want to feel ("something melancholic, but comforting") and the collection answers: the closest books leave their niches and stand on a staircase of pedestals, each with the reasons the engine found, and any book can be opened as its dust jacket, laid flat. The AI is open and runs on this computer, through Ollama.

## Running

Requirements: Node 22+, [Ollama](https://ollama.com) with the `embeddinggemma` and `gemma4:e4b` models.

```bash
ollama pull embeddinggemma && ollama pull gemma4:e4b
npm install
cp .env.example .env.local
npm run db:seed -- --complete --notes
npm run ai:enrich
npm run dev
```

Edit `.env.local` before starting: `ADMIN_PASSWORD` (8+ characters) and `SESSION_SECRET` (24+ characters) protect the counter at `/admin`.

The initial catalog is already in `data/seed/catalog.json`. To fetch it again from Open Library and Wikipedia: `npm run catalog:fetch` (`-- --covers` only refreshes the cover images; `-- --new` only fetches titles added to `data/seed/titles.ts`, keeping the entries already there). Synopses come from Portuguese Wikipedia, and the ones in the repository were translated into English afterwards; titles marked `wikipediaLanguage: "en"` in `data/seed/titles.ts` take theirs from English Wikipedia, as written.

## Commands

| command | what it does |
| --- | --- |
| `npm run dev` | application in development |
| `npm run build && npm start` | production build |
| `npm test` | automated tests |
| `npm run lint` · `npm run typecheck` | static checks |
| `npm run db:seed` | loads the initial catalog (`--complete` includes books without a synopsis; `--notes` applies the sample notes; `--refresh-meta` updates bibliographic data; `--refresh-titles` and `--refresh-synopsis` update titles and synopses; `--add=slug,slug` inserts those entries of the seed catalog) |
| `npm run ai:enrich` | embeddings and classification of pending books (`--all` redoes everything; `--retry` redoes the ones that failed) |
| `npm run ai:eval -- --judge` | compares keyword search and semantic search; writes `data/eval/REPORT.md` and `data/eval/results.json` |

## Where everything lives

| path | responsibility |
| --- | --- |
| `src/lib/catalog` | books, ISBN, CSV import |
| `src/lib/semantic` | taxonomy, Ollama client, classification, embeddings, enrichment queue |
| `src/lib/search` | query interpretation, lexical search, semantic search, explanations |
| `src/lib/shelf` | visual rules for the bindings, sorting and the composition of the collection |
| `src/lib/shop`, `src/lib/showcase`, `src/lib/interest`, `src/lib/auth` | bookshop settings, showcases, reservations, counter session |
| `src/lib/db` | SQLite connection, schema and migrations |
| `src/components/shelf`, `src/components/book`, `src/components/showcase` | public experience: the collection on display, the dust jacket, showcases |
| `src/components/admin`, `src/app/admin` | the bookshop's counter |
| `scripts` | catalog fetch, seeding, enrichment, evaluation |

Everything is in English: the code (files, routes, functions, internal values, CSS classes), the interface, the model prompts and the catalog data. Books carry the title of their English-language edition when one exists and a translated title otherwise, except titles that are proper names; author names and publishers stay as printed on the Brazilian editions the shop sells.

Architecture decisions and open items: [DECISIONS.md](DECISIONS.md).
