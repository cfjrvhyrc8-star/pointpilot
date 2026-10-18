import assert from "node:assert/strict";
import fs from "node:fs";

// Source-contract checks; these do not replace keyboard or mobile browser QA.
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("styles/accessibility.css");
const login = read("app/login/page.js");
assert.match(read("app/layout.js"), /styles\/accessibility\.css/);
assert.match(css, /:focus-visible/);
assert.match(css, /min-height:44px/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(css, /\.navAccount>div\{display:block/);
assert.match(css, /font-size:16px/);
assert.match(login, /aria-busy=\{loading\}/);
assert.match(login, /aria-atomic/);
assert.match(read("app/dashboard/page.js"), /role="status">Loading your wallet/);
console.log("Accessibility: 9 source-contract checks passed (browser QA separate).");
