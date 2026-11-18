async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 } });
  try {
    const tab = await context.newPage();
    const errors = [];
    let documents = 0, requests = 0;
    tab.on('pageerror', error => errors.push(error.message));
    tab.on('request', request => {
      if (request.isNavigationRequest() && request.frame() === tab.mainFrame()) documents++;
      if (new URL(request.url()).pathname.endsWith('/specialists/directory')) requests++;
    });
    await tab.goto('http://localhost:8088/especialistas?sort=PRICE_ASC', { waitUntil: 'domcontentloaded' });
    await tab.locator('#hera-public-html').waitFor({ state: 'detached' });
    await tab.getByRole('button', { name: 'Rechazar estadísticas de uso' }).click();
    const next = tab.getByRole('link', { name: 'Siguiente', exact: true });
    const nextHref = await next.getAttribute('href');
    if (!nextHref?.includes('page=2') || !nextHref.includes('sort=PRICE_ASC')) throw Error('Falta el enlace filtrado a la segunda página');
    const cards = tab.locator('[data-testid="directory-grid"]').getByRole('link');
    const firstProfile = await cards.first().getAttribute('href');

    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const urlPattern = '**/specialists/directory?**';
    await tab.route(urlPattern, async route => { await gate; await route.abort('failed'); }, { times: 1 });
    const pending = tab.waitForRequest(request => request.url().includes('/specialists/directory?') && request.url().includes('page=2'));
    await next.click();
    await pending;
    if (await cards.first().getAttribute('href') !== firstProfile || tab.url().includes('page=2')) throw Error('Se perdió la página de origen durante la espera');
    release();
    await tab.getByText('Reintentar', { exact: true }).click();
    await tab.getByText('2 / 2', { exact: true }).waitFor();
    if (!tab.url().includes('page=2') || !tab.url().includes('sort=PRICE_ASC') || await cards.first().getAttribute('href') === firstProfile) throw Error('Página o filtro incorrectos');
    if (requests !== 2) throw Error('Peticiones inesperadas al paginar y reintentar: ' + requests);
    await tab.goBack();
    await tab.getByText('1 / 2', { exact: true }).waitFor();
    if (await cards.first().getAttribute('href') !== firstProfile) throw Error('Atrás no restauró los perfiles originales');
    await tab.goForward();
    await tab.getByText('2 / 2', { exact: true }).waitFor();
    if (documents !== 1 || errors.length) throw Error(JSON.stringify({ documents, errors }));
    await tab.reload({ waitUntil: 'domcontentloaded' });
    await tab.locator('#hera-public-html').waitFor({ state: 'detached' });
    await tab.getByText('2 / 2', { exact: true }).waitFor();
    return { retry: true, history: true, reload: true, sorted: true };
  } finally {
    await context.close();
  }
}
