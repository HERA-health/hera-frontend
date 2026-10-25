jest.mock('../../../services/clinicalFileCache', () => ({ ownClinicalAsset: (asset: unknown) => asset, releaseClinicalAssets: jest.fn(), discardClinicalPickerCopies: jest.fn() }));
import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as picker from 'expo-document-picker';
import { ClinicalPatientWorkspace, type ClinicalPatientAction } from '../ClinicalPatientWorkspace';
import * as clinical from '../../../services/clinicalService';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Client } from '../../../services/professionalService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/patientDetailService', () => ({ getPatientSessions: jest.fn(async () => ({ items: [], total: 0, page: 1, totalPages: 0 })) }));
jest.mock('../../../services/clinicalService', () => ({ getClinicalTimeline: jest.fn(), getClinicalExercises: jest.fn(), searchClinicalDocuments: jest.fn(), uploadClinicalDocument: jest.fn(), isClinicalSaveUncertain: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../../onboarding/TourTarget', () => ({ TourTarget: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../ClinicalQuestionnairePanel', () => ({ ClinicalQuestionnairePanel: () => null }));

const client: Client = { id: 'patient', source: 'MANAGED', userId: null, user: { id: null, userType: 'CLIENT', name: 'Paciente', email: 'patient@example.test' } };
const page = { limit: 6, total: 0, hasMore: false, nextCursor: null };
const record: clinical.ClinicalRecord = {
  id: 'record', consentStatus: 'GRANTED', consentGivenAt: null, consentRequestedAt: null, consentVersion: null, consentMethod: null,
  closedAt: null, retentionUntil: null, eligibleForManualReview: false, activeConsentRequest: null, guestConsentActionsEnabled: false,
  client: { ...client, questionnaireAnswers: null }, notes: [], documents: [], consentEvents: [], sessionFolders: [],
  pagination: { notes: page, documents: page, consentEvents: page, sessionFolders: page },
};
const timeline: clinical.ClinicalTimelinePage = {
  items: [], pageInfo: page, counters: { completed: 0, withoutNotes: 0, activeFiles: 0, withNotes: 0, withFiles: 0, generalNotes: 0 }, nextSession: null,
};
const document: clinical.ClinicalDocument = { id: 'doc-1', category: 'GENERAL', fileName: 'anterior.pdf', mimeType: 'application/pdf', uploadedAt: '2026-01-01T12:00:00Z', sizeBytes: 20 };
const callbacks = () => ({ onError: jest.fn(), onRefresh: jest.fn(async () => undefined), onLock: jest.fn(), onSection: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(clinical.isClinicalSaveUncertain).mockReturnValue(true);
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
  jest.mocked(clinical.getClinicalTimeline).mockResolvedValue(timeline);
  jest.mocked(clinical.searchClinicalDocuments).mockResolvedValue({ items: [], pageInfo: page });
});

test('switching tabs preserves the quick note draft', async () => {
  const props = { client, record, token: 'unlocked', consentPanel: <Text>Consentimiento</Text>, ...callbacks() };
  const view = render(<ClinicalPatientWorkspace {...props} section="summary" />);
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Borrador entre pestañas');
  view.rerender(<ClinicalPatientWorkspace {...props} section="notes" />);
  view.rerender(<ClinicalPatientWorkspace {...props} section="summary" />);
  expect(screen.getByDisplayValue('Borrador entre pestañas')).toBeTruthy();
  await waitFor(() => expect(clinical.getClinicalTimeline).toHaveBeenCalledTimes(1));
});

test.each<[ClinicalPatientAction['kind'], string]>([
  ['NOTE', 'Nota del expediente'], ['UPLOAD', 'Subir archivos'], ['CONSENT', 'Consentimiento informado'],
])('%s acknowledges each header action once, even if the action object or callback changes', async (kind, title) => {
  const consumed = jest.fn();
  const props = { client, record, token: 'unlocked', consentPanel: null, ...callbacks() };
  const view = render(<ClinicalPatientWorkspace {...props} section="notes" action={{ id: 1, kind }} onActionConsumed={consumed} />);
  expect(screen.getByText(title)).toBeTruthy();
  expect(consumed).toHaveBeenCalledTimes(1);
  expect(consumed).toHaveBeenCalledWith(1);
  fireEvent.press(screen.getAllByRole('button', { name: 'Cerrar' })[0]);
  const changedCallback = jest.fn();
  view.rerender(<ClinicalPatientWorkspace {...props} section="notes" action={{ id: 1, kind }} onActionConsumed={changedCallback} />);
  expect(screen.queryByText(title)).toBeNull();
  expect(changedCallback).not.toHaveBeenCalled();
  view.rerender(<ClinicalPatientWorkspace {...props} section="notes" action={{ id: 2, kind }} onActionConsumed={changedCallback} />);
  expect(screen.getByText(title)).toBeTruthy();
  expect(changedCallback).toHaveBeenCalledWith(2);
  await waitFor(() => expect(clinical.getClinicalTimeline).toHaveBeenCalledTimes(1));
});

test('a previous timeline filter cannot replace the current result', async () => {
  let resolveOlder: ((value: clinical.ClinicalTimelinePage) => void) | undefined;
  jest.mocked(clinical.getClinicalTimeline).mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; })).mockResolvedValueOnce(timeline);
  render(<ClinicalPatientWorkspace client={client} record={record} token="unlocked" section="summary" consentPanel={null} {...callbacks()} />);
  fireEvent.press(screen.getByText('Sin notas'));
  await waitFor(() => expect(clinical.getClinicalTimeline).toHaveBeenLastCalledWith('patient', 'unlocked', 'WITHOUT_NOTES'));
  await act(async () => { resolveOlder?.({ ...timeline, items: [{ kind: 'NOTE', id: 'stale', date: '2026-01-01T12:00:00Z', note: { id: 'stale', content: 'Contenido del filtro anterior', createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z' } }] }); });
  expect(screen.queryByText('Contenido del filtro anterior')).toBeNull();
});

test('changing a document search clears the previous page and cursor immediately', async () => {
  jest.mocked(clinical.searchClinicalDocuments).mockResolvedValueOnce({ items: [document], pageInfo: { ...page, hasMore: true, nextCursor: 'old-cursor', total: 20 } })
    .mockResolvedValueOnce({ items: [], pageInfo: page });
  render(<ClinicalPatientWorkspace client={client} record={record} token="unlocked" section="documents" consentPanel={null} {...callbacks()} />);
  await screen.findByText('anterior.pdf');
  expect(screen.getByText('Ver más archivos')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Buscar archivos'), 'nuevo');
  expect(screen.queryByText('anterior.pdf')).toBeNull();
  expect(screen.queryByText('Ver más archivos')).toBeNull();
  await waitFor(() => expect(clinical.searchClinicalDocuments).toHaveBeenLastCalledWith('patient', 'unlocked', { category: undefined, archived: false, search: 'nuevo' }));
});

test('closing the process preserves reading and removes clinical write actions', async () => {
  render(<ClinicalPatientWorkspace client={client} record={{ ...record, closedAt: '2026-10-19T12:00:00Z' }} token="unlocked" section="summary" consentPanel={null} {...callbacks()} />);
  expect(screen.getByText('Proceso cerrado. El expediente se conserva para consulta.')).toBeTruthy();
  expect(screen.queryByLabelText('Contenido de la nota')).toBeNull();
  expect(screen.queryByText('Subir informe')).toBeNull();
  await waitFor(() => expect(clinical.getClinicalTimeline).toHaveBeenCalled());
});

test('a file picker resolved after the workspace unmounts never starts an upload', async () => {
  let resolvePicker: ((value: picker.DocumentPickerResult) => void) | undefined;
  jest.mocked(picker.getDocumentAsync).mockImplementationOnce(() => new Promise(resolve => { resolvePicker = resolve; }));
  const view = render(<ClinicalPatientWorkspace client={client} record={record} token="unlocked" section="summary" action={{ id: 1, kind: 'UPLOAD' }} consentPanel={null} {...callbacks()} />);
  fireEvent.press(screen.getByText('Seleccionar y subir archivos'));
  view.unmount();
  await act(async () => { resolvePicker?.({ canceled: false, assets: [{ uri: 'private', name: 'private.pdf', size: 20, lastModified: 0 }] }); });
  expect(clinical.uploadClinicalDocument).not.toHaveBeenCalled();
});

test('archived files do not displace active documents from the summary preview', async () => {
  const documents = [...Array.from({ length: 3 }, (_, i) => ({ ...document, id: `archived-${i}`, archivedAt: '2026-10-19T12:00:00Z' })), { ...document, id: 'active', fileName: 'activo.pdf' }];
  render(<ClinicalPatientWorkspace client={client} record={{ ...record, documents }} token="unlocked" section="summary" consentPanel={null} {...callbacks()} />);
  expect(screen.getByText('activo.pdf')).toBeTruthy();
  expect(screen.queryByText('anterior.pdf')).toBeNull();
  await waitFor(() => expect(clinical.getClinicalTimeline).toHaveBeenCalled());
});

 test.each([['Subir documento', 'Subir informe', 'GENERAL'], ['Subir informe', 'Subir documento', 'MEDICAL_REPORT']])('retry from %s via %s preserves the original upload and then permits a new category', async (first, second, category) => {
  const asset = { uri: 'private', name: 'pending.pdf', size: 20, lastModified: 0 };
  jest.mocked(picker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [asset] });
  jest.mocked(clinical.uploadClinicalDocument).mockRejectedValueOnce(new Error('Respuesta perdida')).mockResolvedValue(document);
  render(<ClinicalPatientWorkspace client={client} record={record} token="unlocked" section="summary" consentPanel={null} {...callbacks()} />);
  fireEvent.press(screen.getByText(first));
  fireEvent.press(screen.getByText('Seleccionar y subir archivos'));
  await screen.findByText(/Respuesta perdida.*No se pudo confirmar/);
  fireEvent.press(screen.getByText('Cerrar'));
  fireEvent.press(screen.getByText(second));
  expect(screen.getByText(/Hay archivos pendientes en/)).toBeTruthy();
  fireEvent.press(screen.getByText('Reintentar archivos pendientes'));
  await waitFor(() => expect(clinical.uploadClinicalDocument).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText('Reintentar archivos pendientes')).toBeNull());
  const calls = jest.mocked(clinical.uploadClinicalDocument).mock.calls;
  expect(calls[1][1]).toBe(calls[0][1]);
  expect(calls[0][3]).toBe(category); expect(calls[1][3]).toBe(category);
  expect(picker.getDocumentAsync).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText(second));
  fireEvent.press(screen.getByText('Seleccionar y subir archivos'));
  await waitFor(() => expect(clinical.uploadClinicalDocument).toHaveBeenCalledTimes(3));
  expect(jest.mocked(clinical.uploadClinicalDocument).mock.calls[2][3]).toBe(category === 'GENERAL' ? 'MEDICAL_REPORT' : 'GENERAL');
 });

 test('a rejected file can be removed and replaced without leaving the record', async () => {
  jest.mocked(clinical.isClinicalSaveUncertain).mockReturnValue(false);
  jest.mocked(picker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{uri:'invalid', name:'rejected.pdf', lastModified:0}] });
  jest.mocked(clinical.uploadClinicalDocument).mockRejectedValueOnce(new Error('Archivo rechazado')).mockResolvedValue(document);
  render(<ClinicalPatientWorkspace client={client} record={record} token="unlocked" section="summary" consentPanel={null} {...callbacks()} />);
  fireEvent.press(screen.getByText('Subir documento'));
  fireEvent.press(screen.getByText('Seleccionar y subir archivos'));
  await screen.findByText(/Archivo rechazado.*Puedes quitar/);
  fireEvent.press(screen.getByLabelText('Quitar rejected.pdf'));
  expect(screen.queryByText('rejected.pdf · Pendiente')).toBeNull();
  fireEvent.press(screen.getByText('Cerrar'));
  fireEvent.press(screen.getByText('Subir informe'));
  fireEvent.press(screen.getByText('Seleccionar y subir archivos'));
  await waitFor(() => expect(clinical.uploadClinicalDocument).toHaveBeenCalledTimes(2));
  expect(picker.getDocumentAsync).toHaveBeenCalledTimes(2);
  expect(jest.mocked(clinical.uploadClinicalDocument).mock.calls[1][3]).toBe('MEDICAL_REPORT');
 });

 test('a lost response preserves the uncertain file and its retry identity', async () => {
  jest.mocked(picker.getDocumentAsync).mockResolvedValue({ canceled:false, assets:[{uri:'uncertain',name:'uncertain.pdf',lastModified:0}] });
  jest.mocked(clinical.uploadClinicalDocument).mockRejectedValueOnce(new Error('Sin respuesta')).mockResolvedValue(document);
  render(<ClinicalPatientWorkspace client={client} record={record} token="unlocked" section="summary" consentPanel={null} {...callbacks()} />);
  fireEvent.press(screen.getByText('Subir documento'));
  fireEvent.press(screen.getByText('Seleccionar y subir archivos'));
  await screen.findByText('uncertain.pdf · Resultado sin confirmar');
  fireEvent.press(screen.getByLabelText('Quitar uncertain.pdf'));
  expect(screen.getByText('uncertain.pdf · Resultado sin confirmar')).toBeTruthy();
  fireEvent.press(screen.getByText('Reintentar archivos pendientes'));
  await waitFor(() => expect(screen.queryByText('Reintentar archivos pendientes')).toBeNull());
  const calls=jest.mocked(clinical.uploadClinicalDocument).mock.calls;
  expect(calls[0][1]).toBe(calls[1][1]);
  expect(picker.getDocumentAsync).toHaveBeenCalledTimes(1);
 });
