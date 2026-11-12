const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('./prepare-web.cjs').compilePublicHtml();
const handler = require('../api/public-page');
const { publicProfileSchema } = require('../.seo-build/seo/publicData');
const { profilePageMetadata, injectPublicHtml } = require('../.seo-build/seo/publicHtml');
const { psychologyPages } = require('../.seo-build/seo/publicContent');

const profile = {
  id: 'test-id', publicSlug: 'ana-ejemplo', isPubliclyListed: true, user: { name: 'Ana Ejemplo' },
  avatar: 'https://example.com/photo.webp', specialization: 'Psicología', professionalType: 'PSYCHOLOGIST_HEALTH', professionalTypeLabel: 'Psicólogo/a sanitario/a',
  pricePerSession: 50, offersOnline: true, offersInPerson: false, rating: null, reviewCount: null,
  firstVisitFree: false, description: 'Una presentación clara.', matchingProfile: { specialties: ['anxiety'] }, reviews: [],
};
async function invoke(t, url, response, method = 'GET') {
  let requested;
  t.mock.method(global, 'fetch', async (target, options) => { requested = { target, options }; if (response instanceof Error) throw response; return response; });
  const originalRead = fs.readFileSync;
  t.mock.method(fs, 'readFileSync', (file, ...rest) => String(file).endsWith('dist\\app-shell.html') || String(file).endsWith('dist/app-shell.html') ? originalRead('public/index.html', 'utf8') : originalRead(file, ...rest));
  const headers = {}; let html;
  const res = { setHeader(key, value) { headers[key.toLowerCase()] = value; }, end(value) { html = value; } };
  await handler({ method, url }, res);
  return { status: res.statusCode, headers, html, requested };
}
const ok = data => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });
test('profile HTML has specific metadata, readable content and minimal bootstrap', async t => {
  const result = await invoke(t, '/api/public-page?path=/especialista/ana-ejemplo', ok({ ...profile, email: 'private@example.com', religionCode: 'private', matchingProfile: { specialties: ['anxiety'], privateNotes: 'hidden' } }));
  assert.equal(result.status, 200);
  assert.match(result.html, /<h1>Ana Ejemplo<\/h1>/);
  assert.match(result.html, /Psicología sanitaria · HERA/);
  assert.match(result.html, /Ansiedad/);
  assert.match(result.html, /hera-public-data/);
  assert.doesNotMatch(result.html, /private@example.com|privateNotes|religionCode/);
  assert.match(result.headers['cache-control'], /no-store/);
  assert.equal(result.requested.options.headers.Authorization, undefined);
});
test('missing profiles return actual 404 and temporary failures return 503', async t => {
  assert.equal((await invoke(t, '/api/public-page?path=/especialista/missing', { ok: false, status: 404 })).status, 404);
  assert.equal((await invoke(t, '/api/public-page?path=/especialista/ana-ejemplo', new Error('timeout'))).status, 503);
  assert.equal((await invoke(t, '/api/public-page?path=/especialista/ana-ejemplo', { ok: false, status: 429 })).status, 503);
});
test('unlisted direct profiles remain accessible but noindex', async t => {
  const result = await invoke(t, '/api/public-page?path=/especialista/ana-ejemplo', ok({ ...profile, isPubliclyListed: false }));
  assert.equal(result.status, 200);
  assert.match(result.headers['x-robots-tag'], /noindex/);
  assert.match(result.html, /name="robots" content="noindex, follow"/);
});
test('aliases redirect to the canonical profile and preserve booking parameters', async t => {
  const result = await invoke(t, '/api/public-page?path=/e/test-id&intentToken=abc&optionId=option', ok(profile));
  assert.equal(result.status, 308);
  assert.equal(result.headers.location, '/especialista/ana-ejemplo?intentToken=abc&optionId=option');
});
test('all topics request the psychology categories and have distinct readable content', async t => {
  for (const page of Object.values(psychologyPages)) {
    const result = await invoke(t, `/api/public-page?path=${page.path}`, ok({ items: [], page: 1, pageSize: 12, total: 0, hasMore: false }));
    assert.equal(result.status, 200);
    assert.match(result.requested.target, /professionalTypes=PSYCHOLOGIST_HEALTH%2CPSYCHOLOGIST_CLINICAL/);
    assert.ok(result.html.includes(page.heading));
    assert.ok(result.html.includes(page.questions[0].answer));
    assert.match(result.html, /Ahora mismo no hay perfiles/);
  }
});
test('pagination is self canonical and filtered directory is noindex', async t => {
  const card = { ...profile, user: undefined, name: profile.user.name, yearsInPractice: null, gradientId: null, officeCity: null, descriptionExcerpt: null, collegiateNumber: null, specialties: ['anxiety'] };
  const data = { items: [card], page: 2, pageSize: 12, total: 30, hasMore: true };
  const result = await invoke(t, '/api/public-page?path=/especialistas&page=2', ok(data));
  assert.match(result.html, /canonical" href="https:\/\/www.health-hera.com\/especialistas\?page=2/);
  assert.match(result.html, /href="\/especialistas\?page=3"/);
  const filtered = await invoke(t, '/api/public-page?path=/especialistas&specialty=anxiety', ok({ ...data, page: 1 }));
  assert.match(filtered.headers['x-robots-tag'], /noindex/);
});
test('HTML and JSON escape hostile public strings; unknown routes never become online pages', async t => {
  const result = await invoke(t, '/api/public-page?path=/especialista/ana-ejemplo', ok({ ...profile, description: '</script><script>alert(1)</script>' }));
  assert.doesNotMatch(result.html, /<script>alert/);
  assert.match(result.html, /\\u003c/);
  const dollars = await invoke(t, '/api/public-page?path=/especialista/ana-ejemplo', ok({ ...profile, user: { name: 'Ana $& $1' } }));
  assert.ok(dollars.html.includes('<h1>Ana $&amp; $1</h1>'));
  assert.ok(dollars.html.includes('<title>Ana $&amp; $1 |'));
  assert.equal((await invoke(t, '/api/public-page?path=/psicologos/inventado', ok(profile))).status, 404);
  assert.equal((await invoke(t, '/api/public-page?path=/especialista/ana-ejemplo', ok(profile), 'HEAD')).html, undefined);
});
test('server metadata uses the same public profile fields as the client', () => {
  const parsed = publicProfileSchema.parse(profile);
  assert.equal(profilePageMetadata(parsed).title, 'Ana Ejemplo | Psicología sanitaria · HERA');
  assert.equal((injectPublicHtml('<head></head><div id="root"></div>', '<h1>Hola</h1>').match(/<h1>/g) || []).length, 1);
});

test('initial directory preserves experience and age filters for the matching screen', async t => {
  const query = 'minExperienceYears=5&minAge=30&maxAge=60';
  const result = await invoke(t, `/api/public-page?path=/especialistas&${query}`, ok({ items: [], page: 1, pageSize: 12, total: 0, hasMore: false }));
  const forwarded = new URL(result.requested.target).searchParams;
  assert.equal(forwarded.get('minExperienceYears'), '5');
  assert.equal(forwarded.get('minAge'), '30');
  assert.equal(forwarded.get('maxAge'), '60');
  assert.match(result.headers['x-robots-tag'], /noindex, follow/);
  assert.ok(result.html.includes('data-key="/specialists/directory?minExperienceYears=5&amp;minAge=30&amp;maxAge=60"'));
});
