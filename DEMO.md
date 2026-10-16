# A four-minute tour

A script for recording or presenting Subtext. Each step says what to do and what to say; the times are cumulative.

## Before you start

1. `ollama serve` in a terminal, then `npm run dev` in another.
2. Sign in to the counter at `/admin/login` in the same browser, so the switch from the shop to the counter is instant.
3. `npm run demand:sample` if the Demand room is empty (it fills it with sample requests run through the real shelf, marked as samples).
4. Run the three searches below once before recording: the first answer of each warms the embedding cache.
5. Close other tabs, set the window to about 1440 × 900, and hide the bookmarks bar.

## 0:00 · The problem

Open `/`, at the top of the page.

> An independent bookshop sells by conversation: “I want something sad, but not too sad.” Online, its catalogue is a list you search by title. The reader who doesn’t know the title leaves, and the bookshop never learns what they wanted.

## 0:20 · Ask the shelf

Type **something melancholic, but comforting** and press Enter.

> The collection reads the request, not the words. The closest books step out of their niches and the margin says how it read me: a melancholic and comforting atmosphere. It took a fraction of a second, on this computer.

Point at the colours of the spines: each binding comes from the book’s reading (atmosphere, pace, density), so the shelf itself shows what each book feels like.

## 0:50 · Open a book

Click the first book.

> Each book opens as its dust jacket, laid flat. On one flap, how it reads; on the other, why this book, with a sentence quoted from its synopsis. Nothing here is invented: the reasons are what the catalogue holds. And the reader can reserve a copy, or ask to be told when it’s back.

Fold the jacket back (Esc).

## 1:15 · It says when nothing fits

Search **vegetarian recipes**.

> When the collection has no good answer, it says so instead of inventing one.

## 1:30 · The counter

Open `/admin`.

> This is the bookshop’s side. The day book opens with real numbers: how much of the catalogue the local AI has read and what needs the bookseller.

## 1:45 · The AI reads, the bookseller decides

Open a book from Books, then the **AI reading** tab.

> A model running here read the synopsis: atmospheres in order of predominance, pace, density, voice, themes, and the passages it relied on. The bookseller can correct any of it, and from then on it’s their reading: the AI never overwrites it.

Open **Why this reading?** to show the quoted passages.

## 2:15 · A showcase in a minute

Open Showcases, then the showcase on display.

> A showcase starts from an idea. The shelf suggests books for it, with the reasons they share, and the preview is the band that appears on the home page.

Click **Suggest from the idea**, add one book, and point at the preview.

## 2:45 · What readers ask for

Open **Demand**.

> Every search is kept here, without who made it, and read together by meaning. This is the list to buy from: travel guides and cookbooks the shop doesn’t stock. And this is the shelf against its readers: they ask for ironic, comforting, luminous books, and this collection is mostly melancholic.

## 3:15 · Why open models, here

Open **Search evaluation**.

> Everything runs on open models through Ollama, on the shop’s own computer: embeddinggemma to search, gemma4 to read each book once. No fee per search, and no reader’s request leaves the shop. Measured on the same questions, the shelf finds far better than keyword search and is level with plain embeddings, and the page says where it still loses.

## 3:40 · Who pays

> A bookshop pays for a search that turns browsing into reservations, and for a monthly list of what readers wanted and didn’t find. It runs on a computer the shop already has.

## Searches that work well

| request | what it shows |
| --- | --- |
| something melancholic, but comforting | atmospheres read from the request |
| a book that feels like the sea | a quoted passage under “why this book” |
| books like Clarice Lispector | a reference author in the catalogue |
| vegetarian recipes | the shelf declining |
