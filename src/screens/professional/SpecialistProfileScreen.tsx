import { OptionalFieldSuffix } from '../../components/common/OptionalFieldSuffix';
import { ProfessionalBirthdayEditor } from '../../components/professional/ProfessionalBirthdayEditor';
import { PHONE_CONTACT_HELP, PHONE_FORMAT_HELP } from '../../utils/registrationPhone';
import { emptyPerspective, type PerspectiveDraft } from '../../utils/perspective';
import type {PerspectiveOperation} from '../../services/profileDiscoveryService';
import { customChoiceGroupErrors, PROFESSIONAL_SPECIALTY_OPTIONS, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS } from '../../constants/professionalMatchingOptions';
import { PrivacyPreferencesButton } from '../../components/common/PrivacyPreferences';
import { navigateProfessionalSection } from '../../navigation/professionalNavigation';
import { useFocusedRateLimitRecovery } from '../../hooks/useGeneralRateLimit';
import { GoogleCalendarCard } from '../../components/professional/GoogleCalendarCard';
import { VideoCallSetupPrompt } from '../../components/professional/VideoCallSetupPrompt';
import { ClinicalPinManager } from '../../components/professional/ClinicalPinManager';
import { ProfileEditorSection } from '../../components/professional/ProfileEditorSection';
import { ProfileEditorPages, type ProfilePageNavigation } from '../../components/professional/ProfileEditorPages';
import { choiceKeyboardProps } from '../../utils/choiceKeyboard';
import { TrajectoryEntry } from '../../components/professional/TrajectoryEntry';
import { ProfileEditorSheet, ProfileEditorItem } from '../../components/professional/ProfileEditorSheet';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { ProfessionalMatchingEditor } from '../../components/professional/ProfessionalMatchingEditor';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  Image,
  Share,
  Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useProfileDraftExit } from './useProfileDraftExit';
import { shadows, spacing, borderRadius, typography, layout } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import * as professionalService from '../../services/professionalService';
import * as authService from '../../services/authService';
import { billingService, type FullBillingConfig } from '../../services/billingService';
import {
  SpecialistCertificate as ServiceCertificate,
  SpecialistProfileData as ServiceProfileData,
  VerificationStatusResponse,
} from '../../services/professionalService';
import { AddressAutocomplete, LocationMapPreview } from '../../components/location';
import type {
  AppNavigationProp,
  AppRouteProp,
  ProfessionalProfileSection,
  ProfessionalProfileTab,
} from '../../constants/types';
import { useProfileCompletion } from '../../contexts/ProfileCompletionContext';
import { getWebAppUrl } from '../../config/api';
import { Button } from '../../components/common';
import type { AnimatedPressableHandle } from '../../components/common/AnimatedPressable';
import { TourTarget } from '../../components/onboarding/TourTarget';
import {
  useProfessionalTourAutoStart,
  useProfessionalTourStepPreparation,
} from '../../components/onboarding/professionalTourContext';
import type { UploadAsset } from '../../utils/multipartUpload';
import type { ProfileCompletionCode } from '../../services/profileCompletionService';
import { getMatchingCompletionDescription } from './utils/profileCompletionCopy';
import {
  getProfessionalTypeLabel,
  PROFESSIONAL_TYPE_OPTIONS,
  type ProfessionalType,
} from '../../constants/professionalTypes';
import { PublicProfileSlugEditor } from '../../components/professional/PublicProfileSlugEditor';
import { DirectoryVisibilityStatus } from '../../components/professional/DirectoryVisibilityStatus';
import { PUBLIC_PROFILE_SLUG_MAX_CHANGES } from '../../utils/publicProfileSlug';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ProfileTab = Exclude<ProfessionalProfileTab, 'agenda'>;
type ProfileSection = ProfessionalProfileSection | 'phone';
type EditorMenu = 'type' | 'requirements';
const subtitles: Record<ProfileTab, string> = {
  information: 'Tu presentación, tu forma de atender y tu trayectoria.',
  credentials: 'Verificación profesional y documentos de tu práctica.',
  pricing: 'Consulta tus datos de facturación y accede a su configuración.',
  privacy: 'Decide cómo pueden encontrar tu perfil.',
  google: 'Preferencias de calendario y videollamadas.',
  account: 'Tus datos de acceso, contacto y seguridad clínica.',
  'mi-espacio': '',
};

function isProfileTab(tab: string): tab is ProfileTab {
  return Object.hasOwn(subtitles, tab);
}

function focusEditorTarget(target: View | null) {
  if (!target) return;
  if (Platform.OS === 'web') {
    target.focus?.();
  } else {
    const handle = findNodeHandle(target);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  }
}

// Keep edits made locally while a request was in flight.
function reconcileProfile(base: SpecialistProfileData, draft: SpecialistProfileData, remote: SpecialistProfileData) {
  const result = { ...remote };
  function keepChange<K extends keyof SpecialistProfileData>(key: K) {
    if (JSON.stringify(base[key]) !== JSON.stringify(draft[key])) result[key] = draft[key];
  }
  (Object.keys(draft) as (keyof SpecialistProfileData)[]).forEach(keepChange);
  return result;
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  startYear: string;
  endYear: string;
}

interface Experience {
  id: string;
  position: string;
  organization: string;
  startYear: string;
  endYear: string | null;
  current: boolean;
}

interface Certificate extends ServiceCertificate {}

interface SpecialistProfileData {
  declaredGender: 'woman' | 'man' | 'nonbinary' | null;
  // Basic Info
  fullName: string;
  professionalTitle: string;
  professionalType: ProfessionalType | null;
  bio: string;
  avatar: string | null;

  // Professional Details
  customSpecialties: string[];
  customTherapeuticApproaches: string[];
  matchingNeedsReview: boolean;
  perspective: PerspectiveDraft;
  specialties: string[];
  therapeuticApproaches: string[];
  languages: string[];
  education: Education[];
  experience: Experience[];

  // Verification
  identityVerified: boolean;
  insuranceUploaded: boolean;
  insuranceReviewStatus: 'NOT_UPLOADED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  insuranceReviewedAt: string | null;
  insuranceRejectedReason: string | null;
  locationVisibleToPatients: boolean;
  certificates: Certificate[];

  // Pricing
  priceStandard: string;
  priceExtended: string;
  priceFirstSession: string;
  offerExtended: boolean;
  offerFirstSessionDiscount: boolean;
  sessionTypes: string[];
  modalityOnline: string;
  modalityInPerson: string;

  // Payment
  bankIban: string;
  bankHolder: string;
  bankVerified: boolean;
  taxId: string;
  taxAddress: string;
  taxCity: string;
  applyVat: boolean;
  vatRate: string;
  applyIrpf: boolean;

  // Account
  email: string;
  emailVerified?: boolean;
  phone: string;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  profileVisible: boolean;
  showReviewCount: boolean;
  showLastOnline: boolean;

  // Mi Espacio
  gradientId: string;
  photoGallery: string[];
  presentationVideoUrl: string;
  yearsInPractice: string;
  birthDate: string | null;
  showAge: boolean;
  languagesSpoken: string[];

  // Location & Service Modality
  officeAddress: string;
  officeCity: string;
  officePostalCode: string;
  officeCountry: string;
  officeLat: number | null;
  officeLng: number | null;
  offersOnline: boolean;
  offersInPerson: boolean;
}

// ============================================================================
// CONSTANTS - Field Options
// ============================================================================

const SESSION_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'couples', label: 'Pareja' },
  { value: 'family', label: 'Familiar' },
  { value: 'group', label: 'Grupal' },
];

// ============================================================================
// MI ESPACIO CONSTANTS
// ============================================================================

interface ProfileColorOption {
  id: string;
  name: string;
  colors: [string, string];
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ProfilePalette {
  background: string;
  backgroundMuted: string;
  border: string;
  cardBackground: string;
  inputBackground: string;
  inputFocus: string;
  cardBackgroundDisabled: string;
  cardBg: string;
  info: string;
  overlay: string;
  primary: string;
  primaryAlpha12: string;
  primaryDark: string;
  primaryMuted: string;
  success: string;
  successLight: string;
  warning: string;
  warningAmber: string;
  warningLight: string;
  textMuted: string;
  textOnCard: string;
  textOnPrimary: string;
  textPrimary: string;
  textSecondary: string;
  fontHeading: string;
  fontSans: string;
  fontSansMedium: string;
  fontSansSemiBold: string;
  fontSansBold: string;
}

const PROFILE_COLORS: ProfileColorOption[] = [
  { id: 'salvia-lavanda', name: 'Mente', colors: ['#006884', '#006884'] },
  { id: 'menta-rosa', name: 'Camino', colors: ['#97B2A6', '#97B2A6'] },
  { id: 'cielo-lila', name: 'Innovación', colors: ['#BDD7FF', '#BDD7FF'] },
  { id: 'melocoton-rosa', name: 'Confianza', colors: ['#DFD8CD', '#DFD8CD'] },
  { id: 'oceano-salvia', name: 'Mente Profunda', colors: ['#006884', '#006884'] },
  { id: 'prado-azul', name: 'Camino Claro', colors: ['#97B2A6', '#97B2A6'] },
  { id: 'arena-tostado', name: 'Emociones', colors: ['#F5F0E8', '#F5F0E8'] },
  { id: 'amatista-coral', name: 'Crecimiento', colors: ['#3E5C4F', '#3E5C4F'] },
];

const STRINGS = {
  miEspacio: {
    tabLabel: 'Mi Espacio',
    profileColorTitle: 'Apariencia del perfil',
    profileColorSubtitle: 'Elige el color de fondo que verán tus pacientes',
    galleryLabel: 'Galería',
    gallerySubtitle: 'Añade fotos de tu consulta o de ti misma. Máximo 6 fotos.',
    galleryDeleteConfirm: '¿Eliminar esta foto?',
    videoLabel: 'Vídeo de presentación',
    videoSubtitle: 'Pega el enlace de tu vídeo de YouTube o Vimeo',
    videoPlaceholder: 'https://youtube.com/...',
    videoNote: 'El vídeo debe ser público para que tus pacientes puedan verlo',
  },
};

function createProfilePalette(theme: Theme): ProfilePalette {
  return {
    background: theme.bgElevated,
    backgroundMuted: theme.bgMuted,
    border: theme.borderStrong,
    cardBackground: theme.surfaceMuted,
    inputBackground: theme.bgElevated,
    inputFocus: theme.focus,
    cardBackgroundDisabled: theme.bgMuted,
    cardBg: theme.bgCard,
    info: theme.info,
    overlay: theme.overlay,
    primary: theme.actionPrimary,
    primaryAlpha12: theme.primaryAlpha12,
    primaryDark: theme.primaryDark,
    primaryMuted: theme.primaryMuted,
    success: theme.success,
    successLight: theme.successLight,
    warning: theme.warning,
    warningAmber: theme.warningAmber,
    warningLight: theme.warningBg,
    textMuted: theme.textSecondary,
    textOnCard: theme.textOnPrimary,
    textOnPrimary: theme.textOnPrimary,
    textPrimary: theme.textPrimary,
    textSecondary: theme.textSecondary,
    fontHeading: theme.fontHeading,
    fontSans: theme.fontSans,
    fontSansMedium: theme.fontSansMedium,
    fontSansSemiBold: theme.fontSansSemiBold,
    fontSansBold: theme.fontSansBold,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface CertificateDraft {
  name: string;
  issuer: string;
  validUntil: string;
  publicVisible: boolean;
  educationId: string | null;
}

const pickProfessionalDocument = async (
  type: string | string[]
): Promise<UploadAsset | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0] as DocumentPicker.DocumentPickerAsset & UploadAsset;

  return {
    ...asset,
    fileName: asset.fileName || asset.name || null,
    name: asset.name || asset.fileName || null,
  };
};

const formatDocumentDate = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatBillingAmount = (amount?: number | null): string =>
  typeof amount === 'number'
    ? `${amount.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`
    : 'Pendiente';

const mapServiceProfileToFormData = (profile: ServiceProfileData): SpecialistProfileData => ({
  fullName: profile.fullName || '',
  professionalTitle: profile.professionalTitle || '',
  professionalType: profile.professionalType || null,
  bio: profile.bio || '',
  avatar: profile.avatar ?? null,
  customSpecialties: profile.customSpecialties ?? [],
  customTherapeuticApproaches: profile.customTherapeuticApproaches ?? [],
  matchingNeedsReview: profile.matchingNeedsReview ?? false,
  perspective: {
    religionCode: profile.perspective?.religionCode ?? '', religionOtherText: profile.perspective?.religionOtherText ?? '',
    publish: profile.perspective?.hasPublication ?? false, noticeVersion: null,
    hasDeclaration: profile.perspective?.hasDeclaration ?? false, needsReconfirmation: profile.perspective?.needsReconfirmation ?? false,
  },
  specialties: profile.specialties || [],
  therapeuticApproaches: profile.therapeuticApproaches || [],
  declaredGender: profile.declaredGender ?? null,
  languages: profile.languages || ['spanish'],
  education: (profile.education as Education[]) || [],
  experience: (profile.experience as Experience[]) || [],
  identityVerified: profile.identityVerified || false,
  insuranceUploaded: profile.insuranceUploaded || false,
  insuranceReviewStatus: profile.insuranceReviewStatus ?? (profile.insuranceUploaded ? 'PENDING' : 'NOT_UPLOADED'),
  insuranceReviewedAt: profile.insuranceReviewedAt ?? null,
  insuranceRejectedReason: profile.insuranceRejectedReason ?? null,
  locationVisibleToPatients: profile.locationVisibleToPatients ?? false,
  certificates: (profile.certificates as Certificate[]) || [],
  priceStandard: profile.priceStandard?.toString() || '65',
  priceExtended: profile.priceExtended?.toString() || '95',
  priceFirstSession: profile.priceFirstSession?.toString() || '60',
  offerExtended: profile.offerExtended || false,
  offerFirstSessionDiscount: profile.offerFirstSessionDiscount || false,
  sessionTypes: profile.sessionTypes || ['individual'],
  modalityOnline: profile.modalityOnline?.toString() || '65',
  modalityInPerson: profile.modalityInPerson?.toString() || '70',
  bankIban: profile.bankIban || '',
  bankHolder: profile.bankHolder || '',
  bankVerified: profile.bankVerified || false,
  taxId: profile.taxId || '',
  taxAddress: profile.taxAddress || '',
  taxCity: profile.taxCity || '',
  applyVat: profile.applyVat || false,
  vatRate: profile.vatRate?.toString() || '21',
  applyIrpf: profile.applyIrpf ?? true,
  email: profile.email || '',
  emailVerified: profile.emailVerified,
  phone: profile.phone || '',
  phoneVerified: profile.phoneVerified || false,
  twoFactorEnabled: profile.twoFactorEnabled || false,
  profileVisible: profile.profileVisible ?? true,
  showReviewCount: profile.showReviewCount ?? true,
  showLastOnline: profile.showLastOnline || false,
  gradientId: profile.gradientId ?? 'salvia-lavanda',
  photoGallery: profile.photoGallery ?? [],
  presentationVideoUrl: profile.presentationVideoUrl ?? '',
  yearsInPractice: profile.yearsInPractice == null ? '' : String(profile.yearsInPractice),
  birthDate: profile.birthDate ?? null,
  showAge: profile.showAge ?? false,
  languagesSpoken: profile.languagesSpoken ?? [],
  officeAddress: profile.officeAddress || '',
  officeCity: profile.officeCity || '',
  officePostalCode: profile.officePostalCode || '',
  officeCountry: profile.officeCountry || 'Spain',
  officeLat: profile.officeLat ?? null,
  officeLng: profile.officeLng ?? null,
  offersOnline: profile.offersOnline ?? true,
  offersInPerson: profile.offersInPerson ?? false,
});

const getInsuranceReviewCopy = (
  status: SpecialistProfileData['insuranceReviewStatus'],
  reviewedAt?: string | null,
  rejectionReason?: string | null
): {
  icon: IconName;
  tone: 'success' | 'info' | 'warning';
  title: string;
  description: string;
} => {
  const reviewedOn = formatDocumentDate(reviewedAt);

  switch (status) {
    case 'APPROVED':
      return {
        icon: 'checkmark-circle',
        tone: 'success',
        title: 'Cobertura aprobada',
        description: (reviewedOn ? 'HERA aprobó tu cobertura el ' + reviewedOn + '. ' : 'HERA ha aprobado tu cobertura. ')
          + 'La ubicación depende de que la modalidad presencial esté guardada. El filtro del directorio también requiere una oferta presencial publicada.',
      };
    case 'REJECTED':
      return {
        icon: 'close-circle',
        tone: 'warning',
        title: 'Póliza rechazada',
        description: rejectionReason
          ? `Motivo: ${rejectionReason}. La ubicación permanece oculta y tu perfil queda fuera del filtro presencial.`
          : 'Hemos rechazado la póliza. La ubicación permanece oculta y tu perfil queda fuera del filtro presencial.',
      };
    case 'PENDING':
      return {
        icon: 'time-outline',
        tone: 'info',
        title: 'Póliza subida · En revisión',
        description: 'Puedes guardar la modalidad y la dirección. Hasta que HERA apruebe la cobertura, la ubicación permanece oculta y tu perfil queda fuera del filtro presencial.',
      };
    case 'NOT_UPLOADED':
    default:
      return {
        icon: 'alert-circle',
        tone: 'warning',
        title: 'Falta subir la póliza',
        description: 'Para guardar la atención presencial, sube tu póliza de responsabilidad civil en Credenciales. Puedes empezar la dirección ahora.',
      };
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SpecialistProfileScreen() {
  const { user, updateUser, refreshCurrentUser } = useAuth();
  const { snapshot: completionSnapshot, refresh: refreshCompletion } = useProfileCompletion();
  const appAlert = useAppAlert();
  const { isVisible: isAppAlertVisible } = useAppAlertState();
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [editorWidth, setEditorWidth] = useState(windowWidth);
  const isDesktop = editorWidth >= 920;
  const isMobile = editorWidth < 768;
  const insets = React.useContext(SafeAreaInsetsContext);
  const pageNavigation = useRef<ProfilePageNavigation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const indexRowRef = useRef<View>(null);
  const backLinkRef = useRef<AnimatedPressableHandle>(null);
  const [matchingReviewed, setMatchingReviewed] = useState(false);
  const [menu, setMenu] = useState<EditorMenu | null>(null);
  const [returnToConsultation, setReturnToConsultation] = useState(false);
  const addEducationRef = useRef<AnimatedPressableHandle>(null);
  const addExperienceRef = useRef<AnimatedPressableHandle>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [verificationError, setVerificationError] = useState(false);
  const [verificationKnown, setVerificationKnown] = useState(false);
  const [deletingInsurance, setDeletingInsurance] = useState(false);
  const palette = useMemo(() => createProfilePalette(theme), [theme, isDark]);

  const [activeTab, setActiveTab] = useState<ProfileTab>('information');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [directoryStatus, setDirectoryStatus] = useState<professionalService.PublicDirectoryStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);
  const loadVersion = useRef(0);
  const loaded = useRef(false);
  const profileSaveRunning = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const styles = useMemo(() => createStyles(palette, isDesktop, isMobile), [palette, isDesktop, isMobile]);
  const miEspacioStyles = useMemo(() => createMiEspacioStyles(palette), [palette]);
  const viewportRef = useRef<View>(null);
  const formScrollRef = useRef<ScrollView | null>(null);

  const formScrollOffsetRef = useRef(0);
  const sectionRefs = useRef<Record<ProfileSection, View | null>>({
    identity: null,
    bio: null,
    matching: null,
    languages: null,
    modality: null,
    location: null,
    verification: null,
    insurance: null,
    phone: null,
  });
  const [pendingSection, setPendingSection] = useState<ProfileSection | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<ProfileSection | null>(null);

  // Navigation
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ProfessionalProfile'>>();

  // Share profile state
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [savedPublicSlug, setSavedPublicSlug] = useState('');
  const [publicSlugChangesRemaining, setPublicSlugChangesRemaining] = useState(
    PUBLIC_PROFILE_SLUG_MAX_CHANGES
  );
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [hasCopiedShareUrl, setHasCopiedShareUrl] = useState(false);
  const [isCertificateModalVisible, setIsCertificateModalVisible] = useState(false);
  const [certificateDraft, setCertificateDraft] = useState<CertificateDraft>({
    name: '',
    issuer: '',
    validUntil: '',
    publicVisible: false,
    educationId: null,
  });
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false);
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false);
  const [updatingCertificateKey, setUpdatingCertificateKey] = useState<string | null>(null);
  const [openingCredentialKey, setOpeningCredentialKey] = useState<string | null>(null);

  useProfessionalTourAutoStart(
    'professional_profile_v1',
    !isLoading
      && !loadError
      && !menu
      && !isShareModalVisible
      && !isCertificateModalVisible
      && !isUploadingAvatar
      && !isUploadingGalleryPhoto
      && !isUploadingInsurance
      && !isUploadingCertificate
      && updatingCertificateKey === null
      && openingCredentialKey === null
      && !isAppAlertVisible,
  );

  const prepareProfileTopStep = useCallback(() => {
    formScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  useProfessionalTourStepPreparation('professional.profile.tabs', prepareProfileTopStep);
  useProfessionalTourStepPreparation('professional.profile.visibility', prepareProfileTopStep);
  useProfessionalTourStepPreparation('professional.profile.preview', prepareProfileTopStep);
  useProfessionalTourStepPreparation('professional.profile.save', prepareProfileTopStep);

  useEffect(() => {
    if (!highlightedSection) return undefined;
    const timeout = setTimeout(() => setHighlightedSection(null), 1800);
    return () => clearTimeout(timeout);
  }, [highlightedSection]);

  // Verification status state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse>({
    verificationStatus: 'NOT_SUBMITTED',
  });
  const [resumingVerification, setResumingVerification] = useState(false);

  const [billingConfig, setBillingConfig] = useState<FullBillingConfig | null>(null);
  const [isBillingConfigLoading, setIsBillingConfigLoading] = useState(false);

  // Profile data state
  const [profileData, setProfileData] = useState<SpecialistProfileData>({
    // Basic Info
    fullName: user?.name || '',
    professionalTitle: '',
    professionalType: null,
    bio: '',
    avatar: user?.avatar || null,

    // Professional Details
    customSpecialties: [], customTherapeuticApproaches: [], matchingNeedsReview: false, perspective: emptyPerspective(),
    specialties: [],
    therapeuticApproaches: [],
    declaredGender: null,
    languages: ['spanish'],
    education: [],
    experience: [],

    // Verification
    identityVerified: false,
    insuranceUploaded: false,
    insuranceReviewStatus: 'NOT_UPLOADED',
    insuranceReviewedAt: null,
    insuranceRejectedReason: null,
    locationVisibleToPatients: false,
    certificates: [],

    // Pricing
    priceStandard: '65',
    priceExtended: '95',
    priceFirstSession: '60',
    offerExtended: false,
    offerFirstSessionDiscount: false,
    sessionTypes: ['individual'],
    modalityOnline: '65',
    modalityInPerson: '70',

    // Payment
    bankIban: '',
    bankHolder: '',
    bankVerified: false,
    taxId: '',
    taxAddress: '',
    taxCity: '',
    applyVat: false,
    vatRate: '21',
    applyIrpf: true,

    // Account
    email: user?.email || '',
    emailVerified: user?.emailVerified,
    phone: user?.phone || '',
    phoneVerified: false,
    twoFactorEnabled: false,
    profileVisible: true,
    showReviewCount: true,
    showLastOnline: false,

    // Mi Espacio
    gradientId: 'salvia-lavanda',
    photoGallery: [],
    presentationVideoUrl: '',
    yearsInPractice: '',
    birthDate: null,
    showAge: false,
    languagesSpoken: [],

    // Location & Service Modality
    officeAddress: '',
    officeCity: '',
    officePostalCode: '',
    officeCountry: 'Spain',
    officeLat: null,
    officeLng: null,
    offersOnline: true,
    offersInPerson: false,
  });

  const [originalData, setOriginalData] = useState<SpecialistProfileData>(profileData);
  const baseline = useRef(originalData);
  baseline.current = originalData;
  const hasDraftChanges = JSON.stringify(profileData) !== JSON.stringify(originalData);
  const confirmMatchingReview = profileData.matchingNeedsReview && matchingReviewed;
  const hasChanges = hasDraftChanges || confirmMatchingReview;
  const practiceWarning = getMatchingCompletionDescription(profileData);
  const missingLanguage = profileData.languages.length === 0;
  const showProfileAvatar = Boolean(profileData.avatar) && !avatarLoadFailed;

  useProfileDraftExit(hasChanges);

  useEffect(() => {
    if (!pendingSection || isLoading || (isMobile && !detailOpen)) return;
    // Older completion snapshots can identify the practice group without specifying the missing field.
    let anchor = pendingSection;
    if (anchor === 'matching' && !practiceWarning && missingLanguage) anchor = 'languages';
    if (anchor === 'location' && !sectionRefs.current.location) anchor = 'modality';
    const frame = requestAnimationFrame(() => {
      const target = sectionRefs.current[anchor];
      const scrollView = formScrollRef.current;
      if (!target || !scrollView) return;
      if (Platform.OS === 'web' && typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'start', inline: 'nearest' });
      } else {
        focusEditorTarget(target);
        target.measureInWindow((_x, y) => viewportRef.current?.measureInWindow((_scrollX, scrollY) => {
          scrollView.scrollTo({ y: Math.max(0, formScrollOffsetRef.current + y - scrollY - spacing.md), animated: true });
        }));
      }
      setHighlightedSection(anchor);
      setPendingSection(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, detailOpen, isMobile, isLoading, pendingSection, practiceWarning, missingLanguage]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profileData.avatar]);

  // Calculate profile completion percentage
  const verificationCompletion = useMemo(() => {
    const professionalVerificationProgress =
      verificationStatus.verificationStatus === 'VERIFIED'
        ? 100
        : verificationStatus.verificationStatus === 'PENDING'
          ? 50
          : 0;

    const insuranceProgress =
      profileData.insuranceReviewStatus === 'APPROVED'
        ? 100
        : profileData.insuranceReviewStatus === 'PENDING'
          ? 50
          : 0;

    return Math.round(
      (
        professionalVerificationProgress
        + professionalVerificationProgress
        + insuranceProgress
      ) / 3
    );
  }, [profileData.insuranceReviewStatus, verificationStatus.verificationStatus]);

  const insuranceReviewCopy = useMemo(
    () => getInsuranceReviewCopy(
      profileData.insuranceReviewStatus,
      profileData.insuranceReviewedAt,
      profileData.insuranceRejectedReason
    ),
    [
      profileData.insuranceReviewStatus,
      profileData.insuranceReviewedAt,
      profileData.insuranceRejectedReason,
    ]
  );

  const shareProfileUrl = useMemo(() => {
    const profileRef = savedPublicSlug || specialistId;
    if (!profileRef) {
      return '';
    }

    return `${getWebAppUrl()}/especialista/${encodeURIComponent(profileRef)}`;
  }, [savedPublicSlug, specialistId]);
  const isProfessionalVerified = verificationKnown && verificationStatus.verificationStatus === 'VERIFIED';
  const canOpenPublicProfile =
    isProfessionalVerified && Boolean(specialistId);

  const billingFiscalReady = useMemo(
    () =>
      Boolean(
        billingConfig?.fiscalName?.trim()
        && billingConfig?.fiscalNif?.trim()
        && billingConfig?.fiscalAddress?.trim()
      ),
    [billingConfig]
  );

  const billingBankReady = Boolean(billingConfig?.bankIban?.trim());
  const actionableCompletionItems = useMemo(
    () => completionSnapshot?.role === 'PROFESSIONAL'
      ? completionSnapshot.items.filter((item) => item.state === 'ACTION_REQUIRED')
      : [],
    [completionSnapshot],
  );
  const actionableCompletionCodes = useMemo(
    () => new Set<ProfileCompletionCode>(
      actionableCompletionItems.map((item) => item.code),
    ),
    [actionableCompletionItems],
  );
  const hasCompletionIssue = useCallback(
    (code: ProfileCompletionCode): boolean => actionableCompletionCodes.has(code),
    [actionableCompletionCodes],
  );
  useEffect(() => {
    if (hasChanges) setSaved(false);
    setSaveError('');
  }, [profileData, hasChanges]);

  // Load profile data on mount and on every screen focus
  const loadProfile = useCallback(async () => {
    if (profileSaveRunning.current) return;
    const version = ++loadVersion.current;
    const loadedBefore = loaded.current;
    try {
      if (!loaded.current) setIsLoading(true);
      setLoadError(false);
      const profile = await professionalService.getComprehensiveProfile();
      if (!profile) throw new Error('Perfil no disponible');
      if (version === loadVersion.current) {
        const mappedData = {
          ...mapServiceProfileToFormData(profile),
          avatar: profile.avatar ?? user?.avatar ?? null,
        };
        let resolvedSpecialistId = profile.id ?? null;
        let resolvedPublicSlug = profile.publicSlug ?? '';

        if (!resolvedSpecialistId) {
          const summary = await professionalService.getProfessionalProfile();
          resolvedSpecialistId = summary?.id ?? null;
          resolvedPublicSlug = summary?.publicSlug ?? resolvedPublicSlug;
        }

        if (version !== loadVersion.current) return;
        const previous = baseline.current;
        setProfileData(draft => loadedBefore ? reconcileProfile(previous, draft, mappedData) : mappedData);
        setOriginalData(mappedData);
        setDirectoryStatus(profile.directoryStatus ?? null);
        loaded.current = true;
        setSpecialistId(resolvedSpecialistId);
        setSavedPublicSlug(resolvedPublicSlug);
        setPublicSlugChangesRemaining(
          profile.publicSlugChangesRemaining ?? PUBLIC_PROFILE_SLUG_MAX_CHANGES
        );
      }
    } catch (error) {
      if (version === loadVersion.current) setLoadError(true);
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  }, [user?.avatar]);

  const loadBillingConfig = useCallback(async () => {
    try {
      setIsBillingConfigLoading(true);
      const config = await billingService.getConfig();
      setBillingConfig(config);
    } catch {
      setBillingConfig(null);
    } finally {
      setIsBillingConfigLoading(false);
    }
  }, []);

  useFocusedRateLimitRecovery(() => {
    if (!hasChanges) {
      void loadProfile();
      void loadBillingConfig();
    }
  });

  const loadVerification = useCallback(async () => {
    try {
      const status = await professionalService.getVerificationStatus();
      setVerificationStatus(status);
      setVerificationKnown(true);
      setVerificationError(false);
    } catch {
      setVerificationKnown(false);
      setVerificationError(true);
    }
  }, []);

  const onPageChange = useCallback((next: ProfilePageNavigation, tab?: string) => {
    const returningToIndex = pageNavigation.current !== null && pageNavigation.current !== next && tab === undefined;
    pageNavigation.current = next;
    setDetailOpen(tab !== undefined);
    if (tab !== undefined) setActiveTab(isProfileTab(tab) ? tab : 'information');
    if (returningToIndex) {
      setReturnToConsultation(false);
      setPendingSection(null);
      requestAnimationFrame(() => focusEditorTarget(indexRowRef.current));
    }
  }, []);

  const openTab = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    if (isMobile || detailOpen) pageNavigation.current?.navigate('ProfileSection', { tab });
  }, [isMobile, detailOpen]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.initialTab === 'agenda') {
        navigation.setParams({ initialTab: undefined });
        navigateProfessionalSection(navigation, 'ProfessionalSessions', { openAgendaSettings: true });
        return;
      }
      if (route.params?.initialTab || route.params?.initialSection) {
        const anchor = route.params.initialSection;
        const tab = anchor ? (anchor === 'verification' || anchor === 'insurance' ? 'credentials' : 'information') : route.params.initialTab;
        if (tab) openTab(tab);
        setPendingSection(anchor ?? null);
        setReturnToConsultation(false);
        navigation.setParams({ initialTab: undefined, initialSection: undefined });
      }
    }, [navigation, openTab, route.params?.initialSection, route.params?.initialTab])
  );
  useFocusEffect(useCallback(() => {
    void loadProfile();
    void loadBillingConfig();
    void loadVerification();
  }, [loadBillingConfig, loadVerification, loadProfile]));

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateField = useCallback(<K extends keyof SpecialistProfileData>(
    field: K,
    value: SpecialistProfileData[K]
  ) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  }, []);

  const editOfficeAddress = (field: 'officeAddress' | 'officeCity' | 'officePostalCode' | 'officeCountry', value: string) => {
    setProfileData(prev => prev[field] === value ? prev : { ...prev, [field]: value, officeLat: null, officeLng: null });
  };

  const toggleMultiSelect = useCallback((
    field: 'specialties' | 'therapeuticApproaches' | 'languages' | 'sessionTypes',
    value: string
  ) => {
    setProfileData(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  }, []);

  const openConsultationInsurance = useCallback(() => {
    setReturnToConsultation(true);
    openTab('credentials');
    setPendingSection('insurance');
  }, [openTab]);

  const handleSave = useCallback(async (notifySuccess = true): Promise<boolean> => {
    if (profileSaveRunning.current) return false;
    if (!hasChanges) return true;

    const perspectiveChanged = JSON.stringify(profileData.perspective) !== JSON.stringify(originalData.perspective);
    const perspective = profileData.perspective;
    const withdrawalOnly = Object.keys(profileData).every(key =>
      JSON.stringify(profileData[key as keyof SpecialistProfileData]) === JSON.stringify(originalData[key as keyof SpecialistProfileData])
      || (key === 'perspective' && originalData.perspective.hasDeclaration && !perspective.publish)
      || (key === 'showAge' && !profileData.showAge) || (key === 'birthDate' && profileData.birthDate === null));

    const phoneOnly = Object.keys(profileData).every(key => key === 'phone'
      || JSON.stringify(profileData[key as keyof SpecialistProfileData]) === JSON.stringify(originalData[key as keyof SpecialistProfileData]));
    const requiresProfessionalValidation = confirmMatchingReview || (!withdrawalOnly && !phoneOnly);

    const experienceInput = profileData.yearsInPractice.trim();
    if (requiresProfessionalValidation && experienceInput !== '' && (!/^\d+$/.test(experienceInput) || Number(experienceInput) > 60)) {
      showAppAlert(appAlert, 'Revisa los años de experiencia', 'Indica un número entero entre 0 y 60, o deja el campo vacío para no mostrarlo.');
      return false;
    }

    if (requiresProfessionalValidation && profileData.offersInPerson && !profileData.insuranceUploaded) {
      showAppAlert(appAlert, 
        'Falta la póliza',
        'Sube la póliza en Credenciales para guardar la modalidad presencial. Podrás volver a la ubicación con tus cambios.',
        [{ text: 'Volver', style: 'cancel' }, { text: 'Ir a Credenciales', onPress: openConsultationInsurance }]
      );
      return false;
    }

    if (requiresProfessionalValidation && !profileData.professionalType) {
      showAppAlert(
        appAlert,
        'Falta el tipo profesional',
        'Selecciona tu tipo profesional regulado para guardar el perfil.'
      );
      return false;
    }

    const specialtyCount = profileData.specialties.length + profileData.customSpecialties.length;
    const choiceError = customChoiceGroupErrors(profileData.customSpecialties, PROFESSIONAL_SPECIALTY_OPTIONS)[0]
      || customChoiceGroupErrors(profileData.customTherapeuticApproaches, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS)[0];
    if (requiresProfessionalValidation && (specialtyCount < 1 || choiceError || profileData.therapeuticApproaches.length + profileData.customTherapeuticApproaches.length > 30)) {
      showAppAlert(appAlert, 'Revisa tu práctica', choiceError || 'Elige al menos una especialidad y hasta 30 enfoques.');
      return false;
    }
    if (perspectiveChanged && perspective.publish && (!perspective.religionCode || !perspective.noticeVersion || (perspective.religionCode === 'other' && !perspective.religionOtherText.trim()))) {
      showAppAlert(appAlert, 'Revisa tu perspectiva', 'Selecciona una perspectiva y confirma su publicación.');
      return false;
    }
    profileSaveRunning.current = true;
    ++loadVersion.current;
    setSaveError('');
    setSaved(false);
    setIsSaving(true);
    try {
      const updateData: Partial<ServiceProfileData> & {perspectiveOperation?: PerspectiveOperation} = {};
      const hasFieldChanged = <K extends keyof SpecialistProfileData>(field: K) =>
        JSON.stringify(profileData[field]) !== JSON.stringify(originalData[field]);
      const avatarChanged = hasFieldChanged('avatar');
      const assignIfChanged = <K extends keyof SpecialistProfileData, T extends keyof ServiceProfileData>(
        localField: K,
        apiField: T,
        value: ServiceProfileData[T]
      ) => {
        if (hasFieldChanged(localField)) {
          updateData[apiField] = value;
        }
      };

      assignIfChanged('fullName', 'fullName', profileData.fullName);
      assignIfChanged('professionalTitle', 'professionalTitle', profileData.professionalTitle);
      assignIfChanged('professionalType', 'professionalType', profileData.professionalType);
      assignIfChanged('bio', 'bio', profileData.bio);
      assignIfChanged('avatar', 'avatar', profileData.avatar);
      if (confirmMatchingReview) {
        // Re-submit the reviewed selection even when the user kept every option.
        updateData.specialties = profileData.specialties;
        updateData.customSpecialties = profileData.customSpecialties;
        updateData.therapeuticApproaches = profileData.therapeuticApproaches;
        updateData.customTherapeuticApproaches = profileData.customTherapeuticApproaches;
      } else {
        assignIfChanged('specialties', 'specialties', profileData.specialties);
        assignIfChanged('customSpecialties', 'customSpecialties', profileData.customSpecialties);
        assignIfChanged('therapeuticApproaches', 'therapeuticApproaches', profileData.therapeuticApproaches);
        assignIfChanged('customTherapeuticApproaches', 'customTherapeuticApproaches', profileData.customTherapeuticApproaches);
      }
      if (perspectiveChanged) {
        if (perspective.publish && perspective.noticeVersion) updateData.perspectiveOperation = {action: 'publish', religionCode: perspective.religionCode, religionOtherText: perspective.religionCode === 'other' ? perspective.religionOtherText.trim() : null, noticeVersion: perspective.noticeVersion};
        else if (originalData.perspective.hasDeclaration) updateData.perspectiveOperation = {action: 'delete'};
      }

      assignIfChanged('declaredGender', 'declaredGender', profileData.declaredGender);
      assignIfChanged('languages', 'languages', profileData.languages);
      assignIfChanged('education', 'education', profileData.education);
      assignIfChanged('experience', 'experience', profileData.experience);
      assignIfChanged('phone', 'phone', profileData.phone);
      assignIfChanged('profileVisible', 'profileVisible', profileData.profileVisible);
      assignIfChanged('gradientId', 'gradientId', profileData.gradientId);
      assignIfChanged('photoGallery', 'photoGallery', profileData.photoGallery);
      assignIfChanged('presentationVideoUrl', 'presentationVideoUrl', profileData.presentationVideoUrl);
      assignIfChanged('birthDate', 'birthDate', profileData.birthDate);
      assignIfChanged('showAge', 'showAge', profileData.showAge);
      assignIfChanged('yearsInPractice', 'yearsInPractice', experienceInput === '' ? null : Number(experienceInput));

      if (profileData.offersInPerson) {
        assignIfChanged('officeAddress', 'officeAddress', profileData.officeAddress);
        assignIfChanged('officeCity', 'officeCity', profileData.officeCity);
        assignIfChanged('officePostalCode', 'officePostalCode', profileData.officePostalCode);
        assignIfChanged('officeCountry', 'officeCountry', profileData.officeCountry);
        assignIfChanged('officeLat', 'officeLat', profileData.officeLat);
        assignIfChanged('officeLng', 'officeLng', profileData.officeLng);
      }
      assignIfChanged('offersOnline', 'offersOnline', profileData.offersOnline);
      assignIfChanged('offersInPerson', 'offersInPerson', profileData.offersInPerson);

      const result = await professionalService.updateComprehensiveProfile(updateData);
      setDirectoryStatus(result.directoryStatus ?? null);
      const mappedData = mapServiceProfileToFormData(result);

      if (avatarChanged) {
        updateUser({ avatar: mappedData.avatar });
        setAvatarLoadFailed(false);
      }
      if (hasFieldChanged('phone')) updateUser({ phone: mappedData.phone });
      ++loadVersion.current;
      const savedProfile = reconcileProfile(originalData, baseline.current, mappedData);
      setProfileData(draft => reconcileProfile(profileData, draft, savedProfile));
      setOriginalData(savedProfile);
      if (confirmMatchingReview) setMatchingReviewed(false);
      await refreshCompletion();
      if (notifySuccess) setSaved(true);
      return true;
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, 'Revisa los datos introducidos e inténtalo de nuevo.'));
      showAppAlert(
        appAlert,
        'No se pudo guardar el perfil',
        getErrorMessage(error, 'Revisa los datos introducidos e inténtalo de nuevo.'),
      );
      return false;
    } finally {
      profileSaveRunning.current = false;
      setIsSaving(false);
    }
  }, [confirmMatchingReview, hasChanges, originalData, profileData, refreshCompletion, updateUser, openConsultationInsurance, appAlert]);

  const handleVideoSetup = async () => {
    if (!await handleSave(false)) return;
    openTab('google');
    formScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleImagePick = useCallback(async () => {
    if (isUploadingAvatar) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploadingAvatar(true);
        try {
          const updatedUser = await authService.uploadAvatar({
            uri: asset.uri,
            mimeType: asset.mimeType,
            fileName: asset.fileName,
          });
          const nextAvatar = updatedUser.avatar ?? null;
          updateUser({ avatar: nextAvatar });
          setAvatarLoadFailed(false);
          setProfileData(prev => ({ ...prev, avatar: nextAvatar }));
          setOriginalData(prev => ({ ...prev, avatar: nextAvatar }));
        } catch (uploadError: unknown) {
          showAppAlert(
            appAlert,
            'No se pudo subir la foto',
            getErrorMessage(uploadError, 'Comprueba la imagen seleccionada e inténtalo de nuevo.'),
          );
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (error) {
      showAppAlert(appAlert, 'No se pudo seleccionar la imagen', 'Inténtalo de nuevo con otra imagen.');
    }
  }, [updateUser, isUploadingAvatar]);

  // Navigate to own public profile (as patients see it)
  const handleViewPublicProfile = useCallback(() => {
    const profileRef = savedPublicSlug || specialistId;
    if (!profileRef) {
      showAppAlert(appAlert, 'Perfil no disponible', 'No se pudo cargar la vista pública del perfil.');
      return;
    }

    if (!canOpenPublicProfile) {
      showAppAlert(
        appAlert,
        'Perfil público no disponible',
        'Tu perfil completo estará disponible cuando HERA apruebe tu verificación profesional.'
      );
      return;
    }

    navigation.navigate('PublicSpecialistProfile', { profileRef });
  }, [appAlert, canOpenPublicProfile, navigation, savedPublicSlug, specialistId]);

  // Share profile handler
  const closeShareModal = useCallback(() => {
    setIsShareModalVisible(false);
    setHasCopiedShareUrl(false);
  }, []);

  const handleShareProfile = useCallback(() => {
    if (!shareProfileUrl) return;

    setHasCopiedShareUrl(false);
    setIsShareModalVisible(true);
  }, [shareProfileUrl]);

  const handleCopyShareUrl = useCallback(async () => {
    if (!shareProfileUrl) return;

    try {
      if (await Clipboard.setStringAsync(shareProfileUrl)) {
        setHasCopiedShareUrl(true);
        return;
      }
    } catch {
      // The browser may deny clipboard access.
    }
    setHasCopiedShareUrl(false);
    showAppAlert(appAlert, 'No se pudo copiar el enlace', shareProfileUrl);
  }, [appAlert, shareProfileUrl]);

  const handleNativeShareSheet = useCallback(async () => {
    if (!shareProfileUrl) return;

    try {
      await Share.share({
        message: `Reserva tu sesión conmigo en HERA: ${shareProfileUrl}`,
        url: shareProfileUrl,
      });
    } catch (err) {
      // User cancelled share
    }
  }, [shareProfileUrl]);

  const handleOpenBilling = useCallback(() => {
    navigateProfessionalSection(navigation, 'ProfessionalBilling', { initialSection: 'fiscal' });
  }, [navigation]);

  const resetCertificateDraft = useCallback(() => {
    setCertificateDraft({
      name: '',
      issuer: '',
      validUntil: '',
      publicVisible: false,
      educationId: null,
    });
  }, []);

  const closeCertificateModal = useCallback(() => {
    if (isUploadingCertificate) {
      return;
    }

    setIsCertificateModalVisible(false);
    resetCertificateDraft();
  }, [isUploadingCertificate, resetCertificateDraft]);

  const handleUploadInsuranceDocument = useCallback(async () => {
    if (isUploadingInsurance) {
      return;
    }

    try {
      const asset = await pickProfessionalDocument('application/pdf');
      if (!asset) {
        return;
      }

      setIsUploadingInsurance(true);
      const result = await professionalService.uploadInsuranceDocument(asset);
      ++loadVersion.current;

      setProfileData(prev => ({
        ...prev,
        insuranceUploaded: result.insuranceUploaded,
        insuranceReviewStatus: result.insuranceReviewStatus,
        insuranceReviewedAt: null,
        insuranceRejectedReason: null,
        locationVisibleToPatients: false,
      }));
      setOriginalData(prev => ({
        ...prev,
        insuranceUploaded: result.insuranceUploaded,
        insuranceReviewStatus: result.insuranceReviewStatus,
        insuranceReviewedAt: null,
        insuranceRejectedReason: null,
        locationVisibleToPatients: false,
      }));
      await refreshCompletion();
    } catch (error: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo subir la póliza',
        getErrorMessage(error, 'Comprueba que sea un PDF válido e inténtalo de nuevo.'),
      );
    } finally {
      setIsUploadingInsurance(false);
    }
  }, [isUploadingInsurance, refreshCompletion]);

  const handleOpenInsuranceDocument = useCallback(async () => {
    if (openingCredentialKey === 'insurance') {
      return;
    }

    try {
      setOpeningCredentialKey('insurance');
      await professionalService.openInsuranceDocument();
    } catch (error: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo abrir la póliza',
        getErrorMessage(error, 'Vuelve a intentarlo en unos segundos.'),
      );
    } finally {
      setOpeningCredentialKey(null);
    }
  }, [openingCredentialKey]);

  const handleDeleteInsuranceDocument = useCallback(() => {
    const doDelete = async () => {
      try {
        setDeletingInsurance(true);
        const result = await professionalService.deleteInsuranceDocument();
        ++loadVersion.current;

        setProfileData(prev => ({
          ...prev,
          insuranceUploaded: result.insuranceUploaded,
          insuranceReviewStatus: result.insuranceReviewStatus,
          insuranceReviewedAt: null,
          insuranceRejectedReason: null,
          locationVisibleToPatients: false,
          offersInPerson: result.offersInPerson,
        }));
        setOriginalData(prev => ({
          ...prev,
          insuranceUploaded: result.insuranceUploaded,
          insuranceReviewStatus: result.insuranceReviewStatus,
          insuranceReviewedAt: null,
          insuranceRejectedReason: null,
          locationVisibleToPatients: false,
          offersInPerson: result.offersInPerson,
        }));
        await refreshCompletion();
      } catch (error: unknown) {
        showAppAlert(
          appAlert,
          'No se pudo eliminar la póliza',
          getErrorMessage(error, 'Vuelve a intentarlo en unos segundos.'),
        );
      } finally {
        setDeletingInsurance(false);
      }
    };

    showAppAlert(appAlert,
      'Eliminar póliza',
      'Al eliminar este documento privado se desactivarán las sesiones presenciales. Tu ubicación quedará oculta y tu perfil dejará de aparecer en el filtro presencial. Para volver a activarlas, tendrás que subir una nueva póliza y guardar la modalidad.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void doDelete() },
      ]
    );
  }, [appAlert, refreshCompletion]);

  const handleCreateCertificate = useCallback(async () => {
    if (isUploadingCertificate) {
      return;
    }

    const trimmedName = certificateDraft.name.trim();
    const trimmedIssuer = certificateDraft.issuer.trim();
    const trimmedValidUntil = certificateDraft.validUntil.trim();

    if (!trimmedName || !trimmedIssuer) {
      showAppAlert(appAlert, 'Completa los datos', 'Añade al menos el nombre del certificado y la entidad emisora.');
      return;
    }

    try {
      const asset = await pickProfessionalDocument(['application/pdf', 'image/*']);
      if (!asset) {
        return;
      }

      setIsUploadingCertificate(true);
      const certificate = await professionalService.uploadCertificateDocument({
        file: asset,
        name: trimmedName,
        issuer: trimmedIssuer,
        validUntil: trimmedValidUntil || null,
        publicVisible: certificateDraft.publicVisible,
        educationId: certificateDraft.educationId,
      });

      setProfileData(prev => ({
        ...prev,
        certificates: [certificate, ...prev.certificates],
      }));
      setOriginalData(prev => ({
        ...prev,
        certificates: [certificate, ...prev.certificates],
      }));
      setIsCertificateModalVisible(false);
      resetCertificateDraft();
    } catch (error: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo subir el certificado',
        getErrorMessage(error, 'Revisa el archivo y los datos del certificado.'),
      );
    } finally {
      setIsUploadingCertificate(false);
    }
  }, [certificateDraft, isUploadingCertificate, resetCertificateDraft]);

  const handleOpenCertificate = useCallback(async (certificate: Certificate) => {
    const key = `certificate:${certificate.id}`;
    if (openingCredentialKey === key) {
      return;
    }

    try {
      setOpeningCredentialKey(key);
      await professionalService.openCertificateDocument(certificate.id, certificate.mimeType);
    } catch (error: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo abrir el certificado',
        getErrorMessage(error, 'Vuelve a intentarlo en unos segundos.'),
      );
    } finally {
      setOpeningCredentialKey(null);
    }
  }, [openingCredentialKey]);

  const handleUpdateCertificateMetadata = useCallback(async (
    certificate: Certificate,
    patch: { publicVisible?: boolean; educationId?: string | null }
  ) => {
    if (updatingCertificateKey) {
      return;
    }

    const key = `certificate-meta:${certificate.id}`;

    try {
      setUpdatingCertificateKey(key);
      const updatedCertificate = await professionalService.updateCertificateDocumentMetadata(
        certificate.id,
        patch
      );

      const applyCertificateUpdate = (prev: SpecialistProfileData): SpecialistProfileData => ({
        ...prev,
        certificates: prev.certificates.map((item) =>
          item.id === updatedCertificate.id ? { ...item, ...updatedCertificate } : item
        ),
      });

      setProfileData(applyCertificateUpdate);
      setOriginalData(applyCertificateUpdate);
    } catch (error: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo actualizar el certificado',
        getErrorMessage(error, 'Revisa los datos e inténtalo de nuevo.'),
      );
    } finally {
      setUpdatingCertificateKey(null);
    }
  }, [appAlert, updatingCertificateKey]);

  const handleDeleteCertificate = useCallback((certificateId: string) => {
    const doDelete = async () => {
      try {
        await professionalService.deleteCertificateDocument(certificateId);
        setProfileData(prev => ({
          ...prev,
          certificates: prev.certificates.filter(cert => cert.id !== certificateId),
        }));
        setOriginalData(prev => ({
          ...prev,
          certificates: prev.certificates.filter(cert => cert.id !== certificateId),
        }));
      } catch (error: unknown) {
        showAppAlert(
          appAlert,
          'No se pudo eliminar el certificado',
          getErrorMessage(error, 'Vuelve a intentarlo en unos segundos.'),
        );
      }
    };

    showAppAlert(appAlert,
      'Eliminar certificado',
      'Borraremos el documento privado y su referencia del perfil.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void doDelete() },
      ]
    );
  }, []);


  const addEducation = useCallback(() => {
    const newEducation: Education = {
      id: Date.now().toString(),
      degree: '',
      institution: '',
      startYear: '',
      endYear: '',
    };
    setExpandedEntry('education-' + newEducation.id);
    setProfileData(prev => ({
      ...prev,
      education: [...prev.education, newEducation],
    }));
  }, []);

  const updateEducation = useCallback((id: string, field: keyof Education, value: string) => {
    setProfileData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  }, []);

  const removeEducation = useCallback((id: string) => {
    setExpandedEntry(null);
    requestAnimationFrame(() => addEducationRef.current?.focus());
    setProfileData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id),
    }));
  }, []);

  const addExperience = useCallback(() => {
    const newExperience: Experience = {
      id: Date.now().toString(),
      position: '',
      organization: '',
      startYear: '',
      endYear: null,
      current: false,
    };
    setExpandedEntry('experience-' + newExperience.id);
    setProfileData(prev => ({
      ...prev,
      experience: [...prev.experience, newExperience],
    }));
  }, []);

  const updateExperience = useCallback((id: string, field: keyof Experience, value: Experience[keyof Experience]) => {
    setProfileData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  }, []);

  const removeExperience = useCallback((id: string) => {
    setExpandedEntry(null);
    requestAnimationFrame(() => addExperienceRef.current?.focus());
    setProfileData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id),
    }));
  }, []);

  // ============================================================================
  // RENDER: TAB NAVIGATION
  // ============================================================================

  const needsContactPhone = !originalData.phone.trim();

  const tabs: { id: ProfileTab; label: string; icon: IconName; pendingHint?: string }[] = [
    {
      id: 'information',
      label: 'Información profesional',
      icon: 'person-outline',
    },
    { id: 'mi-espacio', label: STRINGS.miEspacio.tabLabel, icon: 'sparkles-outline' },
    {
      id: 'credentials',
      label: 'Credenciales',
      icon: 'shield-checkmark-outline',
      pendingHint: hasCompletionIssue('PROFESSIONAL_VERIFICATION') || hasCompletionIssue('PROFESSIONAL_INSURANCE') ? 'Credenciales pendientes' : undefined,
    },
    {
      id: 'pricing',
      label: 'Facturación',
      icon: 'card-outline',
      pendingHint: hasCompletionIssue('PROFESSIONAL_BILLING') ? 'Datos fiscales pendientes' : undefined,
    },
    { id: 'privacy', label: 'Privacidad', icon: 'eye-outline' },
    { id: 'google', label: 'Google', icon: 'logo-google' },
    { id: 'account', label: 'Cuenta', icon: 'settings-outline', pendingHint: needsContactPhone ? 'Teléfono recomendado pendiente' : undefined },
  ];

  const canShareProfile = isProfessionalVerified && Boolean(specialistId);
  const selectTab = (tab: ProfileTab) => {
    setSaved(false);
    setMenu(null);
    setPendingSection(null);
    openTab(tab);
    setReturnToConsultation(false);
    formScrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const returnToIndex = () => {
    pageNavigation.current?.popToTop();
  };
  const renderDestinations = (index: boolean) => tabs.map(tab => {
    const selected = !index && activeTab === tab.id;
    return (
      <Pressable key={tab.id} ref={index && tab.id === activeTab ? indexRowRef : undefined}
        accessibilityRole="button" accessibilityLabel={tab.label} accessibilityHint={tab.pendingHint}
        accessibilityState={index ? undefined : { selected }} aria-pressed={index ? undefined : selected}
        onPress={() => {
          selectTab(tab.id);
          if (index) requestAnimationFrame(() => focusEditorTarget(backLinkRef.current));
        }}
        style={({ pressed }) => [index ? styles.indexRow : styles.navTab,
          !index && tab.id === 'information' && styles.informationNavTab,
          (selected || pressed) && styles.navSelected]}>
        <View style={index && styles.indexIcon}><Ionicons name={tab.icon} size={index ? 21 : 17} color={theme.textPrimary} /></View>
        <Text style={[styles.navLabel, index && styles.indexLabel, selected && styles.navLabelSelected]}>{tab.label}</Text>
        {tab.pendingHint && <Ionicons name="information-circle-outline" size={16} color={theme.warningAmber} accessibilityLabel={tab.pendingHint} />}
        {index && <Ionicons name="chevron-forward" size={17} color={theme.textSecondary} />}
      </Pressable>
    );
  });
  const title = tabs.find(tab => tab.id === activeTab)?.label;
  const intro = subtitles[activeTab];
  const buttonIcon = (name: IconName) => <Ionicons name={name} size={17} color={theme.textPrimary} />;
  const saveAction = <Button size="small" disabled={isSaving || isUploadingInsurance || deletingInsurance || !hasChanges}
    accessibilityState={{ busy: isSaving }} onPress={() => void handleSave()}>{isSaving ? 'Guardando…' : saveError ? 'Reintentar' : 'Guardar'}</Button>;
  const renderDirectoryStatus = (embedded = false) => (
    <DirectoryVisibilityStatus embedded={embedded} status={directoryStatus} hasChanges={hasChanges}
      inPersonInsurancePending={originalData.offersInPerson && originalData.insuranceReviewStatus !== 'APPROVED'}
      onRetry={() => { void loadProfile(); }}
      onInsurance={() => { selectTab('credentials'); setPendingSection('insurance'); }}
      onAction={action => {
        if (action === 'pricing') {
          setMenu(null);
          if (hasChanges) showAppAlert(appAlert, 'Tienes cambios sin guardar', 'Guarda los cambios del perfil antes de ir a configurar el precio.');
          else navigateProfessionalSection(navigation, 'ProfessionalBilling');
        } else {
          selectTab(action);
          if (action === 'credentials') setPendingSection('verification');
        }
      }} />
  );
  const previewAction = (
    <TourTarget id="professional.profile.preview">
      <Button size="small" variant="ghost" icon={buttonIcon('open-outline')}
        accessibilityLabel="Ver perfil publicado" onPress={handleViewPublicProfile}>Perfil publicado</Button>
    </TourTarget>
  );
  const renderNavigation = (showIndex: boolean) => (
    <TourTarget id="professional.profile.save" active={!hasChanges && !isSaving}>
      <View style={styles.editorBar}>
        <View style={styles.barLead}>
          {isMobile && !showIndex ?
            <TourTarget id="professional.profile.tabs">
              <Button accessibilityLabel="Volver a secciones" focusRef={backLinkRef} size="small" variant="ghost" icon={buttonIcon('arrow-back-outline')} onPress={returnToIndex}>Volver a secciones</Button>
            </TourTarget> :
            <Text accessibilityRole="header" style={[styles.topBarTitle, { fontFamily: theme.fontDisplay }]}>{isMobile ? 'Editar perfil' : 'Editar perfil profesional'}</Text>}
          {isMobile && previewAction}
        </View>
        <View style={styles.barActions}>
          {!isMobile && previewAction}
          {canShareProfile && <Button size="small" variant="outline" icon={buttonIcon('link-outline')}
            accessibilityLabel="Enlace público" onPress={handleShareProfile}>Enlace público</Button>}
          <TourTarget id="professional.profile.visibility">{renderDirectoryStatus()}</TourTarget>
          {!isMobile && (hasChanges || isSaving) && <TourTarget id="professional.profile.save">{saveAction}</TourTarget>}
        </View>
      </View>
    </TourTarget>
  );

  // ============================================================================
  // RENDER: FORM COMPONENTS
  // ============================================================================

  const renderFormField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      disabled?: boolean;
      multiline?: boolean;
      numberOfLines?: number;
      keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
      helperText?: string;
      required?: boolean;
      optional?: boolean;
      recommended?: boolean;
      verified?: boolean;
      maxLength?: number;
      characterCount?: boolean;
      compactSpacing?: boolean;
      autoFocus?: boolean;
      alignVerificationLabel?: boolean;
    }
  ) => {
    const {
      placeholder = '',
      disabled = false,
      multiline = false,
      numberOfLines = 1,
      keyboardType = 'default',
      helperText,
      required = false,
      recommended = false,
      verified,
      maxLength,
      characterCount = false,
      compactSpacing = false,
      alignVerificationLabel = false,
    } = options || {};

    return (
      <View style={[styles.formField, compactSpacing && { marginBottom: 0 }]}>
        <View style={[styles.labelRow, alignVerificationLabel && styles.alignedVerificationLabel]}>
          <Text style={styles.fieldLabel}>
            {label}
            {options?.optional && <OptionalFieldSuffix />}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
          {recommended && <Text style={[styles.verifiedText, styles.verifiedTextPending]}>Recomendado</Text>}
          {verified !== undefined && (
            <View style={[styles.verifiedBadge, verified ? styles.verifiedBadgeSuccess : styles.verifiedBadgePending]}>
              <Ionicons
                name={verified ? 'checkmark-circle' : 'time'}
                size={14}
                color={verified ? palette.success : palette.warningAmber}
              />
              <Text style={[styles.verifiedText, verified ? styles.verifiedTextSuccess : styles.verifiedTextPending]}>
                {verified ? 'Verificado' : 'Pendiente'}
              </Text>
            </View>
          )}
        </View>
        <TextInput
          style={[
            styles.fieldInput,
            !disabled && focusedField === label && styles.fieldInputFocused,
            disabled && styles.fieldInputDisabled,
            multiline && styles.fieldInputMultiline,
            multiline && { minHeight: numberOfLines * 24 + 24 },
          ]}
          autoFocus={options?.autoFocus}
          value={value}
          accessibilityLabel={options?.optional ? label + ' (opcional)' : label}
          accessibilityState={{ disabled }}
          onFocus={() => setFocusedField(label)}
          onBlur={() => setFocusedField(null)}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          onChangeText={onChangeText}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {(helperText || characterCount) && (
          <View style={styles.fieldFooter}>
            {helperText && <Text style={styles.helperText}>{helperText}</Text>}
            {characterCount && maxLength && (
              <Text style={styles.characterCount}>{value.length}/{maxLength}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // ============================================================================
  // HANDLERS: MI ESPACIO - Gallery
  // ============================================================================

  const handleGalleryPhotoPick = useCallback(async () => {
    if (isUploadingGalleryPhoto || profileData.photoGallery.length >= 6) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const imageUpload: UploadAsset = {
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        };
        setIsUploadingGalleryPhoto(true);
        try {
          const response = await professionalService.uploadGalleryPhoto(imageUpload);
          updateField('photoGallery', [...profileData.photoGallery, response.url]);
        } catch (uploadError: unknown) {
          const message = uploadError instanceof Error ? uploadError.message : 'No se pudo subir la foto';
          showAppAlert(appAlert, 'No se pudo subir la foto', message);
        } finally {
          setIsUploadingGalleryPhoto(false);
        }
      }
    } catch {
      showAppAlert(appAlert, 'No se pudo seleccionar la imagen', 'Inténtalo de nuevo con otra imagen.');
    }
  }, [isUploadingGalleryPhoto, profileData.photoGallery, updateField]);

  const handleDeleteGalleryPhoto = useCallback((url: string) => {
    const doDelete = async () => {
      try {
        await professionalService.deleteGalleryPhoto(url);
        updateField('photoGallery', profileData.photoGallery.filter(u => u !== url));
      } catch (deleteError: unknown) {
        const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la foto';
        showAppAlert(appAlert, 'No se pudo eliminar la foto', message);
      }
    };

    showAppAlert(appAlert,
      STRINGS.miEspacio.galleryDeleteConfirm,
      undefined,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ],
    );
  }, [profileData.photoGallery, updateField]);

  // ============================================================================
  // RENDER: TAB 0 - MI ESPACIO
  // ============================================================================

  const renderMiEspacioTab = () => (
    <View style={styles.tabContent}>
      {/* Section 1: Profile color picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.miEspacio.profileColorTitle}</Text>
        <Text style={miEspacioStyles.subtitle}>{STRINGS.miEspacio.profileColorSubtitle}</Text>
        <View style={miEspacioStyles.colorGrid}>
          {PROFILE_COLORS.map((profileColor) => {
            const isSelected = profileData.gradientId === profileColor.id;
            return (
              <TouchableOpacity
                key={profileColor.id}
                style={[
                  miEspacioStyles.colorCard,
                  isSelected && miEspacioStyles.colorCardSelected,
                  { width: isMobile ? '48%' as unknown as number : 160 },
                ]}
                onPress={() => updateField('gradientId', profileColor.id)}
                activeOpacity={0.7}
              >
                <View style={[miEspacioStyles.colorPreview, { backgroundColor: profileColor.colors[0] }]}>
                  {isSelected && (
                    <View style={miEspacioStyles.colorCheck}>
                      <Ionicons name="checkmark" size={16} color={palette.textOnCard} />
                    </View>
                  )}
                </View>
                <Text style={[
                  miEspacioStyles.colorName,
                  isSelected && miEspacioStyles.colorNameSelected,
                ]} numberOfLines={1}>
                  {profileColor.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Section 2: Photo Gallery */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.miEspacio.galleryLabel}</Text>
        <Text style={miEspacioStyles.subtitle}>{STRINGS.miEspacio.gallerySubtitle}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={miEspacioStyles.galleryRow}
        >
          {profileData.photoGallery.map((url) => (
            <View key={url} style={miEspacioStyles.galleryPhotoContainer}>
              <Image source={{ uri: url }} style={miEspacioStyles.galleryPhoto} />
              <TouchableOpacity
                style={miEspacioStyles.galleryDeleteBtn}
                onPress={() => handleDeleteGalleryPhoto(url)}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={miEspacioStyles.galleryDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {profileData.photoGallery.length < 6 && (
            <TouchableOpacity
              style={miEspacioStyles.galleryAddBtn}
              onPress={handleGalleryPhotoPick}
              activeOpacity={0.7}
              disabled={isUploadingGalleryPhoto}
            >
              {isUploadingGalleryPhoto ? (
                <ActivityIndicator size="small" color={palette.textMuted} />
              ) : (
                <Ionicons name="add" size={32} color={palette.textMuted} />
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Section 3: Presentation Video */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{STRINGS.miEspacio.videoLabel}</Text>
        <Text style={miEspacioStyles.subtitle}>{STRINGS.miEspacio.videoSubtitle}</Text>
        <TextInput
          style={[styles.fieldInput, focusedField === 'presentationVideo' && styles.fieldInputFocused]}
          onFocus={() => setFocusedField('presentationVideo')}
          onBlur={() => setFocusedField(null)}
          value={profileData.presentationVideoUrl}
          onChangeText={(text) => updateField('presentationVideoUrl', text)}
          placeholder={STRINGS.miEspacio.videoPlaceholder}
          placeholderTextColor={palette.textMuted}
          keyboardType="url"
          autoCapitalize="none"
        />
        <Text style={[styles.helperText, { marginTop: spacing.xs }]}>
          {STRINGS.miEspacio.videoNote}
        </Text>
        {profileData.presentationVideoUrl.length > 0 && (
          <View style={miEspacioStyles.videoPreview}>
            <View style={miEspacioStyles.videoPlayIcon}>
              <Ionicons name="play" size={20} color={palette.textOnCard} />
            </View>
            <Text style={miEspacioStyles.videoUrl} numberOfLines={1}>
              {profileData.presentationVideoUrl.length > 40
                ? profileData.presentationVideoUrl.substring(0, 40) + '...'
                : profileData.presentationVideoUrl}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // ============================================================================
  // RENDER: TAB 1 - INFORMACIÓN PROFESIONAL
  // ============================================================================

  const renderCompletionWarning = (
    code: ProfileCompletionCode,
    title: string,
    description: string,
  ): React.ReactElement | null => {
    if (!hasCompletionIssue(code)) return null;

    const isCritical = actionableCompletionItems.some(
      (item) => item.code === code && item.severity === 'CRITICAL',
    );
    const color = isCritical ? theme.error : theme.warningAmber;

    return (
      <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description}
        style={styles.completionInfoButton} onPress={() => showAppAlert(appAlert, title, description)}>
        <Ionicons name="information-circle-outline" size={20} color={color} />
      </Pressable>
    );
  };

  const renderProfilePhoto = () => (
    <View style={styles.photoPanel}>

      <View style={styles.photoSection}>
        <View style={styles.avatarContainer}>
          {showProfileAvatar ? (
            <Image
              source={{ uri: profileData.avatar ?? '' }}
              style={styles.avatarLarge}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <View style={[styles.avatarLarge, { backgroundColor: palette.primary }]}>
              <Text style={styles.avatarLargeText}>
                {profileData.fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join('') || 'P'}
              </Text>
            </View>
          )}
          {isUploadingAvatar && (
            <View style={styles.avatarUploadOverlay}>
              <ActivityIndicator size="large" color={palette.textOnCard} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 86 }}>
          <Text style={styles.fieldLabel}>Foto de perfil<OptionalFieldSuffix /></Text>
          <Text style={styles.helperText}>Imagen cuadrada</Text>
        </View>
        <View style={styles.photoActions}>
          <Button
            variant="outline"
            size="small"
            onPress={handleImagePick}
            disabled={isUploadingAvatar}

            style={{ ...styles.photoButton }}
            textStyle={{ ...styles.photoButtonText }}
          >
            {isUploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
          </Button>
          {profileData.avatar && (
            <Button
              variant="ghost"
              size="small"
              onPress={() => updateField('avatar', null)}
              icon={<Ionicons name="trash-outline" size={18} color={palette.warning} />}
              style={{ ...styles.photoButton, ...styles.photoButtonDanger }}
              textStyle={{ ...styles.photoButtonText, ...styles.photoButtonTextDanger }}
            >
              Eliminar
            </Button>
          )}
        </View>
      </View>
    </View>
  );

  const renderInformationTab = () => (
    <View style={styles.tabContent}>
      <ProfileEditorSection wide={isDesktop} title="Datos profesionales" icon="id-card-outline"
          leadContent={renderProfilePhoto()} anchorRef={node => { sectionRefs.current.identity = node; }}
          highlighted={highlightedSection === 'identity'} notice={renderCompletionWarning(
            'PROFILE_IDENTITY',
            'Identidad profesional incompleta',
            'Revisa que el nombre completo y el tipo profesional estén informados.',
          )}>

        <View style={styles.identityGrid}>
          <View style={styles.identityField}>
            {renderFormField(
              'Nombre completo',
              profileData.fullName,
              (text) => updateField('fullName', text),
              { placeholder: 'Elena Rodríguez García', required: true }
            )}
          </View>
          <View style={styles.identityField}>
            {renderFormField(
              'Título profesional',
              profileData.professionalTitle,
              (text) => updateField('professionalTitle', text),
              {
                placeholder: 'Ej: Psicóloga infantojuvenil',
                optional: true,
                helperText: 'Puedes indicar tu área de trabajo.',
              }
            )}
          </View>
          <View style={styles.identityField}>{renderProfessionalTypeSelector()}</View>
          <View style={styles.identityField}>
            {/* Colegiado number - read-only, sourced from verification flow */}
            {renderFormField(
              'Número de colegiado',
              verificationStatus.colegiadoNumber || '',
              () => {},
              {
                placeholder: verificationStatus.verificationStatus === 'VERIFIED'
                  ? ''
                  : verificationStatus.verificationStatus === 'PENDING'
                    ? 'En revisión'
                    : 'Se completa mediante la verificación profesional',
                required: false,
                verified: verificationKnown ? isProfessionalVerified : undefined,
                alignVerificationLabel: true,
                disabled: true,
                helperText: 'Se actualiza desde Credenciales.',
              }
            )}
          </View>
          <View style={styles.identityField}>
            {renderFormField(
              'Años de experiencia',
              profileData.yearsInPractice,
              (text) => updateField('yearsInPractice', text),
              {
                optional: true,
                placeholder: 'Ej: 3',
                keyboardType: 'numeric',
                alignVerificationLabel: true,
                helperText: 'Dato declarado por ti, visible en tu perfil y en el directorio. Cuenta años completos de ejercicio, sin estudios ni periodos simultáneos. Déjalo vacío para no mostrarlo.',
              }
            )}
          </View>
          <View style={styles.identityField}>
            <ProfessionalBirthdayEditor birthDate={profileData.birthDate} showAge={profileData.showAge}
              onChange={(birthDate, showAge) => setProfileData(current => ({ ...current, birthDate, showAge }))} />
          </View>
        </View>
      </ProfileEditorSection>


        {/* Professional Bio Section */}
        <ProfileEditorSection wide={isDesktop} title="Descripción profesional" icon="document-text-outline"
          description="Cuenta cómo trabajas y a quién acompañas." anchorRef={node => { sectionRefs.current.bio = node; }}
          highlighted={highlightedSection === 'bio'} notice={renderCompletionWarning(
              'PROFILE_BIO',
              'Descripción profesional incompleta',
              profileData.bio.trim().length < 150
                ? `Te faltan ${150 - profileData.bio.trim().length} caracteres para alcanzar el mínimo de 150.`
                : 'Ya alcanzaste el mínimo. Guarda los cambios para actualizar el estado del perfil.',
            )}>

          <View style={[styles.formCard, styles.informationCard, styles.splitEqualCard]}>
            <View style={styles.descriptionPane}>
              {renderFormField(
                'Sobre ti',
                profileData.bio,
                (text) => updateField('bio', text),
                {
                  placeholder: 'Cuéntales a los clientes sobre tu enfoque, experiencia y filosofía terapéutica...',
                  multiline: true,
                  numberOfLines: 4,
                  required: true,
                  maxLength: 500,
                  characterCount: true,
                  helperText: 'Recomendamos al menos 150 caracteres para presentar tu forma de trabajar.',
                }
              )}
            </View>
          </View>
        </ProfileEditorSection>

        {/* Modality Section */}
        <ProfileEditorSection wide={isDesktop} title="Consulta" icon="videocam-outline"
          description="Elige las modalidades en las que ofreces tus sesiones." anchorRef={node => { sectionRefs.current.modality = node; }}
          highlighted={highlightedSection === 'modality'} notice={renderCompletionWarning(
              'PROFILE_MODALITY',
              'Modalidad pendiente',
              'Selecciona al menos una modalidad: sesiones online o presenciales.',
            )}>

          <View style={[styles.formCard, styles.informationCard, styles.splitEqualCard]}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Modalidad de sesiones</Text>
              <View style={styles.modalityOptions}>
                <TouchableOpacity
                  style={[
                    styles.modalityOption,
                    profileData.offersOnline && styles.modalityOptionSelected,
                  ]}
                  onPress={() => updateField('offersOnline', !profileData.offersOnline)}
                  accessibilityRole="checkbox"
                  aria-checked={profileData.offersOnline} accessibilityState={{ checked: profileData.offersOnline }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={profileData.offersOnline ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={profileData.offersOnline ? palette.primary : palette.textMuted}
                  />
                  <Ionicons name="videocam-outline" size={20} color={palette.textPrimary} />
                  <Text style={styles.modalityText}>Sesiones online</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalityOption,
                    profileData.offersInPerson && styles.modalityOptionSelected,
                  ]}
                  onPress={() => updateField('offersInPerson', !profileData.offersInPerson)}
                  accessibilityRole="checkbox"
                  aria-checked={profileData.offersInPerson} accessibilityState={{ checked: profileData.offersInPerson }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={profileData.offersInPerson ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={profileData.offersInPerson ? palette.primary : palette.textMuted}
                  />
                  <Ionicons name="business-outline" size={20} color={palette.textPrimary} />
                  <Text style={styles.modalityText}>Sesiones presenciales</Text>
                </TouchableOpacity>
              </View>

              {profileData.offersOnline && <VideoCallSetupPrompt
                hasUnsavedChanges={hasChanges}
                busy={isSaving}
                onSetup={() => { void handleVideoSetup(); }}
              />}

              {profileData.offersInPerson ? (
                <View
                  style={[
                    styles.presentialStatusCard,
                    insuranceReviewCopy.tone === 'success'
                      ? styles.presentialStatusCardSuccess
                      : insuranceReviewCopy.tone === 'info'
                        ? styles.presentialStatusCardInfo
                        : styles.presentialStatusCardWarning,
                  ]}
                >
                  <Ionicons
                    name={insuranceReviewCopy.icon}
                    size={18}
                    color={
                      insuranceReviewCopy.tone === 'success'
                        ? palette.success
                        : insuranceReviewCopy.tone === 'info'
                          ? palette.info
                          : palette.warningAmber
                    }
                  />
                  <View style={styles.presentialStatusCopy}>
                    <Text style={styles.presentialStatusTitle}>{insuranceReviewCopy.title}</Text>
                    <Text style={styles.presentialStatusText}>{insuranceReviewCopy.description}</Text>
                    <Button variant="ghost" size="small" style={styles.startButton} onPress={openConsultationInsurance}>
                      {profileData.insuranceUploaded ? 'Revisar póliza en Credenciales' : 'Subir póliza en Credenciales'}
                    </Button>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </ProfileEditorSection>

      {/* Office Location (only if in-person is offered) */}
      {profileData.offersInPerson && (
        <ProfileEditorSection wide={isDesktop} title="Ubicación presencial" icon="location-outline"
          description="Indica dónde se realizan las sesiones presenciales." anchorRef={node => { sectionRefs.current.location = node; }}
          highlighted={highlightedSection === 'location'} notice={renderCompletionWarning(
              'PROFILE_LOCATION',
              'Ubicación presencial incompleta',
              'Completa la dirección, la ciudad, el código postal y el país de la consulta.',
            )}>

          <View style={[styles.formCard, styles.informationCard, styles.locationCard]}>
            <View style={styles.locationLayout}>
              <View style={styles.locationFieldsPane}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Dirección de la consulta</Text>
                  <Text style={styles.fieldHelper}>
                    {profileData.locationVisibleToPatients
                      ? 'Visible para clientes que reserven sesiones presenciales'
                      : 'La ubicación sigue oculta para los pacientes.'}
                  </Text>
                  <AddressAutocomplete
                    onTextChange={value => editOfficeAddress('officeAddress', value)}
                    value={profileData.officeAddress}
                    placeholder="Buscar dirección..."
                    onAddressSelect={(details) => {
                      updateField('officeAddress', details.address);
                      updateField('officeCity', details.city);
                      updateField('officePostalCode', details.postalCode);
                      updateField('officeCountry', details.country);
                      updateField('officeLat', details.lat);
                      updateField('officeLng', details.lng);
                    }}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formFieldHalf}>
                    {renderFormField(
                      'Ciudad',
                      profileData.officeCity,
                      (text) => editOfficeAddress('officeCity', text),
                      { placeholder: 'Madrid' }
                    )}
                  </View>
                  <View style={styles.formFieldHalf}>
                    {renderFormField(
                      'Código postal',
                      profileData.officePostalCode,
                      (text) => editOfficeAddress('officePostalCode', text),
                      { placeholder: '28001', keyboardType: 'numeric' }
                    )}
                  </View>
                </View>
                {renderFormField('País', profileData.officeCountry, country => editOfficeAddress('officeCountry', country))}
              </View>

              {/* Map Preview */}
              {profileData.officeLat != null && profileData.officeLng != null && (
                <View style={styles.locationMapPane}>
                  <Text style={styles.fieldLabel}>Vista previa del mapa</Text>
                  <Text style={styles.fieldHelper}>
                    {profileData.locationVisibleToPatients
                      ? 'Así ven ya los clientes la ubicación de tu consulta'
                      : 'Vista previa privada de la ubicación de tu consulta'}
                  </Text>
                  <LocationMapPreview
                    lat={profileData.officeLat}
                    lng={profileData.officeLng}
                    address={profileData.officeAddress}
                    city={profileData.officeCity}
                    height={180}
                  />
                </View>
              )}
            </View>
          </View>
        </ProfileEditorSection>
      )}

      <View
        tabIndex={-1} collapsable={false}
        ref={(node) => { sectionRefs.current.matching = node; }}
        style={styles.detailGroup}
      >
        <ProfessionalMatchingEditor
          wide={isDesktop}
          highlighted={highlightedSection === 'matching'}
          notice={practiceWarning && renderCompletionWarning('PROFILE_MATCHING', 'Especialidades y enfoques pendientes', practiceWarning)}
          languageRef={node => { sectionRefs.current.languages = node; }}
          languageHighlighted={highlightedSection === 'languages'}
          languageNotice={missingLanguage && renderCompletionWarning('PROFILE_MATCHING', 'Idioma de las sesiones pendiente', 'Añade al menos un idioma en el que atiendas y guarda los cambios.')}
          reviewAction={profileData.matchingNeedsReview && <Pressable accessibilityRole="checkbox"
            {...choiceKeyboardProps(() => setMatchingReviewed(value => !value), isSaving)}
            disabled={isSaving} accessibilityLabel="He revisado mis especialidades y enfoques" accessibilityState={{ checked: matchingReviewed, disabled: isSaving }}
            aria-checked={matchingReviewed} onPress={() => setMatchingReviewed(value => !value)} style={styles.currentToggle}>
            <Ionicons name={matchingReviewed ? 'checkbox' : 'square-outline'} size={20} color={palette.primary} />
            <Text style={styles.bodyText}>He revisado mis especialidades y enfoques</Text>
          </Pressable>}
          declaredGender={profileData.declaredGender}
          onGenderChange={value => updateField('declaredGender', value)}
          customSpecialties={profileData.customSpecialties}
          customApproaches={profileData.customTherapeuticApproaches}
          onCustomSpecialtiesChange={values => updateField('customSpecialties', values)}
          onCustomApproachesChange={values => updateField('customTherapeuticApproaches', values)}
          matchingNeedsReview={profileData.matchingNeedsReview}
          perspective={profileData.perspective}
          onPerspectiveChange={value => updateField('perspective', value)}
          busy={isSaving}
          specialties={profileData.specialties}
          approaches={profileData.therapeuticApproaches}
          languages={profileData.languages}
          onToggle={toggleMultiSelect}
          onLanguagesChange={values => { updateField('languages', values); updateField('languagesSpoken', values); }}
        />
      </View>

      <Text accessibilityRole="header" style={[styles.pageTitle, { fontFamily: theme.fontDisplay }]}>Trayectoria profesional</Text>
      <View style={styles.informationLowerGrid}>
        {/* Education Section */}
        <ProfileEditorSection wide={isDesktop} title="Formación académica" icon="school-outline" description="Títulos, centros y fechas de formación.">
          <Button
              variant="outline"
              size="small"
              focusRef={addEducationRef}
              onPress={addEducation}
              icon={<Ionicons name="add" size={18} color={palette.primary} />}
              style={{ ...styles.addButton }}
              textStyle={{ ...styles.addButtonText }}
            >
              Añadir título
            </Button>

          {profileData.education.length === 0 ? (
            <Text style={styles.trajectoryEmpty}>Todavía no has añadido formación.</Text>
          ) : (
            <View style={styles.itemsList}>
              {profileData.education.map((edu) => (
                <TrajectoryEntry key={edu.id} kind="formación" title={edu.degree} organization={edu.institution}
                  startYear={edu.startYear} endYear={edu.endYear}
                  expanded={expandedEntry === 'education-' + edu.id}
                  onToggle={() => setExpandedEntry(current => current === 'education-' + edu.id ? null : 'education-' + edu.id)}
                  onRemove={() => removeEducation(edu.id)}>
                    <View style={styles.trajectoryFields}>
                      <View style={styles.formFieldHalf}>{renderFormField('Título de la formación', edu.degree,
                        value => updateEducation(edu.id, 'degree', value), { compactSpacing: true, autoFocus: true })}</View>
                      <View style={styles.formFieldHalf}>{renderFormField('Institución', edu.institution,
                        value => updateEducation(edu.id, 'institution', value), { compactSpacing: true, placeholder: 'Universidad o centro' })}</View>
                    </View>
                    <View style={styles.trajectoryFields}>
                      <View style={styles.formFieldHalf}>{renderFormField('Año inicial', edu.startYear,
                        value => updateEducation(edu.id, 'startYear', value), { compactSpacing: true, keyboardType: 'numeric', maxLength: 4, placeholder: 'AAAA' })}</View>
                      <View style={styles.formFieldHalf}>{renderFormField('Año final', edu.endYear || '',
                        value => updateEducation(edu.id, 'endYear', value), { compactSpacing: true, keyboardType: 'numeric', maxLength: 4, placeholder: 'AAAA' })}</View>
                    </View>
                </TrajectoryEntry>
              ))}
            </View>
          )}
        </ProfileEditorSection>

        {/* Experience Section */}
        <ProfileEditorSection wide={isDesktop} title="Experiencia profesional" icon="briefcase-outline" description="Puestos, organizaciones y años de ejercicio.">
          <Button
              variant="outline"
              size="small"
              focusRef={addExperienceRef}
              onPress={addExperience}
              icon={<Ionicons name="add" size={18} color={palette.primary} />}
              style={{ ...styles.addButton }}
              textStyle={{ ...styles.addButtonText }}
            >
              Añadir experiencia
            </Button>

          {profileData.experience.length === 0 ? (
            <Text style={styles.trajectoryEmpty}>Todavía no has añadido experiencia profesional.</Text>
          ) : (
            <View style={styles.itemsList}>
              {profileData.experience.map((exp) => (
                <TrajectoryEntry key={exp.id} kind="experiencia" title={exp.position} organization={exp.organization}
                  startYear={exp.startYear} endYear={exp.endYear} current={exp.current}
                  expanded={expandedEntry === 'experience-' + exp.id}
                  onToggle={() => setExpandedEntry(current => current === 'experience-' + exp.id ? null : 'experience-' + exp.id)}
                  onRemove={() => removeExperience(exp.id)}>
                    <View style={styles.trajectoryFields}>
                      <View style={styles.formFieldHalf}>{renderFormField('Puesto', exp.position,
                        value => updateExperience(exp.id, 'position', value), { compactSpacing: true, autoFocus: true })}</View>
                      <View style={styles.formFieldHalf}>{renderFormField('Organización', exp.organization,
                        value => updateExperience(exp.id, 'organization', value), { compactSpacing: true, placeholder: 'Centro o entidad' })}</View>
                    </View>
                    <View style={styles.trajectoryFields}>
                      <View style={styles.formFieldHalf}>{renderFormField('Año inicial', exp.startYear,
                        value => updateExperience(exp.id, 'startYear', value), { compactSpacing: true, keyboardType: 'numeric', maxLength: 4, placeholder: 'AAAA' })}</View>
                      {!exp.current && <View style={styles.formFieldHalf}>{renderFormField('Año final', exp.endYear || '',
                        value => updateExperience(exp.id, 'endYear', value), { compactSpacing: true, keyboardType: 'numeric', maxLength: 4, placeholder: 'AAAA' })}</View>}
                    </View>
                    <Pressable accessibilityRole="checkbox" accessibilityLabel="Empleo actual" aria-checked={exp.current}
                      accessibilityState={{ checked: exp.current }} onPress={() => updateExperience(exp.id, 'current', !exp.current)}
                      style={styles.currentToggle}>
                      <Ionicons name={exp.current ? 'checkbox' : 'square-outline'} size={20} color={palette.primary} />
                      <Text style={styles.bodyText}>Trabajo aquí actualmente</Text>
                    </Pressable>
                </TrajectoryEntry>
              ))}
            </View>
          )}
        </ProfileEditorSection>
      </View>
    </View>
  );

  // ============================================================================
  // RENDER: TAB 2 - CREDENCIALES Y VERIFICACIÓN
  // ============================================================================

  // RootNavigator opens the form when the canonical user state requires it.
  const handleResubmitVerification = async () => {
    if (resumingVerification) return;
    setResumingVerification(true);
    try {
      await refreshCurrentUser();
    } catch (error: unknown) {
      showAppAlert(appAlert, 'No se pudo abrir la verificación', getErrorMessage(error, 'Inténtalo de nuevo.'));
    } finally {
      setResumingVerification(false);
    }
  };

  const getEducationOptionLabel = (education: Education) => {
    const degree = education.degree.trim() || 'Formación';
    return education.institution.trim() ? degree + ' · ' + education.institution.trim() : degree;
  };

  const savedEducation = originalData.education;

  const renderCertificateEducationPicker = (certificate: Certificate) => {
    if (!savedEducation.length) {
      return (
        <Text style={styles.certificateAssociationHint}>
          Guarda una formación en Trayectoria para poder vincularle este documento.
        </Text>
      );
    }

    const updateKey = `certificate-meta:${certificate.id}`;
    const isUpdating = updatingCertificateKey === updateKey;
    const options: Array<{ id: string | null; label: string }> = [
      { id: null, label: 'Sin asociar' },
      ...savedEducation.map((education) => ({
        id: education.id,
        label: getEducationOptionLabel(education),
      })),
    ];

    return (
      <View style={styles.certificateAssociationBlock}>
        <Text style={styles.certificateAssociationLabel}>Asociar a formación</Text>
        <View style={styles.certificateAssociationChips}>
          {options.map((option) => {
            const selected = (certificate.educationId ?? null) === option.id;

            return (
              <TouchableOpacity
                key={option.id ?? 'none'}
                style={[
                  styles.certificateAssociationChip,
                  selected && styles.certificateAssociationChipSelected,
                ]}
                activeOpacity={0.75}
                accessibilityRole="button" accessibilityState={{ selected, disabled: isUpdating || selected }}
                disabled={isUpdating || selected}
                onPress={() => void handleUpdateCertificateMetadata(certificate, { educationId: option.id })}
              >
                {selected ? (
                  <Ionicons name="checkmark" size={13} color={palette.textOnCard} />
                ) : null}
                <Text
                  style={[
                    styles.certificateAssociationChipText,
                    selected && styles.certificateAssociationChipTextSelected,
                  ]}
                  numberOfLines={isMobile ? undefined : 1}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCredentialsTab = () => (
    <View style={styles.tabContent}>
      {/* Professional Verification Status Banner */}
      <ProfileEditorSection wide={isDesktop} title="Verificación profesional" icon="shield-checkmark-outline"
          description="Revisa el estado de tu identidad y colegiación." anchorRef={node => { sectionRefs.current.verification = node; }}
          highlighted={highlightedSection === 'verification'} notice={renderCompletionWarning(
            'PROFESSIONAL_VERIFICATION',
            'Verificación profesional pendiente',
            'Completa o reenvía la verificación para que HERA pueda revisar tus credenciales.',
          )}>
        {!verificationKnown ? <View style={styles.detailGroup}>
          <Text style={styles.bodyText}>{verificationError ? 'No se pudo comprobar la verificación.' : 'Consultando verificación…'}</Text>
          {verificationError && <Button variant="outline" onPress={loadVerification}>Reintentar verificación</Button>}
        </View> : <View style={styles.detailGroup}>
          <Text style={styles.fieldLabel}>Identidad y carnet de colegiado</Text>
          <Text style={styles.bodyText}>{isProfessionalVerified ? 'Identidad verificada' :
            verificationStatus.verificationStatus === 'PENDING' ? 'Documento enviado · En revisión' :
            verificationStatus.verificationStatus === 'REJECTED' ? 'Verificación rechazada' : 'Pendiente de envío'}</Text>
          {verificationStatus.reviewedAt && <Text style={styles.helperText}>Revisado el {formatDocumentDate(verificationStatus.reviewedAt)}</Text>}
          {verificationStatus.rejectionReason && <Text style={styles.bodyText}>{verificationStatus.rejectionReason}</Text>}
          {verificationStatus.colegiadoNumber && <Text style={styles.bodyText}>Número de colegiado · {verificationStatus.colegiadoNumber}</Text>}
          {['REJECTED', 'NOT_SUBMITTED'].includes(verificationStatus.verificationStatus) &&
            <Button style={styles.startButton} variant="outline" loading={resumingVerification} onPress={handleResubmitVerification}>
              {verificationStatus.verificationStatus === 'REJECTED' ? 'Reenviar verificación' : 'Verificar identidad'}
            </Button>}
          <Text style={styles.helperText}>Progreso de verificación · {verificationCompletion}%</Text>
        </View>}
      </ProfileEditorSection>

      {/* Professional Insurance */}
      <ProfileEditorSection wide={isDesktop} title="Seguro de responsabilidad civil" icon="document-lock-outline"
          description="Documentación privada de la cobertura presencial." anchorRef={node => { sectionRefs.current.insurance = node; }}
          highlighted={highlightedSection === 'insurance'} notice={renderCompletionWarning(
            'PROFESSIONAL_INSURANCE',
            'Seguro de responsabilidad civil pendiente',
            'Sube una póliza válida para mantener activa la modalidad presencial.',
          )}>

        <View style={styles.formCard}>
          <View
            style={[
              styles.insuranceStatusCard,
              insuranceReviewCopy.tone === 'success'
                ? styles.insuranceStatusCardSuccess
                : insuranceReviewCopy.tone === 'info'
                  ? styles.insuranceStatusCardInfo
                  : styles.insuranceStatusCardWarning,
            ]}
          >
            <Ionicons
              name={insuranceReviewCopy.icon}
              size={18}
              color={
                insuranceReviewCopy.tone === 'success'
                  ? palette.success
                  : insuranceReviewCopy.tone === 'info'
                    ? palette.info
                    : palette.warningAmber
              }
            />
            <View style={styles.insuranceStatusCopy}>
              <Text style={styles.insuranceStatusTitle}>{insuranceReviewCopy.title}</Text>
              <Text style={styles.insuranceStatusText}>{profileData.insuranceReviewStatus === 'NOT_UPLOADED'
                    ? 'Sube un PDF de tu póliza para que HERA revise la cobertura presencial.'
                    : insuranceReviewCopy.description}</Text>
            </View>
          </View>
          <Text style={styles.bodyText}>Archivo privado · Solo para revisión de HERA</Text>
          <View style={styles.inlineActions}>
            {profileData.insuranceUploaded ? <>
              <Button variant="outline" size="small" loading={openingCredentialKey === 'insurance'} onPress={handleOpenInsuranceDocument}>Abrir póliza</Button>
              <Button variant="ghost" size="small" loading={deletingInsurance} disabled={isSaving || deletingInsurance} onPress={handleDeleteInsuranceDocument}>Eliminar póliza</Button>
            </> : <Button size="small" disabled={isSaving} loading={isUploadingInsurance} onPress={handleUploadInsuranceDocument}>Subir póliza PDF</Button>}
          </View>
          {returnToConsultation && <Button variant="outline" style={styles.startButton} onPress={() => {
            selectTab('information');
            setPendingSection(profileData.offersInPerson ? 'location' : 'modality');
          }}>{profileData.offersInPerson ? 'Continuar con la ubicación' : 'Volver a Consulta'}</Button>}
        </View>
      </ProfileEditorSection>

      <ProfileEditorSection wide={isDesktop} title="Certificados y acreditaciones" icon="ribbon-outline">
          <Button
            variant="outline"
            size="small"
            onPress={() => setIsCertificateModalVisible(true)}
            icon={<Ionicons name="add" size={18} color={palette.primary} />}
            style={{ ...styles.addButton }}
            textStyle={{ ...styles.addButtonText }}
          >
            Añadir certificado
          </Button>


        {profileData.certificates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={40} color={palette.textMuted} />
            <Text style={styles.emptyStateTitle}>No has añadido certificados</Text>
            <Text style={styles.emptyStateDescription}>
              Añade certificados privados y decide cuáles quieres mostrar en tu perfil público.
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {profileData.certificates.map((cert) => {
              const linkedEducation = cert.educationId
                ? savedEducation.find((education) => education.id === cert.educationId)
                : null;
              const updateKey = `certificate-meta:${cert.id}`;
              const isUpdating = updatingCertificateKey === updateKey;

              return (
                <View key={cert.id} style={styles.documentCard}>
                  <View style={styles.documentContent}>
                    <View style={styles.documentHeading}>
                      <View style={styles.documentIcon}>
                        <Ionicons name="ribbon" size={24} color={palette.primary} />
                      </View>
                      <View style={styles.certificateHeaderRow}>
                        <Text style={styles.documentTitle}>{cert.name}</Text>
                        <View
                          style={[
                            styles.certificateVisibilityBadge,
                            cert.publicVisible
                              ? styles.certificateVisibilityBadgeActive
                              : styles.certificateVisibilityBadgePrivate,
                          ]}
                        >
                          <Ionicons
                            name={cert.publicVisible ? 'eye-outline' : 'lock-closed-outline'}
                            size={13}
                            color={cert.publicVisible ? palette.success : palette.textSecondary}
                          />
                          <Text
                            style={[
                              styles.certificateVisibilityBadgeText,
                              cert.publicVisible && styles.certificateVisibilityBadgeTextActive,
                            ]}
                          >
                            {cert.publicVisible ? 'Visible en perfil' : 'Privado'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.documentDetails}>
                      <Text style={styles.documentMeta}>{cert.issuer}</Text>
                      {cert.validUntil && (
                        <Text style={styles.documentMeta}>Válido hasta: {cert.validUntil}</Text>
                      )}
                      {formatDocumentDate(cert.documentUploadedAt) && (
                        <Text style={styles.documentMeta}>
                          Documento subido el {formatDocumentDate(cert.documentUploadedAt)}
                        </Text>
                      )}
                      {linkedEducation ? (
                        <Text style={styles.certificateAssociationText}>
                          Asociado a {getEducationOptionLabel(linkedEducation)}
                        </Text>
                      ) : null}
                      {renderCertificateEducationPicker(cert)}
                    </View>
                  </View>
                  <View style={styles.documentActions}>
                    <TouchableOpacity
                      style={[styles.documentAction, styles.certificateVisibilityAction]}
                      activeOpacity={0.7}
                      disabled={isUpdating}
                      accessibilityRole="switch" aria-checked={cert.publicVisible} accessibilityState={{ checked: cert.publicVisible, disabled: isUpdating }}
                      accessibilityLabel={'Mostrar el archivo ' + cert.name + ' en el perfil público'}
                      onPress={() => void handleUpdateCertificateMetadata(cert, {
                        publicVisible: !cert.publicVisible,
                      })}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color={palette.primary} />
                      ) : (
                        <Ionicons
                          name={cert.publicVisible ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={palette.primary}
                        />
                      )}
                      <Text style={styles.certificateVisibilityActionText}>
                        {cert.publicVisible ? 'Ocultar' : 'Mostrar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.documentAction}
                      activeOpacity={0.7}
                      accessibilityRole="button" accessibilityLabel={'Abrir certificado ' + cert.name}
                      onPress={() => void handleOpenCertificate(cert)}
                    >
                      {openingCredentialKey === `certificate:${cert.id}` ? (
                        <ActivityIndicator size="small" color={palette.primary} />
                      ) : (
                        <Ionicons name="open-outline" size={20} color={palette.primary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.documentAction}
                      activeOpacity={0.7}
                      accessibilityRole="button" accessibilityLabel={'Eliminar certificado ' + cert.name}
                      onPress={() => handleDeleteCertificate(cert.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={palette.warning} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ProfileEditorSection>
    </View>
  );

  // ============================================================================
  // RENDER: TAB 3 - TARIFAS Y PAGOS
  // ============================================================================

  const renderPricingTab = () => (
    <View style={styles.tabContent}>

      <ProfileEditorSection wide={isDesktop} title="Datos de facturación" icon="receipt-outline"
        notice={renderCompletionWarning(
            'PROFESSIONAL_BILLING',
            'Datos fiscales incompletos',
            'Completa el nombre fiscal, el NIF y la dirección fiscal desde Facturación.',
          )}>
        <View style={styles.formCard}>
          {isBillingConfigLoading ? (
            <View style={styles.billingLoadingRow}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.billingSummaryText}>Cargando configuración...</Text>
            </View>
          ) : !billingConfig ? (
            <View style={styles.detailGroup}><Text style={styles.bodyText}>No se pudo comprobar la configuración fiscal y bancaria.</Text>
              <Button style={styles.startButton} variant="outline" onPress={loadBillingConfig}>Reintentar</Button></View>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCopy}><Text style={styles.fieldLabel}>Datos fiscales</Text>
                  <Text style={styles.bodyText}>Identificación para emitir facturas completas.</Text></View>
                <Text style={[styles.statusLabel, { backgroundColor: billingFiscalReady ? theme.successBg : theme.warningBg }]}>{billingFiscalReady ? 'Completos' : 'Pendientes'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCopy}><Text style={styles.fieldLabel}>Cuenta bancaria</Text>
                  <Text style={styles.bodyText}>El IBAN se configura en Facturación.</Text></View>
                <Text style={[styles.statusLabel, { backgroundColor: billingBankReady ? theme.successBg : theme.warningBg }]}>{billingBankReady ? 'Configurada' : 'Pendiente'}</Text>
              </View>
            </>
          )}

          <Button
            variant="primary"
            size="medium"
            onPress={handleOpenBilling}
            style={styles.billingCta}
            icon={<Ionicons name="open-outline" size={18} color={palette.textOnCard} />}
            iconPosition="right"
          >
            Abrir Facturación
          </Button>
          <Text style={styles.helperText}>Gestiona allí tus datos fiscales, IBAN y numeración.</Text>
        </View>
      </ProfileEditorSection>
      <ProfileEditorSection wide={isDesktop} title="Servicios y bonos" icon="pricetags-outline"
        description="Gestiona los precios, modalidades y bonos que ofreces.">
        <Button style={styles.startButton} variant="outline" onPress={() => navigation.navigate('ProfessionalTariffs')}>Gestionar servicios y bonos</Button>
      </ProfileEditorSection>
    </View>
  );

  // ============================================================================
  // RENDER: TAB 4 - CUENTA Y SEGURIDAD
  // ============================================================================

  const renderGoogleTab = () => (
    <View style={styles.tabContent}>
      <GoogleCalendarCard plain videoSetup={profileData.offersOnline} hasUnsavedChanges={hasChanges} onBeforeConnect={() => handleSave(false)} />
    </View>
  );

  const renderAccountTab = () => (
    <View style={[styles.tabContent, styles.settingsContent]}>
      <View style={styles.accountGrid}>
        {/* Account Information */}
        <View style={styles.accountColumn}>
          <ProfileEditorSection wide={isDesktop} title="Acceso y contacto" icon="person-circle-outline">
            {renderFormField(
              'Email de acceso',
              profileData.email,
              () => {},
              {
                disabled: true,
                verified: profileData.emailVerified === true,
                helperText: 'El email no se puede modificar por seguridad',
                compactSpacing: true,
              }
            )}
            <View
              tabIndex={-1} collapsable={false}
        ref={(node) => { sectionRefs.current.phone = node; }}
              style={highlightedSection === 'phone' ? styles.targetHighlight : undefined}
            >
              {renderFormField(
                'Teléfono',
                profileData.phone,
                (text) => updateField('phone', text),
                {
                  placeholder: '600 123 456',
                  compactSpacing: true,
                  keyboardType: 'phone-pad',
                  recommended: needsContactPhone,
                  maxLength: 40,
                  helperText: `${PHONE_FORMAT_HELP}\n${PHONE_CONTACT_HELP} Revisa que esté actualizado.`,
                }
              )}
            </View>
          </ProfileEditorSection>
        </View>
        <View style={styles.settingsPanel}><ClinicalPinManager plain /></View>
      </View>
    </View>
  );

  const renderProfessionalTypeSelector = () => (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>Tipo profesional *</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Elegir tipo profesional"
        onPress={() => setMenu('type')} style={[styles.fieldInput, styles.selectField]}>
        <Text style={styles.bodyText}>{profileData.professionalType ? getProfessionalTypeLabel(profileData.professionalType) : 'Selecciona tu tipo profesional'}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.textPrimary} />
      </Pressable>
    </View>
  );

  // ============================================================================
  // RENDER: TAB 5 - PRIVACIDAD
  // ============================================================================

  const renderPrivacyTab = () => (
    <View style={styles.tabContent}>
      <ProfileEditorSection wide={isDesktop} title="Visibilidad del perfil" icon="eye-outline">
        <View style={styles.formCard}>
          <View accessibilityRole="radiogroup" style={styles.privacySection}>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                profileData.profileVisible && styles.visibilityOptionSelected,
              ]}
              accessibilityRole="radio" aria-checked={profileData.profileVisible} accessibilityState={{ checked: profileData.profileVisible }}
              onPress={() => updateField('profileVisible', true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.profileVisible ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={palette.primary}
              />
              <View style={styles.visibilityOptionCopy}>
                <Text style={styles.visibilityOptionTitle}>Aparecer en el directorio</Text>
                <Text style={styles.visibilityOptionText}>
                  Tu perfil aparecerá cuando cumplas los requisitos de publicación y guardes esta opción.
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                !profileData.profileVisible && styles.visibilityOptionSelected,
              ]}
              accessibilityRole="radio" aria-checked={!profileData.profileVisible} accessibilityState={{ checked: !profileData.profileVisible }}
              onPress={() => updateField('profileVisible', false)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={!profileData.profileVisible ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={palette.primary}
              />
              <View style={styles.visibilityOptionCopy}>
                <Text style={styles.visibilityOptionTitle}>Solo mediante enlace</Text>
                <Text style={styles.visibilityOptionText}>
                  Al guardar, dejarás de aparecer en el directorio. Con la cuenta activa y la verificación aprobada, tu perfil seguirá accesible para quien tenga tu enlace.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

        </View>
        <Button style={styles.startButton} variant="ghost" onPress={() => setMenu('requirements')}>Ver requisitos del directorio</Button>
      </ProfileEditorSection>
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const showIndex = isMobile && !detailOpen;
  const page = isLoading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={palette.primary} />
      <Text style={styles.loadingText}>Cargando perfil...</Text>
    </View>
  ) : (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      onLayout={event => setEditorWidth(event.nativeEvent.layout.width)}>
      {renderNavigation(showIndex)}
      {!isMobile && <TourTarget id="professional.profile.tabs" style={styles.desktopNav}>
        <View style={styles.navList}>{renderDestinations(false)}</View>
      </TourTarget>}
      <View ref={viewportRef} collapsable={false} style={styles.workspace}>
      <ScrollView
        ref={formScrollRef}
        style={styles.formArea}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        onScroll={(event) => {
          formScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.formContent}>
          {showIndex ? <TourTarget id="professional.profile.tabs">
            <View style={styles.index}>
              <Text accessibilityRole="header" style={[styles.pageTitle, { fontFamily: theme.fontDisplay }]}>Secciones del perfil</Text>
              <View style={styles.indexList}>{renderDestinations(true)}</View>
            </View>
          </TourTarget> : <View style={styles.intro}>
            <Text accessibilityRole="header" style={[styles.pageTitle, { fontFamily: theme.fontDisplay }]}>{title}</Text>
            {Boolean(intro) && <Text style={styles.introText}>{intro}</Text>}
          </View>}
          {loadError && <View style={styles.statusNote}><Text accessibilityRole="alert" style={styles.bodyText}>No se pudo cargar el perfil.</Text>
            <Button size="small" variant="outline" onPress={loadProfile}>Volver a cargar</Button></View>}
          {saveError && hasChanges && <Text accessibilityRole="alert" style={[styles.statusNote, styles.bodyText]}>
            No se han guardado los cambios. {saveError}
          </Text>}
          {saved && !hasChanges && <Text accessibilityLiveRegion="polite" style={styles.bodyText}>Cambios guardados</Text>}
          {!showIndex && loaded.current && <>
          {activeTab === 'mi-espacio' && renderMiEspacioTab()}
          {activeTab === 'information' && renderInformationTab()}
          {activeTab === 'credentials' && renderCredentialsTab()}
          {activeTab === 'pricing' && renderPricingTab()}
          {activeTab === 'privacy' && <>{renderPrivacyTab()}
            <ProfileEditorSection wide={isDesktop} title="Estadísticas de uso" icon="stats-chart-outline"><PrivacyPreferencesButton /></ProfileEditorSection></>}
          {activeTab === 'account' && renderAccountTab()}
          {activeTab === 'google' && renderGoogleTab()}
          </>}
        </View>
      </ScrollView>

      </View>
      {isMobile && (hasChanges || isSaving) && <View style={[styles.saveBar, { paddingBottom: Math.max(8, insets?.bottom ?? 0) }]}>
        <Text accessibilityLiveRegion="polite" style={styles.bodyText}>{isSaving ? 'Guardando cambios…' : 'Cambios sin guardar'}</Text>
        <TourTarget id="professional.profile.save">{saveAction}</TourTarget>
      </View>}
      {menu && <ProfileEditorSheet title={menu === 'type' ? 'Tipo profesional' : 'Requisitos del directorio'} onClose={() => setMenu(null)}>
        {menu === 'type' && <>
          <Text style={styles.bodyText}>Selecciona el tipo que corresponda a tu formación y habilitación. Los pacientes lo verán en tu perfil y podrán usarlo para filtrar.</Text>
          {PROFESSIONAL_TYPE_OPTIONS.map(option => <ProfileEditorItem key={option.id} label={option.label} icon={option.icon} selected={profileData.professionalType === option.id}
            onPress={() => { updateField('professionalType', option.id); setMenu(null); }} />)}
        </>}
        {menu === 'requirements' && renderDirectoryStatus(true)}
      </ProfileEditorSheet>}
      {isCertificateModalVisible && <ProfileEditorSheet title="Añadir certificado" onClose={closeCertificateModal}>
        <Text style={styles.bodyText}>Por defecto se guarda privado. Si activas la visibilidad, los pacientes podrán abrir el documento aportado en tu perfil público.</Text>
            <View style={styles.documentModalFields}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nombre del certificado</Text>
                <TextInput
                  accessibilityLabel="Nombre del certificado"
                  value={certificateDraft.name}
                  onChangeText={(text) => setCertificateDraft(prev => ({ ...prev, name: text }))}
                  placeholder="Ej: EMDR Nivel I"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.fieldInput, focusedField === 'certificate-name' && styles.fieldInputFocused]}
                  onFocus={() => setFocusedField('certificate-name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Entidad emisora</Text>
                <TextInput
                  accessibilityLabel="Entidad emisora"
                  value={certificateDraft.issuer}
                  onChangeText={(text) => setCertificateDraft(prev => ({ ...prev, issuer: text }))}
                  placeholder="Ej: Asociación EMDR España"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.fieldInput, focusedField === 'certificate-issuer' && styles.fieldInputFocused]}
                  onFocus={() => setFocusedField('certificate-issuer')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Válido hasta<OptionalFieldSuffix /></Text>
                <TextInput
                  accessibilityLabel="Válido hasta"
                  value={certificateDraft.validUntil}
                  onChangeText={(text) => setCertificateDraft(prev => ({ ...prev, validUntil: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.fieldInput, focusedField === 'certificate-validUntil' && styles.fieldInputFocused]}
                  onFocus={() => setFocusedField('certificate-validUntil')}
                  onBlur={() => setFocusedField(null)}
                />
                <Text style={styles.fieldHint}>
                  Al continuar te pediremos el PDF o la imagen del certificado.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.certificatePublicToggle,
                  certificateDraft.publicVisible && styles.certificatePublicToggleActive,
                ]}
                activeOpacity={0.78}
                accessibilityRole="checkbox" accessibilityState={{ checked: certificateDraft.publicVisible }}
                onPress={() => setCertificateDraft(prev => ({
                  ...prev,
                  publicVisible: !prev.publicVisible,
                }))}
              >
                <Ionicons
                  name={certificateDraft.publicVisible ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={certificateDraft.publicVisible ? palette.primary : palette.textMuted}
                />
                <View style={styles.certificatePublicToggleCopy}>
                  <Text style={styles.certificatePublicToggleTitle}>Visible en perfil público</Text>
                  <Text style={styles.certificatePublicToggleText}>
                    Los pacientes podrán ver el archivo desde tu perfil. Actívalo sólo si el documento no contiene datos sensibles.
                  </Text>
                </View>
              </TouchableOpacity>

              {savedEducation.length ? (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Asociar a formación</Text>
                  <View style={styles.certificateAssociationChips}>
                    {[{ id: null, label: 'Sin asociar' }, ...savedEducation.map((education) => ({
                      id: education.id,
                      label: getEducationOptionLabel(education),
                    }))].map((option) => {
                      const selected = certificateDraft.educationId === option.id;

                      return (
                        <TouchableOpacity
                          key={option.id ?? 'none'}
                          style={[
                            styles.certificateAssociationChip,
                            selected && styles.certificateAssociationChipSelected,
                          ]}
                          activeOpacity={0.75}
                          accessibilityRole="button" accessibilityState={{ selected }}
                          onPress={() => setCertificateDraft(prev => ({
                            ...prev,
                            educationId: option.id,
                          }))}
                        >
                          {selected ? (
                            <Ionicons name="checkmark" size={13} color={palette.textOnCard} />
                          ) : null}
                          <Text
                            style={[
                              styles.certificateAssociationChipText,
                              selected && styles.certificateAssociationChipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.fieldHint}>
                    Si lo asocias, el certificado aparecerá debajo de esa formación en el perfil.
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.shareModalActions}>
              <Button
                variant="outline"
                size="medium"
                onPress={closeCertificateModal}
                fullWidth={isMobile}
                style={styles.shareModalSecondaryAction}
                textStyle={styles.shareModalSecondaryActionText}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="medium"
                onPress={() => void handleCreateCertificate()}
                loading={isUploadingCertificate}
                fullWidth={isMobile}
                style={styles.shareModalPrimaryAction}
                icon={<Ionicons name="cloud-upload-outline" size={16} color={palette.textOnCard} />}
              >
                Elegir archivo y subir
              </Button>
            </View>
      </ProfileEditorSheet>}
      {isShareModalVisible && <ProfileEditorSheet title="Tu enlace público" onClose={closeShareModal}>
        <Text style={styles.bodyText}>Personaliza la dirección de tu perfil y cópiala para compartirla con tus pacientes.</Text>
            <PublicProfileSlugEditor
              initialSlug={savedPublicSlug}
              initialRemainingChanges={publicSlugChangesRemaining}
              variant="dialog"
              onSaved={(publicSlug, remainingChanges) => {
                setSavedPublicSlug(publicSlug);
                setPublicSlugChangesRemaining(remainingChanges);
                setHasCopiedShareUrl(false);
              }}
            />

            {hasCopiedShareUrl ? (
              <View style={styles.shareCopiedBanner}>
                <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                <Text style={styles.shareCopiedBannerText}>Enlace copiado al portapapeles</Text>
              </View>
            ) : null}

            <View style={styles.shareModalActions}>
              <Button
                variant="primary"
                size="medium"
                onPress={handleCopyShareUrl}
                fullWidth={isMobile}
                style={styles.shareModalPrimaryAction}
                icon={<Ionicons name={hasCopiedShareUrl ? 'checkmark' : 'copy-outline'} size={16} color={palette.textOnCard} />}
              >
                {hasCopiedShareUrl ? 'Copiado' : 'Copiar enlace'}
              </Button>

              {Platform.OS !== 'web' ? (
                <Button
                  variant="outline"
                  size="medium"
                  onPress={handleNativeShareSheet}
                  fullWidth={isMobile}
                  style={styles.shareModalSecondaryAction}
                  textStyle={styles.shareModalSecondaryActionText}
                  icon={<Ionicons name="share-social-outline" size={16} color={palette.primary} />}
                >
                  Compartir...
                </Button>
              ) : null}
            </View>
      </ProfileEditorSheet>}
    </KeyboardAvoidingView>
  );
  return <ProfileEditorPages onPageChange={onPageChange}>{page}</ProfileEditorPages>;
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(
  palette: ProfilePalette,
  isDesktop: boolean,
  isMobile: boolean,
) {
  return StyleSheet.create({
  editorBar: { flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 8, paddingHorizontal: isDesktop ? 24 : 16, paddingVertical: isDesktop ? 16 : 6, borderBottomWidth: isDesktop ? 0 : 1, borderColor: palette.border, backgroundColor: palette.background },
  barLead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  barActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  workspace: { flex: 1, minHeight: 0, flexDirection: 'row' },
  desktopNav: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: palette.background },
  navList: { flexDirection: 'row', borderWidth: 1, borderColor: palette.border, borderRadius: 10, overflow: 'hidden' },
  navTab: { flex: 1, flexDirection: 'row', minHeight: 46, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 5 },
  informationNavTab: { flex: 1.55 },
  navSelected: { backgroundColor: palette.primaryAlpha12 },
  navLabel: { flexShrink: 1, textAlign: 'center', fontFamily: palette.fontSansMedium, fontSize: 14, color: palette.textPrimary },
  navLabelSelected: { fontFamily: palette.fontSansBold },
  index: { gap: 16 },
  indexList: { borderWidth: 1, borderColor: palette.border, borderRadius: 14, overflow: 'hidden', backgroundColor: palette.cardBg },
  indexRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  indexIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.backgroundMuted },
  indexLabel: { flex: 1, textAlign: 'left', fontFamily: palette.fontSansSemiBold, fontSize: 16 },
  intro: { marginBottom: 16, gap: 3 },
  introText: { color: palette.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: palette.fontSans },
  pageTitle: { fontSize: isDesktop ? 30 : 26, lineHeight: isDesktop ? 38 : 33, color: palette.textPrimary },
  bodyText: { fontFamily: palette.fontSans, color: palette.textPrimary, fontSize: 15, lineHeight: 22, flexShrink: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: palette.border },
  summaryCopy: { flex: 1, gap: 6 },
  statusLabel: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 5, fontFamily: palette.fontSansBold, fontSize: 13, color: palette.textPrimary },
  startButton: { alignSelf: 'flex-start', marginVertical: 4 },
  detailGroup: { gap: 10 },
  selectField: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  inlineActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginVertical: 8 },
  statusNote: { padding: 14, borderRadius: 8, marginBottom: 12, backgroundColor: palette.warningLight },
  saveBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderColor: palette.border, backgroundColor: palette.cardBg },
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
  },

  // ===== TAB NAVIGATION =====
  topBarTitle: {
    fontSize: isDesktop ? 30 : 22,
    lineHeight: isDesktop ? 38 : 29,
    flexShrink: 1,
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  visibilityBadgePublic: {
    backgroundColor: palette.successLight,
    borderColor: palette.success,
  },
  visibilityBadgePrivate: {
    backgroundColor: palette.primaryAlpha12,
    borderColor: palette.primaryMuted,
  },
  visibilityBadgePending: {
    backgroundColor: palette.warningLight,
    borderColor: palette.warningAmber,
  },
  visibilityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: palette.fontSansBold,
  },
  visibilityBadgeTextPublic: {
    color: palette.success,
  },
  visibilityBadgeTextPrivate: {
    color: palette.primary,
  },
  visibilityBadgeTextPending: {
    color: palette.warningAmber,
  },
  shareCopiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: palette.successLight,
    borderWidth: 1,
    borderColor: palette.success,
  },
  shareCopiedBannerText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.success,
  },
  shareModalActions: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: spacing.sm,
  },
  documentModalFields: {
    gap: spacing.md,
  },
  shareModalPrimaryAction: {
    flex: isMobile ? undefined : 1,
  },
  shareModalSecondaryAction: {
    flex: isMobile ? undefined : 1,
  },
  shareModalSecondaryActionText: {
    color: palette.primary,
  },

  // ===== MAIN LAYOUT =====
  formArea: { flex: 1, minWidth: 0 },
  formContent: { width: '100%', maxWidth: layout.profileMaxWidth, alignSelf: 'center', paddingHorizontal: isDesktop ? 20 : 14, paddingTop: isDesktop ? 10 : 16, paddingBottom: 48 },

  // ===== TAB CONTENT =====
  tabContent: {
    gap: 12,
  },
  informationCard: { padding: 0 },
  identityGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  identityField: { flexGrow: 1, flexBasis: isDesktop ? '30%' : isMobile ? '100%' : '46%', minWidth: 0 },
  photoPanel: { padding: 10, borderRadius: 9, backgroundColor: palette.backgroundMuted },
  identityFields: { minWidth: 0, width: '100%' },
  descriptionSection: { width: '100%' },
  modalitySection: { width: '100%' },
  splitEqualCard: { width: '100%' },
  descriptionPane: {
    width: '100%',
  },
  locationCard: {
    marginTop: 0,
  },
  locationLayout: { gap: 16 },
  locationFieldsPane: { width: '100%' },
  locationMapPane: { width: '100%' },
  informationLowerGrid: { gap: 12 },
  informationHalfSection: { width: '100%' },
  informationFullSection: {
    width: '100%',
    marginBottom: 0,
  },

  // ===== SECTIONS =====
  settingsContent: { width: '100%', maxWidth: 1120, alignSelf: 'flex-start' },
  settingsPanel: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.cardBg, borderRadius: 14, padding: 18 },
  accountGrid: { gap: 12 },
  accountColumn: { minWidth: 0 },
  section: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: palette.border },
  targetHighlight: {
    backgroundColor: palette.primaryAlpha12,
    borderColor: palette.primary,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: 3,
  },
  completionInfoButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headingLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completionHeading: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  inlineSectionTitle: { marginBottom: 0 },
  sectionHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { flexShrink: 1, fontSize: 21, lineHeight: 28, fontFamily: palette.fontHeading, color: palette.textPrimary, marginBottom: 14 },

  // ===== FORM CARD =====
  formCard: { gap: 8 },

  // ===== FORM FIELDS =====
  formField: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  alignedVerificationLabel: { minHeight: 20 },
  fieldLabel: { fontSize: 15, fontFamily: palette.fontSansSemiBold, color: palette.textPrimary },
  fieldHint: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: palette.fontSans,
    color: palette.textMuted,
  },
  required: {
    color: palette.warning,
  },
  fieldInput: {
    backgroundColor: palette.inputBackground,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    fontFamily: palette.fontSans,
    color: palette.textPrimary,
    minHeight: 48,
  },
  fieldInputFocused: {
    borderColor: palette.inputFocus,
    shadowColor: palette.inputFocus,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    ...(Platform.OS === 'web' ? { outlineColor: palette.primaryAlpha12, outlineWidth: 3, outlineStyle: 'solid' as const } : {}),
  },
  fieldInputDisabled: {
    backgroundColor: palette.cardBackgroundDisabled,
    color: palette.textSecondary,
  },
  fieldInputMultiline: {
    paddingTop: spacing.sm + 4,
    textAlignVertical: 'top',
  },
  fieldFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  helperText: { fontSize: 13, lineHeight: 18, flexShrink: 1, fontFamily: palette.fontSans, color: palette.textSecondary },
  characterCount: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    color: palette.textMuted,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
  },
  verifiedBadgeSuccess: {
    backgroundColor: 'rgba(123, 163, 119, 0.15)',
  },
  verifiedBadgePending: {
    backgroundColor: 'rgba(217, 168, 79, 0.15)',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
  },
  verifiedTextSuccess: {
    color: palette.success,
  },
  verifiedTextPending: {
    color: palette.warningAmber,
  },

  // ===== CHIP SELECTOR =====
  chipDisabled: {
    opacity: 0.5,
  },
  chipTextDisabled: {
    color: palette.textMuted,
  },

  // ===== PHOTO SECTION =====
  photoSection: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  avatarContainer: { width: isMobile ? 40 : 50, height: isMobile ? 40 : 50 },
  avatarLarge: { width: '100%', height: '100%', borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { fontFamily: palette.fontSansBold, color: palette.textOnPrimary, fontSize: isMobile ? 17 : 21 },
  avatarUploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.overlay,
    borderRadius: isDesktop ? 48 : 60,
  },
  photoActions: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, flexShrink: 1 },
  photoButton: { minHeight: 42 },
  photoButtonDanger: {
    borderWidth: 0,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.primary,
  },
  photoButtonTextDanger: {
    color: palette.warning,
  },

  // ===== EMPTY STATE =====
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: palette.cardBg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateDescription: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ===== ADD BUTTON =====
  addButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.primary,
  },

  // ===== ITEMS LIST (Education/Experience) =====
  itemsList: {
    gap: spacing.md,
  },
  trajectoryFields: { flexDirection: isMobile ? 'column' : 'row', gap: 12 },
  trajectoryEmpty: { fontSize: 14, lineHeight: 20, color: palette.textSecondary, fontFamily: palette.fontSans, paddingBottom: 8 },
  currentToggle: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, minHeight: 44 },

  // ===== VERIFICATION =====

  // ===== VERIFICATION CARD =====

  // ===== DOCUMENT CARD =====
  documentCard: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'flex-start',
    gap: spacing.md,
    padding: isMobile ? spacing.sm : spacing.md,
    backgroundColor: palette.background,
    borderRadius: borderRadius.md,
  },
  documentHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: isMobile ? spacing.sm : spacing.md,
  },
  documentIcon: {
    width: isMobile ? 36 : 44,
    height: isMobile ? 36 : 44,
    borderRadius: 22,
    backgroundColor: palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentContent: {
    flex: isMobile ? undefined : 1,
    minWidth: 0,
  },
  documentDetails: {
    paddingLeft: isMobile ? 0 : 44 + spacing.md,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  documentTitle: {
    maxWidth: '100%',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textPrimary,
  },
  documentMeta: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
  },
  insuranceStatusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  insuranceStatusCardSuccess: {
    backgroundColor: palette.successLight,
    borderColor: palette.success,
  },
  insuranceStatusCardInfo: {
    backgroundColor: palette.primaryAlpha12,
    borderColor: palette.info,
  },
  insuranceStatusCardWarning: {
    backgroundColor: palette.warningLight,
    borderColor: palette.warningAmber,
  },
  insuranceStatusCopy: {
    flex: 1,
    gap: 4,
  },
  insuranceStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  insuranceStatusText: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    lineHeight: 20,
    color: palette.textSecondary,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: isMobile ? 'flex-start' : 'flex-end',
    gap: spacing.sm,
  },
  documentAction: {
    padding: spacing.sm,
    minHeight: isMobile ? 44 : undefined,
    minWidth: isMobile ? 44 : undefined,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certificateHeaderRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'flex-start',
    flexWrap: isMobile ? 'nowrap' : 'wrap',
    gap: isMobile ? spacing.xs : spacing.sm,
    marginBottom: 3,
  },
  certificateVisibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  certificateVisibilityBadgeActive: {
    borderColor: palette.success,
    backgroundColor: palette.successLight,
  },
  certificateVisibilityBadgePrivate: {
    borderColor: palette.border,
    backgroundColor: palette.backgroundMuted,
  },
  certificateVisibilityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: palette.fontSansBold,
    color: palette.textSecondary,
  },
  certificateVisibilityBadgeTextActive: {
    color: palette.success,
  },
  certificateAssociationText: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    color: palette.primary,
    marginTop: spacing.xs,
  },
  certificateAssociationBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  certificateAssociationLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: palette.fontSansBold,
    color: palette.textSecondary,
  },
  certificateAssociationHint: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    lineHeight: 18,
    color: palette.textMuted,
    marginTop: spacing.sm,
  },
  certificateAssociationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  certificateAssociationChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.cardBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  certificateAssociationChipSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  certificateAssociationChipText: {
    flexShrink: 1,
    maxWidth: isMobile ? undefined : 220,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
  },
  certificateAssociationChipTextSelected: {
    color: palette.textOnCard,
  },
  certificateVisibilityAction: {
    minHeight: isMobile ? 44 : 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.cardBg,
  },
  certificateVisibilityActionText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: palette.fontSansBold,
    color: palette.primary,
  },
  certificatePublicToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.cardBg,
    padding: spacing.md,
  },
  certificatePublicToggleActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryAlpha12,
  },
  certificatePublicToggleCopy: {
    flex: 1,
    gap: 3,
  },
  certificatePublicToggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  certificatePublicToggleText: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    lineHeight: 18,
    color: palette.textSecondary,
  },

  // ===== UPLOAD AREA =====

  // ===== PRICING =====
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
    paddingBottom: spacing.md + 4,
  },
  toggleRow: {
    marginBottom: spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: palette.fontSans,
    color: palette.textPrimary,
  },
  taxSection: {
    marginBottom: spacing.md,
  },
  taxLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
    marginBottom: spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  radioText: {
    fontSize: 15,
    fontFamily: palette.fontSans,
    color: palette.textPrimary,
  },
  billingSummaryText: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    lineHeight: 21,
    color: palette.textSecondary,
  },
  billingLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  billingMetricsGrid: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  billingMetricCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.backgroundMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  billingMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textMuted,
    textTransform: 'uppercase',
  },
  billingMetricValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  billingMetricHint: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    lineHeight: 18,
    color: palette.textSecondary,
  },
  billingCta: { alignSelf: 'flex-start', marginTop: 10 },

  // ===== ACCOUNT =====
  accountActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  accountAction: {
    paddingVertical: spacing.sm,
  },
  accountActionText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.primary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    marginBottom: spacing.lg,
  },
  passwordInfo: {},
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  passwordValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textPrimary,
    marginBottom: spacing.xs,
  },
  passwordMeta: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    color: palette.textMuted,
  },
  changePasswordButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: palette.border,
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  securityLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textPrimary,
  },
  securityStatus: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
  },
  securityButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: palette.primary,
  },
  securityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textOnCard,
  },

  privacySection: {
    marginBottom: spacing.md,
  },
  visibilitySummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  visibilitySummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryAlpha12,
  },
  visibilitySummaryCopy: {
    flex: 1,
    gap: 4,
  },
  visibilitySummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  visibilitySummaryText: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    lineHeight: 20,
    color: palette.textSecondary,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.sm,
    backgroundColor: palette.cardBg,
  },
  visibilityOptionSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryAlpha12,
  },
  visibilityOptionCopy: {
    flex: 1,
    gap: 3,
  },
  visibilityOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  visibilityOptionText: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    lineHeight: 19,
    color: palette.textSecondary,
  },
  accountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  accountLinkDanger: {
    borderBottomWidth: 0,
  },
  accountLinkText: {
    fontSize: 15,
    fontFamily: palette.fontSans,
    color: palette.textPrimary,
  },
  accountLinkTextDanger: {
    color: palette.warning,
  },
  accountWarning: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    color: palette.textMuted,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },

  // ===== LOCATION & MODALITY =====
  modalityOptions: { gap: 8 },
  modalityOption: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 12, gap: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 8 },
  modalityOptionSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryMuted,
  },
  modalityText: {
    flex: 1,
    fontSize: 15,
    color: palette.textPrimary,
    fontWeight: '500',
    fontFamily: palette.fontSansSemiBold,
  },
  presentialStatusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  presentialStatusCardSuccess: {
    backgroundColor: palette.successLight,
    borderColor: palette.success,
  },
  presentialStatusCardInfo: {
    backgroundColor: palette.primaryAlpha12,
    borderColor: palette.info,
  },
  presentialStatusCardWarning: {
    backgroundColor: palette.warningLight,
    borderColor: palette.warningAmber,
  },
  presentialStatusCopy: {
    flex: 1,
    gap: 4,
  },
  presentialStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  presentialStatusText: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    lineHeight: 20,
    color: palette.textSecondary,
  },
  formRow: { flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 0 : 18 },
  formFieldHalf: {
    flex: isMobile ? undefined : 1,
    width: isMobile ? '100%' : undefined,
  },
  fieldHelper: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    color: palette.textMuted,
    marginBottom: spacing.sm,
  },

  // ===== PROFESSIONAL VERIFICATION STATUS BANNER =====

  });
}

// ============================================================================
// MI ESPACIO STYLES
// ============================================================================

function createMiEspacioStyles(palette: ProfilePalette) {
  return StyleSheet.create({
    subtitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    marginBottom: spacing.md,
    },

  // Profile color grid
    colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    },
    colorCard: {
    borderWidth: 0.5,
    borderColor: palette.border,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    alignItems: 'center',
    minHeight: 44,
    },
    colorCardSelected: {
    borderWidth: 2,
    borderColor: palette.primary,
    },
    colorPreview: {
    width: '100%',
    height: 70,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    },
    colorCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    },
    colorName: {
    fontSize: typography.fontSizes.xs,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    },
    colorNameSelected: {
    color: palette.primary,
    fontWeight: typography.fontWeights.semibold,
    },

  // Gallery
    galleryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    },
    galleryPhotoContainer: {
    position: 'relative',
    },
    galleryPhoto: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    },
    galleryDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.warning,
    justifyContent: 'center',
    alignItems: 'center',
    },
    galleryDeleteText: {
    color: palette.textOnCard,
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    fontFamily: palette.fontSansBold,
    lineHeight: 14,
    },
    galleryAddBtn: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: palette.border,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
    },

  // Video preview
    videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.backgroundMuted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    },
    videoPlayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    },
    videoUrl: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    },
  });
}

export default SpecialistProfileScreen;
