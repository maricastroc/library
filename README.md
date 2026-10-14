# Subtext

A digital shelf for independent bookshops. The visitor describes what they want to feel ("something melancholic, but comforting") and the shelf rearranges its spines, explains why each book was suggested and opens the chosen book. The AI is open and runs on this computer, through Ollama.

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

The initial catalog is already in `data/seed/catalog.json`. To fetch it again from Open Library and Wikipedia: `npm run catalog:fetch` (`-- --covers` only refreshes the cover images). The fetch brings synopses in Portuguese; the ones in the repository were translated into English afterwards.

## Commands

| command | what it does |
| --- | --- |
| `npm run dev` | application in development |
| `npm run build && npm start` | production build |
| `npm test` | automated tests |
| `npm run lint` · `npm run typecheck` | static checks |
| `npm run db:seed` | loads the initial catalog (`--complete` includes books without a synopsis; `--notes` applies the sample notes; `--refresh-meta` updates bibliographic data; `--refresh-titles` and `--refresh-synopsis` update titles and synopses) |
| `npm run ai:enrich` | embeddings and classification of pending books (`--all` redoes everything; `--retry` redoes the ones that failed) |
| `npm run ai:eval -- --judge` | compares keyword search and semantic search; writes `data/eval/REPORT.md` and `data/eval/results.json` |

## Where everything lives

| path | responsibility |
| --- | --- |
| `src/lib/catalog` | books, ISBN, CSV import |
| `src/lib/semantic` | taxonomy, Ollama client, classification, embeddings, enrichment queue |
| `src/lib/search` | query interpretation, lexical search, semantic search, explanations |
| `src/lib/shelf` | visual rules for the spines, sorting and shelf layout |
| `src/lib/shop`, `src/lib/showcase`, `src/lib/interest`, `src/lib/auth` | bookshop settings, showcases, reservations, counter session |
| `src/lib/db` | SQLite connection, schema and migrations |
| `src/components/shelf`, `src/components/book`, `src/components/showcase` | public experience: shelf, open book, showcase |
| `src/components/admin`, `src/app/admin` | the bookshop's counter |
| `scripts` | catalog fetch, seeding, enrichment, evaluation |

Everything is in English: the code (files, routes, functions, internal values, CSS classes), the interface, the model prompts and the catalog data. Books carry the title of their English-language edition when one exists; author names and publishers stay as printed on the Brazilian editions the shop sells.

Architecture decisions and open items: [DECISIONS.md](DECISIONS.md).
