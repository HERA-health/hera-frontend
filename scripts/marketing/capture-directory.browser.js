async page => {
  // Run from hera-frontend against the local production export. Only fixture
  // profiles are allowed into marketing captures, even if the API is running.
  const base = 'http://localhost:8088';
  const output = '../output/playwright/product';
  const common = {
    specialization: 'Psicología', professionalType: 'PSYCHOLOGIST_HEALTH',
    professionalTypeLabel: 'Psicóloga sanitaria', rating: null, reviewCount: 0,
    offersOnline: true, languages: ['spanish'], yearsInPractice: 8, gradientId: null,
  };
  const items = [
    { ...common, id: 'sample-elena', name: 'Elena García', publicSlug: 'elena-ejemplo',
      avatar: base + '/demo-portrait.webp', collegiateNumber: 'DEMO-01', officeCity: 'Valencia',
      specialties: ['anxiety', 'self-esteem'], offersInPerson: true, pricePerSession: 60,
      descriptionExcerpt: 'Acompaño a personas adultas que quieren trabajar la ansiedad y la autoestima.' },
    { ...common, id: 'sample-laura', name: 'Laura Martín', publicSlug: 'laura-ejemplo',
      avatar: base + '/demo-consulta.jpg', collegiateNumber: 'DEMO-02', officeCity: null,
      specialties: ['stress', 'grief'], offersInPerson: false, pricePerSession: 55,
      descriptionExcerpt: 'Un espacio para afrontar los cambios vitales y encontrar apoyo en el duelo.' },
  ].map(item => ({ ...item, publicOptions: [{ specialistId: item.id, optionId: 'online', modality: 'ONLINE', durationMinutes: 50, priceCents: item.pricePerSession * 100 }] }));
  const result = [];
  for (const colorScheme of ['light', 'dark']) {
    for (const mobile of [false, true]) {
      const width = mobile ? 390 : 1440;
      const ctx = await page.context().browser().newContext({ viewport: { width, height: 1600 }, colorScheme, reducedMotion: 'reduce' });
      try {
        const tab = await ctx.newPage();
        await tab.route(base + '/especialistas', route => route.fulfill({ path: 'dist/app-shell.html', contentType: 'text/html; charset=utf-8' }));
        await tab.route('**/specialists/profile-options', route => route.fulfill({ json: {
          languages: [{ value: 'spanish', label: 'Español', aliases: [] }], religions: [], religionEnabled: false,
        } }));
        await tab.route('**/specialists/directory**', route => route.fulfill({ json: { success: true, data: { items, page: 1, pageSize: 12, total: 2, hasMore: false } } }));
        await tab.route('**/demo-portrait.webp', route => route.fulfill({ path: 'assets/landing/psychologist-portrait-480.webp', contentType: 'image/webp' }));
        await tab.route('**/demo-consulta.jpg', route => route.fulfill({ path: 'assets/psicologo_stock_fondo_optimized.jpg', contentType: 'image/jpeg' }));
        await tab.goto(base + '/especialistas');
        await tab.getByRole('button',{ name: 'Rechazar estadísticas de uso' }).click();
        const cards = tab.getByTestId('directory-grid');
        await cards.getByText('Elena García', { exact: true }).waitFor();
        await cards.getByText('Laura Martín', { exact: true }).waitFor();
        await tab.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(Array.from(document.querySelectorAll('[data-testid="directory-grid"] img'), img => img.decode()));
        });
        const grid = await cards.boundingBox();
        const header = await tab.locator('.sitebar:visible').boundingBox();
        const top = header.y + header.height;
        const clip = mobile ? grid : { x: 0, y: Math.floor(top), width, height: Math.ceil(grid.y + grid.height - top + 16) };
        const name = 'directory-' + (mobile ? 'mobile-' : 'desktop-') + colorScheme;
        await tab.screenshot({path: output + '/' + name + '.png', clip});
        if (!mobile) {
          const card = await cards.locator('a').first().boundingBox();
          await tab.screenshot({ path: output + '/directory-detail-' + colorScheme + '.png', clip: {x: card.x, y: card.y, width: card.width, height: 165} });
        }
        result.push({ name, width:clip.width, height:clip.height });
      } finally { await ctx.close(); }
    }
  }
  return result;
}