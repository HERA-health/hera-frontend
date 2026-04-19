export interface UploadAsset {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  file?: Blob | null;
}

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

const getFileExtension = (mimeType: string): string =>
  MIME_TYPE_EXTENSIONS[mimeType] || mimeType.split('/')[1] || 'bin';

const getFileNameFromUri = (uri: string): string | null => {
  const segments = uri.split('/');
  const lastSegment = segments[segments.length - 1];
  return lastSegment || null;
};

const resolveUploadBlob = async (asset: UploadAsset): Promise<Blob> => {
  if (asset.file && typeof Blob !== 'undefined' && asset.file instanceof Blob) {
    return asset.file;
  }

  const response = await fetch(asset.uri);
  return response.blob();
};

export const buildMultipartFormData = async (
  fieldName: string,
  asset: UploadAsset,
  extraFields: Record<string, string> = {},
  fallbackBaseName: string = 'upload'
): Promise<FormData> => {
  const formData = new FormData();

  Object.entries(extraFields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const originalBlob = await resolveUploadBlob(asset);
  const mimeType = asset.mimeType || originalBlob.type || 'image/jpeg';
  const normalizedBlob =
    originalBlob.type === mimeType
      ? originalBlob
      : originalBlob.slice(0, originalBlob.size, mimeType);
  const fileName = asset.fileName
    || getFileNameFromUri(asset.uri)
    || `${fallbackBaseName}.${getFileExtension(mimeType)}`;

  formData.append(fieldName, normalizedBlob, fileName);

  return formData;
};

export const buildImageFormData = async (
  fieldName: string,
  asset: UploadAsset,
  extraFields: Record<string, string> = {},
  fallbackBaseName: string = 'upload'
): Promise<FormData> =>
  buildMultipartFormData(fieldName, asset, extraFields, fallbackBaseName);
