import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReferralComposer } from '../ReferralComposer';
import * as service from '../../../services/referralService';
jest.mock('../../../services/referralService', () => ({ getReferralDirectoryOptions: jest.fn(), searchReferralDirectory: jest.fn(), createReferral: jest.fn(), editReferral: jest.fn() }));
jest.mock('../../../services/collaborationService', () => ({ getReferralCandidate: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-command' }));
jest.mock('../../../components/common/AnimatedPressable', () => ({
  AnimatedPressable: ({ children, onPress, accessibilityLabel, accessibilityRole, accessibilityState, disabled }: {
    children: React.ReactNode; onPress?: () => void; accessibilityLabel?: string;
    accessibilityRole?: import('react-native').AccessibilityRole; accessibilityState?: import('react-native').AccessibilityState; disabled?: boolean;
  }) => {
    const { Pressable } = require('react-native');
    return <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole} accessibilityState={accessibilityState} disabled={disabled}>{children}</Pressable>;
  },
}));
const profiles: service.ReferralCandidate[] = ['A', 'B', 'C', 'D'].map(id => ({ id, user: { name: `Profesional ${id}` }, publicSlug: null, specialization: 'Psicología', professionalType: null, pricePerSession: 60, languagesSpoken: ['spanish'], verificationStatus: 'VERIFIED', referralCapabilities: ['Adultos'], referralExclusions: [] }));
const search = jest.mocked(service.searchReferralDirectory);
const options = jest.mocked(service.getReferralDirectoryOptions);
const save = jest.mocked(service.createReferral);
const setup = () => render(<ReferralComposer clientId="patient-test" access={{}} onSaved={jest.fn()} onCancel={jest.fn()} />);
beforeEach(() => {
  jest.clearAllMocks();
  options.mockResolvedValue({ specializations: ['Psicología'], languages: ['spanish'], capabilities: ['Adultos'] });
  search.mockResolvedValue({ items: profiles, hasMore: false });
});
test('uses directory values, converts the budget, and preserves selections when filters change', async () => {
  setup();
  fireEvent.press(await screen.findByLabelText('Idioma'));
  fireEvent.press(screen.getByText('Español'));
  fireEvent.changeText(screen.getByLabelText('Presupuesto máximo por sesión (€)'), '60,50');
  fireEvent.press(screen.getByText('Buscar profesionales'));
  await screen.findByText('Profesional A');
  expect(search).toHaveBeenCalledWith(expect.objectContaining({ language: 'spanish', maxPriceCents: 6050, page: 0 }));
  fireEvent.press(screen.getByText('Añadir a Profesional A'));
  fireEvent.changeText(screen.getByLabelText('Nombre o palabra clave'), 'nuevo');
  expect(screen.getByText('Profesionales propuestos · 1/3 *')).toBeTruthy();
  expect(screen.queryByText('Añadir a Profesional B')).toBeNull();
  expect(screen.getByText('Explora el directorio')).toBeTruthy();
});
test('requires explanation and candidates, limits selection to three, and retains draft on failure', async () => {
  save.mockRejectedValue(new Error('No se pudo guardar'));
  setup();
  await screen.findByLabelText('Idioma');
  expect(screen.getByText('Guardar borrador')).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Explicación para el paciente *'), 'Explicación de prueba');
  fireEvent.press(screen.getByText('Buscar profesionales'));
  await screen.findByText('Profesional A');
  for (const id of ['A', 'B', 'C']) fireEvent.press(screen.getByText(`Añadir a Profesional ${id}`));
  expect(screen.getByText('Añadir a Profesional D')).toBeDisabled();
  fireEvent.press(screen.getByText('Guardar borrador'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  await screen.findByText('No se pudo guardar');
  expect(screen.getByLabelText('Explicación para el paciente *').props.value).toBe('Explicación de prueba');
  expect(screen.getByText('Profesionales propuestos · 3/3 *')).toBeTruthy();
});
test('ignores a pending response when a dropdown changes', async () => {
  let resolveSearch: ((value: { items: service.ReferralCandidate[]; hasMore: boolean }) => void) | undefined;
  search.mockImplementationOnce(() => new Promise(resolve => { resolveSearch = resolve; }));
  setup();
  fireEvent.press(await screen.findByLabelText('Idioma'));
  fireEvent.press(screen.getByText('Español'));
  fireEvent.press(screen.getByText('Buscar profesionales'));
  fireEvent.press(screen.getByLabelText('Idioma'));
  fireEvent.press(screen.getByText('Cualquier idioma'));
  await act(async () => { resolveSearch?.({ items: profiles, hasMore: false }); });
  expect(screen.queryByText('Profesional A')).toBeNull();
});
test('retries unavailable options without losing the explanation', async () => {
  options.mockRejectedValueOnce(new Error('Filtros no disponibles'));
  setup();
  fireEvent.changeText(screen.getByLabelText('Explicación para el paciente *'), 'Se conserva');
  fireEvent.press(await screen.findByText('Reintentar filtros'));
  await screen.findByLabelText('Especialidad');
  expect(screen.getByLabelText('Explicación para el paciente *').props.value).toBe('Se conserva');
});
test('saves the proposal and selected profile without copying search filters into clinical content', async () => {
  const onSaved = jest.fn();
  save.mockResolvedValueOnce({ id: 'draft-test' });
  render(<ReferralComposer clientId="patient-test" access={{}} onSaved={onSaved} onCancel={jest.fn()} />);
  await screen.findByLabelText('Idioma');
  fireEvent.changeText(screen.getByLabelText('Explicación para el paciente *'), 'Propuesta de prueba');
  fireEvent.press(screen.getByText('Buscar profesionales'));
  fireEvent.press(await screen.findByText('Añadir a Profesional A'));
  fireEvent.press(screen.getByText('Guardar borrador'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith('draft-test'));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'patient-test', candidateIds: ['A'], content: { reason: 'PREFERENCE', explanation: 'Propuesta de prueba', summary: '', needs: '', transition: '' } }), {});
});
