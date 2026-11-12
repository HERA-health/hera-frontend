/** @jest-environment jsdom */
Object.assign(globalThis, {
  TextEncoder: require('node:util').TextEncoder,
  TextDecoder: require('node:util').TextDecoder,
  URL: require('node:url').URL,
  URLSearchParams: require('node:url').URLSearchParams,
});
import { z } from 'zod';
import { takePublicBootstrap } from '../publicData';
import { publicDocumentTitle } from '../publicDocumentTitle';

afterEach(() => { document.head.innerHTML = ''; document.body.innerHTML = ''; });

test('bootstrap is consumed once, validates its fields and tolerates query ordering', () => {
  document.body.innerHTML = '<script id="hera-public-data" type="application/json" data-key="/specialists/directory?modality=ONLINE&amp;page=2">{"page":2,"privateField":"discard"}</script>';
  const schema = z.object({ page: z.number() });
  expect(takePublicBootstrap('/specialists/directory?page=2&modality=ONLINE', schema)).toEqual({ page: 2 });
  expect(takePublicBootstrap('/specialists/directory?page=2&modality=ONLINE', schema)).toBeUndefined();
});

test('unrelated navigation never consumes another page bootstrap', () => {
  document.body.innerHTML = '<script id="hera-public-data" data-key="/specialists/public/ana">{"name":"Ana"}</script>';
  expect(takePublicBootstrap('/specialists/public/maria', z.object({ name: z.string() }))).toBeUndefined();
  expect(document.getElementById('hera-public-data')).not.toBeNull();
});

test('navigation preserves the resolved public title without borrowing titles from another route', () => {
  document.head.innerHTML = `<link rel="canonical" href="${window.location.origin}${window.location.pathname}"><meta property="og:title" content="Ana | Psicología sanitaria · HERA">`;
  expect(publicDocumentTitle('PublicSpecialistProfile')).toBe('Ana | Psicología sanitaria · HERA');
  expect(publicDocumentTitle('Login')).toBeUndefined();
  document.querySelector('link')?.setAttribute('href', 'https://www.health-hera.com/another-profile');
  expect(publicDocumentTitle('PublicSpecialistProfile')).toBeUndefined();
});
