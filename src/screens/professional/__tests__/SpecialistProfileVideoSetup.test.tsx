import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SpecialistProfileScreen } from '../SpecialistProfileScreen';
import * as professionalService from '../../../services/professionalService';
import * as calendarService from '../../../services/googleCalendarService';
import { showAppAlert } from '../../../components/common/alert';

const mockNavigation = { navigate: jest.fn(), setParams: jest.fn() };
const mockRefreshCompletion = jest.fn(async () => undefined);
const mockUpdateUser = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: undefined }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'professional', name: 'Especialista de prueba' }, updateUser: mockUpdateUser }) }));
jest.mock('../../../contexts/ProfileCompletionContext', () => ({ useProfileCompletion: () => ({ snapshot: null, refresh: mockRefreshCompletion }) }));
jest.mock('../../../components/common/alert', () => ({ useAppAlert: () => ({}), useAppAlertState: () => ({ isVisible: false }), showAppAlert: jest.fn() }));
jest.mock('../../../hooks/useGeneralRateLimit', () => ({ useFocusedRateLimitRecovery: jest.fn() }));
jest.mock('../../../components/onboarding/professionalTourContext', () => ({ useProfessionalTourAutoStart: jest.fn(), useProfessionalTourStepPreparation: jest.fn() }));
jest.mock('../../../components/onboarding/TourTarget', () => ({ TourTarget: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../../components/professional/ProfessionalMatchingEditor', () => ({ ProfessionalMatchingEditor: () => null }));
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
  bio: 'Descripción profesional de prueba.', avatar: null, specialties: [], therapeuticApproaches: [], languages: ['spanish'], education: [], experience: [],
  identityVerified: false, insuranceUploaded: false, insuranceReviewStatus: 'NOT_UPLOADED', insuranceReviewedAt: null, insuranceRejectedReason: null,
  locationVisibleToPatients: false, certificates: [], priceStandard: 65, email: 'professional@example.invalid', emailVerified: true, phone: '',
  phoneVerified: false, twoFactorEnabled: false, profileVisible: true, showReviewCount: true, showLastOnline: false,
  autoConfirmSessionRequests: true, emailSessionRequestsEnabled: true, emailSessionCancellationsEnabled: true, emailSessionReminder24hEnabled: false,
  rating: 0, reviewCount: 0, officeAddress: '', officeCity: '', officePostalCode: '', officeCountry: 'Spain', officeLat: null, officeLng: null,
  offersOnline: false, offersInPerson: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue(profile);
  jest.mocked(professionalService.getVerificationStatus).mockResolvedValue({ verificationStatus: 'NOT_SUBMITTED' });
  jest.mocked(calendarService.getGoogleCalendarStatus).mockResolvedValue({
    enabled: true, meetAssignmentsEnabled: true, status: 'DISCONNECTED', email: null, pending: 0, failed: 0,
    lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'DAILY', meetEnabled: false, videoSetupCompleted: false,
  });
});

test('enabling online sessions offers setup and persists the modality before opening account settings', async () => {
  let finishSave: (value: professionalService.SpecialistProfileData) => void = () => { throw new Error('Save not started'); };
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(() => new Promise(resolve => { finishSave = resolve; }));
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByText('Sesiones online'));
  fireEvent.press(await screen.findByText('Guardar y configurar Google Meet'));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledWith({ offersOnline: true });
  expect(screen.queryByText('Paso 1 de 2 · Conecta tu cuenta de Google')).toBeNull();
  await act(async () => { finishSave({ ...profile, offersOnline: true }); });
  await screen.findByText('Paso 1 de 2 · Conecta tu cuenta de Google');
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
