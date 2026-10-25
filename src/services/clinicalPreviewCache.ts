import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { createSecureRandomUuid } from '../utils/secureRandom';

// No patient identifiers or original file names are written to cache paths.
const active = new Set<string>();
const directory = () => new Directory(Paths.cache, 'hera-clinical-previews');
const legacyPreviewName = /^preview-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const remove = (file: File) => {
  try {
    if (file.exists) file.delete();
  } catch {
    // The file stays discoverable for the next startup/foreground sweep.
    console.warn('No se pudo limpiar una vista previa clínica temporal; se reintentará.');
  }
};

export const cleanupClinicalPreviews = () => {
  if (Platform.OS === 'web') return;
  try {
    const cache = directory();
    if (cache.exists) {
      for (const item of cache.list()) {
        if (item instanceof File && !active.has(item.uri)) remove(item);
      }
    }
    // Recover previews created by the previous implementation, with its exact
    // UUID-only naming convention. Leave other cached/user files untouched.
    for (const item of new Directory(Paths.cache).list()) {
      if (item instanceof File && legacyPreviewName.test(item.name)) remove(item);
    }
  } catch {
    console.warn('No se pudo revisar la caché de vistas previas clínicas; se reintentará.');
  }
};

export const releaseClinicalPreview = (file: File) => {
  if (!active.delete(file.uri)) return;
  remove(file);
};

export const createClinicalPreview = (bytes: Uint8Array): File => {
  cleanupClinicalPreviews();
  const cache = directory();
  cache.create({ idempotent: true, intermediates: true });
  const file = new File(cache, createSecureRandomUuid());
  active.add(file.uri);
  try {
    file.create();
    file.write(bytes);
    return file;
  } catch (error) {
    releaseClinicalPreview(file);
    throw error;
  }
};
