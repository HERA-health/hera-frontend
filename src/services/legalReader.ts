import config, { getWebAppUrl } from '../config/api';
import { legalSlugFor } from '../constants/legal';

export type LegalAudience = 'CLIENT' | 'PROFESSIONAL' | 'CLINIC';
const termsSlug = { CLIENT: 'terminos-pacientes', PROFESSIONAL: 'terminos-especialistas', CLINIC: 'terminos-clinicas' };
export function legalReaderUrl(keyOrSlug: string, version?: string, audience?: LegalAudience) {
  const slug = keyOrSlug === 'TERMS_OF_SERVICE' && audience ? termsSlug[audience]
    : legalSlugFor(keyOrSlug);
  const origin = __DEV__ ? new URL(config().apiUrl).origin : getWebAppUrl();
  return origin + '/legal/' + encodeURIComponent(slug) + (version ? '/' + encodeURIComponent(version) : '');
}
