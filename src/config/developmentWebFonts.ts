import { Asset } from 'expo-asset';
import Ionicons from '@expo/vector-icons/Ionicons';

/** Mirror the web export's declarative fonts when Metro serves the development HTML. */
export function registerDevelopmentWebFonts(brandFaces: Record<string, number>) {
  const id = 'expo-generated-fonts';
  const sheet = document.getElementById(id) ?? document.createElement('style');
  if (!(sheet instanceof HTMLStyleElement)) return;
  if (!sheet.isConnected) {
    sheet.id = id;
    document.head.appendChild(sheet);
  }
  const registered = new Set(Array.from(sheet.sheet?.cssRules ?? [])
    .filter((rule): rule is CSSFontFaceRule => rule instanceof CSSFontFaceRule)
    .map(rule => rule.style.fontFamily.replace(/^["']|["']$/g, '')));
  for (const [family, asset] of Object.entries({ ...brandFaces, ...Ionicons.font })) {
    if (registered.has(family)) continue;
    const url = Asset.fromModule(asset).uri;
    const display = family === 'ionicons' ? 'block' : 'swap';
    sheet.appendChild(document.createTextNode(`@font-face{font-family:${family};src:url(${JSON.stringify(url)});font-display:${display}}`));
  }
}
