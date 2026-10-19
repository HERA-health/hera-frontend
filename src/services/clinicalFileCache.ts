import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { UploadAsset } from '../utils/multipartUpload';
import { createSecureRandomUuid } from '../utils/secureRandom';

const owned = new Map<string, File>();
let prepared = false;

// Only copies created by this module are deleted. Never delete the user's source.
export const ownClinicalAsset = (asset: UploadAsset): UploadAsset => {
  if (Platform.OS === 'web') return asset;
  const directory = new Directory(Paths.cache, 'hera-clinical-drafts');
  directory.create({ idempotent: true, intermediates: true });
  if (!prepared) {
    for (const item of directory.list()) if (item instanceof File) item.delete();
    prepared = true;
  }
  const source = new File(asset.uri);
  const copy = new File(directory, createSecureRandomUuid());
  source.copy(copy);
  owned.set(copy.uri, copy);
  // DocumentPicker was explicitly asked for a cache copy; clean it after copying.
  try { if (source.uri.startsWith(`${Paths.cache.uri.replace(/\/$/, '')}/`)) source.delete(); }
  catch { console.warn('No se pudo limpiar la copia temporal del selector.'); }
  return { ...asset, uri: copy.uri };
};

export const releaseClinicalAssets = (assets: readonly UploadAsset[]) => {
  for (const asset of assets) {
    const file = owned.get(asset.uri);
    if (!file) continue;
    try { if (file.exists) file.delete(); owned.delete(asset.uri); }
    catch { console.warn('No se pudo limpiar una copia clínica temporal; se reintentará al iniciar.'); }
  }
};

// Used only for the picker's temporary copies before they have been adopted.
export const discardClinicalPickerCopies = (assets: readonly UploadAsset[]) => {
  if (Platform.OS === 'web') return;
  for (const asset of assets) {
    const file = new File(asset.uri);
    try { if (file.uri.startsWith(`${Paths.cache.uri.replace(/\/$/, '')}/`) && file.exists) file.delete(); }
    catch { console.warn('No se pudo limpiar una copia temporal del selector.'); }
  }
};
