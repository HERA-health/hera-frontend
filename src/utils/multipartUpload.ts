export interface UploadAsset {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const getFileExtension = (mimeType: string): string => MIME_TYPE_EXTENSIONS[mimeType] || 'jpg';

const getFileNameFromUri = (uri: string): string | null => {
  const segments = uri.split('/');
  const lastSegment = segments[segments.length - 1];
  return lastSegment || null;
};

export const buildImageFormData = async (
  fieldName: string,
  asset: UploadAsset,
  extraFields: Record<string, string> = {},
  fallbackBaseName: string = 'upload'
): Promise<FormData> => {
  const formData = new FormData();

  Object.entries(extraFields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(asset.uri);
  const originalBlob = await response.blob();
  const mimeType = asset.mimeType || originalBlob.type || 'image/jpeg';
  const normalizedBlob = originalBlob.type === mimeType
    ? originalBlob
    : originalBlob.slice(0, originalBlob.size, mimeType);
  const fileName = asset.fileName
    || getFileNameFromUri(asset.uri)
    || `${fallbackBaseName}.${getFileExtension(mimeType)}`;

  formData.append(fieldName, normalizedBlob, fileName);

  return formData;
};
