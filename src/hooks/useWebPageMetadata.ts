import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getWebAppUrl } from '../config/api';

interface WebPageMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  indexable?: boolean;
  openGraphType?: 'website' | 'profile';
}

const DEFAULT_TITLE = 'HERA';
const DEFAULT_DESCRIPTION = 'HERA, plataforma para especialistas y pacientes de salud mental.';

const setNamedMeta = (name: string, content: string): void => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }

  element.content = content;
};

const setPropertyMeta = (property: string, content: string): void => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }

  element.content = content;
};

const setCanonical = (url: string): void => {
  const canonicalElements = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')
  );
  const canonical = canonicalElements.shift() ?? document.createElement('link');

  canonical.rel = 'canonical';
  canonical.href = url;
  canonical.dataset.heraRouteMetadata = 'true';

  if (!canonical.parentNode) {
    document.head.appendChild(canonical);
  }

  canonicalElements.forEach((duplicate) => duplicate.remove());
};

export const useWebPageMetadata = ({
  title,
  description,
  canonicalPath,
  indexable = true,
  openGraphType = 'website',
}: WebPageMetadata): void => {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') {
        return undefined;
      }

      const normalizedPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
      const canonicalUrl = `${getWebAppUrl()}${normalizedPath}`;
      const robots = indexable ? 'index, follow' : 'noindex, nofollow';

      document.title = title;
      setNamedMeta('description', description);
      setNamedMeta('robots', robots);
      setNamedMeta('twitter:title', title);
      setNamedMeta('twitter:description', description);
      setPropertyMeta('og:title', title);
      setPropertyMeta('og:description', description);
      setPropertyMeta('og:url', canonicalUrl);
      setPropertyMeta('og:type', openGraphType);
      setCanonical(canonicalUrl);

      return () => {
        const canonical = document.head.querySelector<HTMLLinkElement>(
          'link[rel="canonical"][data-hera-route-metadata="true"]'
        );
        if (canonical?.href !== canonicalUrl) {
          return;
        }

        canonical.remove();
        document.title = DEFAULT_TITLE;
        setNamedMeta('description', DEFAULT_DESCRIPTION);
        setNamedMeta('robots', 'noindex, nofollow');
        setNamedMeta('twitter:title', DEFAULT_TITLE);
        setNamedMeta('twitter:description', DEFAULT_DESCRIPTION);
        setPropertyMeta('og:title', DEFAULT_TITLE);
        setPropertyMeta('og:description', DEFAULT_DESCRIPTION);
        setPropertyMeta('og:url', getWebAppUrl());
        setPropertyMeta('og:type', 'website');
      };
    }, [canonicalPath, description, indexable, openGraphType, title])
  );
};
