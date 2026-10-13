import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SpecialistProfileScreen } from '../SpecialistProfileScreen';
import * as professionalService from '../../../services/professionalService';
import * as calendarService from '../../../services/googleCalendarService';
import { showAppAlert } from '../../../components/common/alert';

const mockNavigation = { dispatch: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
const mockRefreshCompletion = jest.fn(async () => undefined);
const mockUpdateUser = jest.fn();
let mockRouteParams: { initialTab?: 'google' | 'account' | 'agenda' } | undefined;
jest.mock('@react-navigation/native', () => ({
  CommonActions: { navigate: (payload: unknown) => ({ type: 'NAVIGATE', payload }) },
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'professional', name: 'Especialista de prueba' }, updateUser: mockUpdateUser }) }));
jest.mock('../../../contexts/ProfileCompletionContext', () => ({ useProfileCompletion: () => ({ snapshot: null, refresh: mockRefreshCompletion }) }));
jest.mock('../../../components/common/alert', () => ({ useAppAlert: () => ({}), useAppAlertState: () => ({ isVisible: false }), showAppAlert: jest.fn() }));
jest.mock('../../../hooks/useGeneralRateLimit', () => ({ useFocusedRateLimitRecovery: jest.fn() }));
jest.mock('../../../components/onboarding/professionalTourContext', () => ({ useProfessionalTourAutoStart: jest.fn(), useProfessionalTourStepPreparation: jest.fn() }));
jest.mock('../../../components/onboarding/TourTarget', () => ({ TourTarget: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../../components/professional/ProfessionalMatchingEditor', () => ({
  ProfessionalMatchingEditor: ({perspective, onPerspectiveChange}: {perspective: import('../../../utils/perspective').PerspectiveDraft; onPerspectiveChange: (value: import('../../../utils/perspective').PerspectiveDraft) => void}) => {
    const {Button} = require('react-native');
    return <Button title="Retirar perspectiva de prueba" onPress={() => onPerspectiveChange({...perspective, religionCode: '', religionOtherText: '', publish: false, noticeVersion: null})} />;
  },
}));
jest.mock('../../../components/professional/PublicProfileSlugEditor', () => ({ PublicProfileSlugEditor: () => null }));
jest.mock('../../../components/professional/DirectoryVisibilityStatus', () => ({ DirectoryVisibilityStatus: () => null }));
jest.mock('../../../components/professional/ClinicalPinManager', () => ({ ClinicalPinManager: () => null }));
jest.mock('../../../components/common/PrivacyPreferences', () => ({ PrivacyPreferencesButton: () => null }));
jest.mock('../../../components/location', () => ({ AddressAutocomplete: () => null, LocationMapPreview: () => null }));
jest.mock('../../../services/professionalService', () => ({ getComprehensiveProfile: jest.fn(), updateComprehensiveProfile: jest.fn(), getVerificationStatus: jest.fn() }));
jest.mock('../../../services/authService', () => ({}));
jest.mock('../../../services/billingService', () => ({ billingService: { getConfig: jest.fn(async () => null) } }));
jest.mock('../../../services/legalService', () => ({ getLegalCatalog: jest.fn(async () => [{ key: 'PRIVACY_POLICY', version: '2026-09-27' }]) }));
jest.mock('../../../services/googleCalendarService', () => ({ getGoogleCalendarStatus: jest.fn(), connectGoogleCalendar: jest.fn() }));

const profile: professionalService.SpecialistProfileData = {
  id: 'specialist', fullName: 'Especialista de prueba', professionalTitle: 'Psicólogo', professionalType: 'PSYCHOLOGIST_HEALTH',
  bio: 'Descripción profesional de prueba.', avatar: null, specialties: ['anxiety'], therapeuticApproaches: [], languages: ['spanish'], education: [], experience: [],
  identityVerified: false, insuranceUploaded: false, insuranceReviewStatus: 'NOT_UPLOADED', insuranceReviewedAt: null, insuranceRejectedReason: null,
  locationVisibleToPatients: false, certificates: [], priceStandard: 65, email: 'professional@example.invalid', emailVerified: true, phone: '',
  phoneVerified: false, twoFactorEnabled: false, profileVisible: true, showReviewCount: true, showLastOnline: false,
  autoConfirmSessionRequests: true, emailSessionRequestsEnabled: true, emailSessionCancellationsEnabled: true, emailSessionReminder24hEnabled: false,
  rating: 0, reviewCount: 0, officeAddress: '', officeCity: '', officePostalCode: '', officeCountry: 'Spain', officeLat: null, officeLng: null,
  offersOnline: false, offersInPerson: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = undefined;
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue(profile);
  jest.mocked(professionalService.getVerificationStatus).mockResolvedValue({ verificationStatus: 'NOT_SUBMITTED' });
  jest.mocked(calendarService.getGoogleCalendarStatus).mockResolvedValue({
    enabled: true, meetAssignmentsEnabled: true, status: 'DISCONNECTED', email: null, pending: 0, failed: 0,
    lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'DAILY', meetEnabled: false, videoSetupCompleted: false,
  });
});

test('enabling online sessions persists the modality before opening the Google tab', async () => {
  let finishSave: (value: professionalService.SpecialistProfileData) => void = () => { throw new Error('Save not started'); };
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(() => new Promise(resolve => { finishSave = resolve; }));
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByText('Sesiones online'));
  fireEvent.press(await screen.findByText('Guardar y configurar Google Meet'));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledWith({ offersOnline: true, specialties: ['anxiety'], customSpecialties: [], therapeuticApproaches: [], customTherapeuticApproaches: [] });
  expect(screen.queryByText('Paso 1 de 2 · Conecta tu cuenta de Google')).toBeNull();
  await act(async () => { finishSave({ ...profile, offersOnline: true }); });
  await screen.findByText('Paso 1 de 2 · Conecta tu cuenta de Google');
  expect(screen.getByRole('tab', { name: 'Google', selected: true })).toBeTruthy();
  expect(calendarService.connectGoogleCalendar).not.toHaveBeenCalled();
  expect(showAppAlert).not.toHaveBeenCalled();
});

test('a rejected profile save keeps the selected modality and does not advance to Google setup', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    jest.mocked(professionalService.updateComprehensiveProfile).mockRejectedValue(new Error('No se pudo guardar.'));
    render(<SpecialistProfileScreen />);
    fireEvent.press(await screen.findByText('Sesiones online'));
    fireEvent.press(await screen.findByText('Guardar y configurar Google Meet'));
    await waitFor(() => expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'No se pudo guardar el perfil', 'No se pudo guardar.'));
    expect(screen.getByText('Guardar y configurar Google Meet')).toBeTruthy();
    expect(screen.queryByText('Paso 1 de 2 · Conecta tu cuenta de Google')).toBeNull();
    expect(calendarService.connectGoogleCalendar).not.toHaveBeenCalled();
  } finally { spy.mockRestore(); }
});

test('account settings exclude Google and switching tabs preserves unsaved account edits', async () => {
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByRole('tab', { name: 'Cuenta' }));
  expect(screen.getByText('Información de cuenta')).toBeTruthy();
  expect(screen.queryByText('Calendario y videollamadas')).toBeNull();
  fireEvent.changeText(screen.getByLabelText('Teléfono'), '+34 600 123 456');
  fireEvent.press(screen.getByRole('tab', { name: 'Google' }));
  await screen.findByText('Calendario y videollamadas');
  expect(screen.queryByText('Información de cuenta')).toBeNull();
  expect(calendarService.connectGoogleCalendar).not.toHaveBeenCalled();
  expect(professionalService.updateComprehensiveProfile).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('tab', { name: 'Cuenta' }));
  expect(screen.getByLabelText('Teléfono').props.value).toBe('+34 600 123 456');
});

test('a Google navigation entry opens the new tab without exposing account settings', async () => {
  mockRouteParams = { initialTab: 'google' };
  render(<SpecialistProfileScreen />);
  await screen.findByText('Calendario y videollamadas');
  expect(screen.getByRole('tab', { name: 'Google', selected: true })).toBeTruthy();
  expect(screen.queryByText('Información de cuenta')).toBeNull();
  expect(mockNavigation.setParams).toHaveBeenCalledWith({ initialTab: undefined, initialSection: undefined });
});

test('existing account navigation still opens account settings', async () => {
  mockRouteParams = { initialTab: 'account' };
  render(<SpecialistProfileScreen />);
  await screen.findByText('Información de cuenta');
  expect(screen.getByRole('tab', { name: 'Cuenta', selected: true })).toBeTruthy();
  expect(screen.queryByText('Calendario y videollamadas')).toBeNull();
});

test('withdrawing alone bypasses unrelated incomplete profile fields and saves once', async () => {
  const incomplete = {...profile, specialties: [], professionalType: null, perspective: {religionCode: 'catholic', hasPublication: true, hasDeclaration: true}};
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue(incomplete);
  let finishSave: (value: professionalService.SpecialistProfileData) => void = () => {throw new Error('Not started');};
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(() => new Promise(resolve => {finishSave = resolve;}));
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByText('Retirar perspectiva de prueba'));
  const saveButton = screen.getByText('Guardar');
  fireEvent.press(saveButton);
  fireEvent.press(saveButton);
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledTimes(1);
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledWith({perspectiveOperation: {action: 'delete'}});
  await act(async () => {finishSave({...incomplete, perspective: {religionCode: null, hasPublication: false, hasDeclaration: false}});});
});

test('a rejected withdrawal keeps the draft available to retry', async () => {
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue({...profile, perspective: {religionCode: 'catholic', hasPublication: true, hasDeclaration: true}});
  jest.mocked(professionalService.updateComprehensiveProfile).mockRejectedValue(new Error('Error de prueba'));
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByText('Retirar perspectiva de prueba'));
  fireEvent.press(screen.getByText('Guardar'));
  await waitFor(() => expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'No se pudo guardar el perfil', 'Error de prueba'));
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledTimes(2);
});

test('a migrated profile can acknowledge its review without changing valid selections', async () => {
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue({...profile, matchingNeedsReview: true});
  jest.mocked(professionalService.updateComprehensiveProfile).mockResolvedValue({...profile, matchingNeedsReview: false});
  render(<SpecialistProfileScreen />);
  await screen.findByText('Retirar perspectiva de prueba');
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  await waitFor(() => expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledTimes(1));
});

test('legacy agenda settings navigation redirects to Agenda and clears the old tab', async () => {
  mockRouteParams = { initialTab: 'agenda' };
  render(<SpecialistProfileScreen />);
  await waitFor(() => expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: 'NAVIGATE', payload: { name: 'ProfessionalSessions', params: { openAgendaSettings: true }, pop: true } }));
  expect(mockNavigation.setParams).toHaveBeenCalledWith({ initialTab: undefined });
  expect(screen.queryByRole('tab', { name: 'Agenda y reservas' })).toBeNull();
});
