async page => {
  const browser = page.context().browser();
  const base = 'http://localhost:8088';
  const headings = [
    'Planes para tu consulta de psicología.', 'Empieza en HERA sin suscripción.',
    'Comisiones por sesión', 'Desde la cuarta sesión',
  ];
  const results = [];
  for (const [width, colorScheme] of [[320, 'light'], [390, 'dark'], [750, 'light']]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, colorScheme });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      const tab = await context.newPage();
      const errors = [];
      let requests = 0;
      tab.on('pageerror', error => errors.push(error.message));
      tab.on('request', request => { if (new URL(request.url()).pathname.endsWith('/subscriptions/plans')) requests++; });
      await tab.route('**/_expo/static/js/web/**', async route => { await gate; await route.continue(); });
      await tab.goto(base + '/planes', { waitUntil: 'commit' });
      await tab.locator('#pricing-first-paint h1').waitFor();
      await tab.evaluate(() => document.fonts.ready);
      const measure = () => Promise.all(headings.map(label => tab.getByText(label, { exact: true }).first().boundingBox()));
      const initial = await measure();
      if (requests !== 1) throw Error('El catálogo debe solicitarse al abrir el documento.');
      release();
      await tab.locator('#pricing-first-paint').waitFor({ state: 'detached' });
      await tab.getByRole('button', { name: 'Rechazar estadísticas de uso' }).click();
      await tab.getByRole('button', { name: 'Solicitar prueba gratuita de Calma' }).first().waitFor();
      const final = await measure();
      for (const [index, box] of initial.entries()) {
        if (!box || !final[index] || ['x', 'y', 'width', 'height'].some(key => Math.abs(box[key] - final[index][key]) > 1)) {
          throw Error('Cambio de posición en ' + width + 'px: ' + headings[index]);
        }
      }
      if (requests !== 1 || errors.length) throw Error('Carga de planes: ' + JSON.stringify({ requests, errors }));
      results.push({ width, colorScheme, requests });
    } finally {
      release();
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const tab = await context.newPage();
    let attempts = 0;
    await tab.route('**/subscriptions/plans', route => {
      attempts++;
      return attempts === 1 ? route.abort('failed') : route.continue();
    });
    await tab.goto(base + '/planes');
    await tab.getByRole('button', { name: 'Rechazar estadísticas de uso' }).click();
    await tab.getByRole('button', { name: 'Volver a cargar planes' }).click();
    await tab.getByRole('button', { name: 'Solicitar prueba gratuita de Calma' }).first().waitFor();
    if (attempts !== 2) throw Error('Se esperaba una sola petición de reintento.');
    return { viewports: results, retryRequests: attempts };
  } finally {
    await context.close();
  }
}
