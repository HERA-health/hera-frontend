import React from 'react';
import { useWindowDimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
import * as DocumentPicker from 'expo-document-picker';
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { RootStackParamList } from '../../../constants/types';
import { SpecialistProfileScreen } from '../SpecialistProfileScreen';
import * as professionalService from '../../../services/professionalService';
import * as calendarService from '../../../services/googleCalendarService';
import { showAppAlert } from '../../../components/common/alert';

const mockNavigation = { dispatch: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
const mockRefreshCompletion = jest.fn(async () => undefined);
const mockUpdateUser = jest.fn();
let mockCompletion: import('../../../services/profileCompletionService').ProfileCompletionSnapshot | null;
let mockRouteParams: RootStackParamList['ProfessionalProfile'];
jest.mock('@react-navigation/native', () => ({
  CommonActions: { navigate: (payload: unknown) => ({ type: 'NAVIGATE', payload }) },
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'professional', name: 'Especialista de prueba' }, updateUser: mockUpdateUser }) }));
jest.mock('../../../contexts/ProfileCompletionContext', () => ({ useProfileCompletion: () => ({ snapshot: mockCompletion, refresh: mockRefreshCompletion }) }));
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
jest.mock('../../../services/professionalService', () => ({ uploadInsuranceDocument: jest.fn(), deleteInsuranceDocument: jest.fn(), getComprehensiveProfile: jest.fn(), updateComprehensiveProfile: jest.fn(), getVerificationStatus: jest.fn() }));
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
  jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 } satisfies ReturnType<typeof useWindowDimensions>);
  jest.clearAllMocks();
  mockRouteParams = undefined;
  mockCompletion = null;
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue(profile);
  jest.mocked(professionalService.getVerificationStatus).mockResolvedValue({ verificationStatus: 'NOT_SUBMITTED' });
  jest.mocked(calendarService.getGoogleCalendarStatus).mockResolvedValue({
    enabled: true, meetAssignmentsEnabled: true, status: 'DISCONNECTED', email: null, pending: 0, failed: 0,
    lastSyncedAt: null, errorCode: null, reconciling: false, videoProviderPreference: 'DAILY', meetEnabled: false, videoSetupCompleted: false,
  });
});

test('a missing bio marks identity and exposes its guidance only at the bio heading', async () => {
  mockCompletion = { role: 'PROFESSIONAL', scopeId: 'demo', items: [{ code: 'PROFILE_BIO', state: 'ACTION_REQUIRED', severity: 'WARNING' }] };
  render(<SpecialistProfileScreen />);
  const info = await screen.findByRole('button', { name: 'Descripción profesional incompleta' });
  fireEvent.press(info);
  expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'Descripción profesional incompleta', expect.stringContaining('150'));
  fireEvent.press(screen.getByRole('button', { name: 'Trayectoria' }));
  expect(screen.queryByRole('button', { name: 'Descripción profesional incompleta' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Identidad y presentación' }).props.accessibilityHint).toContain('por completar');
  expect(screen.getByRole('button', { name: 'Trayectoria' }).props.accessibilityHint).toBeUndefined();
  expect(screen.queryByText(/Te queda.*apartado/)).toBeNull();
});

test('optional experience years loads empty, saves a number, and can be cleared', async () => {
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(async data => ({ ...profile, yearsInPractice: data.yearsInPractice }));
  render(<SpecialistProfileScreen />);
  const input = await screen.findByLabelText('Años de experiencia (opcional)');
  expect(input.props.value).toBe('');
  fireEvent.changeText(input, '3');
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenLastCalledWith(expect.objectContaining({ yearsInPractice: 3 }));
  expect(screen.getByLabelText('Años de experiencia (opcional)').props.value).toBe('3');
  fireEvent.changeText(screen.getByLabelText('Años de experiencia (opcional)'), '');
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenLastCalledWith(expect.objectContaining({ yearsInPractice: null }));
  expect(screen.getByLabelText('Años de experiencia (opcional)').props.value).toBe('');
});

test.each(['-1', '3.5', '61', 'abc'])('invalid experience input %s is not saved', async value => {
  render(<SpecialistProfileScreen />);
  fireEvent.changeText(await screen.findByLabelText('Años de experiencia (opcional)'), value);
  fireEvent.press(screen.getByText('Guardar'));
  expect(professionalService.updateComprehensiveProfile).not.toHaveBeenCalled();
  expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'Revisa los años de experiencia', expect.any(String));
});

test('a failed experience save preserves the draft for retry', async () => {
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue({ ...profile, yearsInPractice: 8 });
  jest.mocked(professionalService.updateComprehensiveProfile).mockRejectedValueOnce(new Error('Error de prueba'));
  render(<SpecialistProfileScreen />);
  const input = await screen.findByLabelText('Años de experiencia (opcional)');
  expect(input.props.value).toBe('8');
  fireEvent.changeText(input, '9');
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(screen.getByLabelText('Años de experiencia (opcional)').props.value).toBe('9');
  jest.mocked(professionalService.updateComprehensiveProfile).mockResolvedValue({ ...profile, yearsInPractice: 9 });
  await act(async () => fireEvent.press(screen.getByText('Reintentar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledTimes(2);
});

test('enabling online sessions persists the modality before opening the Google tab', async () => {
  let finishSave: (value: professionalService.SpecialistProfileData) => void = () => { throw new Error('Save not started'); };
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(() => new Promise(resolve => { finishSave = resolve; }));
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByRole('button', { name: 'Consulta' }));
  fireEvent.press(await screen.findByText('Sesiones online'));
  fireEvent.press(await screen.findByText('Guardar y configurar Google Meet'));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledWith({ offersOnline: true });
  expect(screen.queryByText('Paso 1 de 2 · Conecta tu cuenta de Google')).toBeNull();
  await act(async () => { finishSave({ ...profile, offersOnline: true }); });
  await screen.findByText('Paso 1 de 2 · Conecta tu cuenta de Google');
  expect(screen.getByRole('button', { name: 'Google', selected: true })).toBeTruthy();
  expect(calendarService.connectGoogleCalendar).not.toHaveBeenCalled();
  expect(showAppAlert).not.toHaveBeenCalled();
});

test('a rejected profile save keeps the selected modality and does not advance to Google setup', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    jest.mocked(professionalService.updateComprehensiveProfile).mockRejectedValue(new Error('No se pudo guardar.'));
    render(<SpecialistProfileScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Consulta' }));
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
  fireEvent.press(await screen.findByRole('button', { name: 'Cuenta' }));
  expect(screen.getByText('Acceso y contacto')).toBeTruthy();
  expect(screen.queryByText('Google Calendar')).toBeNull();
  fireEvent.changeText(screen.getByLabelText('Teléfono'), '+34 600 123 456');
  fireEvent.press(screen.getByRole('button', { name: 'Google' }));
  await screen.findByText('Google Calendar');
  expect(screen.queryByText('Acceso y contacto')).toBeNull();
  expect(calendarService.connectGoogleCalendar).not.toHaveBeenCalled();
  expect(professionalService.updateComprehensiveProfile).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Cuenta' }));
  expect(screen.getByLabelText('Teléfono').props.value).toBe('+34 600 123 456');
});

test('Account shows a recommended phone badge until saving, including on incomplete existing profiles', async () => {
  const incomplete = { ...profile, professionalType: null, specialties: [], offersInPerson: true, insuranceUploaded: false };
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue(incomplete);
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(async data => ({ ...incomplete, phone: data.phone ?? '' }));
  render(<SpecialistProfileScreen />);
  await screen.findByLabelText('Teléfono recomendado pendiente');
  expect(screen.queryByText(/Añade un teléfono para que el equipo/)).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Cuenta' }));
  expect(screen.getByText('Recomendado')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cuenta', selected: true })).toBeTruthy();
  expect(screen.queryByText('Pendiente')).toBeNull();
  fireEvent.changeText(screen.getByLabelText('Teléfono'), '600 123 456');
  expect(screen.getByLabelText('Teléfono recomendado pendiente')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenLastCalledWith({ phone: '600 123 456' });
  expect(mockUpdateUser).toHaveBeenCalledWith({ phone: '600 123 456' });
  fireEvent.press(screen.getByRole('button', { name: 'Información profesional' }));
  expect(screen.queryByLabelText('Teléfono recomendado pendiente')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Cuenta' }));
  fireEvent.changeText(screen.getByLabelText('Teléfono'), '');
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenLastCalledWith({ phone: '' });
  expect(screen.getByLabelText('Teléfono recomendado pendiente')).toBeTruthy();
});

test('a failed phone save keeps the recommendation and the draft for retry', async () => {
  jest.mocked(professionalService.updateComprehensiveProfile).mockRejectedValueOnce(new Error('Error de prueba'));
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByRole('button', { name: 'Cuenta' }));
  fireEvent.changeText(screen.getByLabelText('Teléfono'), '600 123 456');
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(screen.getByLabelText('Teléfono recomendado pendiente')).toBeTruthy();
  expect(screen.getByLabelText('Teléfono').props.value).toBe('600 123 456');
  expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'No se pudo guardar el perfil', 'Error de prueba');
});

test('a saved phone does not show a recommendation', async () => {
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue({ ...profile, phone: '+34600123456' });
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByRole('button', { name: 'Cuenta' }));
  expect(screen.queryByLabelText('Teléfono recomendado pendiente')).toBeNull();
  expect(screen.queryByText('Recomendado')).toBeNull();
  expect(screen.getByLabelText('Teléfono').props.value).toBe('+34600123456');
});

test('editing more than the phone still validates incomplete professional fields', async () => {
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue({ ...profile, professionalType: null, specialties: [] });
  render(<SpecialistProfileScreen />);
  const experience = await screen.findByLabelText('Años de experiencia (opcional)');
  fireEvent.changeText(experience, '3');
  fireEvent.press(screen.getByRole('button', { name: 'Cuenta' }));
  fireEvent.changeText(screen.getByLabelText('Teléfono'), '600 123 456');
  fireEvent.press(screen.getByText('Guardar'));
  expect(professionalService.updateComprehensiveProfile).not.toHaveBeenCalled();
  expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'Falta el tipo profesional', expect.any(String));
});

test('a Google navigation entry opens the new tab without exposing account settings', async () => {
  mockRouteParams = { initialTab: 'google' };
  render(<SpecialistProfileScreen />);
  await screen.findByText('Google Calendar');
  expect(screen.getByRole('button', { name: 'Google', selected: true })).toBeTruthy();
  expect(screen.queryByText('Acceso y contacto')).toBeNull();
  expect(mockNavigation.setParams).toHaveBeenCalledWith({ initialTab: undefined, initialSection: undefined });
});

test('a location reminder opens Consultation even when in-person sessions are still off', async () => {
  mockRouteParams = { initialTab: 'information', initialSection: 'location' };
  render(<SpecialistProfileScreen />);
  await screen.findByText('Sesiones presenciales');
  expect(screen.getByRole('button', { name: 'Consulta', selected: true })).toBeTruthy();
  expect(mockNavigation.setParams).toHaveBeenCalledWith({ initialTab: undefined, initialSection: undefined });
});

test('an insurance reminder opens Credentials and the policy upload', async () => {
  mockRouteParams = { initialSection: 'insurance' };
  render(<SpecialistProfileScreen />);
  await screen.findByText('Subir póliza PDF');
  expect(screen.getByRole('button', { name: 'Credenciales', selected: true })).toBeTruthy();
});

test('existing account navigation still opens account settings', async () => {
  mockRouteParams = { initialTab: 'account' };
  render(<SpecialistProfileScreen />);
  await screen.findByText('Acceso y contacto');
  expect(screen.getByRole('button', { name: 'Cuenta', selected: true })).toBeTruthy();
  expect(screen.queryByText('Google Calendar')).toBeNull();
});

test('withdrawing alone bypasses unrelated incomplete profile fields and saves once', async () => {
  const incomplete = {...profile, specialties: [], professionalType: null, perspective: {religionCode: 'catholic', hasPublication: true, hasDeclaration: true}};
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue(incomplete);
  let finishSave: (value: professionalService.SpecialistProfileData) => void = () => {throw new Error('Not started');};
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(() => new Promise(resolve => {finishSave = resolve;}));
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByRole('button', { name: 'Práctica e idiomas' }));
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
  fireEvent.press(await screen.findByRole('button', { name: 'Práctica e idiomas' }));
  fireEvent.press(await screen.findByText('Retirar perspectiva de prueba'));
  fireEvent.press(screen.getByText('Guardar'));
  await waitFor(() => expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'No se pudo guardar el perfil', 'Error de prueba'));
  await act(async () => fireEvent.press(screen.getByText('Reintentar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledTimes(2);
});

test('a migrated profile can acknowledge its review without changing valid selections', async () => {
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue({...profile, matchingNeedsReview: true});
  jest.mocked(professionalService.updateComprehensiveProfile).mockResolvedValue({...profile, matchingNeedsReview: false});
  render(<SpecialistProfileScreen />);
  await screen.findByLabelText('Título profesional');
  expect(screen.queryByText('Guardar')).toBeNull();
  fireEvent.press(await screen.findByRole('button', { name: 'Práctica e idiomas' }));
  await screen.findByText('Retirar perspectiva de prueba');
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledWith({
    specialties: profile.specialties, customSpecialties: [],
    therapeuticApproaches: profile.therapeuticApproaches, customTherapeuticApproaches: [],
  });
  expect(screen.queryByText('Guardar')).toBeNull();
});

test('legacy agenda settings navigation redirects to Agenda and clears the old tab', async () => {
  mockRouteParams = { initialTab: 'agenda' };
  render(<SpecialistProfileScreen />);
  await waitFor(() => expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: 'NAVIGATE', payload: { name: 'ProfessionalSessions', params: { openAgendaSettings: true }, pop: true } }));
  expect(mockNavigation.setParams).toHaveBeenCalledWith({ initialTab: undefined });
  expect(screen.queryByRole('button', { name: 'Agenda y reservas' })).toBeNull();
});


test('age can be hidden or birth date cleared without completing unrelated profile fields', async () => {
  const incomplete = {...profile, professionalType: null, specialties: [], birthDate: '1990-10-28', showAge: true};
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue(incomplete);
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(async data => ({...incomplete, ...data}));
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByLabelText('Mostrar mi edad en el perfil'));
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenLastCalledWith({showAge: false});
  expect(screen.getByText('28/10/1990')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Borrar fecha de nacimiento'));
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenLastCalledWith({birthDate: null});
});

test('a private PDF upload preserves the consultation draft and permits a partial save before approval', async () => {
  const pending = { ...profile, insuranceUploaded: true, insuranceReviewStatus: 'PENDING' as const };
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false, assets: [{ lastModified: 0, name: 'poliza-ficticia.pdf', uri: 'file:///poliza-ficticia.pdf', mimeType: 'application/pdf' }],
  });
  jest.mocked(professionalService.uploadInsuranceDocument).mockResolvedValue(pending);
  jest.mocked(professionalService.updateComprehensiveProfile).mockImplementation(async changes => ({ ...pending, ...changes }));
  render(<SpecialistProfileScreen />);
  fireEvent.changeText(await screen.findByLabelText('Título profesional'), 'Edición de prueba');
  fireEvent.press(screen.getByRole('button', { name: 'Consulta' }));
  fireEvent.press(screen.getByText('Sesiones presenciales'));
  fireEvent.changeText(screen.getByLabelText('Ciudad'), 'Ciudad ficticia');
  fireEvent.press(screen.getByText('Guardar'));
  expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'Falta la póliza', expect.any(String), expect.any(Array));
  fireEvent.press(screen.getByText('Subir póliza en Credenciales'));
  await act(async () => fireEvent.press(screen.getByText('Subir póliza PDF')));
  expect(screen.getByText('Póliza subida · En revisión')).toBeTruthy();
  expect(professionalService.updateComprehensiveProfile).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Continuar con la ubicación'));
  expect(screen.getByLabelText('Ciudad').props.value).toBe('Ciudad ficticia');
  await act(async () => fireEvent.press(screen.getByText('Guardar')));
  expect(professionalService.updateComprehensiveProfile).toHaveBeenCalledWith({
    offersInPerson: true, professionalTitle: 'Edición de prueba', officeCity: 'Ciudad ficticia',
  });
  expect(screen.getByText('La ubicación sigue oculta para los pacientes.')).toBeTruthy();
});

test('rejected insurance keeps the reason and only confirmed deletion disables the saved modality', async () => {
  jest.mocked(professionalService.getComprehensiveProfile).mockResolvedValue({
    ...profile, offersOnline: true, offersInPerson: true, insuranceUploaded: true, insuranceReviewStatus: 'REJECTED',
    insuranceRejectedReason: 'Documento de prueba caducado',
  });
  jest.mocked(professionalService.deleteInsuranceDocument).mockResolvedValue({
    insuranceUploaded: false, offersInPerson: false, insuranceReviewStatus: 'NOT_UPLOADED',
  });
  render(<SpecialistProfileScreen />);
  fireEvent.changeText(await screen.findByLabelText('Título profesional'), 'Otro título');
  fireEvent.press(screen.getByRole('button', { name: 'Consulta' }));
  expect(screen.getByText(/Documento de prueba caducado/)).toBeTruthy();
  fireEvent.press(screen.getByText('Revisar póliza en Credenciales'));
  fireEvent.press(screen.getByText('Eliminar póliza'));
  const actions = jest.mocked(showAppAlert).mock.lastCall?.[3] ?? [];
  expect(actions.map(action => action.text)).toEqual(['Cancelar', 'Eliminar']);
  expect(professionalService.deleteInsuranceDocument).not.toHaveBeenCalled();
  await act(async () => actions.find(action => action.text === 'Eliminar')?.onPress?.());
  fireEvent.press(screen.getByText('Volver a Consulta'));
  expect(screen.getByRole('checkbox', { name: /Sesiones presenciales/ }).props.accessibilityState.checked).toBe(false);
  expect(screen.getByRole('checkbox', { name: /Sesiones online/ }).props.accessibilityState.checked).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Identidad y presentación' }));
  expect(screen.getByLabelText('Título profesional').props.value).toBe('Otro título');
});

test('clipboard denial shows the saved URL and does not announce a successful copy', async () => {
  jest.mocked(professionalService.getVerificationStatus).mockResolvedValue({verificationStatus: 'VERIFIED'});
  jest.mocked(Clipboard.setStringAsync).mockResolvedValue(false);
  render(<SpecialistProfileScreen />);
  fireEvent.press(await screen.findByRole('button', {name: 'Enlace público'}));
  await act(async () => fireEvent.press(screen.getByText('Copiar enlace')));
  expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'No se pudo copiar el enlace', expect.stringContaining('/especialista/'));
  expect(screen.queryByText('Enlace copiado al portapapeles')).toBeNull();
});
