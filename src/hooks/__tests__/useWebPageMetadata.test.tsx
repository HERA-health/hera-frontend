/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useWebPageMetadata } from '../useWebPageMetadata';

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => ReactModule.useEffect(effect, [effect]),
  };
});

interface MetadataProps {
  title: string;
  description: string;
  canonicalPath: string;
  indexable: boolean;
}

describe('useWebPageMetadata', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    document.head.querySelectorAll('link[rel="canonical"]').forEach((element) => element.remove());
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    document.head.querySelectorAll('link[rel="canonical"]').forEach((element) => element.remove());
  });

  it('keeps one canonical and updates route-specific robots and Open Graph metadata', () => {
    const duplicateOne = document.createElement('link');
    duplicateOne.rel = 'canonical';
    duplicateOne.href = 'https://example.com/old-one';
    document.head.appendChild(duplicateOne);
    const duplicateTwo = document.createElement('link');
    duplicateTwo.rel = 'canonical';
    duplicateTwo.href = 'https://example.com/old-two';
    document.head.appendChild(duplicateTwo);

    const { rerender, unmount } = renderHook(
      (props: MetadataProps) => useWebPageMetadata(props),
      {
        initialProps: {
          title: 'Hera | Especialistas',
          description: 'Directorio público',
          canonicalPath: '/especialistas',
          indexable: true,
        },
      }
    );

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href)
      .toMatch(/\/especialistas$/);
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content)
      .toBe('index, follow');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content)
      .toBe('Hera | Especialistas');

    rerender({
      title: 'Perfil no disponible | HERA',
      description: 'Perfil público',
      canonicalPath: '/especialista/inexistente',
      indexable: false,
    });

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content)
      .toBe('noindex, nofollow');

    unmount();
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(0);
  });

  it('does not let a previous route cleanup overwrite the active route metadata', () => {
    const previousRoute = renderHook(() => useWebPageMetadata({
      title: 'Hera | Inicio',
      description: 'Landing',
      canonicalPath: '/',
    }));
    const activeRoute = renderHook(() => useWebPageMetadata({
      title: 'Hera | Especialistas',
      description: 'Directorio público',
      canonicalPath: '/especialistas',
    }));

    previousRoute.unmount();

    expect(document.title).toBe('Hera | Especialistas');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href)
      .toMatch(/\/especialistas$/);
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content)
      .toBe('index, follow');

    activeRoute.unmount();
  });
});
