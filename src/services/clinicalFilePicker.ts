import * as DocumentPicker from 'expo-document-picker';
import type { UploadAsset } from '../utils/multipartUpload';
import { ownClinicalAsset, releaseClinicalAssets, discardClinicalPickerCopies } from './clinicalFileCache';

export async function pickClinicalFiles(multiple = true): Promise<UploadAsset[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    multiple, copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  const owned: UploadAsset[] = [];
  try {
    if (result.assets.some(asset => (asset.size || 0) > 15 * 1024 * 1024)) throw new Error('Cada archivo debe ocupar como máximo 15 MB.');
    for (const asset of result.assets) owned.push(ownClinicalAsset({ ...asset, fileName: asset.name }));
    return owned;
  } catch (error) {
    releaseClinicalAssets(owned);
    discardClinicalPickerCopies(result.assets);
    throw error;
  }
}
