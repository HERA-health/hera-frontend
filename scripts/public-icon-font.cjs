const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const subsetFont = require('subset-font');

// Keep Expo's full font as the fallback for dynamic names and subsequent screens.
module.exports = async function publicIconFont() {
  const vendor = 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons';
  const glyphs = JSON.parse(fs.readFileSync(path.join(vendor, 'glyphmaps/Ionicons.json'), 'utf8'));
  const codes = new Set();
  for (const directory of ['src/screens/landing', 'src/components/common', 'src/components/features']) {
    for (const source of fs.readdirSync(directory, { recursive: true })) {
      if (!/\.tsx?$/.test(source) || source.includes('__tests__')) continue;
      const text = fs.readFileSync(path.join(directory, source), 'utf8');
      for (const [, name] of text.matchAll(/['"]([a-z0-9-]+)['"]/g)) {
        if (Object.hasOwn(glyphs, name)) codes.add(glyphs[name]);
      }
    }
  }
  const font = fs.readFileSync(path.join(vendor, 'Fonts/Ionicons.ttf'));
  const full = fs.readdirSync('dist/assets', { recursive: true })
    .find(file => /(?:^|[/\\])Ionicons\.[a-f0-9]+\.ttf$/.test(file));
  if (!full || !codes.size) throw new Error('Missing web icon font or public glyphs');
  const points = [...codes].sort((a, b) => a - b);
  const subset = await subsetFont(font, String.fromCodePoint(...points), { targetFormat: 'woff2' });
  const hash = createHash('sha256').update(subset).digest('hex').slice(0, 32);
  const file = 'public-icons.' + hash + '.woff2';
  fs.writeFileSync(path.join('dist/assets', file), subset);
  const range = points.map(code => 'U+' + code.toString(16)).join(',');
  return '@font-face{font-family:ionicons;src:url("/assets/' + full.replaceAll('\\','/') + '");font-display:block}' +
    '@font-face{font-family:ionicons;src:url("/assets/' + file + '") format("woff2");font-display:block;unicode-range:' + range + '}';
};
