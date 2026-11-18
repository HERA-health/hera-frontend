async (page) => {
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => localStorage.setItem("hera_theme_mode", value),
      theme,
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Navegar a Inicio", exact: true })
      .waitFor();
    for (const [id, label] of [
      ["home", "Inicio"],
      ["agenda", "Agenda"],
      ["patients", "Mis pacientes"],
      ["billing", "Facturación"],
      ["availability", "Disponibilidad"],
      ["statistics", "Estadísticas"],
    ]) {
      await page
        .getByRole("button", { name: "Navegar a " + label, exact: true })
        .click();
      if (id === "agenda" || id === "patients")
        await page
          .getByText("Laura Martín Soler", { exact: true })
          .filter({ visible: true })
          .first()
          .waitFor();
      if (id === "billing")
        await page
          .getByText(/F-\d{4}-/)
          .filter({ visible: true })
          .first()
          .waitFor();
      await page.waitForFunction(
        () => !document.querySelector('[role="progressbar"]'),
      );
      const skip = page.getByRole("button", {
        name: "Omitir guía",
        exact: true,
      });
      try {
        await skip.waitFor({ state: "visible", timeout: 2200 });
        await skip.click();
      } catch {}
      await page.waitForFunction(
        () => !document.body.innerText.match(/Cargando|Preparando tu espacio/),
      );
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `__CAPTURE_OUTPUT__/${id}-${theme}.png`,
        animations: "disabled",
        scale: "css",
      });
    }
  }
};
