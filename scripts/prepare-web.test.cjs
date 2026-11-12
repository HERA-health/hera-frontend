const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { staticPaths, pageMetadata, renderMetadata } = require('./prepare-web.cjs');

test('preserves explicit, optional, alias, conditional and implicit deep links', () => {
  const paths = staticPaths();
  for (const route of ['integrations/google-calendar', 'clinical-consent/:requestId/:token', 'clinic-consent/:requestId/:token', 'clinic-consent/:requestId', 'clinical-consent/guest/:requestId', 'reset', 'verify', 'e/:profileRef', 'mi-clinica/:clinicId?/:section?', 'pagos/reserva/:bookingId', 'ProfessionalHome', 'Specialists', 'Welcome']) {
    assert.ok(paths.includes(route), route);
  }
  assert.ok(!paths.includes('dashboard')); // A parse callback value is not a route.
  assert.ok(!paths.includes('inventada'));
});
test('initial metadata matches each public screen, without loading React', () => {
  const shell = fs.readFileSync('public/index.html', 'utf8');
  for (const file of ['landing/LandingPage.tsx', 'landing/PricingScreen.tsx', 'landing/ProfessionalShowcaseScreen.tsx']) {
    const meta = pageMetadata(`src/screens/${file}`);
    const html = renderMetadata(shell, meta);
    assert.ok(html.includes(`<title>${meta.title}</title>`));
    assert.ok(html.includes(`rel="canonical" href="https://www.health-hera.com${meta.canonicalPath}"`));
    assert.ok(html.includes(meta.description));
    assert.ok(html.includes('calendar-boot-template')); // OAuth boot remains intact.
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  }
});
test('unknown paths fall through to the static 404, not the application', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.ok(!config.rewrites.some(rule => rule.source === '/(.*)' || rule.source === '/:path*'));
  assert.ok(config.rewrites.some(rule => rule.source === '/legal/:path*'));
  assert.ok(config.rewrites.some(rule => rule.source === '/sitemap.xml'));
  const html = fs.readFileSync('public/404.html', 'utf8');
  assert.ok(html.includes('noindex, follow'));
  assert.ok(!html.includes('<script'));
});
