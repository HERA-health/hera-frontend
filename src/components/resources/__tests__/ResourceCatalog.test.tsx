import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ResourceCatalog } from '../ResourceCatalog';
import { ResourceEditor } from '../ResourceEditor';
import * as service from '../../../services/resourceService';
import * as picker from 'expo-document-picker';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../../../services/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../../../services/resourceService', () => ({ ...jest.requireActual('../../../services/resourceService'), listResources: jest.fn(), saveResource: jest.fn(), publishResource: jest.fn(), uploadResourceFile: jest.fn(), requestResourceFile: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../../../utils/openPrivateDocument', () => ({ openPrivateDocument: jest.fn() }));
jest.mock('../../common/alert', () => ({ useAppAlert: () => ({ confirm: jest.fn().mockResolvedValue(true) }) }));

const resource: service.HeraResource = { id: 'resource1', title: 'Registro de emociones', description: 'Material para tu práctica.', category: 'THERAPEUTIC', minimumPlan: 'CALMA', status: 'PUBLISHED', updatedAt: '2026-11-11T10:00:00Z', files: [{ id: 'file1', format: 'PDF', fileName: 'registro.pdf', sizeBytes: 1200 }] };
const result: service.ResourceList = { items: [resource], total: 1, page: 1, pageSize: 20, openAccess: true, categoryCounts: [{ category: 'THERAPEUTIC', count: 1 }] };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(service.listResources).mockResolvedValue(result);
});
it('shows only HERA catalogue actions and requests links only on interaction', async () => {
  render(<ResourceCatalog />);
  await screen.findByText(resource.title);
  expect(screen.queryByText(/Acceso inicial:/)).toBeNull();
  expect(screen.queryByText('Mis plantillas')).toBeNull();
  expect(screen.queryByText('Nuevo recurso')).toBeNull();
  expect(service.requestResourceFile).not.toHaveBeenCalled();
});
it('closed access disables file actions but keeps the catalogue visible', async () => {
  jest.mocked(service.listResources).mockResolvedValue({ ...result, openAccess: false });
  render(<ResourceCatalog />); await screen.findByText(resource.title);
  expect(screen.getByLabelText(`Ver PDF de ${resource.title}`)).toBeDisabled();
  expect(screen.getByLabelText(`Descargar PDF de ${resource.title}`)).toBeDisabled();
  expect(screen.getByText(/todavía no está habilitado/)).toBeTruthy();
});
it('search and categories filter on the server and can be reset', async () => {
  render(<ResourceCatalog />); await screen.findByText(resource.title);
  fireEvent.press(screen.getByLabelText('Categoría Recursos terapéuticos'));
  await waitFor(() => expect(service.listResources).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'THERAPEUTIC', page: 1 }), false, expect.anything()));
  fireEvent.changeText(screen.getByLabelText('Buscar recursos'), 'emociones');
  await waitFor(() => expect(service.listResources).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'emociones' }), false, expect.anything()));
  fireEvent.press(screen.getByText('Restablecer'));
  await waitFor(() => expect(service.listResources).toHaveBeenLastCalledWith(expect.objectContaining({ category: undefined, search: '' }), false, expect.anything()));
});
it('recovers after a list failure and handles an empty catalogue honestly', async () => {
  jest.mocked(service.listResources).mockRejectedValueOnce(new Error('Fallo de conexión')).mockResolvedValueOnce({ ...result, items: [], total: 0 });
  render(<ResourceCatalog />); await screen.findByText('Fallo de conexión');
  fireEvent.press(screen.getByText('Reintentar'));
  await screen.findByText('La biblioteca está por comenzar');
});
it('admin creates a draft before uploads and cannot publish it without files', async () => {
  const draft = { ...resource, status: 'DRAFT' as const, files: [] };
  jest.mocked(service.saveResource).mockResolvedValue(draft);
  render(<ResourceEditor initial={null} onClose={jest.fn()} />);
  expect(screen.getByText('Publicar recurso')).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Título del recurso'), resource.title);
  fireEvent.changeText(screen.getByLabelText('Descripción del recurso'), resource.description);
  fireEvent.press(screen.getByText('Guardar ficha'));
  await screen.findByText('Ficha guardada.');
  expect(service.saveResource).toHaveBeenCalledWith(undefined, expect.objectContaining({ title: resource.title }));
  expect(screen.getByText('Publicar recurso')).toBeDisabled();
});
it('failed replacement retains existing file and publication; retry succeeds', async () => {
  jest.mocked(picker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'fixture', name: 'registro.pdf', mimeType: 'application/pdf', size: 1200, lastModified: 0 }] });
  jest.mocked(service.uploadResourceFile).mockRejectedValueOnce(new Error('No se pudo subir')).mockResolvedValueOnce({ resource, cleanupPending: false });
  render(<ResourceEditor initial={resource} onClose={jest.fn()} />);
  fireEvent.press(screen.getByText('Añadir o sustituir archivo'));
  await screen.findByText('No se pudo subir');
  expect(screen.getByText('registro.pdf')).toBeTruthy();
  expect(service.publishResource).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Añadir o sustituir archivo'));
  await screen.findByText('Archivo guardado correctamente.');
});
