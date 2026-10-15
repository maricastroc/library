import { listShelfBooks } from "@/lib/catalog/books";

export function listPickerBooks() {
  return listShelfBooks().sort((a, b) => a.title.localeCompare(b.title, "en"));
}
