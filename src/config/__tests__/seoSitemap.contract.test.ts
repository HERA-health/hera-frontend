import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../..');

describe('dynamic specialist sitemap deployment contract', () => {
  it('proxies the canonical root sitemap to the backend before the SPA fallback', () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8')
    ) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(vercelConfig.rewrites[0]).toEqual({
      source: '/sitemap.xml',
      destination: 'https://api.health-hera.com/sitemap.xml',
    });
    expect(vercelConfig.rewrites[1]).toEqual({
      source: '/(.*)',
      destination: '/index.html',
    });
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
