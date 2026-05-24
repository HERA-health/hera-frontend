/**
 * SpecialistProfileScreen - Professional Profile Management
 *
 * A comprehensive professional identity management system for psychologists on HERA.
 * Designed to feel like LinkedIn meets Stripe Dashboard - professional, trustworthy,
 * and easy to maintain.
 *
 * Four Essential Tabs:
 * 1. Información Profesional - Public profile info (what clients see)
 * 2. Credenciales y Verificación - Verification status and trust badges
 * 3. Tarifas y Pagos - Pricing and payment configuration
 * 4. Cuenta y Seguridad - Account settings and security
 *
 * Features:
 * - Two-column layout: Form (60%) + Live Preview (40%)
 * - Real-time preview updates as specialist types
 * - Verification badges and progress indicators
 * - Professional-grade form design
 * - Responsive for all devices
 */

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
  Modal,
  Pressable,
  Image,
  Share,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { shadows, spacing, borderRadius, typography, layout } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import * as professionalService from '../../services/professionalService';
import * as authService from '../../services/authService';
import { billingService, type FullBillingConfig, type TariffItem } from '../../services/billingService';
import {
  SpecialistCertificate as ServiceCertificate,
  SpecialistProfileData as ServiceProfileData,
  VerificationStatus,
  VerificationStatusResponse,
} from '../../services/professionalService';
import { AddressAutocomplete, LocationMapPreview } from '../../components/location';
import type { AppNavigationProp } from '../../constants/types';
import { getWebAppUrl } from '../../config/api';
import { AnimatedPressable, Button } from '../../components/common';
import { TourTarget } from '../../components/onboarding/TourTarget';
import {
  useProfessionalTourAutoStart,
  useProfessionalTourStepPreparation,
} from '../../components/onboarding/professionalTourContext';
import type { UploadAsset } from '../../utils/multipartUpload';
import {
  getProfessionalTypeLabel,
  PROFESSIONAL_TYPE_OPTIONS,
  type ProfessionalType,
} from '../../constants/professionalTypes';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ProfileTab = 'mi-espacio' | 'information' | 'credentials' | 'pricing' | 'privacy' | 'account';

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
  // Basic Info
  fullName: string;
  professionalTitle: string;
  professionalType: ProfessionalType | null;
  bio: string;
  avatar: string | null;

  // Professional Details
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
  yearsInPractice: number;
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

const SPECIALTIES = [
  { value: 'anxiety', label: 'Ansiedad y estrés' },
  { value: 'depression', label: 'Depresión' },
  { value: 'couples', label: 'Terapia de pareja' },
  { value: 'trauma', label: 'Trauma (EMDR)' },
  { value: 'self-esteem', label: 'Autoestima' },
  { value: 'grief', label: 'Duelo' },
  { value: 'addiction', label: 'Adicciones' },
  { value: 'eating', label: 'Trastornos alimentarios' },
  { value: 'sleep', label: 'Problemas de sueño' },
  { value: 'phobias', label: 'Fobias' },
];

const THERAPEUTIC_APPROACHES = [
  { value: 'cbt', label: 'Cognitivo-Conductual (TCC)' },
  { value: 'act', label: 'Terapia de Aceptación y Compromiso' },
  { value: 'emdr', label: 'EMDR' },
  { value: 'psychodynamic', label: 'Psicodinámico' },
  { value: 'humanistic', label: 'Humanista' },
  { value: 'systemic', label: 'Sistémico' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'gestalt', label: 'Gestalt' },
];

const LANGUAGES = [
  { value: 'spanish', label: 'Español' },
  { value: 'english', label: 'Inglés' },
  { value: 'catalan', label: 'Catalán' },
  { value: 'french', label: 'Francés' },
  { value: 'german', label: 'Alemán' },
  { value: 'portuguese', label: 'Portugués' },
];

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

function createProfilePalette(theme: Theme, isDark: boolean): ProfilePalette {
  return {
    background: theme.bg,
    backgroundMuted: theme.bgMuted,
    border: theme.border,
    cardBackground: theme.surfaceMuted,
    cardBackgroundDisabled: isDark ? theme.surfaceMuted : theme.borderLight,
    cardBg: theme.bgCard,
    info: theme.info,
    overlay: theme.overlay,
    primary: theme.primary,
    primaryAlpha12: theme.primaryAlpha12,
    primaryDark: theme.primaryDark,
    primaryMuted: theme.primaryMuted,
    success: theme.success,
    successLight: theme.successLight,
    warning: theme.warning,
    warningAmber: theme.warningAmber,
    warningLight: theme.warningBg,
    textMuted: theme.textMuted,
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
  avatar: profile.avatar || null,
  specialties: profile.specialties || [],
  therapeuticApproaches: profile.therapeuticApproaches || [],
  languages: profile.languages || ['spanish'],
  education: (profile.education as Education[]) || [],
  experience: (profile.experience as Experience[]) || [],
  identityVerified: profile.identityVerified || false,
  insuranceUploaded: profile.insuranceUploaded || false,
  insuranceReviewStatus: profile.insuranceReviewStatus || 'NOT_UPLOADED',
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
  yearsInPractice: profile.yearsInPractice ?? 0,
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
        title: 'Póliza aprobada',
        description: reviewedOn
          ? `Tu cobertura presencial está aprobada desde el ${reviewedOn}. Los pacientes ya pueden ver tu ubicación si tienes activado presencial.`
          : 'Tu cobertura presencial está aprobada. Los pacientes ya pueden ver tu ubicación si tienes activado presencial.',
      };
    case 'REJECTED':
      return {
        icon: 'close-circle',
        tone: 'warning',
        title: 'Póliza rechazada',
        description: rejectionReason
          ? `Hemos rechazado la póliza. Motivo: ${rejectionReason}. Mientras no la revisemos de nuevo, los pacientes no verán tu ubicación.`
          : 'Hemos rechazado la póliza. Mientras no la revisemos de nuevo, los pacientes no verán tu ubicación.',
      };
    case 'PENDING':
      return {
        icon: 'time-outline',
        tone: 'info',
        title: 'Póliza en revisión',
        description: 'Ya has subido la póliza. Hasta que la aprobemos, los pacientes no podrán ver tu ubicación ni reservar presencial.',
      };
    case 'NOT_UPLOADED':
    default:
      return {
        icon: 'alert-circle',
        tone: 'warning',
        title: 'Póliza pendiente',
        description: 'Sube tu póliza para que podamos revisar la cobertura presencial. Sin ella no mostraremos la ubicación a los pacientes.',
      };
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SpecialistProfileScreen() {
  const { user, updateUser } = useAuth();
  const appAlert = useAppAlert();
  const { isVisible: isAppAlertVisible } = useAppAlertState();
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isMobile = windowWidth < 768;
  const palette = useMemo(() => createProfilePalette(theme, isDark), [theme, isDark]);

  const [activeTab, setActiveTab] = useState<ProfileTab>('information');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(!isMobile);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const styles = useMemo(() => createStyles(palette, isDesktop, isMobile, showPreview), [palette, isDesktop, isMobile, showPreview]);
  const miEspacioStyles = useMemo(() => createMiEspacioStyles(palette), [palette]);
  const formScrollRef = useRef<ScrollView | null>(null);

  // Navigation
  const navigation = useNavigation<AppNavigationProp>();

  // Share profile state
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [hasCopiedShareUrl, setHasCopiedShareUrl] = useState(false);
  const [isCertificateModalVisible, setIsCertificateModalVisible] = useState(false);
  const [certificateDraft, setCertificateDraft] = useState<CertificateDraft>({
    name: '',
    issuer: '',
    validUntil: '',
  });
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false);
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false);
  const [openingCredentialKey, setOpeningCredentialKey] = useState<string | null>(null);

  useProfessionalTourAutoStart(
    'professional_profile_v1',
    !isLoading
      && !loadError
      && !isShareModalVisible
      && !isCertificateModalVisible
      && !(isMobile && showPreview)
      && !isUploadingAvatar
      && !isUploadingGalleryPhoto
      && !isUploadingInsurance
      && !isUploadingCertificate
      && openingCredentialKey === null
      && !isAppAlertVisible,
  );

  const prepareProfileTopStep = useCallback(() => {
    formScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const prepareProfilePreviewStep = useCallback(() => {
    if (isDesktop && !showPreview) {
      setShowPreview(true);
    }
  }, [isDesktop, showPreview]);

  useProfessionalTourStepPreparation('professional.profile.tabs', prepareProfileTopStep);
  useProfessionalTourStepPreparation('professional.profile.preview', prepareProfilePreviewStep);
  useProfessionalTourStepPreparation('professional.profile.save', prepareProfileTopStep);

  // Verification status state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse>({
    verificationStatus: 'NOT_SUBMITTED',
  });

  // Read-only stats from API (not editable)
  const [specialistStats, setSpecialistStats] = useState({ rating: 0, reviewCount: 0 });
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
    specialties: [],
    therapeuticApproaches: [],
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
    yearsInPractice: 0,
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
    if (!specialistId) {
      return '';
    }

    return `${getWebAppUrl()}/e/${specialistId}`;
  }, [specialistId]);
  const isProfessionalVerified = verificationStatus.verificationStatus === 'VERIFIED';
  const canOpenPublicProfile =
    isProfessionalVerified && Boolean(specialistId);

  const activeBillingTariffs = useMemo<TariffItem[]>(
    () => billingConfig?.tariffs?.filter((tariff) => tariff.isActive) ?? [],
    [billingConfig]
  );

  const defaultBillingTariff = useMemo<TariffItem | null>(
    () =>
      activeBillingTariffs.find((tariff) => tariff.isDefault)
      ?? activeBillingTariffs[0]
      ?? null,
    [activeBillingTariffs]
  );

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
  const parsedProfilePrice = Number(profileData.priceStandard);
  const publicSessionPrice =
    billingConfig?.pricePerSession ?? (Number.isFinite(parsedProfilePrice) ? parsedProfilePrice : null);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(profileData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [profileData, originalData]);

  // Load profile data on mount and on every screen focus
  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(false);
      const profile = await professionalService.getComprehensiveProfile();
      if (profile) {
        const mappedData = {
          ...mapServiceProfileToFormData(profile),
          avatar: profile.avatar ?? user?.avatar ?? null,
        };

        setProfileData(mappedData);
        setOriginalData(mappedData);
        setSpecialistStats({
          rating: profile.rating ?? 0,
          reviewCount: profile.reviewCount ?? 0,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoadError(true);
      // Keep default values on error
    } finally {
      setIsLoading(false);
    }
  }, [user?.avatar]);

  const loadBillingConfig = useCallback(async () => {
    try {
      setIsBillingConfigLoading(true);
      const config = await billingService.getConfig();
      setBillingConfig(config);
    } catch (error) {
      console.error('Error loading billing config:', error);
      setBillingConfig(null);
    } finally {
      setIsBillingConfigLoading(false);
    }
  }, []);

  // Reload both profile data and verification status on every screen focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadBillingConfig();
      const loadVerificationStatus = async () => {
        try {
          const status = await professionalService.getVerificationStatus();
          setVerificationStatus(status);
        } catch (error) {
          console.error('Error loading verification status:', error);
        }
      };
      loadVerificationStatus();

      // Load specialist ID for share link
      const loadSpecialistId = async () => {
        try {
          const profile = await professionalService.getProfessionalProfile();
          if (profile?.id) {
            setSpecialistId(profile.id);
          }
        } catch (error) {
          console.error('Error loading specialist ID:', error);
        }
      };
      loadSpecialistId();
    }, [loadBillingConfig, loadProfile])
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateField = useCallback(<K extends keyof SpecialistProfileData>(
    field: K,
    value: SpecialistProfileData[K]
  ) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  }, []);

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

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    if (profileData.offersInPerson && !profileData.insuranceUploaded) {
      showAppAlert(appAlert, 
        'Falta la póliza',
        'Para activar las sesiones presenciales necesitamos una póliza de responsabilidad civil subida y guardada en HERA.'
      );
      return;
    }

    if (!profileData.professionalType) {
      showAppAlert(
        appAlert,
        'Falta el tipo profesional',
        'Selecciona tu tipo profesional regulado para guardar el perfil.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const updateData: Partial<ServiceProfileData> = {
      };
      const hasFieldChanged = <K extends keyof SpecialistProfileData>(field: K) =>
        JSON.stringify(profileData[field]) !== JSON.stringify(originalData[field]);
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
      assignIfChanged('specialties', 'specialties', profileData.specialties);
      assignIfChanged('therapeuticApproaches', 'therapeuticApproaches', profileData.therapeuticApproaches);
      assignIfChanged('languages', 'languages', profileData.languages);
      assignIfChanged('education', 'education', profileData.education);
      assignIfChanged('experience', 'experience', profileData.experience);
      assignIfChanged('phone', 'phone', profileData.phone);
      assignIfChanged('profileVisible', 'profileVisible', profileData.profileVisible);
      assignIfChanged('gradientId', 'gradientId', profileData.gradientId);
      assignIfChanged('photoGallery', 'photoGallery', profileData.photoGallery);
      assignIfChanged('presentationVideoUrl', 'presentationVideoUrl', profileData.presentationVideoUrl);
      assignIfChanged('yearsInPractice', 'yearsInPractice', profileData.yearsInPractice);
      assignIfChanged('languagesSpoken', 'languagesSpoken', profileData.languagesSpoken);
      assignIfChanged('officeAddress', 'officeAddress', profileData.officeAddress);
      assignIfChanged('officeCity', 'officeCity', profileData.officeCity);
      assignIfChanged('officePostalCode', 'officePostalCode', profileData.officePostalCode);
      assignIfChanged('officeCountry', 'officeCountry', profileData.officeCountry);
      assignIfChanged('officeLat', 'officeLat', profileData.officeLat);
      assignIfChanged('officeLng', 'officeLng', profileData.officeLng);
      assignIfChanged('offersOnline', 'offersOnline', profileData.offersOnline);
      assignIfChanged('offersInPerson', 'offersInPerson', profileData.offersInPerson);

      const result = await professionalService.updateComprehensiveProfile(updateData);
      const mappedData = mapServiceProfileToFormData(result);

      setProfileData(mappedData);
      setOriginalData(mappedData);
      setSpecialistStats({
        rating: result.rating ?? 0,
        reviewCount: result.reviewCount ?? 0,
      });
      showAppAlert(appAlert, 'Cambios guardados', 'Tu perfil ha sido actualizado correctamente');
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo guardar el perfil. Intenta de nuevo.'));
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, originalData, profileData]);

  const handleImagePick = useCallback(async () => {
    if (isUploadingAvatar) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
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
          updateUser({ avatar: updatedUser.avatar ?? undefined });
          updateField('avatar', updatedUser.avatar ?? null);
        } catch (uploadError: unknown) {
          showAppAlert(appAlert, 'Error', getErrorMessage(uploadError, 'No se pudo subir la foto'));
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (error) {
      showAppAlert(appAlert, 'Error', 'No se pudo seleccionar la imagen');
    }
  }, [updateField, updateUser, isUploadingAvatar]);

  // Navigate to own public profile (as patients see it)
  const handleViewPublicProfile = useCallback(() => {
    if (!specialistId) {
      showAppAlert(appAlert, 'Error', 'No se pudo cargar el perfil');
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

    navigation.navigate('SpecialistDetail', { specialistId });
  }, [appAlert, canOpenPublicProfile, specialistId, navigation]);

  // Share profile handler
  const closeShareModal = useCallback(() => {
    setIsShareModalVisible(false);
    setHasCopiedShareUrl(false);
  }, []);

  const handleShareProfile = useCallback(() => {
    if (!specialistId) return;

    setHasCopiedShareUrl(false);
    setIsShareModalVisible(true);
  }, [specialistId]);

  const handleCopyShareUrl = useCallback(async () => {
    if (!shareProfileUrl) return;

    await Clipboard.setStringAsync(shareProfileUrl);
    setHasCopiedShareUrl(true);
  }, [shareProfileUrl]);

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
    navigation.navigate('ProfessionalBilling');
  }, [navigation]);

  const resetCertificateDraft = useCallback(() => {
    setCertificateDraft({
      name: '',
      issuer: '',
      validUntil: '',
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

      setProfileData(prev => ({
        ...prev,
        insuranceUploaded: true,
        insuranceReviewStatus: result.insuranceReviewStatus,
        insuranceReviewedAt: null,
        insuranceRejectedReason: null,
        locationVisibleToPatients: false,
      }));
      setOriginalData(prev => ({
        ...prev,
        insuranceUploaded: true,
        insuranceReviewStatus: result.insuranceReviewStatus,
        insuranceReviewedAt: null,
        insuranceRejectedReason: null,
        locationVisibleToPatients: false,
      }));
    } catch (error: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo subir la póliza.'));
    } finally {
      setIsUploadingInsurance(false);
    }
  }, [isUploadingInsurance]);

  const handleOpenInsuranceDocument = useCallback(async () => {
    if (openingCredentialKey === 'insurance') {
      return;
    }

    try {
      setOpeningCredentialKey('insurance');
      await professionalService.openInsuranceDocument();
    } catch (error: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo abrir la póliza.'));
    } finally {
      setOpeningCredentialKey(null);
    }
  }, [openingCredentialKey]);

  const handleDeleteInsuranceDocument = useCallback(() => {
    const doDelete = async () => {
      try {
        const result = await professionalService.deleteInsuranceDocument();

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
      } catch (error: unknown) {
        showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo eliminar la póliza.'));
      }
    };

    showAppAlert(appAlert,
      'Eliminar póliza',
      'Si eliminas la póliza, desactivaremos las sesiones presenciales hasta que subas una nueva.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void doDelete() },
      ]
    );
  }, []);

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
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo subir el certificado.'));
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
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo abrir el certificado.'));
    } finally {
      setOpeningCredentialKey(null);
    }
  }, [openingCredentialKey]);

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
        showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo eliminar el certificado.'));
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
    setProfileData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id),
    }));
  }, []);

  // ============================================================================
  // RENDER: TAB NAVIGATION
  // ============================================================================

  const tabs: { id: ProfileTab; label: string; icon: IconName }[] = [
    { id: 'information', label: 'Información Profesional', icon: 'person-outline' },
    { id: 'mi-espacio', label: STRINGS.miEspacio.tabLabel, icon: 'sparkles-outline' },
    { id: 'credentials', label: 'Credenciales', icon: 'shield-checkmark-outline' },
    { id: 'pricing', label: 'Facturación', icon: 'card-outline' },
    { id: 'privacy', label: 'Privacidad', icon: 'eye-outline' },
    { id: 'account', label: 'Cuenta', icon: 'settings-outline' },
  ];

  const canShareProfile = isProfessionalVerified && Boolean(specialistId);
  const publicProfileUnavailableCopy = !specialistId
    ? {
        title: 'Perfil público cargando',
        description: 'Estamos preparando el enlace de tu perfil. Vuelve a intentarlo en unos segundos.',
      }
    : !isProfessionalVerified
      ? {
          title: 'Pendiente de verificación',
          description: 'Cuando HERA apruebe tu verificación profesional, podrás abrir y compartir tu perfil completo.',
        }
      : null;
  const visibilityCopy = !isProfessionalVerified
    ? {
        icon: 'time-outline' as IconName,
        label: 'Pendiente de verificación',
        description: 'Tu perfil se publicará cuando HERA apruebe tu verificación profesional.',
        badgeStyle: styles.visibilityBadgePending,
        badgeTextStyle: styles.visibilityBadgeTextPending,
      }
    : profileData.profileVisible
    ? {
        icon: 'earth-outline' as IconName,
        label: 'Perfil público',
        description: 'Apareces en búsquedas y recomendaciones de HERA.',
        badgeStyle: styles.visibilityBadgePublic,
        badgeTextStyle: styles.visibilityBadgeTextPublic,
      }
    : {
        icon: 'link-outline' as IconName,
        label: 'Perfil privado',
        description: 'No apareces en búsquedas. Tus pacientes y quien tenga tu enlace pueden acceder.',
        badgeStyle: styles.visibilityBadgePrivate,
        badgeTextStyle: styles.visibilityBadgeTextPrivate,
      };
  const visibilityBadgeIconColor = !isProfessionalVerified
    ? palette.warningAmber
    : profileData.profileVisible
      ? palette.success
      : palette.primary;

  const renderTabNavigation = () => (
    <TourTarget id="professional.profile.tabs" fill style={styles.fullWidthTourTarget}>
      <View style={[styles.tabsContainer, isDesktop && styles.tabsContainerDesktop]}>
      <View style={[styles.topBar, isDesktop ? styles.topBarDesktop : styles.topBarMobile]}>
        <View style={styles.topBarContent}>
          <Text style={styles.topBarTitle}>Editar perfil</Text>
          <Text style={styles.topBarSubtitle}>
            Ajusta tu ficha pública, credenciales y condiciones de trabajo.
          </Text>
        </View>

        {specialistId ? (
            <TourTarget id="professional.profile.visibility" fill>
              <View style={styles.topBarActions}>
            <View style={[styles.visibilityBadge, visibilityCopy.badgeStyle]}>
              <Ionicons
                name={visibilityCopy.icon}
                size={14}
                color={visibilityBadgeIconColor}
              />
              <Text style={[styles.visibilityBadgeText, visibilityCopy.badgeTextStyle]}>
                {visibilityCopy.label}
              </Text>
            </View>
            {canShareProfile ? (
              <Button
                variant="outline"
                size="small"
                onPress={handleShareProfile}
                icon={<Ionicons name="link-outline" size={16} color={palette.primary} />}
                style={{ ...styles.topBarActionButton }}
                textStyle={{ ...styles.topBarActionText }}
              >
                Compartir perfil
              </Button>
            ) : null}
              </View>
            </TourTarget>
        ) : null}
      </View>

      <ScrollView
        horizontal={!isDesktop}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={isDesktop ? styles.tabsDesktop : styles.tabsMobile}
      >
        {tabs.map((tab) => (
          <AnimatedPressable
            key={tab.id}
            style={{
              ...styles.tab,
              ...(isDesktop ? styles.tabDesktop : {}),
              ...(activeTab === tab.id ? styles.tabActive : {}),
              ...(isDesktop && activeTab === tab.id ? styles.tabActiveDesktop : {}),
            }}
            onPress={() => setActiveTab(tab.id)}
            hoverLift={false}
            pressScale={0.985}
          >
            <Ionicons
              name={tab.icon}
              size={isDesktop ? 20 : 18}
              color={activeTab === tab.id ? palette.primary : palette.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                isDesktop ? styles.tabTextDesktop : {},
                activeTab === tab.id ? styles.tabTextActive : {},
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>
      </View>
    </TourTarget>
  );

  // ============================================================================
  // RENDER: PROFILE PREVIEW SIDEBAR
  // ============================================================================

  const renderProfilePreview = () => (
    <View style={styles.previewContainer}>
      <TourTarget id="professional.profile.preview" fill style={styles.previewHeaderTourTarget}>
        <View style={styles.previewHeader}>
          <Ionicons name="eye-outline" size={18} color={palette.textSecondary} />
          <Text style={styles.previewTitle}>Vista previa pública</Text>
        </View>
      </TourTarget>

      <ScrollView
        style={styles.previewScroll}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.previewContent}
      >
        {/* Avatar & Name */}
        <View style={styles.previewAvatarSection}>
          {profileData.avatar ? (
            <Image source={{ uri: profileData.avatar }} style={styles.previewAvatar} />
          ) : (
            <View style={[styles.previewAvatar, { backgroundColor: palette.primary }]}>
              <Text style={styles.previewAvatarText}>
                {profileData.fullName.charAt(0).toUpperCase() || 'P'}
              </Text>
            </View>
          )}
          <Text style={styles.previewName} numberOfLines={1}>
            {profileData.fullName || 'Tu nombre'}
          </Text>
          <Text style={styles.previewTitle2} numberOfLines={1}>
            {getProfessionalTypeLabel(profileData.professionalType)}
          </Text>
        </View>

        {/* Rating & Price */}
        <View style={styles.previewStats}>
          <View style={styles.previewStat}>
            <Text style={styles.previewStatValue}>
              {specialistStats.reviewCount > 0 ? `⭐ ${specialistStats.rating.toFixed(1)}` : '⭐ —'}
            </Text>
            <Text style={styles.previewStatLabel}>
              {specialistStats.reviewCount > 0
                ? `(${specialistStats.reviewCount} ${specialistStats.reviewCount === 1 ? 'reseña' : 'reseñas'})`
                : 'Sin reseñas aún'}
            </Text>
          </View>
          <View style={styles.previewStatDivider} />
          <View style={styles.previewStat}>
            <Text style={styles.previewStatValue}>{formatBillingAmount(publicSessionPrice)}</Text>
            <Text style={styles.previewStatLabel}>/ sesión</Text>
          </View>
        </View>

        {/* Specialties */}
        {profileData.specialties.length > 0 && (
          <View style={styles.previewSection}>
            <View style={styles.previewTags}>
              {profileData.specialties.slice(0, 3).map((specialty) => {
                const label = SPECIALTIES.find(s => s.value === specialty)?.label || specialty;
                return (
                  <View key={specialty} style={styles.previewTag}>
                    <Text style={styles.previewTagText} numberOfLines={1}>{label}</Text>
                  </View>
                );
              })}
              {profileData.specialties.length > 3 && (
                <View style={[styles.previewTag, styles.previewTagMore]}>
                  <Text style={styles.previewTagText}>+{profileData.specialties.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bio Preview */}
        {profileData.bio && (
          <View style={styles.previewSection}>
            <Text style={styles.previewBio} numberOfLines={3}>
              "{profileData.bio}"
            </Text>
          </View>
        )}

        {/* Verification Badges */}
        <View style={styles.previewBadges}>
          {verificationStatus.verificationStatus === 'VERIFIED' && (
            <>
              <View style={styles.previewBadge}>
                <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                <Text style={styles.previewBadgeText}>Colegiado verificado</Text>
              </View>
              <View style={styles.previewBadge}>
                <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                <Text style={styles.previewBadgeText}>Identidad verificada</Text>
              </View>
            </>
          )}
        </View>

        {/* View Full Profile Button */}
        {publicProfileUnavailableCopy ? (
          <View style={styles.previewUnavailableNotice}>
            <View style={styles.previewUnavailableIcon}>
              <Ionicons name="time-outline" size={18} color={palette.warningAmber} />
            </View>
            <View style={styles.previewUnavailableCopy}>
              <Text style={styles.previewUnavailableTitle}>
                {publicProfileUnavailableCopy.title}
              </Text>
              <Text style={styles.previewUnavailableText}>
                {publicProfileUnavailableCopy.description}
              </Text>
            </View>
          </View>
        ) : null}

        <Button
          variant="outline"
          size="medium"
          onPress={handleViewPublicProfile}
          disabled={!canOpenPublicProfile}
          fullWidth
          icon={<Ionicons name="arrow-forward" size={16} color={palette.primary} />}
          iconPosition="right"
          style={styles.previewButton}
          textStyle={styles.previewButtonText}
        >
          {canOpenPublicProfile ? 'Ver perfil completo' : 'Perfil completo pendiente'}
        </Button>
      </ScrollView>
    </View>
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
      verified?: boolean;
      maxLength?: number;
      characterCount?: boolean;
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
      verified,
      maxLength,
      characterCount = false,
    } = options || {};

    return (
      <View style={styles.formField}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
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
            disabled && styles.fieldInputDisabled,
            multiline && styles.fieldInputMultiline,
            multiline && { minHeight: numberOfLines * 24 + 24 },
          ]}
          value={value}
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

  const renderChipSelector = (
    label: string,
    options: { value: string; label: string }[],
    selectedValues: string[],
    field: 'specialties' | 'therapeuticApproaches' | 'languages' | 'sessionTypes',
    maxSelections?: number
  ) => (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>
        {label}
        {maxSelections && <Text style={styles.fieldHint}> (máximo {maxSelections})</Text>}
      </Text>
      <View style={styles.chipContainer}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          const reachedMax = maxSelections !== undefined && selectedValues.length >= maxSelections;
          const isDisabled = !isSelected && reachedMax;

          return (
            <AnimatedPressable
              key={option.value}
              style={{
                ...styles.chip,
                ...(isSelected ? styles.chipSelected : {}),
                ...(isDisabled ? styles.chipDisabled : {}),
              }}
              onPress={() => !isDisabled && toggleMultiSelect(field, option.value)}
              disabled={isDisabled}
              hoverLift={false}
              pressScale={0.985}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={palette.textOnCard} />
              )}
              <Text style={[
                styles.chipText,
                isSelected ? styles.chipTextSelected : null,
                isDisabled ? styles.chipTextDisabled : null,
              ]}>
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );

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
          showAppAlert(appAlert, 'Error', message);
        } finally {
          setIsUploadingGalleryPhoto(false);
        }
      }
    } catch {
      showAppAlert(appAlert, 'Error', 'No se pudo seleccionar la imagen');
    }
  }, [isUploadingGalleryPhoto, profileData.photoGallery, updateField]);

  const handleDeleteGalleryPhoto = useCallback((url: string) => {
    const doDelete = async () => {
      try {
        await professionalService.deleteGalleryPhoto(url);
        updateField('photoGallery', profileData.photoGallery.filter(u => u !== url));
      } catch (deleteError: unknown) {
        const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la foto';
        showAppAlert(appAlert, 'Error', message);
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
          style={styles.fieldInput}
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

  const renderInformationTab = () => (
    <View style={styles.tabContent}>
      {/* Profile Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foto de perfil</Text>
        <View style={styles.photoSection}>
          <View style={styles.avatarContainer}>
            {profileData.avatar ? (
              <Image source={{ uri: profileData.avatar }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarLarge, { backgroundColor: palette.primary }]}>
                <Text style={styles.avatarLargeText}>
                  {profileData.fullName.charAt(0).toUpperCase() || 'P'}
                </Text>
              </View>
            )}
            {isUploadingAvatar && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 60 }}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.photoActions}>
            <Button
              variant="outline"
              size="small"
              onPress={handleImagePick}
              disabled={isUploadingAvatar}
              icon={<Ionicons name="camera-outline" size={18} color={palette.primary} />}
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
          <Text style={styles.photoHint}>
            Recomendado: Foto profesional, buena iluminación, fondo neutro
          </Text>
        </View>
      </View>

      {/* Basic Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información básica</Text>
        <View style={styles.formCard}>
          {renderFormField(
            'Nombre completo',
            profileData.fullName,
            (text) => updateField('fullName', text),
            { placeholder: 'Elena Rodríguez García', required: true }
          )}
          {renderFormField(
            'Título profesional',
            profileData.professionalTitle,
            (text) => updateField('professionalTitle', text),
            {
              placeholder: 'Ej: Psicóloga infantojuvenil',
              required: false,
              helperText: `Opcional. El tipo oficial actual es: ${getProfessionalTypeLabel(profileData.professionalType)}.`,
            }
          )}
          {renderProfessionalTypeSelector()}
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
              verified: verificationStatus.verificationStatus === 'VERIFIED',
              disabled: true,
            }
          )}
        </View>
      </View>

      {/* Professional Bio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descripción profesional</Text>
        <View style={styles.formCard}>
          {renderFormField(
            'Sobre ti',
            profileData.bio,
            (text) => updateField('bio', text),
            {
              placeholder: 'Cuéntales a los clientes sobre tu enfoque, experiencia y filosofía terapéutica...',
              multiline: true,
              numberOfLines: 6,
              required: true,
              maxLength: 500,
              characterCount: true,
              helperText: 'Mínimo 150 caracteres para aparecer en búsquedas',
            }
          )}
        </View>
      </View>

      {/* Location & Modality Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ubicación y modalidad</Text>
        <View style={styles.formCard}>
          {/* Modality Options */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Modalidad de sesiones</Text>
            <Text style={styles.fieldHelper}>Selecciona cómo ofreces tus sesiones</Text>
            <View style={styles.modalityOptions}>
              <TouchableOpacity
                style={[
                  styles.modalityOption,
                  profileData.offersOnline && styles.modalityOptionSelected,
                ]}
                onPress={() => updateField('offersOnline', !profileData.offersOnline)}
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
                </View>
              </View>
            ) : null}
          </View>

          {/* Office Location (only if in-person is offered) */}
          {profileData.offersInPerson && (
            <>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Dirección de la consulta</Text>
                <Text style={styles.fieldHelper}>
                  {profileData.locationVisibleToPatients
                    ? 'Esta dirección ya es visible para los clientes que reserven sesiones presenciales'
                    : 'Guardaremos esta dirección, pero no la mostraremos a los pacientes hasta aprobar la póliza'}
                </Text>
                <AddressAutocomplete
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
                    (text) => updateField('officeCity', text),
                    { placeholder: 'Madrid' }
                  )}
                </View>
                <View style={styles.formFieldHalf}>
                  {renderFormField(
                    'Codigo postal',
                    profileData.officePostalCode,
                    (text) => updateField('officePostalCode', text),
                    { placeholder: '28001', keyboardType: 'numeric' }
                  )}
                </View>
              </View>

              {/* Map Preview */}
              {profileData.officeLat && profileData.officeLng && (
                <View style={styles.mapPreviewContainer}>
                  <Text style={styles.fieldLabel}>Vista previa del mapa</Text>
                  <Text style={styles.fieldHelper}>
                    {profileData.locationVisibleToPatients
                      ? 'Así ven ya los clientes la ubicación de tu consulta'
                      : 'Esta vista previa es interna hasta que aprobemos tu cobertura presencial'}
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
            </>
          )}
        </View>
      </View>

      {/* Specialties Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Especialidades y enfoques</Text>
        <View style={styles.formCard}>
          {renderChipSelector(
            'Especialidades',
            SPECIALTIES,
            profileData.specialties,
            'specialties',
            5
          )}
          {renderChipSelector(
            'Enfoques terapéuticos',
            THERAPEUTIC_APPROACHES,
            profileData.therapeuticApproaches,
            'therapeuticApproaches'
          )}
          {renderChipSelector(
            'Idiomas',
            LANGUAGES,
            profileData.languages,
            'languages'
          )}
        </View>
      </View>

      {/* Education Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Formación académica</Text>
          <Button
            variant="outline"
            size="small"
            onPress={addEducation}
            icon={<Ionicons name="add" size={18} color={palette.primary} />}
            style={{ ...styles.addButton }}
            textStyle={{ ...styles.addButtonText }}
          >
            Añadir título
          </Button>
        </View>

        {profileData.education.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={40} color={palette.textMuted} />
            <Text style={styles.emptyStateTitle}>No has añadido formación</Text>
            <Text style={styles.emptyStateDescription}>
              Comparte tus títulos y certificaciones para que los clientes conozcan tu preparación.
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {profileData.education.map((edu) => (
              <View key={edu.id} style={styles.itemCard}>
                <View style={styles.itemIcon}>
                  <Ionicons name="school" size={20} color={palette.primary} />
                </View>
                <View style={styles.itemContent}>
                  <TextInput
                    style={styles.itemInput}
                    value={edu.degree}
                    onChangeText={(text) => updateEducation(edu.id, 'degree', text)}
                    placeholder="Título (ej: Máster en Psicología Clínica)"
                    placeholderTextColor={palette.textMuted}
                  />
                  <TextInput
                    style={styles.itemInputSmall}
                    value={edu.institution}
                    onChangeText={(text) => updateEducation(edu.id, 'institution', text)}
                    placeholder="Institución"
                    placeholderTextColor={palette.textMuted}
                  />
                  <View style={styles.itemRow}>
                    <TextInput
                      style={[styles.itemInputSmall, styles.itemInputYear]}
                      value={edu.startYear}
                      onChangeText={(text) => updateEducation(edu.id, 'startYear', text)}
                      placeholder="Año inicio"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.itemSeparator}>-</Text>
                    <TextInput
                      style={[styles.itemInputSmall, styles.itemInputYear]}
                      value={edu.endYear}
                      onChangeText={(text) => updateEducation(edu.id, 'endYear', text)}
                      placeholder="Año fin"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.itemRemove}
                  onPress={() => removeEducation(edu.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={22} color={palette.warning} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Experience Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Experiencia profesional</Text>
          <Button
            variant="outline"
            size="small"
            onPress={addExperience}
            icon={<Ionicons name="add" size={18} color={palette.primary} />}
            style={{ ...styles.addButton }}
            textStyle={{ ...styles.addButtonText }}
          >
            Añadir experiencia
          </Button>
        </View>

        {profileData.experience.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={40} color={palette.textMuted} />
            <Text style={styles.emptyStateTitle}>No has añadido experiencia</Text>
            <Text style={styles.emptyStateDescription}>
              Añade tu experiencia para que los clientes conozcan tu trayectoria.
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {profileData.experience.map((exp) => (
              <View key={exp.id} style={styles.itemCard}>
                <View style={styles.itemIcon}>
                  <Ionicons name="briefcase" size={20} color={palette.primary} />
                </View>
                <View style={styles.itemContent}>
                  <TextInput
                    style={styles.itemInput}
                    value={exp.position}
                    onChangeText={(text) => updateExperience(exp.id, 'position', text)}
                    placeholder="Puesto (ej: Psicóloga Clínica)"
                    placeholderTextColor={palette.textMuted}
                  />
                  <TextInput
                    style={styles.itemInputSmall}
                    value={exp.organization}
                    onChangeText={(text) => updateExperience(exp.id, 'organization', text)}
                    placeholder="Organización"
                    placeholderTextColor={palette.textMuted}
                  />
                  <View style={styles.itemRow}>
                    <TextInput
                      style={[styles.itemInputSmall, styles.itemInputYear]}
                      value={exp.startYear}
                      onChangeText={(text) => updateExperience(exp.id, 'startYear', text)}
                      placeholder="Inicio"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.itemSeparator}>-</Text>
                    {exp.current ? (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Presente</Text>
                      </View>
                    ) : (
                      <TextInput
                        style={[styles.itemInputSmall, styles.itemInputYear]}
                        value={exp.endYear || ''}
                        onChangeText={(text) => updateExperience(exp.id, 'endYear', text)}
                        placeholder="Fin"
                        placeholderTextColor={palette.textMuted}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.currentToggle}
                      onPress={() => updateExperience(exp.id, 'current', !exp.current)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={exp.current ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={palette.primary}
                      />
                      <Text style={styles.currentToggleText}>Actual</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.itemRemove}
                  onPress={() => removeExperience(exp.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={22} color={palette.warning} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // ============================================================================
  // RENDER: TAB 2 - CREDENCIALES Y VERIFICACIÓN
  // ============================================================================

  // Handler for navigating to verification screen
  const handleResubmitVerification = () => {
    navigation.navigate('ProfessionalVerification');
  };

  // Render the professional verification status banner
  const renderVerificationStatusBanner = () => {
    const status = verificationStatus.verificationStatus;

    if (status === 'VERIFIED') {
      return (
        <View style={[styles.verificationBanner, styles.verificationBannerVerified]}>
          <View style={styles.verificationBannerIcon}>
            <Ionicons name="checkmark-circle" size={28} color={palette.success} />
          </View>
          <View style={styles.verificationBannerContent}>
            <Text style={[styles.verificationBannerTitle, styles.verificationBannerTitleVerified]}>
              Verificado
            </Text>
            <Text style={styles.verificationBannerText}>
              Tu identidad profesional ha sido verificada correctamente.
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'PENDING') {
      return (
        <View style={[styles.verificationBanner, styles.verificationBannerPending]}>
          <View style={styles.verificationBannerIcon}>
            <Ionicons name="time-outline" size={28} color={palette.info} />
          </View>
          <View style={styles.verificationBannerContent}>
            <Text style={[styles.verificationBannerTitle, styles.verificationBannerTitlePending]}>
              Verificación en proceso
            </Text>
            <Text style={styles.verificationBannerText}>
              Te avisaremos cuando esté lista. Mientras tanto, puedes completar tu perfil.
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'REJECTED') {
      return (
        <View style={[styles.verificationBanner, styles.verificationBannerRejected]}>
          <View style={styles.verificationBannerIcon}>
            <Ionicons name="alert-circle" size={28} color={palette.warning} />
          </View>
          <View style={styles.verificationBannerContent}>
            <Text style={[styles.verificationBannerTitle, styles.verificationBannerTitleRejected]}>
              Verificación rechazada
            </Text>
            <Text style={styles.verificationBannerText}>
              Por favor reenvía tus datos correctamente.
              {verificationStatus.rejectionReason && (
                ` Motivo: ${verificationStatus.rejectionReason}`
              )}
            </Text>
            <Button
              variant="danger"
              size="small"
              onPress={handleResubmitVerification}
              icon={<Ionicons name="refresh" size={16} color="#FFFFFF" />}
              style={{ ...styles.verificationResubmitButton }}
              textStyle={{ ...styles.verificationResubmitButtonText }}
            >
              Reenviar verificación
            </Button>
          </View>
        </View>
      );
    }

    // NOT_SUBMITTED
    return (
      <View style={[styles.verificationBanner, styles.verificationBannerNotSubmitted]}>
        <View style={styles.verificationBannerIcon}>
          <Ionicons name="shield-outline" size={28} color={palette.textSecondary} />
        </View>
        <View style={styles.verificationBannerContent}>
          <Text style={[styles.verificationBannerTitle, styles.verificationBannerTitleNotSubmitted]}>
            Verificación pendiente
          </Text>
          <Text style={styles.verificationBannerText}>
            Completa la verificación de tu identidad profesional para que los clientes puedan encontrarte.
          </Text>
          <Button
            variant="primary"
            size="small"
            onPress={handleResubmitVerification}
            icon={<Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />}
            style={{ ...styles.verificationSubmitButton }}
            textStyle={{ ...styles.verificationResubmitButtonText }}
          >
            Iniciar verificación
          </Button>
        </View>
      </View>
    );
  };

  const renderCredentialsTab = () => (
    <View style={styles.tabContent}>
      {/* Professional Verification Status Banner */}
      {renderVerificationStatusBanner()}

      {/* Verification Status Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado de verificación</Text>
        <View style={styles.verificationOverview}>
          <View style={styles.verificationItem}>
            <Ionicons
              name={verificationStatus.verificationStatus === 'VERIFIED' ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={verificationStatus.verificationStatus === 'VERIFIED' ? palette.success : palette.warningAmber}
            />
            <View style={styles.verificationItemContent}>
              <Text style={styles.verificationItemTitle}>Identidad verificada</Text>
              <Text style={styles.verificationItemStatus}>
                {verificationStatus.verificationStatus === 'VERIFIED'
                  ? 'Completado'
                  : verificationStatus.verificationStatus === 'PENDING'
                    ? 'En revisión'
                    : 'Pendiente de verificar'}
              </Text>
            </View>
          </View>
          <View style={styles.verificationItem}>
            <Ionicons
              name={verificationStatus.verificationStatus === 'VERIFIED' ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={verificationStatus.verificationStatus === 'VERIFIED' ? palette.success : palette.warningAmber}
            />
            <View style={styles.verificationItemContent}>
              <Text style={styles.verificationItemTitle}>Número de colegiado validado</Text>
              <Text style={styles.verificationItemStatus}>
                {verificationStatus.verificationStatus === 'VERIFIED'
                  ? 'Verificado'
                  : verificationStatus.verificationStatus === 'PENDING'
                    ? 'En revisión'
                    : 'Pendiente'}
              </Text>
            </View>
          </View>
          <View style={[styles.verificationItem, styles.verificationItemLast]}>
            <Ionicons
              name={
                profileData.insuranceReviewStatus === 'APPROVED'
                  ? 'checkmark-circle'
                  : profileData.insuranceReviewStatus === 'PENDING'
                    ? 'time'
                    : 'alert-circle'
              }
              size={24}
              color={
                profileData.insuranceReviewStatus === 'APPROVED'
                  ? palette.success
                  : profileData.insuranceReviewStatus === 'PENDING'
                    ? palette.info
                    : palette.warning
              }
            />
            <View style={styles.verificationItemContent}>
              <Text style={styles.verificationItemTitle}>Seguro profesional</Text>
              <Text style={styles.verificationItemStatus}>
                {profileData.insuranceReviewStatus === 'APPROVED'
                  ? 'Aprobado'
                  : profileData.insuranceReviewStatus === 'PENDING'
                    ? 'En revisión'
                    : profileData.insuranceReviewStatus === 'REJECTED'
                      ? 'Rechazado'
                      : 'Pendiente de subir'}
              </Text>
            </View>
          </View>

          {/* Profile Completion Bar */}
          <View style={styles.completionSection}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Verificación completada</Text>
              <Text style={styles.completionValue}>{verificationCompletion}%</Text>
            </View>
            <View style={styles.completionBar}>
              <View style={[styles.completionFill, { width: `${verificationCompletion}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Identity Verification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verificación de identidad</Text>
        <View style={styles.formCard}>
          <View style={styles.verificationCard}>
            <View style={styles.verificationCardIcon}>
              <Ionicons
                name={verificationStatus.verificationStatus === 'VERIFIED' ? 'shield-checkmark' : 'shield'}
                size={32}
                color={verificationStatus.verificationStatus === 'VERIFIED' ? palette.success : palette.textSecondary}
              />
            </View>
            <View style={styles.verificationCardContent}>
              <Text style={styles.verificationCardTitle}>Carnet de colegiado</Text>
              <Text style={styles.verificationCardStatus}>
                {verificationStatus.verificationStatus === 'VERIFIED'
                  ? `Verificado${verificationStatus.reviewedAt ? ` el ${new Date(verificationStatus.reviewedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
                  : verificationStatus.verificationStatus === 'PENDING'
                    ? 'En revisión por el equipo de verificación'
                    : 'Sube tu documento de identidad'}
              </Text>
            </View>
            <Button
              variant={verificationStatus.verificationStatus === 'VERIFIED' ? 'ghost' : 'outline'}
              size="small"
              onPress={verificationStatus.verificationStatus !== 'VERIFIED' ? handleResubmitVerification : () => {}}
              disabled={verificationStatus.verificationStatus === 'VERIFIED'}
              style={{ ...styles.verificationCardButton }}
              textStyle={{ ...styles.verificationCardButtonText }}
            >
              {verificationStatus.verificationStatus === 'VERIFIED' ? 'Verificado' : 'Verificar'}
            </Button>
          </View>
        </View>
      </View>

      {/* Professional Insurance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguro de responsabilidad civil</Text>
        <View style={styles.formCard}>
          <View style={styles.credentialsHintCard}>
            <Ionicons name="lock-closed-outline" size={18} color={palette.primary} />
            <Text style={styles.credentialsHintText}>
              Este archivo queda en almacenamiento privado y no se enseña al paciente. Nos sirve para validar la cobertura necesaria para sesiones presenciales.
            </Text>
          </View>
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
              <Text style={styles.insuranceStatusText}>{insuranceReviewCopy.description}</Text>
            </View>
          </View>
          {profileData.insuranceUploaded ? (
            <View style={styles.documentCard}>
              <View style={styles.documentIcon}>
                <Ionicons name="document-text" size={24} color={palette.primary} />
              </View>
              <View style={styles.documentContent}>
                <Text style={styles.documentTitle}>Póliza de seguro</Text>
                <Text style={styles.documentMeta}>
                  {profileData.locationVisibleToPatients
                    ? 'Aprobada para sesiones presenciales y visible para pacientes'
                    : 'Documento privado pendiente de aprobación para mostrar presencial'}
                </Text>
              </View>
              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={styles.documentAction}
                  activeOpacity={0.7}
                  onPress={() => void handleOpenInsuranceDocument()}
                >
                  {openingCredentialKey === 'insurance' ? (
                    <ActivityIndicator size="small" color={palette.primary} />
                  ) : (
                    <Ionicons name="eye-outline" size={20} color={palette.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.documentAction}
                  activeOpacity={0.7}
                  onPress={handleDeleteInsuranceDocument}
                >
                  <Ionicons name="trash-outline" size={20} color={palette.warning} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.uploadArea}>
              <Ionicons name="cloud-upload-outline" size={40} color={palette.textMuted} />
              <Text style={styles.uploadTitle}>Subir póliza de seguro</Text>
              <Text style={styles.uploadDescription}>
                Requerido para ofrecer sesiones presenciales
              </Text>
              <Button
                variant="primary"
                size="small"
                onPress={() => void handleUploadInsuranceDocument()}
                loading={isUploadingInsurance}
                icon={<Ionicons name="add" size={18} color={palette.textOnCard} />}
                style={styles.uploadButton}
                textStyle={{ ...styles.uploadButtonText }}
              >
                Subir PDF
              </Button>
            </View>
          )}
        </View>
      </View>

      {/* Certificates */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Certificados y acreditaciones</Text>
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
        </View>

        {profileData.certificates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={40} color={palette.textMuted} />
            <Text style={styles.emptyStateTitle}>No has añadido certificados</Text>
            <Text style={styles.emptyStateDescription}>
              Añade certificaciones privadas para revisión interna y para poder mostrar acreditaciones de forma controlada.
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {profileData.certificates.map((cert) => (
              <View key={cert.id} style={styles.documentCard}>
                <View style={styles.documentIcon}>
                  <Ionicons name="ribbon" size={24} color={palette.primary} />
                </View>
                <View style={styles.documentContent}>
                  <Text style={styles.documentTitle}>{cert.name}</Text>
                  <Text style={styles.documentMeta}>{cert.issuer}</Text>
                  {cert.validUntil && (
                    <Text style={styles.documentMeta}>Válido hasta: {cert.validUntil}</Text>
                  )}
                  {formatDocumentDate(cert.documentUploadedAt) && (
                    <Text style={styles.documentMeta}>
                      Documento subido el {formatDocumentDate(cert.documentUploadedAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.documentActions}>
                  <TouchableOpacity
                    style={styles.documentAction}
                    activeOpacity={0.7}
                    onPress={() => void handleOpenCertificate(cert)}
                  >
                    {openingCredentialKey === `certificate:${cert.id}` ? (
                      <ActivityIndicator size="small" color={palette.primary} />
                    ) : (
                      <Ionicons name="eye-outline" size={20} color={palette.primary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentAction}
                    activeOpacity={0.7}
                    onPress={() => handleDeleteCertificate(cert.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={palette.warning} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // ============================================================================
  // RENDER: TAB 3 - TARIFAS Y PAGOS
  // ============================================================================

  const renderPricingTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen de facturación</Text>
        <View style={styles.formCard}>
          <View style={styles.billingSummaryHeader}>
            <View style={styles.billingSummaryIcon}>
              <Ionicons name="card-outline" size={22} color={palette.primary} />
            </View>
            <View style={styles.billingSummaryCopy}>
              <Text style={styles.billingSummaryTitle}>La facturación se gestiona desde su pantalla dedicada</Text>
              <Text style={styles.billingSummaryText}>
                Las tarifas públicas, datos fiscales, IBAN, IVA y numeración de facturas se guardan en Facturación.
              </Text>
            </View>
          </View>

          {isBillingConfigLoading ? (
            <View style={styles.billingLoadingRow}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.billingSummaryText}>Cargando configuración...</Text>
            </View>
          ) : (
            <>
              <View style={styles.billingMetricsGrid}>
                <View style={styles.billingMetricCard}>
                  <Text style={styles.billingMetricLabel}>Tarifa pública</Text>
                  <Text style={styles.billingMetricValue}>
                    {formatBillingAmount(defaultBillingTariff?.price ?? billingConfig?.pricePerSession)}
                  </Text>
                  <Text style={styles.billingMetricHint}>
                    {defaultBillingTariff
                      ? `${defaultBillingTariff.name} · ${defaultBillingTariff.durationMinutes} min`
                      : 'Sin tarifa por defecto'}
                  </Text>
                </View>
                <View style={styles.billingMetricCard}>
                  <Text style={styles.billingMetricLabel}>Tarifas activas</Text>
                  <Text style={styles.billingMetricValue}>{activeBillingTariffs.length}</Text>
                  <Text style={styles.billingMetricHint}>Gestionadas en Facturación</Text>
                </View>
              </View>

              <View style={styles.billingStatusList}>
                <View style={styles.billingStatusRow}>
                  <Ionicons
                    name={billingFiscalReady ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={18}
                    color={billingFiscalReady ? palette.success : palette.warningAmber}
                  />
                  <Text style={styles.billingStatusText}>
                    {billingFiscalReady ? 'Datos fiscales completos' : 'Faltan datos fiscales para facturas completas'}
                  </Text>
                </View>
                <View style={styles.billingStatusRow}>
                  <Ionicons
                    name={billingBankReady ? 'checkmark-circle' : 'information-circle-outline'}
                    size={18}
                    color={billingBankReady ? palette.success : palette.textSecondary}
                  />
                  <Text style={styles.billingStatusText}>
                    {billingBankReady ? 'IBAN configurado' : 'IBAN pendiente en Facturación'}
                  </Text>
                </View>
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
        </View>
      </View>
      </View>
  );

  // ============================================================================
  // RENDER: TAB 4 - CUENTA Y SEGURIDAD
  // ============================================================================

  const renderAccountTab = () => (
    <View style={styles.tabContent}>
      {/* Account Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de cuenta</Text>
        <View style={styles.formCard}>
          {renderFormField(
            'Email de acceso',
            profileData.email,
            () => {},
            {
              disabled: true,
              verified: profileData.emailVerified === true,
              helperText: 'El email no se puede modificar por seguridad',
            }
          )}
          {renderFormField(
            'Teléfono',
            profileData.phone,
            (text) => updateField('phone', text),
            {
              placeholder: '+34 600 123 456',
              keyboardType: 'phone-pad',
              verified: profileData.phoneVerified,
            }
          )}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        <View style={styles.formCard}>
          <View style={styles.notificationInfoCard}>
            <View style={styles.notificationInfoHeader}>
              <View style={styles.notificationInfoIcon}>
                <Ionicons name="mail-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.notificationInfoCopy}>
                <Text style={styles.notificationInfoTitle}>Emails automáticos activos</Text>
                <Text style={styles.notificationInfoDescription}>
                  En esta versión HERA envía por defecto los avisos críticos de agenda para evitar que se pierda una reserva o una cancelación.
                </Text>
              </View>
              <View style={styles.notificationStatusPill}>
                <Text style={styles.notificationStatusText}>Activas</Text>
              </View>
            </View>

            <View style={styles.notificationInfoList}>
              <View style={styles.notificationInfoRow}>
                <Ionicons name="calendar-clear-outline" size={16} color={theme.primary} />
                <Text style={styles.notificationInfoRowText}>Nueva solicitud de cita</Text>
              </View>
              <View style={styles.notificationInfoRow}>
                <Ionicons name="close-circle-outline" size={16} color={theme.warning} />
                <Text style={styles.notificationInfoRowText}>Cancelación de cita</Text>
              </View>
              <View style={styles.notificationInfoRow}>
                <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.notificationInfoRowText}>Los recordatorios push llegarán en una fase posterior</Text>
              </View>
            </View>

            <Text style={styles.notificationInfoHint}>
              Cuando exista configuración real por canal, aparecerá aquí en lugar de estos avisos informativos.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderProfessionalTypeSelector = () => (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>
        Tipo profesional <Text style={styles.required}>*</Text>
      </Text>
      <Text style={styles.fieldHelper}>
        Es la categoría regulada que verán los pacientes y podrán usar para filtrar.
      </Text>
      <View style={styles.chipContainer}>
        {PROFESSIONAL_TYPE_OPTIONS.map((option) => {
          const isSelected = profileData.professionalType === option.id;

          return (
            <AnimatedPressable
              key={option.id}
              style={{
                ...styles.chip,
                ...(isSelected ? styles.chipSelected : {}),
              }}
              onPress={() => updateField('professionalType', option.id)}
              hoverLift={false}
              pressScale={0.985}
            >
              <Ionicons
                name={isSelected ? 'checkmark' : option.icon}
                size={14}
                color={isSelected ? palette.textOnCard : palette.textMuted}
              />
              <Text style={[
                styles.chipText,
                isSelected ? styles.chipTextSelected : null,
              ]}>
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );

  // ============================================================================
  // RENDER: TAB 5 - PRIVACIDAD
  // ============================================================================

  const renderPrivacyTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidad</Text>
        <View style={styles.formCard}>
          <View style={styles.visibilitySummary}>
            <View style={styles.visibilitySummaryIcon}>
              <Ionicons name={visibilityCopy.icon} size={20} color={visibilityBadgeIconColor} />
            </View>
            <View style={styles.visibilitySummaryCopy}>
              <Text style={styles.visibilitySummaryTitle}>{visibilityCopy.label}</Text>
              <Text style={styles.visibilitySummaryText}>{visibilityCopy.description}</Text>
            </View>
          </View>

          <View style={styles.privacySection}>
            <Text style={styles.privacyLabel}>Visibilidad del perfil</Text>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                profileData.profileVisible && styles.visibilityOptionSelected,
              ]}
              onPress={() => updateField('profileVisible', true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.profileVisible ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={palette.primary}
              />
              <View style={styles.visibilityOptionCopy}>
                <Text style={styles.visibilityOptionTitle}>Público en HERA</Text>
                <Text style={styles.visibilityOptionText}>
                  Se muestra en la lista de especialistas, búsquedas y recomendaciones.
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                !profileData.profileVisible && styles.visibilityOptionSelected,
              ]}
              onPress={() => updateField('profileVisible', false)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={!profileData.profileVisible ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={palette.primary}
              />
              <View style={styles.visibilityOptionCopy}>
                <Text style={styles.visibilityOptionTitle}>Privado con enlace</Text>
                <Text style={styles.visibilityOptionText}>
                  No aparece en búsquedas ni recomendaciones. Sigue disponible para tus pacientes y para quien reciba tu enlace.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  );

  // ============================================================================
  // RENDER: SAVE BUTTON (Fixed at bottom)
  // ============================================================================

  const renderSaveButton = () => (
    <TourTarget
      id="professional.profile.save"
      fill
      style={[styles.saveButtonContainer, isDesktop && styles.saveButtonContainerDesktop]}
    >
      <View style={styles.saveButtonInner}>
      <Button
        variant="primary"
        size="medium"
        onPress={handleSave}
        disabled={!hasChanges || isSaving}
        loading={isSaving}
        style={{ ...styles.saveButton, ...(!hasChanges ? styles.saveButtonDisabled : {}) }}
        textStyle={{ ...styles.saveButtonText, ...(!hasChanges ? styles.saveButtonTextDisabled : {}) }}
        icon={<Ionicons name="checkmark-circle-outline" size={20} color={hasChanges ? palette.textOnCard : palette.textMuted} />}
      >
        Guardar cambios
      </Button>
      </View>
    </TourTarget>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      {renderTabNavigation()}

      {/* Main Content Area */}
      <View style={styles.mainArea}>
        {/* Form Content */}
        <ScrollView
          ref={formScrollRef}
          style={[styles.formArea, isDesktop && showPreview && styles.formAreaWithPreview]}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={true}
        >
          {activeTab === 'mi-espacio' && renderMiEspacioTab()}
          {activeTab === 'information' && renderInformationTab()}
          {activeTab === 'credentials' && renderCredentialsTab()}
          {activeTab === 'pricing' && renderPricingTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
          {activeTab === 'account' && renderAccountTab()}

          {/* Spacer for save button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Preview Sidebar (Desktop only) */}
        {isDesktop && showPreview && renderProfilePreview()}

        {/* Mobile Preview Toggle */}
        {isMobile && (
          <AnimatedPressable
            style={styles.previewToggle}
            onPress={() => setShowPreview(!showPreview)}
            hoverLift={false}
            pressScale={0.97}
          >
            <Ionicons name="eye-outline" size={20} color={palette.textOnCard} />
          </AnimatedPressable>
        )}
      </View>

      {/* Save Button */}
      {renderSaveButton()}

      <Modal
        visible={isCertificateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCertificateModal}
      >
        <Pressable style={styles.shareModalOverlay} onPress={closeCertificateModal}>
          <Pressable style={styles.documentModalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.shareModalHeader}>
              <View style={styles.shareModalHeaderCopy}>
                <View style={styles.shareModalBadge}>
                  <Ionicons name="ribbon-outline" size={14} color={palette.primary} />
                  <Text style={styles.shareModalBadgeText}>Documento privado</Text>
                </View>
                <Text style={styles.shareModalTitle}>Añadir certificado</Text>
                <Text style={styles.shareModalSubtitle}>
                  El paciente no verá el archivo. Guardaremos el documento en privado para revisión interna y futuras verificaciones.
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeCertificateModal}
                activeOpacity={0.7}
                style={styles.shareModalCloseButton}
              >
                <Ionicons name="close" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.documentModalFields}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nombre del certificado</Text>
                <TextInput
                  value={certificateDraft.name}
                  onChangeText={(text) => setCertificateDraft(prev => ({ ...prev, name: text }))}
                  placeholder="Ej: EMDR Nivel I"
                  placeholderTextColor={palette.textMuted}
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Entidad emisora</Text>
                <TextInput
                  value={certificateDraft.issuer}
                  onChangeText={(text) => setCertificateDraft(prev => ({ ...prev, issuer: text }))}
                  placeholder="Ej: Asociación EMDR España"
                  placeholderTextColor={palette.textMuted}
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Válido hasta</Text>
                <TextInput
                  value={certificateDraft.validUntil}
                  onChangeText={(text) => setCertificateDraft(prev => ({ ...prev, validUntil: text }))}
                  placeholder="YYYY-MM-DD (opcional)"
                  placeholderTextColor={palette.textMuted}
                  style={styles.fieldInput}
                />
                <Text style={styles.fieldHint}>
                  Al continuar te pediremos el PDF o la imagen del certificado.
                </Text>
              </View>
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
                Seleccionar archivo
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isShareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeShareModal}
      >
        <Pressable style={styles.shareModalOverlay} onPress={closeShareModal}>
          <Pressable style={styles.shareModalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.shareModalHeader}>
              <View style={styles.shareModalHeaderCopy}>
                <View style={styles.shareModalBadge}>
                  <Ionicons name="link-outline" size={14} color={palette.primary} />
                  <Text style={styles.shareModalBadgeText}>Enlace público</Text>
                </View>
                <Text style={styles.shareModalTitle}>Compartir perfil</Text>
                <Text style={styles.shareModalSubtitle}>
                  Muestra este enlace, cópialo o compártelo. La nueva versión usa una ruta más corta y limpia.
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeShareModal}
                activeOpacity={0.7}
                style={styles.shareModalCloseButton}
              >
                <Ionicons name="close" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.shareUrlCard}>
              <Text style={styles.shareUrlLabel}>Tu enlace para pacientes</Text>
              <TextInput
                value={shareProfileUrl}
                editable={false}
                selectTextOnFocus
                style={styles.shareUrlInput}
              />
              <Text style={styles.shareUrlHint}>
                El enlace queda visible para que tambien se pueda copiar manualmente.
              </Text>
            </View>

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
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mobile Preview Modal */}
      {isMobile && showPreview && (
        <Modal
          visible={showPreview}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPreview(false)}
        >
          <Pressable style={styles.previewModal} onPress={() => setShowPreview(false)}>
            <Pressable style={styles.previewModalContent} onPress={e => e.stopPropagation()}>
              <View style={styles.previewModalHeader}>
                <Text style={styles.previewModalTitle}>Vista previa</Text>
                <TouchableOpacity onPress={() => setShowPreview(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={24} color={palette.textPrimary} />
                </TouchableOpacity>
              </View>
              {renderProfilePreview()}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(
  palette: ProfilePalette,
  isDesktop: boolean,
  isMobile: boolean,
  showPreview: boolean,
) {
  return StyleSheet.create({
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
  fullWidthTourTarget: {
    width: '100%',
  },
  tabsContainer: {
    backgroundColor: palette.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  tabsContainerDesktop: {
    borderBottomWidth: 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topBarDesktop: {
    paddingHorizontal: spacing.xl,
  },
  topBarMobile: {
    paddingHorizontal: spacing.md,
    paddingLeft: layout.mobileShellLeftInset,
    flexWrap: 'wrap',
  },
  topBarContent: {
    flex: 1,
    minWidth: 220,
  },
  topBarTitle: {
    fontSize: isDesktop ? 28 : 24,
    lineHeight: isDesktop ? 34 : 30,
    fontWeight: '800',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  topBarSubtitle: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontFamily: palette.fontSans,
    lineHeight: 20,
    color: palette.textSecondary,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: isMobile ? 'flex-start' : 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  topBarActionButton: {
    minWidth: isMobile ? 0 : 172,
  },
  topBarActionText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
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
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 15, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  shareModalContent: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: palette.cardBg,
    borderRadius: borderRadius.xl,
    padding: isMobile ? spacing.lg : spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.lg,
    ...shadows.lg,
  },
  documentModalContent: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: palette.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.lg,
    ...shadows.lg,
  },
  shareModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  shareModalHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  shareModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: palette.primaryAlpha12,
    borderWidth: 1,
    borderColor: palette.primaryMuted,
  },
  shareModalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.primary,
  },
  shareModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.backgroundMuted,
  },
  shareModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  shareModalSubtitle: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    lineHeight: 21,
    color: palette.textSecondary,
  },
  shareUrlCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.backgroundMuted,
    gap: spacing.sm,
  },
  shareUrlLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: palette.fontSansBold,
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  shareUrlInput: {
    borderWidth: 1,
    borderColor: palette.primaryMuted,
    borderRadius: borderRadius.md,
    backgroundColor: palette.cardBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: isMobile ? 14 : 15,
    fontFamily: palette.fontSans,
    lineHeight: 22,
    color: palette.textPrimary,
  },
  shareUrlHint: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    lineHeight: 19,
    color: palette.textMuted,
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
  tabsMobile: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  tabsDesktop: {
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    gap: 0,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: palette.cardBg,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.xs,
  },
  tabDesktop: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tabActive: {
    backgroundColor: palette.primaryMuted,
    borderColor: palette.primary,
  },
  tabActiveDesktop: {
    backgroundColor: 'transparent',
    borderBottomColor: palette.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
  },
  tabTextDesktop: {
    fontSize: 15,
    fontFamily: palette.fontSans,
  },
  tabTextActive: {
    color: palette.textPrimary,
    fontWeight: '600',
  },

  // ===== MAIN LAYOUT =====
  mainArea: {
    flex: 1,
    flexDirection: 'row',
  },
  formArea: {
    flex: 1,
  },
  formAreaWithPreview: {
    flex: 0.6,
  },
  formContent: {
    padding: isMobile ? spacing.md : spacing.lg,
    paddingBottom: 120,
  },

  // ===== PREVIEW SIDEBAR =====
  previewContainer: {
    flex: 0.4,
    backgroundColor: palette.cardBg,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    maxWidth: 380,
  },
  previewHeaderTourTarget: {
    width: '100%',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewScroll: {
    flex: 1,
  },
  previewContent: {
    padding: spacing.lg,
  },
  previewAvatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  previewAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  previewAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    fontFamily: palette.fontSansBold,
    color: palette.textOnCard,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  previewTitle2: {
    fontSize: 15,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  previewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.background,
    borderRadius: borderRadius.lg,
  },
  previewStat: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  previewStatValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  previewStatLabel: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
  },
  previewStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: palette.border,
  },
  previewSection: {
    marginBottom: spacing.md,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  previewTag: {
    backgroundColor: palette.primaryMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  previewTagMore: {
    backgroundColor: palette.border,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: palette.fontSansSemiBold,
    color: palette.primary,
  },
  previewBio: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
  previewBadges: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  previewBadgeText: {
    fontSize: 13,
    color: palette.success,
    fontWeight: '500',
    fontFamily: palette.fontSansSemiBold,
  },
  previewUnavailableNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: palette.warningAmber,
    backgroundColor: palette.warningLight,
  },
  previewUnavailableIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.cardBg,
  },
  previewUnavailableCopy: {
    flex: 1,
    gap: 2,
  },
  previewUnavailableTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  previewUnavailableText: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    lineHeight: 17,
    color: palette.textSecondary,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: borderRadius.md,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.primary,
  },

  // ===== MOBILE PREVIEW =====
  previewToggle: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  previewModalContent: {
    backgroundColor: palette.cardBg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  previewModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },

  // ===== TAB CONTENT =====
  tabContent: {
    gap: spacing.lg,
  },

  // ===== SECTIONS =====
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },

  // ===== FORM CARD =====
  formCard: {
    backgroundColor: palette.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },

  // ===== FORM FIELDS =====
  formField: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
  },
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
    backgroundColor: palette.cardBackground,
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    fontFamily: palette.fontSans,
    color: palette.textPrimary,
    minHeight: 48,
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
  helperText: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: palette.background,
    borderWidth: 2,
    borderColor: palette.border,
    gap: spacing.xs,
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
  },
  chipTextSelected: {
    color: palette.textOnCard,
  },
  chipTextDisabled: {
    color: palette.textMuted,
  },

  // ===== PHOTO SECTION =====
  photoSection: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: palette.cardBg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  avatarLargeText: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: palette.fontSansBold,
    color: palette.textOnCard,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: palette.border,
  },
  photoButtonDanger: {
    borderColor: palette.warning,
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
  photoHint: {
    fontSize: 12,
    fontFamily: palette.fontSans,
    color: palette.textMuted,
    textAlign: 'center',
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
  itemCard: {
    flexDirection: 'row',
    backgroundColor: palette.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemInput: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemInputSmall: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemInputYear: {
    width: 70,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  itemSeparator: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    color: palette.textMuted,
  },
  itemRemove: {
    padding: spacing.xs,
  },
  currentBadge: {
    backgroundColor: palette.primaryMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.primary,
  },
  currentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  currentToggleText: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
  },

  // ===== VERIFICATION =====
  verificationOverview: {
    backgroundColor: palette.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  verificationItemLast: {
    borderBottomWidth: 0,
  },
  verificationItemContent: {
    flex: 1,
  },
  verificationItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textPrimary,
  },
  verificationItemStatus: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
  },
  completionSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  completionLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
  },
  completionValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.primary,
  },
  completionBar: {
    height: 8,
    backgroundColor: palette.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: palette.primary,
    borderRadius: 4,
  },

  // ===== VERIFICATION CARD =====
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  verificationCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationCardContent: {
    flex: 1,
  },
  verificationCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textPrimary,
  },
  verificationCardStatus: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
  },
  verificationCardButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: palette.primary,
  },
  verificationCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textOnCard,
  },

  // ===== DOCUMENT CARD =====
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.background,
    borderRadius: borderRadius.md,
  },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentContent: {
    flex: 1,
  },
  documentTitle: {
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
  credentialsHintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: palette.primaryAlpha12,
    marginBottom: spacing.md,
  },
  credentialsHintText: {
    flex: 1,
    fontSize: 13,
    fontFamily: palette.fontSans,
    lineHeight: 20,
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
    gap: spacing.sm,
  },
  documentAction: {
    padding: spacing.sm,
  },

  // ===== UPLOAD AREA =====
  uploadArea: {
    alignItems: 'center',
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: palette.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  uploadDescription: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  uploadButton: {
    alignSelf: 'center',
    minWidth: 190,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textOnCard,
  },

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
  billingSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    marginBottom: spacing.lg,
  },
  billingSummaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryAlpha12,
  },
  billingSummaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  billingSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
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
  billingStatusList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  billingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  billingStatusText: {
    flex: 1,
    fontSize: 14,
    fontFamily: palette.fontSans,
    lineHeight: 20,
    color: palette.textPrimary,
  },
  billingCta: {
    alignSelf: 'flex-start',
  },

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
  notificationInfoCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.backgroundMuted,
    padding: spacing.lg,
    gap: spacing.md,
  },
  notificationInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  notificationInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryAlpha12,
  },
  notificationInfoCopy: {
    flex: 1,
    gap: 4,
  },
  notificationInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    color: palette.textPrimary,
  },
  notificationInfoDescription: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    lineHeight: 21,
    color: palette.textSecondary,
  },
  notificationStatusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: palette.primaryAlpha12,
    borderWidth: 1,
    borderColor: palette.primaryMuted,
  },
  notificationStatusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: palette.fontSansBold,
    color: palette.primary,
  },
  notificationInfoList: {
    gap: spacing.sm,
  },
  notificationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationInfoRowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: palette.fontSans,
    color: palette.textPrimary,
    lineHeight: 20,
  },
  notificationInfoHint: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    lineHeight: 19,
    color: palette.textMuted,
  },
  privacySection: {
    marginBottom: spacing.md,
  },
  privacyLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textSecondary,
    marginBottom: spacing.sm,
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

  // ===== SAVE BUTTON =====
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: palette.cardBg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    alignItems: 'center',
    ...shadows.lg,
  },
  saveButtonContainerDesktop: {
    right: 380, // Account for preview sidebar
  },
  saveButtonInner: {
    width: '100%',
    alignItems: 'center',
  },
  saveButton: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: palette.textOnCard,
  },
  saveButtonTextDisabled: {
    color: palette.textMuted,
  },

  // ===== LOCATION & MODALITY =====
  modalityOptions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    backgroundColor: palette.cardBg,
  },
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
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formFieldHalf: {
    flex: 1,
  },
  mapPreviewContainer: {
    marginTop: spacing.md,
  },
  fieldHelper: {
    fontSize: 13,
    fontFamily: palette.fontSans,
    color: palette.textMuted,
    marginBottom: spacing.sm,
  },

  // ===== PROFESSIONAL VERIFICATION STATUS BANNER =====
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  verificationBannerVerified: {
    backgroundColor: palette.successLight,
    borderWidth: 1,
    borderColor: palette.success,
  },
  verificationBannerPending: {
    backgroundColor: 'rgba(139, 168, 196, 0.15)',
    borderWidth: 1,
    borderColor: palette.info,
  },
  verificationBannerRejected: {
    backgroundColor: palette.warningLight,
    borderWidth: 1,
    borderColor: palette.warning,
  },
  verificationBannerNotSubmitted: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
  },
  verificationBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  verificationBannerContent: {
    flex: 1,
  },
  verificationBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: palette.fontHeading,
    marginBottom: spacing.xs,
  },
  verificationBannerTitleVerified: {
    color: palette.success,
  },
  verificationBannerTitlePending: {
    color: palette.info,
  },
  verificationBannerTitleRejected: {
    color: palette.warning,
  },
  verificationBannerTitleNotSubmitted: {
    color: palette.textPrimary,
  },
  verificationBannerText: {
    fontSize: 14,
    fontFamily: palette.fontSans,
    color: palette.textSecondary,
    lineHeight: 20,
  },
  verificationResubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  verificationSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  verificationResubmitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: palette.fontSansSemiBold,
    color: '#FFFFFF',
  },

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
