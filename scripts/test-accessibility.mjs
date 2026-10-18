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
assert.match(css, /\.dashHero\.atlasHeader h1\{color:#171a2d\}/);
assert.match(css, /overflow-x:auto/);
assert.match(css, /flex:0 0 58px/);
const mobile = read("styles/dashboard-mobile.css");
assert.match(read("app/layout.js"), /styles\/dashboard-mobile\.css/);
assert.match(mobile, /\.nav\{position:static/);
assert.match(mobile, /\.atlas\{grid-template-columns:minmax\(0,1fr\)/);
assert.match(mobile, /\.ledgerList>div\{min-width:0/);
assert.match(mobile, /112px \+ env\(safe-area-inset-bottom/);
assert.match(mobile, /\.atlasNav\{grid-template-columns:minmax\(0,1fr\)/);
assert.doesNotMatch(mobile, /overflow-x:\s*(hidden|clip)/);
console.log("Accessibility: 19 source-contract checks passed (browser QA separate).");
