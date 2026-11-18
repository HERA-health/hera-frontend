const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
require("./prepare-web.cjs").compilePublicHtml();
const {
  professionalPages,
  marketingCaptures,
} = require("../.seo-build/seo/professionalContent");
const {
  professionalHtml,
  professionalTourHtml,
} = require("../.seo-build/seo/professionalPresentation");
const {
  publicThemeBoot,
  publicHeaderHtml,
} = require("../.seo-build/seo/publicNavigation");
test("four distinct professional intents with crawlable actions and a single main heading", () => {
  assert.equal(Object.keys(professionalPages).length, 4);
  const titles = new Set();
  for (const [id, page] of Object.entries(professionalPages)) {
    const html = professionalHtml(id);
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.ok(html.includes(page.heading));
    titles.add(page.title);
    assert.match(html, /Datos de demostración/);
    assert.match(html, /width="1600" height="1000"/);
    assert.match(html, /href="\/planes"/);
    assert.doesNotMatch(html, /software-clinicas-psicologia/);
    for (const href of [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))
      assert.ok(href.startsWith("/") || href.startsWith("#"));
  }
  assert.equal(titles.size, 4);
});
test("tour covers the eight actual product areas and uses dedicated marketing assets", () => {
  assert.deepEqual(
    marketingCaptures.map((x) => x.id),
    [
      "home",
      "agenda",
      "patients",
      "record",
      "documents",
      "billing",
      "availability",
      "statistics",
    ],
  );
  const html = professionalTourHtml();
  assert.ok(!html.includes("/onboarding/"));
  assert.ok(!html.includes("autoplay"));
  assert.ok(!html.includes('class="pro-breadcrumb"'));
  assert.match(html, /class="pro-tour-workspace"/);
  for (const shot of marketingCaptures)
    assert.ok(html.includes(`id="tour-${shot.id}"`));
});
test("theme initializes before mounting from preference or system; audiences have distinct navigation", () => {
  assert.match(publicThemeBoot, /localStorage/);
  assert.match(publicThemeBoot, /matchMedia/);
  const header = publicHeaderHtml();
  assert.match(header, /Funcionalidades/);
  assert.match(header, /class="pub-moon"><svg\b/);
  assert.match(header, /class="pub-sun"><svg\b/);
  const rewrites = JSON.parse(fs.readFileSync("vercel.json", "utf8")).rewrites;
  assert.ok(
    !rewrites.some(
      (x) =>
        x.source === "/planes" &&
        x.destination === "/api/public-page?path=/planes",
    ),
  );
});
