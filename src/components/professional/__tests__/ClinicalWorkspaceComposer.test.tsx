jest.mock('../../../utils/secureRandom', () => ({ createSecureRandomUuid: () => 'test-operation-key' }));
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as picker from 'expo-document-picker';
import { ClinicalWorkspaceComposer } from '../ClinicalWorkspaceComposer';
import * as clinical from '../../../services/clinicalService';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Client } from '../../../services/professionalService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/clinicalService', () => ({ createClinicalNote: jest.fn(), updateClinicalNote: jest.fn(), uploadClinicalDocument: jest.fn(), saveClinicalExercise: jest.fn(), isClinicalSaveUncertain: jest.fn(() => false), getClinicalContentHistory: jest.fn() }));
jest.mock('../../../services/clinicalFileCache', () => ({ ownClinicalAsset: (asset: unknown) => asset, releaseClinicalAssets: jest.fn(), discardClinicalPickerCopies: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
const client: Client = { id: 'patient-1', userId: null, source: 'MANAGED', user: { id: null, name: 'Paciente', userType: 'CLIENT', email: 'patient@example.test' } };
const saved: clinical.ClinicalNote = { id: 'note-1', content: 'Seguimiento', createdAt: '2026-10-19T10:00:00Z', updatedAt: '2026-10-19T10:00:00Z' };
const document: clinical.ClinicalDocument = { id: 'doc-1', fileName: 'uno.pdf', mimeType: 'application/pdf', uploadedAt: '2026-10-19T10:00:00Z', sizeBytes: 100, category: 'NOTE_ATTACHMENT' };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
});

test('a partial attachment failure retries only pending files and keeps the existing note', async () => {
  const onSaved = jest.fn(), onError = jest.fn();
  jest.mocked(picker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [
    { uri: 'one', name: 'uno.pdf', size: 100, lastModified: 0, mimeType: 'application/pdf' }, { uri: 'two', name: 'dos.pdf', size: 100, lastModified: 0, mimeType: 'application/pdf' },
  ] });
  jest.mocked(clinical.createClinicalNote).mockResolvedValue(saved);
  jest.mocked(clinical.updateClinicalNote).mockResolvedValue(saved);
  jest.mocked(clinical.uploadClinicalDocument).mockResolvedValueOnce(document).mockRejectedValueOnce(new Error('Carga interrumpida')).mockResolvedValueOnce({ ...document, id: 'doc-2', fileName: 'dos.pdf' });
  render(<ClinicalWorkspaceComposer client={client} token="unlocked" draft={{ kind: 'NOTE' }} onSaved={onSaved} onError={onError} />);
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Seguimiento');
  fireEvent.press(screen.getByText('Adjuntar archivos'));
  await screen.findByText('dos.pdf');
  fireEvent.press(screen.getByText('Guardar nota'));
  await screen.findByText(/El texto está guardado/);
  expect(onSaved).not.toHaveBeenCalled(); expect(clinical.createClinicalNote).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('uno.pdf')).toBeNull(); expect(screen.getByText('dos.pdf')).toBeTruthy();
  fireEvent.press(screen.getByText('Reintentar pendientes'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(clinical.createClinicalNote).toHaveBeenCalledTimes(1);
  expect(jest.mocked(clinical.uploadClinicalDocument).mock.calls.map(call => call[1].fileName)).toEqual(['uno.pdf', 'dos.pdf', 'dos.pdf']);
  expect(clinical.uploadClinicalDocument).toHaveBeenLastCalledWith(client.id, expect.objectContaining({ fileName: 'dos.pdf' }), 'unlocked', 'NOTE_ATTACHMENT', undefined, { noteId: saved.id });
});

test('a failed note save retains its text and never uploads files', async () => {
  jest.mocked(clinical.createClinicalNote).mockRejectedValue(new Error('Sesión clínica caducada'));
  render(<ClinicalWorkspaceComposer client={client} token="expired" draft={{ kind: 'NOTE' }} onSaved={jest.fn()} onError={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'No perder este borrador');
  fireEvent.press(screen.getByText('Guardar nota'));
  await screen.findByText('Sesión clínica caducada');
  expect(screen.getByDisplayValue('No perder este borrador')).toBeTruthy();
  expect(clinical.uploadClinicalDocument).not.toHaveBeenCalled();
});

test('an unsuccessful edit never claims that the new text was saved', async () => {
  jest.mocked(clinical.updateClinicalNote).mockRejectedValue(new Error('No se pudo actualizar'));
  render(<ClinicalWorkspaceComposer client={client} token="unlocked" draft={{ kind: 'NOTE', note: saved }} onSaved={jest.fn()} onError={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Cambios todavía sin guardar');
  fireEvent.press(screen.getByText('Guardar nota'));
  await screen.findByText('No se pudo actualizar');
  expect(screen.queryByText(/El texto está guardado/)).toBeNull();
  expect(screen.getByDisplayValue('Cambios todavía sin guardar')).toBeTruthy();
});

test('retrying pending files does not rewrite already-saved text', async () => {
  jest.mocked(picker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'one', name: 'uno.pdf', size: 100, lastModified: 0 }] });
  jest.mocked(clinical.createClinicalNote).mockResolvedValue(saved);
  jest.mocked(clinical.uploadClinicalDocument).mockRejectedValueOnce(new Error('Carga interrumpida')).mockResolvedValueOnce(document);
  const changed = jest.fn(), completed = jest.fn();
  render(<ClinicalWorkspaceComposer client={client} token="unlocked" draft={{ kind: 'NOTE' }} onSaved={completed} onChanged={changed} onError={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Seguimiento');
  fireEvent.press(screen.getByText('Adjuntar archivos'));
  await screen.findByText('uno.pdf');
  fireEvent.press(screen.getByText('Guardar nota'));
  await screen.findByText(/El texto está guardado/);
  expect(changed).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText('Reintentar pendientes'));
  await waitFor(() => expect(completed).toHaveBeenCalledTimes(1));
  expect(clinical.updateClinicalNote).not.toHaveBeenCalled();
});


test('an uncertain creation retries the same operation and preserves the draft', async () => {
  jest.mocked(clinical.isClinicalSaveUncertain).mockReturnValue(true);
  jest.mocked(clinical.createClinicalNote).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(saved);
  const onSaved = jest.fn();
  render(<ClinicalWorkspaceComposer client={client} token="unlocked" draft={{ kind: 'NOTE' }} onSaved={onSaved} onError={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Seguimiento');
  fireEvent.press(screen.getByText('Guardar nota'));
  await screen.findByText(/No hemos podido confirmar/);
  expect(screen.getByLabelText('Contenido de la nota').props.editable).toBe(false);
  const firstKey = jest.mocked(clinical.createClinicalNote).mock.calls[0][4];
  fireEvent.press(screen.getByText('Comprobar y reintentar guardado'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(jest.mocked(clinical.createClinicalNote).mock.calls[1][4]).toBe(firstKey);
  expect(firstKey).toBeTruthy();
});

test('a conflicting edit retains the draft until the specialist reviews the current version', async () => {
  jest.mocked(clinical.isClinicalSaveUncertain).mockReturnValue(false);
  jest.mocked(clinical.updateClinicalNote).mockRejectedValueOnce(Object.assign(new Error('Contenido modificado'), { code: 'CLINICAL_VERSION_CONFLICT' })).mockResolvedValueOnce({ ...saved, content: 'Mi borrador' });
  jest.mocked(clinical.getClinicalContentHistory).mockResolvedValue({ current: { updatedAt: '2026-10-19T11:00:00.000Z', title: null, content: 'Otra edición guardada' }, items: [], nextCursor: null });
  const onSaved = jest.fn();
  render(<ClinicalWorkspaceComposer client={client} token="unlocked" draft={{ kind: 'NOTE', note: saved }} onSaved={onSaved} onError={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Mi borrador');
  fireEvent.press(screen.getByText('Guardar nota'));
  await screen.findByText('Otra edición guardada');
  expect(screen.getByDisplayValue('Mi borrador')).toBeTruthy();
  fireEvent.press(screen.getByText('He revisado los cambios; continuar editando'));
  fireEvent.press(screen.getByText('Guardar nota'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(jest.mocked(clinical.updateClinicalNote).mock.calls[1][3]).toBe('2026-10-19T11:00:00.000Z');
});


test('recovering a save changed afterwards does not silently adopt a newer version for an old draft', async () => {
  jest.mocked(clinical.createClinicalNote).mockResolvedValueOnce({ ...saved, content: 'Cambio posterior', updatedAt: '2026-10-19T12:00:00.000Z' });
  const completed = jest.fn();
  render(<ClinicalWorkspaceComposer client={client} token="unlocked" draft={{ kind: 'NOTE' }} onSaved={completed} onError={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Mi borrador original');
  fireEvent.press(screen.getByText('Guardar nota'));
  await screen.findByText('Cambio posterior');
  expect(screen.getByDisplayValue('Mi borrador original')).toBeTruthy();
  expect(completed).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Guardar nota' })).toBeDisabled();
});
