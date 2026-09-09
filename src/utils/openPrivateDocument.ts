import { Platform } from 'react-native';

export const openPrivateDocument = async (bytes: ArrayBuffer, id: string, name: string, mimeType: string) => {
  const fileName = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 160);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, `hera-${id}-${fileName}`);
  file.write(new Uint8Array(bytes));
  try {
    const { isAvailableAsync, shareAsync } = await import('expo-sharing');
    if (!await isAvailableAsync()) throw new Error('Este dispositivo no permite abrir el documento. Prueba desde la versión web.');
    await shareAsync(file.uri, { mimeType, dialogTitle: 'Documento privado de HERA' });
  } finally { file.delete(); }
};
