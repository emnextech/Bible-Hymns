import { describe, expect, it } from "vitest";
import { findBook } from "../src/books";
import { parseReference, parseReferences, ReferenceError } from "../src/reference";

describe("findBook", () => {
  it.each([
    ["John", "John"],
    ["jn", "John"],
    ["1 John", "1 John"],
    ["I John", "1 John"],
    ["1jn", "1 John"],
    ["First John", "1 John"],
    ["III John", "3 John"],
    ["Ps", "Psalms"],
    ["Psalm", "Psalms"],
    ["Song of Songs", "Song of Solomon"],
    ["Rev.", "Revelation"],
    ["Revelations", "Revelation"],
    ["Isaiah", "Isaiah"],
    ["phil", "Philippians"],
    ["phlm", "Philemon"],
    ["deut", "Deuteronomy"],
    ["43", "John"],
  ])("%s -> %s", (input, name) => {
    expect(findBook(input)?.name).toBe(name);
  });

  it("rejects ambiguous prefixes", () => {
    expect(findBook("jo")).toBeUndefined();
  });
});

describe("parseReference", () => {
  it("single verse", () => {
    expect(parseReference("John 3:16")).toMatchObject({ start: 43003016, end: 43003016, label: "John 3:16" });
  });
  it("verse range", () => {
    expect(parseReference("John 3:16-18")).toMatchObject({ start: 43003016, end: 43003018, label: "John 3:16-18" });
  });
  it("cross-chapter range", () => {
    expect(parseReference("Gen 1:1-2:3")).toMatchObject({ start: 1001001, end: 1002003, label: "Genesis 1:1-2:3" });
  });
  it("whole chapter", () => {
    expect(parseReference("Ps 23")).toMatchObject({ start: 19023001, end: 19023999, label: "Psalms 23" });
  });
  it("chapter range", () => {
    expect(parseReference("Psalm 23-24")).toMatchObject({ start: 19023001, end: 19024999 });
  });
  it("numbered book with abbreviation", () => {
    expect(parseReference("1 Jn 1:9").label).toBe("1 John 1:9");
  });
  it("no space between book and chapter", () => {
    expect(parseReference("Rom8:28").label).toBe("Romans 8:28");
  });
  it("single-chapter book with bare verse", () => {
    expect(parseReference("Jude 5")).toMatchObject({ start: 65001005, end: 65001005 });
    expect(parseReference("Jude 3-5")).toMatchObject({ start: 65001003, end: 65001005 });
    expect(parseReference("Jude 1:24").start).toBe(65001024);
  });
  it("book name alone means chapter 1", () => {
    expect(parseReference("Genesis").label).toBe("Genesis 1");
  });
  it("rejects bad input", () => {
    expect(() => parseReference("Nothing 1:1")).toThrow(ReferenceError);
    expect(() => parseReference("John 22:1")).toThrow(ReferenceError);
    expect(() => parseReference("John 3:18-16")).toThrow(ReferenceError);
  });
  it("multiple references", () => {
    expect(parseReferences("John 3:16; Rom 10:9-10").map((p) => p.label)).toEqual(["John 3:16", "Romans 10:9-10"]);
  });
});
