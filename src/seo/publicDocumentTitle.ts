const publicRoutes = new Set(['Landing', 'PublicSpecialists', 'PublicSpecialistProfile', 'PsychologyOnline', 'PsychologyTopic']);

/** React Navigation can update the title after a screen's metadata effect. */
export function publicDocumentTitle(routeName?: string): string | undefined {
  if (typeof document === 'undefined' || typeof window === 'undefined' || !window.location) return;
  if (routeName && !publicRoutes.has(routeName)) return;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const title = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
  if (!canonical || !title) return;
  try {
    if (new URL(canonical.href).pathname === window.location.pathname) return title;
  } catch { return; }
}
