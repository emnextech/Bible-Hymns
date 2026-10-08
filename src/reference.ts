import { type Book, findBook } from "./books";

export interface Passage {
  book: Book;
  /** Inclusive verse-id range (BBCCCVVV). A whole chapter ends at verse 999. */
  start: number;
  end: number;
  /** Normalised human-readable reference, e.g. "John 3:16-18". */
  label: string;
}

export class ReferenceError extends Error {}

export const verseId = (book: number, chapter: number, verse: number) => book * 1_000_000 + chapter * 1_000 + verse;

const REF = /^(.+?)\s*(\d+)(?:\s*[:.]\s*(\d+))?(?:\s*[-–—]\s*(\d+)(?:\s*[:.]\s*(\d+))?)?$/;

/**
 * Parse one reference: "John 3:16", "1 Jn 1:9", "Ps 23", "Ps 23-24", "Gen 1:1-2:3",
 * "John 3:16-18", "Jude 5" (single-chapter books take a bare verse number).
 */
export function parseReference(input: string): Passage {
  const m = REF.exec(input.trim());
  if (!m) {
    // A bare book name means its first chapter.
    const book = findBook(input);
    if (book) return chapterRange(book, 1, 1);
    throw new ReferenceError(`Could not understand reference "${input}"`);
  }
  const [, bookPart, a, b, c, d] = m;
  const book = findBook(bookPart);
  if (!book) throw new ReferenceError(`Unknown book "${bookPart.trim()}"`);

  let n1 = Number(a), v1 = b ? Number(b) : undefined, n2 = c ? Number(c) : undefined, v2 = d ? Number(d) : undefined;

  // Single-chapter books: "Jude 5" / "Jude 3-5" mean verses, not chapters.
  if (book.chapters === 1 && v1 === undefined && !(n1 === 1 && n2 === undefined)) {
    v1 = n1;
    n1 = 1;
    if (n2 !== undefined && v2 === undefined) {
      v2 = n2;
      n2 = 1;
    }
  }

  const check = (ch: number) => {
    if (ch < 1 || ch > book.chapters) throw new ReferenceError(`${book.name} has ${book.chapters} chapter(s); got ${ch}`);
  };
  check(n1);

  if (v1 === undefined) {
    // Chapter or chapter range: "Ps 23" / "Ps 23-24"
    const last = n2 ?? n1;
    check(last);
    if (last < n1) throw new ReferenceError(`Range ends before it starts in "${input}"`);
    return chapterRange(book, n1, last);
  }

  let endCh = n1, endV = v1;
  if (n2 !== undefined && v2 !== undefined) {
    endCh = n2; // "Gen 1:1-2:3"
    endV = v2;
  } else if (n2 !== undefined) {
    endV = n2; // "John 3:16-18"
  }
  check(endCh);
  const start = verseId(book.id, n1, v1);
  const end = verseId(book.id, endCh, endV);
  if (end < start) throw new ReferenceError(`Range ends before it starts in "${input}"`);

  let label = `${book.name} ${n1}:${v1}`;
  if (end !== start) label += endCh === n1 ? `-${endV}` : `-${endCh}:${endV}`;
  return { book, start, end, label };
}

function chapterRange(book: Book, from: number, to: number): Passage {
  return {
    book,
    start: verseId(book.id, from, 1),
    end: verseId(book.id, to, 999),
    label: from === to ? `${book.name} ${from}` : `${book.name} ${from}-${to}`,
  };
}

/** Parse several references separated by ";" (e.g. "John 3:16; Rom 10:9-10"). */
export function parseReferences(input: string): Passage[] {
  return input
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseReference);
}
