import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PrivateServiceEditor } from '../PrivateServiceEditor';
import { SimpleDropdown } from '../../../components/common/SimpleDropdown';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { savePrivateService, type PrivateServiceCatalog, type PrivateService } from '../../../services/privateCatalogService';
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/privateCatalogService', () => ({ savePrivateService: jest.fn() }));
jest.mock('../../../components/common/alert', () => ({ useAppAlert: jest.fn(), showAppAlert: jest.fn() }));
const service: PrivateService = { id: 'mdr', key: 'mdr', name: 'Terapia MDR', description: null, version: 3, archivedAt: null, options: [
  { id: 'option', serviceId: 'mdr', name: 'Terapia MDR', modality: 'VIDEO_CALL', durationMinutes: 50, priceCents: 6000, currency: 'EUR', isActive: true, isPublic: true, isPreferred: true, version: 3, legacyDuration: false, legacyTariffId: null },
] };
const catalog: PrivateServiceCatalog = { version: 1, firstVisitFree: true, restrictions: {}, options: [], services: [service] };
const props = () => ({ navigation: { navigate: jest.fn() }, sourceCatalog: catalog, service, onSaved: jest.fn(), onClose: jest.fn(), onDirtyChange: jest.fn(), onSavingChange: jest.fn(), onReload: jest.fn(async () => {}) });
const dropdown = (label: string) => {
  const control = screen.UNSAFE_getAllByType(SimpleDropdown).find(c => c.props.accessibilityLabel === label);
  if (!control) throw new Error(`Missing dropdown: ${label}`);
  return control;
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
});

test.each([45, 50])('creates a %i minute service without an unwanted 60 minute option', async duration => {
  const input = props();
  jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...input} service={null} />);
  fireEvent.changeText(screen.getByLabelText('Nombre del servicio'), 'Nuevo');
  fireEvent(screen.getByLabelText('Activar Videollamada'), 'valueChange', true);
  fireEvent(dropdown('Duración principal de Videollamada'), 'select', duration);
  fireEvent.changeText(screen.getByLabelText(`Precio de Videollamada, ${duration} minutos`), '50');
  fireEvent(dropdown('Disponibilidad de Videollamada'), 'select', 'public');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalled());
  expect(jest.mocked(savePrivateService).mock.calls[0][1].options).toEqual([
    expect.objectContaining({ durationMinutes: duration, priceCents: 5000, isPublic: true, isPreferred: true }),
  ]);
});

test('changing the preferred duration preserves existing configured variants', async () => {
  const input = props();
  jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...input} />);
  fireEvent(dropdown('Duración principal de Videollamada'), 'select', 45);
  fireEvent.changeText(screen.getByLabelText('Precio de Videollamada, 45 minutos'), '40');
  fireEvent(dropdown('Disponibilidad de Videollamada'), 'select', 'private');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalled());
  expect(jest.mocked(savePrivateService).mock.calls[0][1].options).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'option', durationMinutes: 50, priceCents: 6000, isActive: true, isPublic: true, isPreferred: false }),
    expect.objectContaining({ durationMinutes: 45, priceCents: 4000, isPublic: false, isPreferred: true }),
  ]));
});

test('renamed General still displays its legacy tariff detail', () => {
  render(<PrivateServiceEditor {...props()} service={{ ...service, key: 'base', name: 'Mi consulta', options: [
    { ...service.options[0], name: 'Consulta prolongada', legacyTariffId: 'legacy' },
  ] }} />);
  expect(screen.getByDisplayValue('Mi consulta')).toBeTruthy();
  expect(screen.getByText('Consulta prolongada')).toBeTruthy();
});
test('decimal input saves one service without global policy and keeps its expected version', async () => {
  const input = props(); jest.mocked(savePrivateService).mockResolvedValue(catalog);
  render(<PrivateServiceEditor {...input} />);
  fireEvent.changeText(screen.getByLabelText('Precio de Videollamada, 50 minutos'), '50,50');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalledWith(catalog));
  const saved = jest.mocked(savePrivateService).mock.calls[0];
  expect(saved[0]).toBe('mdr'); expect(saved[1].version).toBe(3);
  expect(saved[1].options[0].priceCents).toBe(5050);
  expect(saved[1]).not.toHaveProperty('firstVisitFree');
});
test('conflicts preserve the name and price draft and prevent blind resubmission', async () => {
  jest.mocked(savePrivateService).mockRejectedValue({ isAxiosError: true, response: { data: { code: 'CATALOG_VERSION_CONFLICT', message: 'El servicio ha cambiado.' } } });
  render(<PrivateServiceEditor {...props()} />);
  fireEvent.changeText(screen.getByLabelText('Nombre del servicio'), 'Mi borrador');
  fireEvent.changeText(screen.getByLabelText('Precio de Videollamada, 50 minutos'), '75');
  fireEvent.press(screen.getByText('Guardar servicio'));
  await screen.findByText('Cargar versión actual');
  expect(screen.getByDisplayValue('Mi borrador')).toBeTruthy();
  expect(screen.getByDisplayValue('75')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Guardar servicio' }).props.accessibilityState.disabled).toBe(true);
});
test('new options require an explicit price and visibility; activating does not publish', async () => {
  render(<PrivateServiceEditor {...props()} service={null} />);
  fireEvent.changeText(screen.getByLabelText('Nombre del servicio'), 'Nuevo');
  fireEvent(screen.getByLabelText('Activar Videollamada'), 'valueChange', true);
  fireEvent.press(screen.getByText('Guardar servicio'));
  expect(await screen.findByText('Importe no válido')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Precio de Videollamada, 60 minutos'), '0');
  fireEvent.press(screen.getByText('Guardar servicio'));
  expect(await screen.findByText('Elige la disponibilidad de cada opción nueva.')).toBeTruthy();
  expect(savePrivateService).not.toHaveBeenCalled();
});


test('base service name is editable and additional durations open only on request', () => {
  const base: PrivateService = { ...service, key: 'base', name: 'General', options: [service.options[0], { ...service.options[0], id: 'extra', durationMinutes: 75, isPreferred: false, isPublic: false, legacyDuration: true }] };
  render(<PrivateServiceEditor {...props()} service={base} />);
  fireEvent.changeText(screen.getByLabelText('Nombre del servicio'), 'Consulta personalizada');
  expect(screen.getByDisplayValue('Consulta personalizada')).toBeTruthy();
  expect(screen.queryByLabelText('Precio de Videollamada, 75 minutos')).toBeNull();
  fireEvent.press(screen.getByText('Otras duraciones · 1'));
  expect(screen.getByLabelText('Precio de Videollamada, 75 minutos')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Precio de Videollamada, 75 minutos'), '85');
  expect(screen.getByDisplayValue('85')).toBeTruthy();
  expect(screen.getByLabelText('Precio de Videollamada, 50 minutos').props.value).toBe('60');
});
