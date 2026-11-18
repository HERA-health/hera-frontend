async (page) => {
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => localStorage.setItem("hera_theme_mode", value),
      theme,
    );
    await page.reload();
    for (const [id, label, ready] of [
      ["clinic-agenda", "Agenda", "David Vega Ríos"],
      ["clinic-team", "Equipo", "Ana Beltrán Soler"],
      ["clinic-services", "Servicios", "Terapia individual"],
      ["clinic-billing", "Facturación", /^FSC-\d{4}-0006$/],
    ]) {
      await page
        .getByRole("button", { name: "Navegar a " + label, exact: true })
        .click();
      if (id === "clinic-billing")
        await page
          .getByRole("tab", { name: "Facturas y cobros", exact: true })
          .click();
      await page
        .getByText(ready, { exact: true })
        .filter({ visible: true })
        .first()
        .waitFor();
      await page.waitForFunction(
        () => !document.body.innerText.includes("Cargando"),
      );
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      await page.screenshot({
        path: "__CAPTURE_OUTPUT__/" + id + "-" + theme + ".png",
        animations: "disabled",
        scale: "css",
      });
    }
  }
};
