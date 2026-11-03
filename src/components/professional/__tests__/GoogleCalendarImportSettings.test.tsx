import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GoogleCalendarImportSettings } from '../GoogleCalendarImportSettings';
import * as service from '../../../services/googleCalendarService';
import type { CalendarImportStatus } from '../../../services/externalCalendarContracts';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../services/googleCalendarService', () => ({ configureCalendarImport: jest.fn(), getImportCalendars: jest.fn(), consumeCalendarImportSetup: jest.fn(() => false) }));
const status: CalendarImportStatus = { available: true, enabled: false, permissionRequired: false, revision: 2, disclosureVersion: '2026-11-02', calendars: [], lastSyncedAt: null, errorCode: null };
const calendars = [{ id: 'main', name: 'Personal', primary: true, availabilityOnly: false }, { id: 'team', name: 'Equipo', primary: false, availabilityOnly: true }];
const changed = jest.fn(async () => {}), authorize = jest.fn(async () => {});
beforeEach(() => { jest.clearAllMocks(); jest.mocked(service.getImportCalendars).mockResolvedValue(calendars); jest.mocked(service.configureCalendarImport).mockResolvedValue(status); });

test('unreadable metadata keeps the selection and offers recovery without disconnecting or saving preferences', async () => {
  render(<GoogleCalendarImportSettings userId="owner" status={{ ...status, enabled: true, calendars: [{ id: 'main', name: 'Calendario de Google' }], errorCode: 'CALENDAR_IMPORT_METADATA_UNAVAILABLE' }} connected onAuthorize={authorize} onChanged={changed} />);
  expect(screen.getByText('No hemos podido recuperar los nombres de tus calendarios. Tu selección se conserva.')).toBeTruthy();
  expect(screen.getByText('1 calendario incluido')).toBeTruthy();
  fireEvent.press(screen.getByText('Actualizar calendarios'));
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(service.configureCalendarImport).not.toHaveBeenCalled();
  expect(authorize).not.toHaveBeenCalled();
});

test('an enabled import missing read permission opens authorization directly instead of claiming events are synchronized', async () => {
  render(<GoogleCalendarImportSettings userId="owner" status={{ ...status, enabled: true, permissionRequired: true,
    calendars: [{ id: 'main', name: 'Calendario de Google' }], errorCode: 'CALENDAR_IMPORT_METADATA_UNAVAILABLE' }} connected onAuthorize={authorize} onChanged={changed} />);
  await screen.findByText('Continuar con Google');
  expect(screen.getByText('Renueva el permiso de Google para volver a incluir tus eventos en HERA.')).toBeTruthy();
  expect(screen.queryByText('Tus otros compromisos aparecen en HERA y bloquean los horarios ocupados.')).toBeNull();
  expect(screen.queryByText('Actualizar calendarios')).toBeNull();
  expect(service.getImportCalendars).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Continuar con Google'));
  await waitFor(() => expect(authorize).toHaveBeenCalledTimes(1));
  expect(service.configureCalendarImport).not.toHaveBeenCalled();
});

test('opening proposes the primary calendar without activating or importing until save', async () => {
  render(<GoogleCalendarImportSettings userId="owner" status={status} connected onAuthorize={authorize} onChanged={changed} />);
  expect(service.getImportCalendars).not.toHaveBeenCalled();
  fireEvent(screen.getByLabelText('Incluir eventos de Google en mi agenda de HERA'), 'valueChange', true);
  const personal = await screen.findByRole('checkbox', { name: 'Personal' });
  expect(personal.props.accessibilityState.checked).toBe(true);
  expect(service.configureCalendarImport).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Incluir eventos de Google en mi agenda de HERA').props.value).toBe(true);
  expect(screen.getByText('Pendiente de guardar · Aún no se incluyen eventos.')).toBeTruthy();
  fireEvent.press(screen.getByRole('checkbox', { name: 'Equipo' }));
  fireEvent.press(screen.getByText('Guardar y activar'));
  await waitFor(() => expect(changed).toHaveBeenCalled());
  expect(service.configureCalendarImport).toHaveBeenCalledWith({ enabled: true, calendarIds: ['main', 'team'], revision: 2, disclosureVersion: '2026-11-02' });
});

test('skipping optional setup does not write preferences', async () => {
  jest.mocked(service.consumeCalendarImportSetup).mockReturnValueOnce(true);
  render(<GoogleCalendarImportSettings userId="owner" status={status} connected onAuthorize={authorize} onChanged={changed} />);
  await screen.findByRole('checkbox', { name: 'Personal' });
  fireEvent.press(screen.getByText('Ahora no'));
  expect(service.configureCalendarImport).not.toHaveBeenCalled();
  expect(screen.queryByText('Guardar y activar')).toBeNull();
});

test('permission expansion is explicit and disabling leaves export preferences untouched', async () => {
  const view = render(<GoogleCalendarImportSettings userId="owner" status={{ ...status, permissionRequired: true }} connected onAuthorize={authorize} onChanged={changed} />);
  fireEvent(screen.getByLabelText('Incluir eventos de Google en mi agenda de HERA'), 'valueChange', true);
  fireEvent.press(screen.getByText('Continuar con Google'));
  await waitFor(() => expect(authorize).toHaveBeenCalled());
  expect(service.getImportCalendars).not.toHaveBeenCalled();
  view.unmount();
  render(<GoogleCalendarImportSettings userId="owner" status={{ ...status, enabled: true, calendars: [{ id: 'main', name: 'Personal' }] }} connected onAuthorize={authorize} onChanged={changed} />);
  fireEvent(screen.getByLabelText('Incluir eventos de Google en mi agenda de HERA'), 'valueChange', false);
  await waitFor(() => expect(service.configureCalendarImport).toHaveBeenCalledWith({ enabled: false, calendarIds: [], revision: 2, disclosureVersion: '2026-11-02' }));
});


test('revoked connections can disable import without reauthorizing first', async () => {
  render(<GoogleCalendarImportSettings userId="owner" status={{ ...status, enabled: true, permissionRequired: true }} connected={false} onAuthorize={authorize} onChanged={changed} />);
  const toggle = screen.getByLabelText('Incluir eventos de Google en mi agenda de HERA');
  expect(toggle.props.disabled).toBe(false);
  fireEvent(toggle, 'valueChange', false);
  await waitFor(() => expect(service.configureCalendarImport).toHaveBeenCalledWith({ enabled: false, calendarIds: [], revision: 2, disclosureVersion: '2026-11-02' }));
  expect(authorize).not.toHaveBeenCalled();
});


test('the draft switch responds immediately and can cancel setup without saving', async () => {
  render(<GoogleCalendarImportSettings userId="owner" status={status} connected onAuthorize={authorize} onChanged={changed} />);
  const label = 'Incluir eventos de Google en mi agenda de HERA';
  fireEvent(screen.getByLabelText(label), 'valueChange', true);
  await screen.findByRole('checkbox', { name: 'Personal' });
  expect(screen.getByLabelText(label).props.value).toBe(true);
  fireEvent(screen.getByLabelText(label), 'valueChange', false);
  expect(screen.getByLabelText(label).props.value).toBe(false);
  expect(screen.queryByText('Guardar y activar')).toBeNull();
  expect(service.configureCalendarImport).not.toHaveBeenCalled();
});

test('saving keeps the chosen calendars visible and errors leave a retryable draft', async () => {
  let rejectSave!: (error: Error) => void;
  jest.mocked(service.configureCalendarImport).mockReturnValueOnce(new Promise((_, reject) => { rejectSave = reject; }));
  render(<GoogleCalendarImportSettings userId="owner" status={status} connected onAuthorize={authorize} onChanged={changed} />);
  fireEvent(screen.getByLabelText('Incluir eventos de Google en mi agenda de HERA'), 'valueChange', true);
  await screen.findByRole('checkbox', { name: 'Personal' });
  fireEvent.press(screen.getByText('Guardar y activar'));
  expect(screen.getByRole('checkbox', { name: 'Personal' }).props.accessibilityState).toMatchObject({ checked: true, disabled: true });
  expect(screen.getByText('Guardando…')).toBeTruthy();
  expect(screen.queryByLabelText('Cargando calendarios')).toBeNull();
  await act(async () => rejectSave(new Error('No se pudo guardar.')));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText('Guardar y activar')).toBeTruthy();
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Incluir eventos de Google en mi agenda de HERA').props.value).toBe(true);
  fireEvent.press(screen.getByText('Ahora no'));
  expect(screen.getByLabelText('Incluir eventos de Google en mi agenda de HERA').props.value).toBe(false);
});
