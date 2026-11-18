async (page) => {
  const browser = page.context().browser();
  const results = [];
  for (const width of [320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    try {
      const current = await context.newPage();
      await current.goto("http://localhost:8088/software-para-psicologos");
      await current.locator("#hera-public-html").waitFor({ state: "detached" });
      await current.goto("http://localhost:8088/profesionales/recorrido#tour-record");
      await current.locator("#hera-public-html").waitFor({ state: "detached" });
      await current.locator("#tour-record").waitFor({ state: "visible" });
      const privacy = current.getByRole("button", { name: "Rechazar estadísticas de uso" });
      if (await privacy.isVisible()) await privacy.click();
      await current.reload();
      await current.locator("#hera-public-html").waitFor({ state: "detached" });
      await current.locator("#tour-record").waitFor({ state: "visible" });
      const nav = current.getByRole("navigation", { name: "Pantallas del recorrido" });
      await nav.getByRole("link", { name: /Facturación/ }).click();
      await current.locator("#tour-billing").waitFor({ state: "visible" });
      await current.reload();
      await current.locator("#hera-public-html").waitFor({ state: "detached" });
      await current.locator("#tour-billing").waitFor({ state: "visible" });
      await current.goBack();
      if (!current.url().endsWith("/software-para-psicologos"))
        throw new Error("The screen selector should not add page history entries.");
      await current.goForward();
      await current.locator("#hera-public-html").waitFor({ state: "detached" });
      await current.locator("#tour-billing").waitFor({ state: "visible" });
      if (await current.locator(".pro-tour-step:visible").count() !== 1)
        throw new Error("The tour must show exactly one selected screen.");
      const geometry = await current.evaluate(() => ({
        headingTop: document.querySelector("#tour-billing h2").getBoundingClientRect().top,
        headingLeft: document.querySelector("#tour-billing h2").getBoundingClientRect().left,
        navRight: document.querySelector(".pro-tour-nav").getBoundingClientRect().right,
        navBottom: document.querySelector(".pro-tour-nav").getBoundingClientRect().bottom,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      if (geometry.overflow || (width >= 1040 ? geometry.headingLeft < geometry.navRight : geometry.headingTop < geometry.navBottom))
        throw new Error("Tour navigation obscures content: " + JSON.stringify(geometry));
      await current.getByRole("link", { name: "Ampliar: Facturación", exact: true }).click();
      await current.getByRole("dialog").waitFor();
      const original = await current.getByRole("link", { name: "Abrir imagen a tamaño completo" }).getAttribute("href");
      if (!original.endsWith("/billing-light-1600.webp")) throw new Error("Wrong full-size capture.");
      await current.keyboard.press("Escape");
      await current.getByRole("dialog").waitFor({ state: "hidden" });
      results.push({ width, directLink: true, reload: true, history: true, imageDialog: true });
    } finally {
      await context.close();
    }
  }
  // A reader can scroll and open a FAQ while the application bundle is delayed.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  try {
    const current = await context.newPage();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await current.route("**/_expo/static/js/web/**", async (request) => { await gate; await request.continue(); });
    await current.goto("http://localhost:8088/software-para-psicologos", { waitUntil: "commit" });
    const question = current.locator("#hera-public-html .pro-faq summary").first();
    await question.waitFor();
    await current.evaluate(() => document.fonts.ready);
    await question.click();
    const before = await question.evaluate((element) => element.getBoundingClientRect().y);
    release();
    await current.locator("#hera-public-html").waitFor({ state: "detached" });
    const after = await current.locator(".pro-faq summary").first().evaluate((element) => element.getBoundingClientRect().y);
    const open = await current.locator(".pro-faq details").first().evaluate((element) => element.open);
    if (Math.abs(before - after) > 2 || !open) throw new Error("Initial reader position or expanded FAQ was lost: " + JSON.stringify({before, after, open}));
    results.push({ delayedJavaScript: true, scrollPreserved: true, faqPreserved: true });
  } finally {
    await context.close();
  }
  return results;
}
