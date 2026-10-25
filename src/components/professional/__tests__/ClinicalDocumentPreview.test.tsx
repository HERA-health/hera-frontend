import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { File } from 'expo-file-system';
import { ClinicalDocumentPreview } from '../patient-detail/ClinicalDocumentPreview';
import { api } from '../../../services/api';
import { createClinicalPreview, releaseClinicalPreview } from '../../../services/clinicalPreviewCache';
import { cancelClinicalDownloads } from '../../../services/clinicalDownloads';
import type { ClinicalDocument } from '../../../services/clinicalService';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme }),
}));
jest.mock('../../../services/api', () => ({ api: { get: jest.fn() } }));
jest.mock('../../../services/clinicalPreviewCache', () => ({ createClinicalPreview: jest.fn(), releaseClinicalPreview: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: class {
  uri: string;
  constructor(uri: string) { this.uri = uri; }
} }));
const document: ClinicalDocument = {
  id: 'document', category: 'GENERAL', fileName: 'clinical-image.png', mimeType: 'image/png',
  uploadedAt: '2026-10-01T10:00:00.000Z', sizeBytes: 3,
};
beforeEach(() => jest.clearAllMocks());

test('an image preview releases its managed file when the protected view unmounts', async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const file = new File('file:///cache/hera-clinical-previews/fixture');
  jest.mocked(api.get).mockResolvedValue({ data: bytes.buffer });
  jest.mocked(createClinicalPreview).mockReturnValue(file);
  const view = render(<ClinicalDocumentPreview document={document} token="clinical-token" onError={jest.fn()} />);
  await screen.findByLabelText('clinical-image.png');
  expect(createClinicalPreview).toHaveBeenCalledWith(bytes);
  view.unmount();
  expect(releaseClinicalPreview).toHaveBeenCalledWith(file);
});

test.each(['unmount', 'lock'])('a late download after %s never writes clinical bytes to cache', async (action) => {
  let finish: (response: { data: ArrayBuffer }) => void = () => undefined;
  const request = new Promise<{ data: ArrayBuffer }>((resolve) => { finish = resolve; });
  jest.mocked(api.get).mockReturnValue(request);
  const view = render(<ClinicalDocumentPreview document={document} token="late-token" onError={jest.fn()} />);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  if (action === 'unmount') view.unmount();
  else cancelClinicalDownloads('late-token');
  await act(async () => { finish({ data: new ArrayBuffer(3) }); await request; });
  expect(createClinicalPreview).not.toHaveBeenCalled();
});
