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
function prepare() {
  const rewrites = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).rewrites;
  const paths = staticPaths();
  if (paths.length < 30) throw new Error('Unable to read navigation routes');
  for (const route of paths.filter(route => route.includes(':') && !route.startsWith('legal/'))) {
    if (!rewrites.some(rule => rule.source === `/${route}` && rule.destination === '/app-shell.html')) {
      throw new Error(`Missing web rewrite for ${route}`);
    }
  }
  const shell = fs.readFileSync('dist/index.html', 'utf8');
  fs.writeFileSync('dist/app-shell.html', shell);
  for (const route of paths.filter(route => route && !route.includes(':'))) {
    const destination = path.join('dist', route, 'index.html');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, shell);
  }
  for (const file of ['landing/LandingPage.tsx', 'landing/PricingScreen.tsx', 'landing/ProfessionalShowcaseScreen.tsx', 'specialists/PublicSpecialistsScreen.tsx']) {
    const metadata = pageMetadata(`src/screens/${file}`);
    const destination = path.join('dist', metadata.canonicalPath, 'index.html');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, renderMetadata(shell, metadata));
  }
}
if (require.main === module) prepare();
module.exports = { staticPaths, pageMetadata, renderMetadata };
