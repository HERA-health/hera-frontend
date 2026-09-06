import React from 'react';
import { View } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ProfessionalClientsScreen } from '../ProfessionalClientsScreen';
import * as professionalService from '../../../services/professionalService';

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    useNavigation: () => ({ setParams: jest.fn(), navigate: jest.fn() }),
    useRoute: () => ({ params: undefined }),
    useIsFocused: () => mockIsFocused,
    useFocusEffect: (effect: () => void | (() => void)) => ReactModule.useEffect(() => {
      if (mockIsFocused) return effect();
    }, [effect, mockIsFocused]),
  };
});
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme, isDark: false }),
}));
jest.mock('../../../components/common/alert', () => ({
  useAppAlert: () => ({}), useAppAlertState: () => ({ isVisible: false }), showAppAlert: jest.fn(),
}));
jest.mock('../../../components/onboarding/professionalTourContext', () => ({
  useProfessionalTourAutoStart: jest.fn(), useOptionalProfessionalTour: () => null,
}));
jest.mock('../../../components/professional/ManagedSessionSchedulerModal', () => {
  const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ManagedSessionSchedulerModal: ({ visible, onSubmit }: React.ComponentProps<typeof import('../../../components/professional/ManagedSessionSchedulerModal').ManagedSessionSchedulerModal>) => visible
    ? <Button title="Guardar cita de prueba" onPress={() => { void onSubmit({ clientId: 'client-test', date: '2026-10-01T10:00:00Z', duration: 60, type: 'VIDEO_CALL' }); }} />
    : null };
});
jest.mock('../../../services/professionalService', () => ({ getProfessionalClients: jest.fn(), createManagedClientSession: jest.fn(), isManagedSessionBufferConflictError: () => false }));
jest.mock('../../../services/managedPatientConsentService', () => ({ createManagedPatientWithInitialConsent: jest.fn() }));
jest.mock('../../../services/clinicalService', () => ({
  getClinicalAccessStatus: jest.fn(async () => ({ hasPin: true, session: { active: false } })),
  hasAcceptedCurrentDataProcessingAgreement: () => true,
}));

beforeEach(() => {
  mockIsFocused = true;
  jest.mocked(professionalService.getProfessionalClients).mockReset();
  jest.mocked(professionalService.createManagedClientSession).mockReset();
});

it('shows a load failure, then a genuine empty result after a successful retry', async () => {
  const getClients = jest.mocked(professionalService.getProfessionalClients);
  getClients.mockRejectedValueOnce(new Error('Demasiadas solicitudes')).mockResolvedValueOnce([]);
  const view = render(<View><ProfessionalClientsScreen /></View>);
  await waitFor(() => expect(view.getByText('No pudimos cargar los pacientes')).toBeTruthy());
  expect(view.queryByText('No hay pacientes para este filtro')).toBeNull();
  fireEvent.press(view.getByText('Reintentar'));
  await waitFor(() => expect(view.getByText('No hay pacientes para este filtro')).toBeTruthy());
  expect(view.queryByText('No pudimos cargar los pacientes')).toBeNull();
  view.unmount();
});

it('refreshes once after a creation during an existing read, without replaying the write', async () => {
  const client: professionalService.Client = {
    id: 'client-test', userId: null, source: 'MANAGED', displayName: 'Paciente de prueba',
    user: { id: null, email: '', name: 'Paciente de prueba', userType: 'CLIENT' }, sessions: [],
  };
  const session: professionalService.Session = {
    id: 'session-test', clientId: client.id, specialistId: 'professional-test', date: '2026-10-01T10:00:00Z', duration: 60, type: 'VIDEO_CALL', status: 'CONFIRMED',
  };
  let resolvePending: ((clients: professionalService.Client[]) => void) | undefined;
  const pending = new Promise<professionalService.Client[]>((resolve) => { resolvePending = resolve; });
  const getClients = jest.mocked(professionalService.getProfessionalClients);
  getClients.mockResolvedValueOnce([client]).mockReturnValueOnce(pending).mockResolvedValueOnce([{ ...client, sessions: [session] }]);
  jest.mocked(professionalService.createManagedClientSession).mockResolvedValueOnce(session);
  const view = render(<View><ProfessionalClientsScreen /></View>);
  await waitFor(() => expect(view.getByText('Crear cita')).toBeTruthy());
  fireEvent.press(view.getByText('Crear cita'));
  mockIsFocused = false;
  view.rerender(<View><ProfessionalClientsScreen /></View>);
  mockIsFocused = true;
  view.rerender(<View><ProfessionalClientsScreen /></View>);
  expect(getClients).toHaveBeenCalledTimes(2);
  await act(async () => { fireEvent.press(view.getByText('Guardar cita de prueba')); });
  expect(professionalService.createManagedClientSession).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(view.queryByText('Guardar cita de prueba')).toBeNull());
  expect(getClients).toHaveBeenCalledTimes(2);
  await act(async () => { resolvePending?.([client]); });
  await waitFor(() => expect(view.getByText('1 sesión')).toBeTruthy());
  expect(getClients).toHaveBeenCalledTimes(3);
  expect(professionalService.createManagedClientSession).toHaveBeenCalledTimes(1);
  view.unmount();
});
