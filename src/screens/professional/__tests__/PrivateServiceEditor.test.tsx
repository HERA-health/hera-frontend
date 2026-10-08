import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PrivateServiceEditor } from '../PrivateServiceEditor';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { savePrivateService, type PrivateServiceCatalog, type PrivateService } from '../../../services/privateCatalogService';
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/privateCatalogService', () => ({ savePrivateService: jest.fn(), loadServiceAssignmentPatients: jest.fn(async () => [{ id: 'patient', name: 'Ana Pérez' }]) }));
jest.mock('../../../components/common/alert', () => ({ useAppAlert: jest.fn(), showAppAlert: jest.fn() }));
const service: PrivateService = { id: 'mdr', key: 'mdr', name: 'Terapia MDR', description: null, version: 3, archivedAt: null, options: [
  { id: 'option', serviceId: 'mdr', name: 'Terapia MDR', modality: 'VIDEO_CALL', durationMinutes: 50, priceCents: 6000, currency: 'EUR', isActive: true, isPublic: true, isPreferred: true, version: 3, legacyDuration: false, legacyTariffId: null },
] };
const catalog: PrivateServiceCatalog = { version: 1, firstVisitFree: true, restrictions: {}, options: [], services: [service] };
const props = () => ({ navigation: { navigate: jest.fn() }, sourceCatalog: catalog, service, onSaved: jest.fn(), onClose: jest.fn(), onDirtyChange: jest.fn(), onSavingChange: jest.fn(), onReload: jest.fn(async () => {}) });
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
});

const sharedSwitch = () => screen.getByLabelText('Misma duración y precio para todas las modalidades');
const chooseAudience = (value = 'public') => fireEvent.press(screen.getByRole('radio', { name: value === 'public' ? 'Tarifa pública' : 'Tarifa privada' }));

test.each([5, 10, 45, 50, 75, 240])('creates only the selected %i minute option', async duration => {
  const input = props(); jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...input} service={null} />);
  fireEvent.changeText(screen.getByLabelText('Nombre del servicio'), 'Nuevo');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Videollamada' }));
  fireEvent.changeText(screen.getByLabelText('Duración común'), String(duration));
  fireEvent.changeText(screen.getByLabelText('Precio común'), '50,50');
  chooseAudience();
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalled());
  expect(jest.mocked(savePrivateService).mock.calls[0][1].options).toEqual([
    { modality: 'VIDEO_CALL', durationMinutes: duration, priceCents: 5050, isActive: true, isPublic: true, isPreferred: true },
  ]);
});

test('shared values and private visibility apply to every selected modality', async () => {
  const input = props(); jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...input} />);
  fireEvent.changeText(screen.getByLabelText('Duración común'), '37');
  fireEvent.changeText(screen.getByLabelText('Precio común'), '0');
  fireEvent.press(screen.getByRole('checkbox', { name: 'Teléfono' }));
  chooseAudience('private');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalled());
  const options = jest.mocked(savePrivateService).mock.calls[0][1].options;
  expect(options).toHaveLength(2);
  expect(options.every(o => o.durationMinutes === 37 && o.priceCents === 0)).toBe(true);
  expect(options.every(o => !o.isPublic)).toBe(true);
});

test('distinct existing values open independently; shared mode copies the first selected modality', async () => {
  const second = { ...service.options[0], id: 'phone', modality: 'PHONE_CALL' as const, durationMinutes: 75, priceCents: 8500 };
  const input = props(); jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...input} service={{ ...service, options: [...service.options, second] }} />);
  expect(sharedSwitch().props.value).toBe(false);
  expect(screen.getByLabelText('Duración de Teléfono').props.value).toBe('75');
  fireEvent.changeText(screen.getByLabelText('Precio de Teléfono'), '90.75');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalled());
  expect(jest.mocked(savePrivateService).mock.calls[0][1].options).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'option', durationMinutes: 50, priceCents: 6000 }),
    expect.objectContaining({ id: 'phone', durationMinutes: 75, priceCents: 9075 }),
  ]));
  fireEvent(sharedSwitch(), 'valueChange', true);
  expect(screen.getByLabelText('Duración común').props.value).toBe('50');
  fireEvent(sharedSwitch(), 'valueChange', false);
  expect(screen.getByLabelText('Duración de Teléfono').props.value).toBe('50');
  expect(screen.getByLabelText('Precio de Teléfono').props.value).toBe('60');
});

test('legacy options are retired only on save; the principal ID and price survive', async () => {
  const input = props(); jest.mocked(savePrivateService).mockResolvedValue(catalog);
  const legacy = { ...service, key: 'base', name: 'General', options: [
    { ...service.options[0], id: 'extra', durationMinutes: 75, isPreferred: false }, ...service.options,
  ] };
  render(<PrivateServiceEditor {...input} service={legacy} />);
  expect(screen.getByText('Revisa la simplificación de este servicio')).toBeTruthy();
  expect(screen.queryByText('Otras duraciones')).toBeNull();
  expect(screen.queryByText('Sesión individual')).toBeNull();
  expect(input.onDirtyChange).toHaveBeenLastCalledWith(false);
  expect(savePrivateService).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Cancelar'));
  expect(input.onClose).toHaveBeenCalled();
  expect(savePrivateService).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalled());
  expect(jest.mocked(savePrivateService).mock.calls[0][1].options).toEqual([
    expect.objectContaining({ id: 'option', durationMinutes: 50, priceCents: 6000, isPreferred: true }),
  ]);
});

test.each(['4', '241', '5.5', '', '-10'])('rejects invalid duration %s', async value => {
  render(<PrivateServiceEditor {...props()} />);
  fireEvent.changeText(screen.getByLabelText('Duración común'), value);
  fireEvent.press(screen.getByText('Guardar servicio'));
  expect(await screen.findByText('Entre 5 y 240 minutos enteros')).toBeTruthy();
  expect(savePrivateService).not.toHaveBeenCalled();
});

test.each(['', '-1', '50.505'])('rejects invalid price %s', async value => {
  render(<PrivateServiceEditor {...props()} />);
  fireEvent.changeText(screen.getByLabelText('Precio común'), value);
  fireEvent.press(screen.getByText('Guardar servicio'));
  expect(await screen.findByText('Importe no válido')).toBeTruthy();
  expect(savePrivateService).not.toHaveBeenCalled();
});

test('General also requires an active modality; deselection and reactivation reuse its option', async () => {
  const input = props(); jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...input} service={{ ...service, key: 'base' }} />);
  fireEvent.press(screen.getByRole('checkbox', { name: 'Videollamada' }));
  fireEvent.press(screen.getByText('Guardar servicio'));
  expect(await screen.findAllByText('Selecciona al menos una modalidad.')).toHaveLength(2);
  expect(savePrivateService).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Videollamada' }));
  fireEvent.changeText(screen.getByLabelText('Duración común'), '60');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalled());
  expect(jest.mocked(savePrivateService).mock.calls[0][1].options[0].id).toBe('option');
});

test('preview includes internal modalities and incomplete values remain pending', async () => {
  render(<PrivateServiceEditor {...props()} service={{ ...service, options: [{ ...service.options[0], isPublic: false }] }} />);
  expect(screen.getByText('Privada · No visible en tu perfil')).toBeTruthy();
  await screen.findByLabelText('Buscar pacientes para asignar tarifa');
  expect(screen.getByText('50 min')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Duración común'), '');
  fireEvent.changeText(screen.getByLabelText('Precio común'), '');
  expect(screen.getByText('Duración pendiente')).toBeTruthy();
  expect(screen.getAllByText('Precio pendiente')).toHaveLength(2);
});

test('conflicts preserve the draft and prevent blind resubmission', async () => {
  jest.mocked(savePrivateService).mockRejectedValue({ isAxiosError: true, response: { data: { code: 'CATALOG_VERSION_CONFLICT', message: 'El servicio ha cambiado.' } } });
  render(<PrivateServiceEditor {...props()} />);
  fireEvent.changeText(screen.getByLabelText('Nombre del servicio'), 'Mi borrador');
  fireEvent.changeText(screen.getByLabelText('Precio común'), '75');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await screen.findByText('Cargar versión actual');
  expect(screen.getByDisplayValue('Mi borrador')).toBeTruthy();
  expect(screen.getByDisplayValue('75')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Guardar servicio' }).props.accessibilityState.disabled).toBe(true);
});

test('public is the default; private assignment is searchable, saved and cleared when publishing', async () => {
  jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...props()} />);
  expect(screen.getByRole('radio', { name: 'Tarifa pública' }).props.accessibilityState.checked).toBe(true);
  expect(screen.queryByLabelText('Buscar pacientes para asignar tarifa')).toBeNull();
  chooseAudience('private');
  fireEvent.changeText(await screen.findByLabelText('Buscar pacientes para asignar tarifa'), 'perez');
  fireEvent.press(screen.getByRole('button', { name: 'Asignar a Ana Pérez' }));
  expect(screen.getByRole('button', { name: 'Quitar asignación a Ana Pérez' })).toBeTruthy();
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(savePrivateService).toHaveBeenCalledWith('mdr', expect.objectContaining({ assignedClientIds: ['patient'], options: [expect.objectContaining({ isPublic: false })] })));
  chooseAudience();
  fireEvent.changeText(screen.getByLabelText('Nombre del servicio'), 'Publicada');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(savePrivateService).toHaveBeenLastCalledWith('mdr', expect.objectContaining({ assignedClientIds: [], options: [expect.objectContaining({ isPublic: true })] })));
});

test('mixed legacy visibility can be explicitly saved as private without changing prices', async () => {
  jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...props()} service={{ ...service, options: [...service.options, { ...service.options[0], id: 'phone', modality: 'PHONE_CALL', isPublic: false }] }} />);
  await screen.findByLabelText('Buscar pacientes para asignar tarifa');
  expect(screen.getByRole('radio', { name: 'Tarifa privada' }).props.accessibilityState.checked).toBe(true);
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(savePrivateService).toHaveBeenCalled());
  expect(jest.mocked(savePrivateService).mock.calls[0][1].options.every(o => !o.isPublic && o.priceCents === 6000)).toBe(true);
});
