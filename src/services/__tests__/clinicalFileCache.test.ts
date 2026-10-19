import { Platform } from 'react-native';
import { ownClinicalAsset, releaseClinicalAssets, discardClinicalPickerCopies } from '../clinicalFileCache';
const mockDeleted: string[] = [];
const mockCopied: string[] = [];
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../' + '../utils/secureRandom', () => ({ createSecureRandomUuid: () => 'owned' }));
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    exists = true;
    constructor(parent: string | { uri: string }, name?: string) { this.uri = `${typeof parent === 'string' ? parent : parent.uri}${name ? `/${name}` : ''}`; }
    copy(target: File) { mockCopied.push(target.uri); }
    delete() { mockDeleted.push(this.uri); this.exists = false; }
  }
  class Directory {
    uri: string;
    constructor(parent: { uri: string }, name: string) { this.uri = `${parent.uri}/${name}`; }
    create() {}
    list() { return [new File(this, 'old-draft')]; }
  }
  return { File, Directory, Paths: { cache: { uri: 'file:///cache' } } };
});

test('owned copies and stale drafts are cleaned without deleting original user files', () => {
  const original = { uri: 'file:///documents/patient.pdf', name: 'patient.pdf' };
  const owned = ownClinicalAsset(original);
  expect(owned.uri).toBe('file:///cache/hera-clinical-drafts/owned');
  expect(mockDeleted).toContain('file:///cache/hera-clinical-drafts/old-draft');
  expect(mockDeleted).not.toContain(original.uri);
  releaseClinicalAssets([original]);
  expect(mockDeleted).not.toContain(original.uri);
  releaseClinicalAssets([owned]);
  expect(mockDeleted).toContain(owned.uri);
});

test('picker cache copies are removed after adoption or validation failure', () => {
  const temporary = { uri: 'file:///cache/picker.pdf' };
  ownClinicalAsset(temporary);
  expect(mockDeleted).toContain(temporary.uri);
  discardClinicalPickerCopies([{ uri: 'file:///cache/invalid.pdf' }, { uri: 'file:///documents/original.pdf' }]);
  expect(mockDeleted).toContain('file:///cache/invalid.pdf');
  expect(mockDeleted).not.toContain('file:///documents/original.pdf');
});

test('web assets are never copied or deleted as local files', () => {
  Platform.OS = 'web';
  const file = { uri: 'blob:document' };
  const before = mockCopied.length;
  expect(ownClinicalAsset(file)).toBe(file);
  releaseClinicalAssets([file]);
  expect(mockCopied.length).toBe(before);
});
