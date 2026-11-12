const fs = require('node:fs');
const path = require('node:path');
const { psychologyPages, topicForPath, directoryHref, directoryMetadata } = require('../.seo-build/seo/publicContent');
const { publicProfileSchema, directoryPageSchema } = require('../.seo-build/seo/publicData');
const { injectPublicHtml, psychologyHtml, directoryHtml, profileHtml, profilePageMetadata, pageFrame, escapeHtml } = require('../.seo-build/seo/publicHtml');
const { renderPublicMetadata: renderMetadata } = require('../.seo-build/seo/publicHtml');

let shell;
const getShell = () => shell || (shell = fs.readFileSync(path.join(process.cwd(), 'dist/app-shell.html'), 'utf8'));
const origin = 'https://www.health-hera.com';
const apiOrigin = (process.env.EXPO_PUBLIC_API_URL || 'https://api.health-hera.com/api').replace(/\/$/, '');

async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD'); res.statusCode = 405; return res.end();
  }
  const url = new URL(req.url, origin);
  const route = url.searchParams.get('path') || url.pathname;
  url.searchParams.delete('path');
  // Vercel includes named rewrite captures in the function query. They are
  // routing details, not booking/return parameters to preserve in redirects.
  url.searchParams.delete('profileRef');
  url.searchParams.delete('topic');
  const send = (status, metadata, body, key, data) => {
    res.statusCode = status;
    // Error documents stay useful independently of app/API recovery.
    const template = status >= 400 ? getShell().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') : getShell();
    let html = renderMetadata(template, metadata);
    if (metadata.indexable === false) html = html.replace(/(<meta name="robots" content=")[^"]*/, '$1noindex, follow');
    return res.end(req.method === 'HEAD' ? undefined : injectPublicHtml(html, body, key, data));
  };
  const failure = (status) => {
    const heading = status === 404 ? 'No encontramos esta página' : status === 400 ? 'Revisa los filtros de búsqueda' : 'No hemos podido cargar esta página';
    // Error responses stay usable even if the application cannot start.
    res.setHeader('X-Robots-Tag', 'noindex');
    return send(status, { title: `${heading} · HERA`, description: heading, canonicalPath: route, indexable: false }, pageFrame(`<h1>${heading}</h1><p>${status === 503 ? 'Puedes volver a intentarlo en unos instantes.' : 'Puedes seguir buscando en el directorio.'}</p><a href="/especialistas">Explorar el directorio</a>${status === 503 ? ` · <a href="${escapeHtml(route)}">Volver a intentar</a>` : ''}`));
  };
  try {
    const topic = topicForPath(route);
    const profile = route.match(/^\/(?:especialista|e)\/([^/]{1,120})\/?$/);
    if (!topic && !profile && route !== '/especialistas') return failure(404);
    let apiPath;
    let params = new URLSearchParams();
    if (profile) apiPath = `/specialists/public/${encodeURIComponent(decodeURIComponent(profile[1]))}`;
    else {
      if (topic) params = new URL(directoryHref(psychologyPages[topic].filters), origin).searchParams;
      else {
        const allowed = new Set(['page', 'professionalType', 'professionalTypes', 'modality', 'specialty', 'approach', 'q', 'language', 'minRating', 'maxPrice', 'minExperienceYears', 'minAge', 'maxAge', 'sort']);
        for (const [key, value] of url.searchParams) if (allowed.has(key)) params.append(key, value);
      }
      apiPath = `/specialists/directory${params.size ? `?${params}` : ''}`;
    }
    const response = await fetch(`${apiOrigin}${apiPath}`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' }, redirect: 'error' });
    if (response.status === 404 || response.status === 410 || response.status === 403) return failure(profile ? 404 : 503);
    if (response.status === 400) return failure(400);
    if (!response.ok) { res.setHeader('Retry-After', '60'); return failure(503); }
    const envelope = await response.json();
    if (!envelope || envelope.success !== true) return failure(503);
    if (profile) {
      const data = publicProfileSchema.parse(envelope.data);
      const canonicalPath = `/especialista/${encodeURIComponent(data.publicSlug || data.id)}`;
      if (canonicalPath !== route) {
        res.statusCode = 308;
        res.setHeader('Location', `${canonicalPath}${url.searchParams.size ? `?${url.searchParams}` : ''}`);
        return res.end();
      }
      const indexable = data.isPubliclyListed && !!(data.avatar || data.user.avatar) && data.pricePerSession > 0;
      if (!indexable) res.setHeader('X-Robots-Tag', 'noindex, follow');
      return send(200, { ...profilePageMetadata(data), canonicalPath, indexable }, profileHtml(data), apiPath, data);
    }
    const data = directoryPageSchema.parse(envelope.data);
    if (!topic && data.page > 1 && !data.items.length) return failure(404);
    if (topic) {
      const page = psychologyPages[topic];
      return send(200, { title: page.title, description: page.description, canonicalPath: page.path }, psychologyHtml(page, data), apiPath, data);
    }
    const filtered = [...params.keys()].some(key => key !== 'page');
    const canonicalPath = `/especialistas${data.page > 1 ? `?page=${data.page}` : ''}`;
    if (filtered) res.setHeader('X-Robots-Tag', 'noindex, follow');
    return send(200, { ...directoryMetadata, canonicalPath: filtered ? `/especialistas?${params}` : canonicalPath, indexable: !filtered }, directoryHtml(data, params), apiPath, data);
  } catch {
    res.setHeader('Retry-After', '60');
    return failure(503);
  }
}
module.exports = handler;
