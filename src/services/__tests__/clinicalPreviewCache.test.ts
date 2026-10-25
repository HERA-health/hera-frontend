import { Platform } from 'react-native';
import { createClinicalPreview, releaseClinicalPreview, cleanupClinicalPreviews } from '../clinicalPreviewCache';

const mockFiles = new Map<string, Uint8Array>();
const mockDirectories = new Set<string>();
const mockDeleteFailures = new Set<string>();
let mockWriteFailure = false;
let mockId = 0;
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../../utils/secureRandom', () => ({ createSecureRandomUuid: () => `synthetic-${++mockId}` }));
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) {
      this.uri = `${typeof parent === 'string' ? parent : parent.uri}${name ? `/${name}` : ''}`;
    }
    get name() { return this.uri.split('/').pop(); }
    get exists() { return mockFiles.has(this.uri); }
    create() { mockFiles.set(this.uri, new Uint8Array()); }
    write(bytes: Uint8Array) {
      if (mockWriteFailure) throw new Error('Disk write failure');
      mockFiles.set(this.uri, bytes);
    }
    delete() {
      if (mockDeleteFailures.has(this.uri)) throw new Error('Disk delete failure');
      mockFiles.delete(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(parent: { uri: string }, name?: string) { this.uri = `${parent.uri}${name ? `/${name}` : ''}`; }
    get exists() { return mockDirectories.has(this.uri); }
    create() { mockDirectories.add(this.uri); }
    list() {
      return [...mockFiles.keys()].filter(uri => uri.slice(0, uri.lastIndexOf('/')) === this.uri)
        .map(uri => new File(uri));
    }
  }
  return { File, Directory, Paths: { cache: { uri: 'file:///cache' } } };
});
beforeEach(() => {
  Platform.OS = 'ios';
  mockFiles.clear(); mockDirectories.clear(); mockDeleteFailures.clear(); mockWriteFailure = false;
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('startup removes interrupted and legacy previews without touching other files', () => {
  mockDirectories.add('file:///cache/hera-clinical-previews');
  const old = 'file:///cache/hera-clinical-previews/interrupted';
  const legacy = 'file:///cache/preview-12345678-1234-4234-8234-123456789abc';
  const originals = ['file:///documents/patient.jpg', 'file:///cache/preview-holiday.jpg', 'file:///cache/unrelated'];
  for (const uri of [old, legacy, ...originals]) mockFiles.set(uri, new Uint8Array([1]));
  cleanupClinicalPreviews();
  expect(mockFiles.has(old)).toBe(false);
  expect(mockFiles.has(legacy)).toBe(false);
  expect([...mockFiles.keys()]).toEqual(originals);
});

test('foreground cleanup preserves live previews; releasing one removes its bytes', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const first = createClinicalPreview(bytes);
  const second = createClinicalPreview(bytes);
  cleanupClinicalPreviews();
  expect(mockFiles.get(first.uri)).toEqual(bytes);
  expect(mockFiles.has(second.uri)).toBe(true);
  releaseClinicalPreview(first);
  expect(mockFiles.has(first.uri)).toBe(false);
  expect(mockFiles.has(second.uri)).toBe(true);
  releaseClinicalPreview(second);
});

test('a failed release is retried by the next cleanup and a partial write is removed', () => {
  const file = createClinicalPreview(new Uint8Array([5]));
  mockDeleteFailures.add(file.uri);
  releaseClinicalPreview(file);
  expect(mockFiles.has(file.uri)).toBe(true);
  mockDeleteFailures.clear();
  cleanupClinicalPreviews();
  expect(mockFiles.has(file.uri)).toBe(false);
  mockWriteFailure = true;
  expect(() => createClinicalPreview(new Uint8Array([6]))).toThrow('Disk write failure');
  expect(mockFiles.size).toBe(0);
});

test('web initialization does not access or delete native cached files', () => {
  Platform.OS = 'web';
  mockDirectories.add('file:///cache/hera-clinical-previews');
  mockFiles.set('file:///cache/hera-clinical-previews/old', new Uint8Array([7]));
  cleanupClinicalPreviews();
  expect(mockFiles.size).toBe(1);
});
