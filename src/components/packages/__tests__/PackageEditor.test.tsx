import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { loadPrivateCatalog } from '../../../services/privateCatalogService';
import { loadPackageCatalog, savePackageCatalog } from '../../../services/packageService';
import { PackageEditor } from '../PackageEditor';
import { catalog, offer, service } from '../testing/packageFixtures';
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/privateCatalogService', () => ({ loadPrivateCatalog: jest.fn() }));
jest.mock('../../../services/packageService', () => ({ loadPackageCatalog: jest.fn(), savePackageCatalog: jest.fn(), packagePrice: (n: number) => `${(n / 100).toFixed(2)} €` }));
jest.mock('../../common/alert', () => ({ useAppAlert: jest.fn(), showAppAlert: jest.fn() }));
const props = () => ({ offer: null, catalog, navigation: { navigate: jest.fn() }, onSaved: jest.fn(), onClose: jest.fn(), onDirtyChange: jest.fn(), onSavingChange: jest.fn(), onServicesChanged: jest.fn() });
beforeEach(() => {
  jest.clearAllMocks(); jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
  jest.mocked(savePackageCatalog).mockResolvedValue([offer]);
});
test('defaults to all active modalities, keeps manual selection on repeated service press, and saves an optional name', async () => {
  const input = props(); render(<PackageEditor {...input} />);
  fireEvent.press(screen.getByText('General'));
  for (const modality of ['Videollamada', 'Presencial', 'Teléfono']) expect(screen.getByRole('checkbox', { name: modality }).props.accessibilityState.checked).toBe(true);
  fireEvent.press(screen.getByRole('checkbox', { name: 'Teléfono' })); fireEvent.press(screen.getByText('General'));
  expect(screen.getByRole('checkbox', { name: 'Teléfono' }).props.accessibilityState.checked).toBe(false);
  expect(screen.getByText('50 min · 60.00 €')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Número de sesiones'), '10'); fireEvent.changeText(screen.getByLabelText('Precio total en euros'), '540,00');
  expect(screen.getByText('54.00 € / sesión')).toBeTruthy(); expect(screen.getByText(/Presencial · Ahorro de 260.00/)).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Descripción del bono'), 'Opcional');
  fireEvent.press(screen.getByText('Crear bono'));
  await waitFor(() => expect(input.onSaved).toHaveBeenCalled());
  expect(savePackageCatalog).toHaveBeenCalledWith(undefined, expect.objectContaining({ name: '', description: 'Opcional', serviceVersion: 3, optionIds: ['option-0', 'option-1'], sessions: 10, totalCents: 54000, isPublic: true }));
});
test('selecting a private service forces private visibility and disables public purchase', async () => {
  const input = props(); const privateService = { ...service, options: service.options.map(o => ({ ...o, isPublic: false })) };
  render(<PackageEditor {...input} catalog={{ ...catalog, services: [privateService] }} />);
  fireEvent.press(screen.getByText('General'));
  expect(screen.getByRole('radio', { name: 'Bono privado' }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole('radio', { name: 'Bono público' }).props.accessibilityState.disabled).toBe(true);
  fireEvent.changeText(screen.getByLabelText('Precio total en euros'), '0'); fireEvent.press(screen.getByText('Crear bono'));
  await waitFor(() => expect(savePackageCatalog).toHaveBeenCalledWith(undefined, expect.objectContaining({ isPublic: false, totalCents: 0 })));
});
test('an invalid empty coverage never sends a request', () => {
  render(<PackageEditor {...props()} />); fireEvent.press(screen.getByText('General'));
  for (const modality of ['Videollamada', 'Presencial', 'Teléfono']) fireEvent.press(screen.getByRole('checkbox', { name: modality }));
  fireEvent.press(screen.getByText('Crear bono'));
  expect(screen.getByRole('alert').props.children).toMatch(/al menos una modalidad/); expect(savePackageCatalog).not.toHaveBeenCalled();
});
test('source-version conflict refreshes data without erasing the draft and requires another explicit save', async () => {
  const input = props(); jest.mocked(savePackageCatalog).mockRejectedValueOnce({ response: { data: { code: 'PACKAGE_SERVICE_CHANGED', message: 'Servicio modificado' } } });
  const next = { ...catalog, services: [{ ...service, version: 4, options: service.options.map(o => ({ ...o, priceCents: 9000 })) }] };
  jest.mocked(loadPrivateCatalog).mockResolvedValue(next); jest.mocked(loadPackageCatalog).mockResolvedValue({ data: [offer], acquisitionsEnabled: true });
  render(<PackageEditor {...input} offer={offer} />);
  fireEvent.changeText(screen.getByLabelText('Nombre del bono'), 'Mi borrador'); fireEvent.press(screen.getByText('Guardar bono'));
  await screen.findByText('Actualizar datos sin borrar mi borrador'); fireEvent.press(screen.getByText('Actualizar datos sin borrar mi borrador'));
  await waitFor(() => expect(input.onServicesChanged).toHaveBeenCalledWith(next));
  expect(screen.getByLabelText('Nombre del bono').props.value).toBe('Mi borrador'); expect(savePackageCatalog).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText('Guardar bono'));
  await waitFor(() => expect(savePackageCatalog).toHaveBeenCalledWith(offer.id, expect.objectContaining({ name: 'Mi borrador', serviceVersion: 4 })));
});
test('retired coverage must be reviewed, while edits retain existing selected modalities', async () => {
  const input = props(); render(<PackageEditor {...input} offer={{ ...offer, options: [offer.options[0], { id: 'retired', modality: 'PHONE_CALL', durationMinutes: 90 }] }} />);
  expect(screen.getByRole('checkbox', { name: 'Presencial' }).props.accessibilityState.checked).toBe(false);
  fireEvent.press(screen.getByText('Guardar bono')); expect(savePackageCatalog).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Revisar cobertura actual')); fireEvent.press(screen.getByText('Guardar bono'));
  await waitFor(() => expect(savePackageCatalog).toHaveBeenCalledWith(offer.id, expect.objectContaining({ optionIds: ['option-0'] })));
});
test('legacy services stay visible with an action to configure them', () => {
  render(<PackageEditor {...props()} catalog={{ ...catalog, services: [{ ...service, id: 'legacy:owner' }] }} />);
  expect(screen.getByText('General')).toBeTruthy(); expect(screen.getByText('Revisar servicio General')).toBeTruthy();
});
test('a concurrent archive offers an explicit restoration after refreshing the preserved draft', async () => {
  const input = props();
  jest.mocked(savePackageCatalog).mockRejectedValueOnce({ response: { data: { code: 'PACKAGE_VERSION_CONFLICT', message: 'Bono modificado' } } });
  jest.mocked(loadPrivateCatalog).mockResolvedValue(catalog);
  jest.mocked(loadPackageCatalog).mockResolvedValue({ data: [{ ...offer, version: 2, archivedAt: '2026-10-11' }], acquisitionsEnabled: true });
  render(<PackageEditor {...input} offer={offer} />); fireEvent.press(screen.getByText('Guardar bono'));
  fireEvent.press(await screen.findByText('Actualizar datos sin borrar mi borrador'));
  fireEvent.press(await screen.findByText('Restaurar y guardar'));
  await waitFor(() => expect(savePackageCatalog).toHaveBeenCalledWith(offer.id, expect.objectContaining({ version: 2, restore: true })));
});

test('an archived source conflict reloads the service and lets the user keep the draft on another active service', async () => {
  const input = props();
  jest.mocked(savePackageCatalog).mockRejectedValueOnce({ response: { data: { code: 'PACKAGE_SERVICE_CHANGED', message: 'Servicio modificado' } } });
  const alternative = { ...service, id: 'alternative', name: 'Seguimiento', version: 2,
    options: service.options.map(option => ({ ...option, id: `alternative-${option.id}`, serviceId: 'alternative' })) };
  const next = { ...catalog, services: [{ ...service, version: 4, archivedAt: '2026-10-11' }, alternative] };
  jest.mocked(loadPrivateCatalog).mockResolvedValue(next);
  jest.mocked(loadPackageCatalog).mockResolvedValue({ data: [offer], acquisitionsEnabled: true });
  render(<PackageEditor {...input} offer={offer} />);
  fireEvent.changeText(screen.getByLabelText('Descripción del bono'), 'Borrador conservado');
  fireEvent.press(screen.getByText('Guardar bono'));
  fireEvent.press(await screen.findByText('Actualizar datos sin borrar mi borrador'));
  await waitFor(() => expect(input.onServicesChanged).toHaveBeenCalledWith(next));
  expect(screen.getByLabelText('Descripción del bono').props.value).toBe('Borrador conservado');
  expect(screen.queryByText('General')).toBeNull();
  fireEvent.press(screen.getByText('Guardar bono'));
  expect(savePackageCatalog).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText('Seguimiento')); fireEvent.press(screen.getByText('Guardar bono'));
  await waitFor(() => expect(savePackageCatalog).toHaveBeenLastCalledWith(offer.id, expect.objectContaining({
    description: 'Borrador conservado', serviceId: alternative.id, serviceVersion: 2,
  })));
});
