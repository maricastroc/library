import { listShelfBooks } from "@/lib/catalog/books";
import { spineIdentity } from "@/lib/shelf/identity";

export function listPickerBooks() {
  return listShelfBooks()
    .map((book) => ({ id: book.id, title: book.title, author: book.author, color: spineIdentity(book).color, note: book.note }))
    .sort((a, b) => a.title.localeCompare(b.title, "en"));
}
