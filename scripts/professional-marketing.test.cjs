const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
require("./prepare-web.cjs").compilePublicHtml();
const {
  professionalPages,
  marketingCaptures,
} = require("../.seo-build/seo/professionalContent");
const {
  directoryCapturePath,
  professionalHtml,
  professionalTourHtml,
} = require("../.seo-build/seo/professionalPresentation");
const {
  publicThemeBoot,
  publicHeaderHtml,
} = require("../.seo-build/seo/publicNavigation");
test("five distinct professional intents with crawlable actions and a single main heading", () => {
  assert.equal(Object.keys(professionalPages).length, 5);
  const titles = new Set();
  for (const [id, page] of Object.entries(professionalPages)) {
    const html = professionalHtml(id, "/profile-example.webp");
    assert.match(html, /href="\/register\?userType=PROFESSIONAL"/);
    for (const [, asset] of html.matchAll(/--shot-(?:light|dark):url\('([^']+)'\)/g))
      assert.ok(fs.existsSync("public" + asset), "Missing detail " + asset);
    if (id === "directory") {
      assert.ok(html.includes('href="/especialistas"') && html.includes("Cómo aparecer en el directorio"));
      assert.match(html, /data-capture="directory"/);
      for (const layout of ["desktop", "mobile", "detail"])
        for (const mode of ["light", "dark"])
          assert.ok(fs.existsSync("public" + directoryCapturePath(layout, mode)));
    }
    else if (id !== "software") assert.ok(html.includes(`href="/profesionales/recorrido#tour-${id === "patients" ? "record" : id}"`));
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.ok(html.includes(page.heading));
    titles.add(page.title);
    assert.match(html, /Datos de demostración/);
    if (id !== "directory") assert.match(html, /width="1600" height="1000"/);
    assert.match(html, /href="\/planes"/);
    assert.doesNotMatch(html, /software-clinicas-psicologia/);
    for (const href of [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))
      assert.ok(href.startsWith("/") || href.startsWith("#"));
  }
  assert.equal(titles.size, 5);
});
test("patient navigation respects the destinations available in the active stack", () => {
  const { publicBarHtml } = require("../.seo-build/seo/publicBar");
  const header = (hasLanding, hasQuestionnaire) =>
    publicBarHtml("patient", true, "directory", { hasLanding, hasQuestionnaire });
  assert.doesNotMatch(header(false, false), /href="(?:\/\?section=|\/cuestionario)/);
  assert.match(header(false, true), /href="\/cuestionario"/);
  assert.match(header(true, true), /href="\/\?section=howItWorks"/);
  assert.match(header(false, false), /href="\/software-para-psicologos"/);
});

test("all published product captures are accounted for after either export", () => {
  const dir = "public/marketing/product/";
  const manifest = JSON.parse(fs.readFileSync(dir + "manifest.json", "utf8"));
  assert.deepEqual(manifest.files.map(entry => entry.file).sort(),
    fs.readdirSync(dir).filter(name => name.endsWith(".webp")).sort());
  for (const entry of manifest.files) {
    const bytes = fs.readFileSync(dir + entry.file);
    assert.equal(entry.bytes, bytes.length, entry.file);
    assert.equal(entry.sha256, require("node:crypto").createHash("sha256").update(bytes).digest("hex"), entry.file);
  }
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
