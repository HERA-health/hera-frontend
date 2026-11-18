async (page) => {
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => localStorage.setItem("hera_theme_mode", value),
      theme,
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Navegar a Mis pacientes", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Buscar por nombre, email o teléfono" })
      .fill("Laura Martín Soler");
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("[role=button]")].filter(
          (e) => e.checkVisibility() && e.textContent.includes("Ver ficha"),
        ).length === 1,
    );
    await page.getByRole("button", { name: "Ver ficha", exact: false }).click();
    await page
      .getByRole("tab", { name: "Área clínica protegida", exact: true })
      .click();
    const pin = page.getByRole("textbox", { name: "PIN clínico", exact: true });
    await Promise.race([
      pin.waitFor(),
      page
        .getByRole("tab", { name: "Historia clínica", exact: true })
        .waitFor(),
    ]);
    if (await pin.isVisible()) {
      await pin.fill("482619");
      await page
        .getByRole("button", { name: "Acceder al área clínica", exact: true })
        .click();
    }
    await page
      .getByRole("tab", { name: "Historia clínica", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: /^Evaluación inicial Evaluación del proceso/,
      })
      .click();
    await page
      .getByRole("heading", { name: "Evaluación inicial", exact: true })
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() =>
      document.querySelectorAll("*").forEach((e) => {
        if (e.scrollTop) e.scrollTop = 0;
      }),
    );
    await page.waitForTimeout(600);
    await page.screenshot({
      path: "__CAPTURE_OUTPUT__/record-" + theme + ".png",
      animations: "disabled",
      scale: "css",
    });
    await page
      .getByRole("tab", { name: "Documentación clínica", exact: true })
      .click();
    await page
      .getByText("consentimiento-informado.pdf", { exact: true })
      .filter({ visible: true })
      .first()
      .waitFor();
    await page
      .getByRole("button", { name: "Descargar documento", exact: true })
      .waitFor();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: "__CAPTURE_OUTPUT__/documents-" + theme + ".png",
      animations: "disabled",
      scale: "css",
    });
  }
};
