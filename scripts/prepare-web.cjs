// Generate static entry points after Expo export. No runtime rendering or API calls.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function parse(file) {
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, child => visit(child, callback));
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function pageMetadata(file) {
  let metadata;
  visit(parse(file), node => {
    if (ts.isCallExpression(node) && node.expression.getText() === 'useWebPageMetadata') {
      metadata = {};
      for (const property of node.arguments[0].properties) {
        if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer)) {
          metadata[property.name.getText()] = property.initializer.text;
        }
      }
    }
  });
  if (!metadata?.title || !metadata.description || !metadata.canonicalPath) throw new Error(`Missing static metadata: ${file}`);
  return metadata;
}
function renderMetadata(html, metadata) {
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const canonical = `https://www.health-hera.com${metadata.canonicalPath}`;
  return html.replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*/g, `$1${description}`)
    .replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*/g, `$1${title}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${canonical}`)
    .replace('</head>', `<link rel="canonical" href="${canonical}" />\n  </head>`);
}
function staticPaths() {
  const routes = new Map();
  // Only screen definitions, excluding parse/stringify callbacks and their literals.
  visit(parse('App.tsx'), node => {
    if (!ts.isPropertyAssignment(node) || node.name.getText() !== 'screens' || !ts.isObjectLiteralExpression(node.initializer)) return;
    function collect(object) {
      for (const property of object.properties) {
        if (ts.isSpreadAssignment(property) && ts.isParenthesizedExpression(property.expression)) {
          const expression = property.expression.expression;
          if (ts.isConditionalExpression(expression) && ts.isObjectLiteralExpression(expression.whenTrue)) collect(expression.whenTrue);
        } else if (ts.isPropertyAssignment(property)) {
          const value = property.initializer;
          const paths = [];
          if (ts.isStringLiteral(value)) paths.push(value.text);
          if (ts.isObjectLiteralExpression(value)) for (const entry of value.properties) {
            if (!ts.isPropertyAssignment(entry)) continue;
            if (entry.name.getText() === 'path' && ts.isStringLiteral(entry.initializer)) paths.push(entry.initializer.text);
            if (entry.name.getText() === 'alias' && ts.isArrayLiteralExpression(entry.initializer)) {
              for (const alias of entry.initializer.elements) if (ts.isStringLiteral(alias)) paths.push(alias.text);
            }
          }
          routes.set(property.name.getText(), paths);
        }
      }
    }
    collect(node.initializer);
  });
  // React Navigation uses the screen name for routes without an explicit path.
  visit(parse('src/navigation/documentTitles.ts'), node => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === 'ROUTE_TITLES') {
      for (const property of node.initializer.properties) if (!routes.has(property.name.getText())) routes.set(property.name.getText(), [property.name.getText()]);
    }
  });
  // Guest consent screens are selected before React Navigation in App.tsx.
  return [...routes.values()].flat().concat(['clinic-consent/:requestId', 'clinical-consent/guest/:requestId']);
}
function compilePublicHtml() {
  for (const file of ['config/api', 'seo/initialPricingCatalog', 'seo/webPageSchema', 'seo/publicNavigation', 'seo/publicBar', 'seo/publicFooter', 'constants/publicFooter', 'seo/professionalContent', 'seo/professionalPresentation', 'seo/subscriptionCatalog', 'screens/landing/pricingContent', 'seo/publicContent', 'seo/publicData', 'seo/publicHtml', 'seo/landingProfessionalMenu', 'seo/landingInitialHtml', 'seo/directoryInitialHtml', 'seo/directoryIcons', 'screens/specialist-profile/profilePresentation', 'constants/professionalMatchingOptions', 'seo/landingIcons', 'seo/psychologyPresentation', 'constants/themeIconPaths', 'constants/theme', 'constants/colors', 'constants/publicAudienceTheme', 'constants/publicHeaderLinks', 'constants/professionalNavigation', 'constants/professionalMatchingCatalog']) {
    const source = fs.readFileSync('src/' + file + '.ts', 'utf8');
    const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const destination = '.seo-build/' + file + '.js';
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, result.outputText);
  }
}
async function prepare() {
  // Use the same public API origin as the Expo production export, including .env files.
  require('@expo/env').loadProjectEnv(process.cwd(), { mode: process.env.NODE_ENV || 'production', silent: true });
  compilePublicHtml();
  const rewrites = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).rewrites;
  const paths = staticPaths();
  if (paths.length < 30) throw new Error('Unable to read navigation routes');
  for (const route of paths.filter(route => route.includes(':') && !route.startsWith('legal/'))) {
    if (!rewrites.some(rule => rule.source === `/${route}` && (rule.destination === '/app-shell.html' || rule.destination.startsWith('/api/public-page?')))) {
      throw new Error(`Missing web rewrite for ${route}`);
    }
  }
  const assets = fs.readdirSync('dist/assets/assets/fonts');
  const fonts = [['HeraDisplay', 'Lustria-Regular'], ['HeraSans', 'GlacialIndifference-Regular'], ['HeraSans-Bold', 'GlacialIndifference-Bold']].map(([family, prefix]) => {
    const file = assets.find(name => name.startsWith(prefix + '.'));
    if (!file) throw new Error('Missing public font: ' + family);
    return '@font-face{font-family:"' + family + '";src:url("/assets/assets/fonts/' + file + '");font-display:swap}';
  }).join('');
  const logo = fs.readdirSync('dist/assets/assets').find(name => name.startsWith('main-logo.') && name.endsWith('.webp'));
  if (!logo) throw new Error('Missing HERA public logo');
  const brandAsset = (prefix) => {
    const file = fs.readdirSync('dist/assets/assets').find(name => name.startsWith(prefix + '.') && name.endsWith('.webp'));
    if (!file) throw new Error('Missing public brand asset: ' + prefix);
    return '/assets/assets/' + file;
  };
  const brandStyle = ':root{--hera-public-logo:url("/assets/assets/' + logo + '");--hera-public-logo-dark:url("' + brandAsset('Logo-Hera-beige-oscuro') + '");--hera-public-mark:url("' + brandAsset('Isotipo-Hera-Azul-oscuro-original') + '");--hera-public-mark-dark:url("' + brandAsset('Isotipo-Hera-beige-claro') + '")}';
  const icons = await require('./public-icon-font.cjs')();
  const shell = fs.readFileSync('dist/index.html', 'utf8').replace('</head>',
    '<style id="expo-generated-fonts">' + fonts + icons + '</style><style>' + brandStyle + '</style></head>');
  const appShell = shell.replace(/(<meta name="robots" content=")[^"]*/, '$1noindex, follow');
  fs.writeFileSync('dist/app-shell.html', appShell);
  // A previous export must not shadow the runtime catalog route on Vercel.
  for (const route of paths.filter(route => route && !route.includes(':') && !['especialistas', 'psicologos-online'].includes(route))) {
    const destination = path.join('dist', route, 'index.html');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, appShell);
  }
  const preloadFonts = ['Lustria-Regular', 'GlacialIndifference-Regular', 'GlacialIndifference-Bold'].map(prefix => {
    const file = assets.find(name => name.startsWith(prefix + '.'));
    return '<link rel="preload" as="font" href="/assets/assets/fonts/' + file + '" crossorigin>';
  }).join('');
  for (const file of ['landing/LandingPage.tsx', 'landing/PricingScreen.tsx']) {
    const metadata = pageMetadata(`src/screens/${file}`);
    const destination = path.join('dist', metadata.canonicalPath, 'index.html');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    let page = renderMetadata(shell, metadata).replace('</head>', preloadFonts + '</head>');
    if (metadata.canonicalPath === '/') {
      const { publicFooterHtml } = require('../.seo-build/seo/publicFooter');
      const { injectPublicHtml } = require('../.seo-build/seo/publicHtml');
      const { landingInitialCss, landingInitialHtml } = require('../.seo-build/seo/landingInitialHtml');
      const { landingIcons } = require('../.seo-build/seo/landingIcons');
      const photo = (width) => {
        const name = fs.readdirSync('dist/assets/assets/landing').find(name => name.startsWith('psychologist-landscape-' + width + '.') && name.endsWith('.webp'));
        if (!name) throw new Error('Missing landing photograph: ' + width);
        return '/assets/assets/landing/' + name;
      };
      // Read only the existing public theme preference before first paint. This
      // build-only presentation never adds code to the application bundle.
      const { publicThemeBoot: themeBoot } = require('../.seo-build/seo/publicNavigation');
      page = injectPublicHtml(page.replace('</head>', themeBoot + '<style>' + landingInitialCss + '</style></head>'), landingInitialHtml({ photo: photo(1024), photos: { small: photo(640), large: photo(1536) }, icons: landingIcons }) + publicFooterHtml());
    }
    if (metadata.canonicalPath === '/planes') {
      const { apiEndpoints, isLocalWebHostname } = require('../.seo-build/config/api');
      const { publicHeaderHtml, publicThemeBoot, publicNavigationCss } = require('../.seo-build/seo/publicNavigation');
      const { publicBarCss } = require('../.seo-build/seo/publicBar');
      const { DIRECTORY_OFFER, pricingIntro } = require('../.seo-build/screens/landing/pricingContent');
      const { lightTheme, darkTheme } = require('../.seo-build/constants/theme');
      page = page.replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>
        <style>body{overflow:auto;background:#faf8f3;color:#3e5c4f}.pricing-offline{max-width:42rem;margin:8vh auto;padding:24px;font:18px/1.6 HeraSans,sans-serif}.pricing-offline h1{font:36px/1.2 HeraDisplay,serif}.pricing-offline a{color:inherit}</style>
        <main class="pricing-offline"><h1>Planes para tu consulta de psicología.</h1>
        <p>Puedes recibir pacientes desde el directorio de HERA sin cuota mensual fija y con comisión por sesión. Los planes Calma, Crecimiento y Horizonte ofrecen distintas prestaciones para gestionar tu consulta.</p>
        <p>Activa JavaScript para consultar los precios vigentes, comparar prestaciones y solicitar la prueba de un plan.</p>
        <a href="/software-para-psicologos">Conocer HERA para profesionales</a> · <a href="/profesionales/recorrido">Explorar las pantallas</a></main>
      </noscript>`);
      page = require('./pricing-first-paint.cjs')(page, {
        apiUrls: apiEndpoints, localHostname: isLocalWebHostname, header: publicHeaderHtml(),
        themeBoot: publicThemeBoot, navigationCss: publicNavigationCss + publicBarCss, offer: DIRECTORY_OFFER,
        copy: pricingIntro, light: lightTheme, dark: darkTheme,
      });
    }
    fs.writeFileSync(destination, page);
  }
  const { publicFooterHtml } = require('../.seo-build/seo/publicFooter');
  const { professionalPages } = require('../.seo-build/seo/professionalContent');
  const { professionalHtml, professionalTourHtml, professionalCss, tourMetadata } = require('../.seo-build/seo/professionalPresentation');
  const { publicThemeBoot } = require('../.seo-build/seo/publicNavigation');
  const { injectPublicHtml } = require('../.seo-build/seo/publicHtml');
  const { webPageSchema } = require('../.seo-build/seo/webPageSchema');
  const portrait = fs.readdirSync('dist/assets/assets/landing').find(file => file.startsWith('psychologist-portrait-480.') && file.endsWith('.webp'));
  if (!portrait) throw new Error('Missing professional profile photograph');
  const pages = Object.entries(professionalPages).map(([id, page]) => ({ metadata: { ...page, canonicalPath: page.path }, body: professionalHtml(id, '/assets/assets/landing/' + portrait) }));
  pages.push({ metadata: tourMetadata, body: professionalTourHtml() });
  for (const { metadata, body } of pages) {
    const destination = path.join('dist', metadata.canonicalPath, 'index.html');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const canonical = 'https://www.health-hera.com' + metadata.canonicalPath;
    const schema = webPageSchema(metadata.title, metadata.description, canonical);
    const initial = renderMetadata(shell, metadata).replace('</head>', publicThemeBoot + '<style>' + professionalCss + '</style><script id="hera-page-schema" type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script></head>');
    fs.writeFileSync(destination, injectPublicHtml(initial, body + publicFooterHtml()));
  }
}
if (require.main === module) prepare();
module.exports = { staticPaths, pageMetadata, renderMetadata, compilePublicHtml };
