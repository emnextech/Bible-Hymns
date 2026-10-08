// Builds public/index.html from web/index.html.
// The inline app script and stylesheet are down-levelled for older phones/browsers and minified.
// Usage: node scripts/build-web.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Oldest engines we aim to run on: ES2017 (iOS/Safari 11+, Chrome 58+, Firefox 52+, Samsung Internet 7+).
const JS_TARGET = ["es2017"];
const CSS_TARGET = ["safari12", "ios12", "chrome64", "firefox68", "edge79"];

let html = readFileSync(join(root, "web/index.html"), "utf8");

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const css = await transform(styleMatch[1], { loader: "css", minify: true, target: CSS_TARGET });
html = html.replace(styleMatch[0], () => `<style>${css.code.trim()}</style>`);

// The app script is the last inline <script> in the document.
const start = html.lastIndexOf("<script>");
const end = html.indexOf("</script>", start);
const js = await transform(html.slice(start + 8, end), { loader: "js", minify: true, target: JS_TARGET, legalComments: "none" });
for (const w of [...css.warnings, ...js.warnings]) console.warn("warning:", w.text);
html = html.slice(0, start + 8) + js.code.trim() + html.slice(end);

writeFileSync(join(root, "public/index.html"), html);
console.log(`Built public/index.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
