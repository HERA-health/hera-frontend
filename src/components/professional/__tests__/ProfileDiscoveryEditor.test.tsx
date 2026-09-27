import { useDiscoveryRevalidation } from '../../../hooks/useDiscoveryRevalidation';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ProfileDiscoveryEditor } from '../ProfileDiscoveryEditor';
import { SearchableProfileSelect } from '../../common/SearchableProfileSelect';
import { ProfileDiscoveryFilters } from '../../common/ProfileDiscoveryFilters';
import * as service from '../../../services/profileDiscoveryService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../hooks/useProfileOptions', () => ({ useProfileOptions: () => ({ options: {
  languages: [{ value: 'arabic', label: 'Árabe', aliases: ['arabic', 'العربية'] }, { value: 'spanish', label: 'Español', aliases: ['castellano'] }],
  religions: [{ value: 'catholic', label: 'Catolicismo', aliases: [], parent: 'christian' }, { value: 'islam', label: 'Islam', aliases: [] }],
  religionEnabled: true, religionNotice: 'Información pública y voluntaria.', religionNoticeVersion: 'v1', religionDraftNotice: 'Guardado privado y voluntario.', religionDraftNoticeVersion: 'draft-v1',
}, error: false, retry: jest.fn() }) }));
jest.mock('../../../services/profileDiscoveryService', () => ({
  getReligionPublication: jest.fn(), publishReligion: jest.fn(), saveReligionDraft: jest.fn(), withdrawReligion: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(service.getReligionPublication).mockResolvedValue({ religionCode: null, hasPublication: false });
  jest.mocked(service.publishReligion).mockResolvedValue({ religionCode: 'catholic', hasPublication: true });
  jest.mocked(service.saveReligionDraft).mockResolvedValue({ religionCode: 'catholic', hasPublication: false, hasDeclaration: true });
  jest.mocked(service.withdrawReligion).mockResolvedValue({ religionCode: null, hasPublication: false });
});

test('language search ignores accents and selects the canonical value', () => {
  const change = jest.fn();
  render(<SearchableProfileSelect label="Idiomas" options={[{ value: 'arabic', label: 'Árabe', aliases: ['العربية'] }]} values={[]} onChange={change} multiple />);
  fireEvent.press(screen.getByText('Seleccionar ▾'));
  fireEvent.changeText(screen.getByLabelText('Buscar idiomas'), 'arabe');
  fireEvent.press(screen.getByText('Árabe'));
  expect(change).toHaveBeenCalledWith(['arabic']);
});

test('legacy values remain visible and removable', () => {
  const change = jest.fn();
  render(<SearchableProfileSelect label="Idiomas" options={[]} values={['Idioma antiguo']} onChange={change} multiple />);
  fireEvent.press(screen.getByLabelText('Quitar Idioma antiguo'));
  expect(change).toHaveBeenCalledWith([]);
});

test('selecting a religion never publishes without an explicit confirmation', async () => {
  render(<ProfileDiscoveryEditor languages={['spanish']} onLanguagesChange={jest.fn()} profileVisible />);
  await waitFor(() => expect(service.getReligionPublication).toHaveBeenCalled());
  expect(screen.queryByText('Información pública y voluntaria.')).toBeNull();
  fireEvent.press(screen.getByText('Más información'));
  expect(screen.getByText('Información pública y voluntaria.')).toBeTruthy();
  fireEvent.press(screen.getByText('Menos información'));
  expect(screen.queryByText('Información pública y voluntaria.')).toBeNull();
  expect(service.publishReligion).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Seleccionar creencia ▾'));
  fireEvent.press(screen.getByText('Catolicismo'));
  fireEvent.press(screen.getByText('Guardar religión'));
  expect(service.publishReligion).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByText('Guardar religión'));
  await waitFor(() => expect(service.publishReligion).toHaveBeenCalledWith('catholic', 'v1'));
  await screen.findByText('Guardado: Catolicismo');
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByText('Guardar religión')).toBeNull();
});

test('withdrawal is explicit and removes the active publication', async () => {
  jest.mocked(service.getReligionPublication).mockResolvedValue({ religionCode: 'catholic', hasPublication: true });
  render(<ProfileDiscoveryEditor languages={['spanish']} onLanguagesChange={jest.fn()} profileVisible />);
  fireEvent.press(await screen.findByText('Retirar de mi perfil'));
  await screen.findByText('Información eliminada.');
  expect(service.withdrawReligion).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Retirar de mi perfil')).toBeNull();
});

test('religion lives in more filters and combines with the selected language', () => {
  const change = jest.fn();
  render(<ProfileDiscoveryFilters language="arabic" onChange={change} />);
  expect(screen.queryByText('Religión o creencias')).toBeNull();
  fireEvent.press(screen.getByText('Más filtros'));
  fireEvent.press(screen.getByText('Cualquiera ▾'));
  fireEvent.press(screen.getByText('Catolicismo'));
  expect(change).toHaveBeenCalledWith({ language: 'arabic', religion: 'catholic' });
});

test('publication read failures explain the affected feature and clear after retry', async () => {
  jest.mocked(service.getReligionPublication).mockRejectedValueOnce(new Error('Unavailable'));
  render(<ProfileDiscoveryEditor languages={['spanish']} onLanguagesChange={jest.fn()} profileVisible />);
  await screen.findByText('No se pudo cargar la declaración de religión o creencias.');
  expect(screen.queryByText('No has publicado esta información.')).toBeNull();
  fireEvent.press(screen.getByText('Reintentar carga'));
  await waitFor(() => expect(service.getReligionPublication).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText('Cargando publicación…')).toBeNull());
  expect(screen.queryByText('No se pudo cargar la declaración de religión o creencias.')).toBeNull();
  expect(screen.queryByText('Reintentar carga')).toBeNull();
});

test('focus revalidation preserves the pending selection and confirmation', async () => {
  render(<ProfileDiscoveryEditor languages={[]} onLanguagesChange={jest.fn()} profileVisible />);
  await waitFor(() => expect(screen.queryByText('Cargando publicación…')).toBeNull());
  fireEvent.press(screen.getByText('Seleccionar creencia ▾'));
  fireEvent.press(screen.getByText('Catolicismo'));
  fireEvent.press(screen.getByRole('checkbox'));
  const calls = jest.mocked(useDiscoveryRevalidation).mock.calls;
  act(() => calls[calls.length - 1][0]());
  await waitFor(() => expect(service.getReligionPublication).toHaveBeenCalledTimes(2));
  expect(screen.getByText('Catolicismo ▾')).toBeTruthy();
  expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(true);
  fireEvent.press(screen.getByText('Guardar religión'));
  await waitFor(() => expect(service.publishReligion).toHaveBeenCalledWith('catholic', 'v1'));
});

test('hidden profiles save for display by link and changing directory visibility keeps the saved state', async () => {
  const props = { languages: [], onLanguagesChange: jest.fn() };
  const view = render(<ProfileDiscoveryEditor {...props} profileVisible={false} />);
  await waitFor(() => expect(screen.queryByText('Cargando publicación…')).toBeNull());
  fireEvent.press(screen.getByText('Seleccionar creencia ▾'));
  fireEvent.press(screen.getByText('Catolicismo'));
  fireEvent.press(screen.getByText('Guardar religión'));
  expect(service.publishReligion).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByText('Guardar religión'));
  await screen.findByText('Guardado: Catolicismo');
  expect(service.publishReligion).toHaveBeenCalledWith('catholic', 'v1');
  expect(service.saveReligionDraft).not.toHaveBeenCalled();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByText('Guardar religión')).toBeNull();
  view.rerender(<ProfileDiscoveryEditor {...props} profileVisible />);
  view.rerender(<ProfileDiscoveryEditor {...props} profileVisible={false} />);
  expect(screen.getByText('Guardado: Catolicismo')).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('previous private drafts require confirmation before becoming visible', async () => {
  jest.mocked(service.getReligionPublication).mockResolvedValue({ religionCode: 'catholic', hasPublication: false, hasDeclaration: true });
  render(<ProfileDiscoveryEditor languages={[]} onLanguagesChange={jest.fn()} profileVisible={false} />);
  await screen.findByText('Pendiente de confirmar: Catolicismo');
  expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
  expect(service.publishReligion).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByText('Guardar religión'));
  await screen.findByText('Guardado: Catolicismo');
  expect(screen.queryByRole('checkbox')).toBeNull();
});

test('a read started before publication cannot restore the previous empty state', async () => {
  let resolveRead: ((value: service.ReligionPublication) => void) | undefined;
  render(<ProfileDiscoveryEditor languages={[]} onLanguagesChange={jest.fn()} profileVisible />);
  await waitFor(() => expect(screen.queryByText('Cargando publicación…')).toBeNull());
  fireEvent.press(screen.getByText('Seleccionar creencia ▾'));
  fireEvent.press(screen.getByText('Catolicismo'));
  fireEvent.press(screen.getByRole('checkbox'));
  jest.mocked(service.getReligionPublication).mockImplementationOnce(() => new Promise(resolve => { resolveRead = resolve; }));
  const calls = jest.mocked(useDiscoveryRevalidation).mock.calls;
  act(() => calls[calls.length - 1][0]());
  await waitFor(() => expect(service.getReligionPublication).toHaveBeenCalledTimes(2));
  fireEvent.press(screen.getByText('Guardar religión'));
  await screen.findByText('Guardado: Catolicismo');
  await act(async () => { resolveRead?.({ religionCode: null, hasPublication: false }); });
  expect(screen.getByText('Guardado: Catolicismo')).toBeTruthy();
  expect(screen.getByText('Catolicismo ▾')).toBeTruthy();
});

test.each([false, true])('saved choice only asks for confirmation when changed (public: %s)', async (profileVisible) => {
  jest.mocked(service.getReligionPublication).mockResolvedValue({ religionCode: 'catholic', hasPublication: true, hasDeclaration: true });
  render(<ProfileDiscoveryEditor languages={[]} onLanguagesChange={jest.fn()} profileVisible={profileVisible} />);
  await screen.findByText('Catolicismo ▾');
  expect(screen.queryByRole('checkbox')).toBeNull();
  fireEvent.press(screen.getByText('Catolicismo ▾'));
  fireEvent.press(screen.getByText('Islam'));
  expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByText('Islam ▾'));
  fireEvent.press(screen.getByText('Catolicismo'));
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByText(profileVisible ? 'Guardar religión' : 'Guardar religión')).toBeNull();
  expect(service.publishReligion).not.toHaveBeenCalled();
  expect(service.saveReligionDraft).not.toHaveBeenCalled();
});
