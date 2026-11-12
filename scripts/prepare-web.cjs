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
  for (const file of ['seo/publicContent', 'seo/publicData', 'seo/publicHtml', 'seo/psychologyPresentation', 'constants/theme', 'constants/publicHeaderLinks', 'constants/professionalMatchingCatalog']) {
    const source = fs.readFileSync('src/' + file + '.ts', 'utf8');
    const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const destination = '.seo-build/' + file + '.js';
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, result.outputText);
  }
}
function prepare() {
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
  const logo = fs.readdirSync('dist/assets/assets').find(name => name.startsWith('main-logo.') && name.endsWith('.png'));
  if (!logo) throw new Error('Missing HERA public logo');
  const brandStyle = ':root{--hera-public-logo:url("/assets/assets/' + logo + '")}';
  const shell = fs.readFileSync('dist/index.html', 'utf8').replace('</head>', '<style>' + fonts + brandStyle + '</style></head>');
  fs.writeFileSync('dist/app-shell.html', shell);
  for (const route of paths.filter(route => route && !route.includes(':') && !['especialistas', 'psicologos-online'].includes(route))) {
    const destination = path.join('dist', route, 'index.html');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, shell);
  }
  for (const file of ['landing/LandingPage.tsx', 'landing/PricingScreen.tsx', 'landing/ProfessionalShowcaseScreen.tsx']) {
    const metadata = pageMetadata(`src/screens/${file}`);
    const destination = path.join('dist', metadata.canonicalPath, 'index.html');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    let page = renderMetadata(shell, metadata);
    if (metadata.canonicalPath === '/') {
      const { injectPublicHtml, landingHtml } = require('../.seo-build/seo/publicHtml');
      const photo = fs.readdirSync('dist/assets/assets/landing').find(name => name.startsWith('psychologist-landscape-1024.') && name.endsWith('.webp'));
      page = injectPublicHtml(page, landingHtml('/assets/assets/landing/' + photo));
    }
    fs.writeFileSync(destination, page);
  }
}
if (require.main === module) prepare();
module.exports = { staticPaths, pageMetadata, renderMetadata, compilePublicHtml };
