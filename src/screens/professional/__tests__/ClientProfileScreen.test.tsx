import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ClientProfileScreen } from '../ClientProfileScreen';
import * as professional from '../../../services/professionalService';
import { getPatientSummary, getPatientSessions, type PatientSummary } from '../../../services/patientDetailService';

let mockIsFocused = true;
const mockNavigation = { setParams: jest.fn(), navigate: jest.fn(), goBack: jest.fn() };
jest.mock('@react-navigation/native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  return {
    useNavigation: () => mockNavigation,
    useRoute: () => ({ params: { clientId: 'patient', initialTab: 'history' } }),
    useFocusEffect: (effect: () => void | (() => void)) => ReactModule.useEffect(() => {
      if (mockIsFocused) return effect();
    }, [effect, mockIsFocused]),
  };
});
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme }),
}));
jest.mock('../../../components/common/alert', () => ({ useAppAlert: () => jest.fn(), showAppAlert: jest.fn() }));
jest.mock('../../../components/onboarding/professionalTourContext', () => ({ useOptionalProfessionalTour: () => null }));
jest.mock('../../../components/onboarding/TourTarget', () => ({ TourTarget: ({ children }: React.PropsWithChildren) => children }));
jest.mock('../../../components/professional/ClinicalTab', () => ({ ClinicalTab: () => null }));
jest.mock('../../../components/professional/patient-detail/PatientFinancialPanel', () => ({ PatientFinancialPanel: () => null }));
jest.mock('../../../components/professional/ClinicalSessionInvoiceSheet', () => ({ ClinicalSessionInvoiceSheet: () => null }));
jest.mock('../../../components/professional/SessionMeetingControls', () => ({ SessionMeetingControls: () => null }));
jest.mock('../../../components/professional/ManagedSessionSchedulerModal', () => {
  const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
  return { ManagedSessionSchedulerModal: ({ visible, onSubmit }: React.ComponentProps<typeof import('../../../components/professional/ManagedSessionSchedulerModal').ManagedSessionSchedulerModal>) => visible
    ? <Button title="Guardar cita de prueba" onPress={() => { void onSubmit({ clientId: 'patient', date: '2026-11-01T10:00:00Z', duration: 60, type: 'IN_PERSON' }); }} />
    : null };
});
jest.mock('../../../services/professionalService', () => ({
  getProfessionalClientDetail: jest.fn(), getProfessionalSessionDetail: jest.fn(),
  createManagedClientSession: jest.fn(), isManagedSessionBufferConflictError: () => false,
}));
jest.mock('../../../services/patientDetailService', () => ({ getPatientSummary: jest.fn(), getPatientSessions: jest.fn() }));
jest.mock('../../../services/billingService', () => ({ billingService: { getAttachableInvoicesForSession: jest.fn() } }));
jest.mock('../../../services/sessionPaymentService', () => ({ getPayment: jest.fn(), cancelPayment: jest.fn(), paymentAmount: jest.fn() }));

const client: professional.Client = {
  id: 'patient', userId: null, source: 'MANAGED', displayName: 'Paciente de prueba',
  user: { id: null, name: 'Paciente de prueba', email: 'patient@example.test', userType: 'CLIENT' }, sessions: [],
};
const session: professional.ProfessionalSessionDetail = {
  id: 'scheduled', clientId: client.id, specialistId: 'professional', date: '2026-11-01T10:00:00.000Z',
  duration: 60, type: 'IN_PERSON', status: 'CONFIRMED',
  bookedServiceName: 'Sesión individual',
  price: { amount: 60, currency: 'EUR', tariffName: null },
  professional: { id: 'professional', displayName: 'Profesional', professionalTitle: null },
  clinicalTarget: null,
};
const summary: PatientSummary = {
  profile: { taxId: null, birthDate: null, address: null, postalCode: null, city: null, country: null,
    occupation: null, emergencyName: null, emergencyPhone: null, editableFields: [] },
  completed: 0, nextSession: null, lastSession: null, pendingAmountCents: 0, pendingInvoiceCount: 0,
  authorizationStatus: 'PENDING', authorizationGrantedAt: null, closedAt: null, treatmentConsent: null,
  recentMovements: [], professionalName: 'Profesional', relationshipSince: null, provenance: 'OWN',
};
beforeEach(() => {
  jest.clearAllMocks();
  mockIsFocused = true;
  jest.mocked(professional.getProfessionalClientDetail).mockReset().mockResolvedValue(client);
  jest.mocked(professional.getProfessionalSessionDetail).mockReset().mockResolvedValue(session);
  jest.mocked(getPatientSummary).mockReset().mockResolvedValue(summary);
  jest.mocked(getPatientSessions).mockReset().mockResolvedValue({ items: [], total: 0, page: 1, totalPages: 0 });
  jest.mocked(professional.createManagedClientSession).mockReset().mockResolvedValue(session);
});

test('creating an appointment refreshes the summary and mounted sessions list', async () => {
  render(<ClientProfileScreen />);
  await screen.findByText('Sin cita programada');
  expect(screen.queryByText('Paciente gestionado')).toBeNull();
  expect(screen.queryByText('Paciente HERA')).toBeNull();
  await waitFor(() => expect(getPatientSessions).toHaveBeenCalledTimes(1));
  jest.mocked(getPatientSummary).mockResolvedValue({ ...summary, nextSession: session });
  jest.mocked(getPatientSessions).mockResolvedValue({ items: [{ ...session, collectionState: 'UNRECORDED' }], total: 1, page: 1, totalPages: 1 });
  fireEvent.press(screen.getByRole('button', { name: 'Programar sesión' }));
  fireEvent.press(await screen.findByText('Guardar cita de prueba'));
  await screen.findByRole('button', { name: /1 nov 2026/ });
  expect(screen.queryByText('Sin cita programada')).toBeNull();
  expect(professional.createManagedClientSession).toHaveBeenCalledTimes(1);
  expect(getPatientSummary).toHaveBeenCalledTimes(2);
  expect(getPatientSessions).toHaveBeenCalledTimes(2);
  expect(professional.getProfessionalClientDetail).toHaveBeenCalledTimes(2);
});

test('returning to the screen refreshes the summary and sessions; older summary responses are ignored', async () => {
  let finishOld: (value: PatientSummary) => void = () => undefined;
  const old = new Promise<PatientSummary>((resolve) => { finishOld = resolve; });
  jest.mocked(getPatientSummary).mockReturnValueOnce(old).mockResolvedValue({ ...summary, pendingAmountCents: 2500, pendingInvoiceCount: 1 });
  const view = render(<ClientProfileScreen />);
  await waitFor(() => expect(getPatientSessions).toHaveBeenCalledTimes(1));
  mockIsFocused = false;
  view.rerender(<ClientProfileScreen />);
  mockIsFocused = true;
  view.rerender(<ClientProfileScreen />);
  await screen.findByText('25,00 €');
  await waitFor(() => expect(getPatientSessions).toHaveBeenCalledTimes(2));
  await act(async () => { finishOld(summary); await old; });
  expect(screen.getByText('25,00 €')).toBeTruthy();
  expect(getPatientSummary).toHaveBeenCalledTimes(2);
});

test('a mutation during a client read queues a fresh read without replaying the write', async () => {
  let finishOld: (value: professional.Client) => void = () => undefined;
  const old = new Promise<professional.Client>((resolve) => { finishOld = resolve; });
  jest.mocked(professional.getProfessionalClientDetail).mockResolvedValueOnce(client).mockReturnValueOnce(old).mockResolvedValue({ ...client, sessions: [session] });
  const view = render(<ClientProfileScreen />);
  await screen.findByText('Sin cita programada');
  fireEvent.press(screen.getByRole('button', { name: 'Programar sesión' }));
  mockIsFocused = false;
  view.rerender(<ClientProfileScreen />);
  mockIsFocused = true;
  view.rerender(<ClientProfileScreen />);
  expect(professional.getProfessionalClientDetail).toHaveBeenCalledTimes(2);
  fireEvent.press(screen.getByText('Guardar cita de prueba'));
  await waitFor(() => expect(professional.createManagedClientSession).toHaveBeenCalledTimes(1));
  await act(async () => { finishOld(client); await old; });
  await waitFor(() => expect(professional.getProfessionalClientDetail).toHaveBeenCalledTimes(3));
  expect(professional.createManagedClientSession).toHaveBeenCalledTimes(1);
});
