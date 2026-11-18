async page => {
  const destinations = ['/software-para-psicologos', '/agenda-para-psicologos', '/gestion-pacientes-psicologos', '/facturacion-para-psicologos', '/perfil-en-el-directorio-para-psicologos', '/profesionales/recorrido', '/planes'];
  const results = [];
  for (const [width, colorScheme] of [[390,'dark'], [1100,'light'], [1440,'light']]) {
    const ctx = await page.context().browser().newContext({ viewport: {width, height: 880}, colorScheme });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      const tab = await ctx.newPage();
      const errors = [];
      tab.on('pageerror', error => errors.push(error.message));
      await tab.route('**/_expo/static/js/web/**', async route => { await gate; await route.continue(); });
      await tab.goto('http://localhost:8088/', { waitUntil: 'commit' });
      const bar = tab.locator('.sitebar:visible');
      const summary = bar.locator('.sitebar-group > summary:visible');
      async function openOuter() {
        if (!await summary.isVisible()) await bar.locator('.sitebar-mobile > summary').click();
      }
      await openOuter();
      await summary.click();
      const menu = bar.locator('.sitebar-group > .sitebar-sheet:visible');
      const hrefs = await menu.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')));
      if (hrefs.join() !== destinations.join()) throw Error('Enlaces iniciales incompletos');
      release();
      await tab.locator('#hera-public-html').waitFor({state:'detached'});
      await menu.waitFor();
      await tab.getByRole('button', {name:'Rechazar estadísticas de uso'}).click();
      await menu.waitFor({state:'hidden'});
      const origin = await tab.evaluate(() => performance.timeOrigin);
      for (const href of destinations) {
        await openOuter();
        await summary.click();
        const link = menu.locator('a[href="'+href+'"]');
        const box = await menu.boundingBox();
        if (!box || box.x < 0 || box.x+box.width > width || box.y+box.height > 881) throw Error('Menú fuera de pantalla');
        await link.click();
        await tab.waitForURL(url => url.pathname === href);
        await tab.getByRole('heading',{level:1}).first().waitFor();
        await tab.goBack();
        await bar.waitFor();
      }
      await openOuter();
      await summary.focus();
      await tab.keyboard.press('Enter');
      await menu.waitFor();
      await tab.keyboard.press('Tab');
      if (!await menu.locator('a:first-child').evaluate(a => a === document.activeElement)) throw Error('Orden de tabulación');
      await tab.keyboard.press('Escape');
      await menu.waitFor({state:'hidden'});
      if (!await summary.evaluate(el => el === document.activeElement)) throw Error('Foco después de Escape');
      if (origin !== await tab.evaluate(()=>performance.timeOrigin) || errors.length) throw Error('Recarga o error durante la navegación: '+errors.join());
      results.push({width,colorScheme,links:hrefs.length});
    } finally { release(); await ctx.close(); }
  }
  return results;
}