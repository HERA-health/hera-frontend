import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../..');

describe('dynamic specialist sitemap deployment contract', () => {
  it('proxies the canonical sitemap while leaving unknown paths to the static 404', () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8')
    ) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(vercelConfig.rewrites.find(rule => rule.source === '/sitemap.xml')).toEqual({
      source: '/sitemap.xml',
      destination: 'https://api.health-hera.com/sitemap.xml',
    });
    expect(vercelConfig.rewrites.some(rule => rule.source === '/(.*)' || rule.source === '/:path*')).toBe(false);
    const sitemapIndex = vercelConfig.rewrites.findIndex(rule => rule.source === '/sitemap.xml');
    const appIndex = vercelConfig.rewrites.findIndex(rule => rule.destination === '/app-shell.html');
    expect(appIndex).toBeGreaterThan(sitemapIndex);
    const notFoundHtml = fs.readFileSync(path.join(projectRoot, 'public', '404.html'), 'utf8');
    expect(notFoundHtml).toContain('noindex, follow');
    expect(fs.existsSync(path.join(projectRoot, 'public', 'sitemap.xml'))).toBe(false);
  });

  it('advertises the canonical sitemap from robots.txt', () => {
    const robots = fs.readFileSync(
      path.join(projectRoot, 'public', 'robots.txt'),
      'utf8'
    );

    expect(robots).toContain('Sitemap: https://www.health-hera.com/sitemap.xml');
  });
});
