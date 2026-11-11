import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Modal, Platform } from 'react-native';
import { ResourceActions } from '../ResourceActions';
import { requestResourceFile, type HeraResource } from '../../../services/resourceService';
import { openPrivateDocument } from '../../../utils/openPrivateDocument';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../services/resourceService', () => ({ requestResourceFile: jest.fn() }));
jest.mock('../../../utils/openPrivateDocument', () => ({ openPrivateDocument: jest.fn() }));
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));

const resource: HeraResource = { id: 'resource1', title: 'Registro', description: 'Recurso HERA', category: 'CLINICAL', minimumPlan: 'CALMA', status: 'PUBLISHED', updatedAt: '2026-11-11T10:00:00Z', files: [{ id: 'file1', format: 'PDF', fileName: 'registro.pdf', sizeBytes: 1200 }] };
const access = { url: 'https://storage.example.invalid/file', expiresIn: 120, fileName: 'registro.pdf', mimeType: 'application/pdf' };
const originalOS = Platform.OS;
const originalFetch = global.fetch;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => { jest.clearAllMocks(); mockFocused = true; Platform.OS = 'web'; });
afterEach(() => { Platform.OS = originalOS; global.fetch = originalFetch; });

it('closing a PDF while it reloads prevents its late response from reopening the modal', async () => {
  const reload = deferred<typeof access>();
  jest.mocked(requestResourceFile).mockResolvedValueOnce(access).mockReturnValueOnce(reload.promise);
  const view = render(<ResourceActions resource={resource} />);
  fireEvent.press(view.getByLabelText('Ver PDF de Registro'));
  await waitFor(() => expect(view.UNSAFE_getByType(Modal).props.visible).toBe(true));
  fireEvent.press(view.getByText('Recargar PDF'));
  fireEvent.press(view.getByLabelText('Cerrar vista previa'));
  await act(async () => reload.resolve({ ...access, url: access.url + '?new' }));
  expect(view.UNSAFE_getByType(Modal).props.visible).toBe(false);
});

it('leaving the screen ignores a pending file access response', async () => {
  Platform.OS = 'ios';
  const pending = deferred<typeof access>();
  jest.mocked(requestResourceFile).mockReturnValue(pending.promise);
  global.fetch = jest.fn();
  const view = render(<ResourceActions resource={resource} />);
  fireEvent.press(view.getByLabelText('Descargar PDF de Registro'));
  mockFocused = false;
  view.rerender(<ResourceActions resource={resource} />);
  await act(async () => pending.resolve(access));
  expect(global.fetch).not.toHaveBeenCalled();
  expect(openPrivateDocument).not.toHaveBeenCalled();
});

it('web downloads surface storage errors instead of silently opening an error tab', async () => {
  jest.mocked(requestResourceFile).mockResolvedValue(access);
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  const view = render(<ResourceActions resource={resource} />);
  fireEvent.press(view.getByLabelText('Descargar PDF de Registro'));
  await view.findByText('No se pudo descargar el archivo. Inténtalo de nuevo.');
  expect(openPrivateDocument).not.toHaveBeenCalled();
});

it('web downloads pass the retrieved bytes to the existing document helper', async () => {
  const bytes = new ArrayBuffer(12);
  jest.mocked(requestResourceFile).mockResolvedValue(access);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes });
  const view = render(<ResourceActions resource={resource} />);
  fireEvent.press(view.getByLabelText('Descargar PDF de Registro'));
  await waitFor(() => expect(openPrivateDocument).toHaveBeenCalledWith(bytes, resource.id, access.fileName, access.mimeType));
});
