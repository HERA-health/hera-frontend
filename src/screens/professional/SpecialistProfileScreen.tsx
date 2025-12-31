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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';
import { shadows, spacing, borderRadius, typography } from '../../constants/colors';
import * as professionalService from '../../services/professionalService';
import { SpecialistProfileData as ServiceProfileData } from '../../services/professionalService';

// ============================================================================
// DESIGN TOKENS - HERA Specialist Profile Theme
// ============================================================================

const profileTheme = {
  // Backgrounds - #F5F7F5 is THE ABSOLUTE TRUTH
  background: '#F5F7F5',        // Light Sage - THE ONE TRUE BACKGROUND
  cardBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
  inputBackgroundDisabled: '#F5F7F5',

  // Primary Actions
  primary: '#8B9D83',           // Sage Green
  primaryHover: '#7A8B74',
  primaryMuted: '#E8F5E8',      // Light sage tint

  // Text Hierarchy
  textDark: '#2C3E2C',          // Forest - headings
  textMedium: '#6B7B6B',        // Gray - body
  textLight: '#9BA39B',         // Subtle gray - helpers
  textOnPrimary: '#FFFFFF',

  // Borders & Dividers
  border: '#E8EBE8',
  borderFocus: '#8B9D83',

  // Status Colors
  success: '#7BA377',           // Green - verified
  error: '#E89D88',             // Coral - error/missing
  warning: '#D9A84F',           // Amber - pending
  info: '#8BA8C4',

  // Progress
  progressComplete: '#8B9D83',
  progressIncomplete: '#E8EBE8',

  // Scrollbar
  scrollbarTrack: '#F0F2F0',
  scrollbarThumb: '#C5CFC5',
  scrollbarThumbHover: '#8B9D83',
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ProfileTab = 'information' | 'credentials' | 'pricing' | 'account';

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

interface Certificate {
  id: string;
  name: string;
  issuer: string;
  validUntil: string | null;
}

interface SpecialistProfileData {
  // Basic Info
  fullName: string;
  professionalTitle: string;
  licenseNumber: string;
  licenseVerified: boolean;
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
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  profileVisible: boolean;
  showReviewCount: boolean;
  showLastOnline: boolean;
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
// MAIN COMPONENT
// ============================================================================

export function SpecialistProfileScreen() {
  const { user, updateUser } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isMobile = windowWidth < 768;

  const [activeTab, setActiveTab] = useState<ProfileTab>('information');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(!isMobile);
  const [isLoading, setIsLoading] = useState(true);

  // Profile data state
  const [profileData, setProfileData] = useState<SpecialistProfileData>({
    // Basic Info
    fullName: user?.name || '',
    professionalTitle: 'Psicóloga Clínica',
    licenseNumber: '',
    licenseVerified: false,
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
    emailVerified: true,
    phone: user?.phone || '',
    phoneVerified: false,
    twoFactorEnabled: false,
    profileVisible: true,
    showReviewCount: true,
    showLastOnline: false,
  });

  const [originalData, setOriginalData] = useState<SpecialistProfileData>(profileData);

  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    let completed = 0;
    let total = 10;

    if (profileData.fullName) completed++;
    if (profileData.professionalTitle) completed++;
    if (profileData.licenseNumber) completed++;
    if (profileData.bio && profileData.bio.length >= 150) completed++;
    if (profileData.specialties.length > 0) completed++;
    if (profileData.therapeuticApproaches.length > 0) completed++;
    if (profileData.education.length > 0) completed++;
    if (profileData.experience.length > 0) completed++;
    if (profileData.priceStandard) completed++;
    if (profileData.bankIban) completed++;

    return Math.round((completed / total) * 100);
  }, [profileData]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(profileData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [profileData, originalData]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const profile = await professionalService.getComprehensiveProfile();
        if (profile) {
          // Map API data to local state
          const mappedData: SpecialistProfileData = {
            // Basic Info
            fullName: profile.fullName || '',
            professionalTitle: profile.professionalTitle || 'Psicóloga Clínica',
            licenseNumber: profile.licenseNumber || '',
            licenseVerified: profile.licenseVerified || false,
            bio: profile.bio || '',
            avatar: profile.avatar || null,

            // Professional Details
            specialties: profile.specialties || [],
            therapeuticApproaches: profile.therapeuticApproaches || [],
            languages: profile.languages || ['spanish'],
            education: (profile.education as Education[]) || [],
            experience: (profile.experience as Experience[]) || [],

            // Verification
            identityVerified: profile.identityVerified || false,
            insuranceUploaded: profile.insuranceUploaded || false,
            certificates: (profile.certificates as Certificate[]) || [],

            // Pricing
            priceStandard: profile.priceStandard?.toString() || '65',
            priceExtended: profile.priceExtended?.toString() || '95',
            priceFirstSession: profile.priceFirstSession?.toString() || '60',
            offerExtended: profile.offerExtended || false,
            offerFirstSessionDiscount: profile.offerFirstSessionDiscount || false,
            sessionTypes: profile.sessionTypes || ['individual'],
            modalityOnline: profile.modalityOnline?.toString() || '65',
            modalityInPerson: profile.modalityInPerson?.toString() || '70',

            // Payment
            bankIban: profile.bankIban || '',
            bankHolder: profile.bankHolder || '',
            bankVerified: profile.bankVerified || false,
            taxId: profile.taxId || '',
            taxAddress: profile.taxAddress || '',
            taxCity: profile.taxCity || '',
            applyVat: profile.applyVat || false,
            vatRate: profile.vatRate?.toString() || '21',
            applyIrpf: profile.applyIrpf ?? true,

            // Account
            email: profile.email || '',
            emailVerified: profile.emailVerified || true,
            phone: profile.phone || '',
            phoneVerified: profile.phoneVerified || false,
            twoFactorEnabled: profile.twoFactorEnabled || false,
            profileVisible: profile.profileVisible ?? true,
            showReviewCount: profile.showReviewCount ?? true,
            showLastOnline: profile.showLastOnline || false,
          };

          setProfileData(mappedData);
          setOriginalData(mappedData);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        // Keep default values on error
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

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

    setIsSaving(true);
    try {
      // Transform local state to API format
      const updateData: Partial<ServiceProfileData> = {
        fullName: profileData.fullName,
        professionalTitle: profileData.professionalTitle,
        licenseNumber: profileData.licenseNumber,
        bio: profileData.bio,
        avatar: profileData.avatar,

        specialties: profileData.specialties,
        therapeuticApproaches: profileData.therapeuticApproaches,
        languages: profileData.languages,
        education: profileData.education,
        experience: profileData.experience,

        priceStandard: parseFloat(profileData.priceStandard) || 65,
        priceExtended: profileData.offerExtended ? (parseFloat(profileData.priceExtended) || null) : null,
        priceFirstSession: profileData.offerFirstSessionDiscount ? (parseFloat(profileData.priceFirstSession) || null) : null,
        offerExtended: profileData.offerExtended,
        offerFirstSessionDiscount: profileData.offerFirstSessionDiscount,
        sessionTypes: profileData.sessionTypes,
        modalityOnline: parseFloat(profileData.modalityOnline) || 65,
        modalityInPerson: parseFloat(profileData.modalityInPerson) || 70,

        bankIban: profileData.bankIban,
        bankHolder: profileData.bankHolder,
        taxId: profileData.taxId,
        taxAddress: profileData.taxAddress,
        taxCity: profileData.taxCity,
        applyVat: profileData.applyVat,
        vatRate: parseFloat(profileData.vatRate) || 21,
        applyIrpf: profileData.applyIrpf,

        phone: profileData.phone,
        profileVisible: profileData.profileVisible,
        showReviewCount: profileData.showReviewCount,
        showLastOnline: profileData.showLastOnline,
      };

      await professionalService.updateComprehensiveProfile(updateData);

      setOriginalData(profileData);
      Alert.alert('Cambios guardados', 'Tu perfil ha sido actualizado correctamente');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, profileData]);

  const handleImagePick = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateField('avatar', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  }, [updateField]);

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

  const updateExperience = useCallback((id: string, field: keyof Experience, value: any) => {
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

  const tabs: { id: ProfileTab; label: string; icon: string }[] = [
    { id: 'information', label: 'Información Profesional', icon: 'person-outline' },
    { id: 'credentials', label: 'Credenciales', icon: 'shield-checkmark-outline' },
    { id: 'pricing', label: 'Tarifas y Pagos', icon: 'card-outline' },
    { id: 'account', label: 'Cuenta', icon: 'settings-outline' },
  ];

  const renderTabNavigation = () => (
    <View style={[styles.tabsContainer, isDesktop && styles.tabsContainerDesktop]}>
      <ScrollView
        horizontal={!isDesktop}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={isDesktop ? styles.tabsDesktop : styles.tabsMobile}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              isDesktop && styles.tabDesktop,
              activeTab === tab.id && styles.tabActive,
              isDesktop && activeTab === tab.id && styles.tabActiveDesktop,
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={isDesktop ? 20 : 18}
              color={activeTab === tab.id ? profileTheme.primary : profileTheme.textMedium}
            />
            <Text
              style={[
                styles.tabText,
                isDesktop && styles.tabTextDesktop,
                activeTab === tab.id && styles.tabTextActive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ============================================================================
  // RENDER: PROFILE PREVIEW SIDEBAR
  // ============================================================================

  const renderProfilePreview = () => (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        <Ionicons name="eye-outline" size={18} color={profileTheme.textMedium} />
        <Text style={styles.previewTitle}>Vista previa pública</Text>
      </View>

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
            <LinearGradient
              colors={[profileTheme.primary, profileTheme.primaryHover]}
              style={styles.previewAvatar}
            >
              <Text style={styles.previewAvatarText}>
                {profileData.fullName.charAt(0).toUpperCase() || 'P'}
              </Text>
            </LinearGradient>
          )}
          <Text style={styles.previewName} numberOfLines={1}>
            {profileData.fullName || 'Tu nombre'}
          </Text>
          <Text style={styles.previewTitle2} numberOfLines={1}>
            {profileData.professionalTitle || 'Título profesional'}
          </Text>
        </View>

        {/* Rating & Price */}
        <View style={styles.previewStats}>
          <View style={styles.previewStat}>
            <Text style={styles.previewStatValue}>⭐ 4.8</Text>
            <Text style={styles.previewStatLabel}>(127 reseñas)</Text>
          </View>
          <View style={styles.previewStatDivider} />
          <View style={styles.previewStat}>
            <Text style={styles.previewStatValue}>€{profileData.priceStandard || '65'}</Text>
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
          {profileData.licenseVerified && (
            <View style={styles.previewBadge}>
              <Ionicons name="checkmark-circle" size={14} color={profileTheme.success} />
              <Text style={styles.previewBadgeText}>Colegiado verificado</Text>
            </View>
          )}
          {profileData.identityVerified && (
            <View style={styles.previewBadge}>
              <Ionicons name="checkmark-circle" size={14} color={profileTheme.success} />
              <Text style={styles.previewBadgeText}>Identidad verificada</Text>
            </View>
          )}
        </View>

        {/* View Full Profile Button */}
        <TouchableOpacity style={styles.previewButton} activeOpacity={0.7}>
          <Text style={styles.previewButtonText}>Ver perfil completo</Text>
          <Ionicons name="arrow-forward" size={16} color={profileTheme.primary} />
        </TouchableOpacity>
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
                color={verified ? profileTheme.success : profileTheme.warning}
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
          placeholderTextColor={profileTheme.textLight}
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
          const isDisabled = !isSelected && maxSelections && selectedValues.length >= maxSelections;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                isDisabled && styles.chipDisabled,
              ]}
              onPress={() => !isDisabled && toggleMultiSelect(field, option.value)}
              activeOpacity={0.7}
              disabled={isDisabled}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={profileTheme.textOnPrimary} />
              )}
              <Text style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
                isDisabled && styles.chipTextDisabled,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
              <LinearGradient
                colors={[profileTheme.primary, profileTheme.primaryHover]}
                style={styles.avatarLarge}
              >
                <Text style={styles.avatarLargeText}>
                  {profileData.fullName.charAt(0).toUpperCase() || 'P'}
                </Text>
              </LinearGradient>
            )}
          </View>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoButton} onPress={handleImagePick} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={18} color={profileTheme.primary} />
              <Text style={styles.photoButtonText}>Cambiar foto</Text>
            </TouchableOpacity>
            {profileData.avatar && (
              <TouchableOpacity
                style={[styles.photoButton, styles.photoButtonDanger]}
                onPress={() => updateField('avatar', null)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color={profileTheme.error} />
                <Text style={[styles.photoButtonText, styles.photoButtonTextDanger]}>Eliminar</Text>
              </TouchableOpacity>
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
            { placeholder: 'Dr. Elena Rodríguez García', required: true }
          )}
          {renderFormField(
            'Título profesional',
            profileData.professionalTitle,
            (text) => updateField('professionalTitle', text),
            { placeholder: 'Psicóloga Clínica', required: true }
          )}
          {renderFormField(
            'Número de colegiado',
            profileData.licenseNumber,
            (text) => updateField('licenseNumber', text),
            {
              placeholder: 'M-12345',
              required: true,
              verified: profileData.licenseVerified,
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
          <TouchableOpacity style={styles.addButton} onPress={addEducation} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={profileTheme.primary} />
            <Text style={styles.addButtonText}>Añadir título</Text>
          </TouchableOpacity>
        </View>

        {profileData.education.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={40} color={profileTheme.textLight} />
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
                  <Ionicons name="school" size={20} color={profileTheme.primary} />
                </View>
                <View style={styles.itemContent}>
                  <TextInput
                    style={styles.itemInput}
                    value={edu.degree}
                    onChangeText={(text) => updateEducation(edu.id, 'degree', text)}
                    placeholder="Título (ej: Máster en Psicología Clínica)"
                    placeholderTextColor={profileTheme.textLight}
                  />
                  <TextInput
                    style={styles.itemInputSmall}
                    value={edu.institution}
                    onChangeText={(text) => updateEducation(edu.id, 'institution', text)}
                    placeholder="Institución"
                    placeholderTextColor={profileTheme.textLight}
                  />
                  <View style={styles.itemRow}>
                    <TextInput
                      style={[styles.itemInputSmall, styles.itemInputYear]}
                      value={edu.startYear}
                      onChangeText={(text) => updateEducation(edu.id, 'startYear', text)}
                      placeholder="Año inicio"
                      placeholderTextColor={profileTheme.textLight}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.itemSeparator}>-</Text>
                    <TextInput
                      style={[styles.itemInputSmall, styles.itemInputYear]}
                      value={edu.endYear}
                      onChangeText={(text) => updateEducation(edu.id, 'endYear', text)}
                      placeholder="Año fin"
                      placeholderTextColor={profileTheme.textLight}
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
                  <Ionicons name="close-circle" size={22} color={profileTheme.error} />
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
          <TouchableOpacity style={styles.addButton} onPress={addExperience} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={profileTheme.primary} />
            <Text style={styles.addButtonText}>Añadir experiencia</Text>
          </TouchableOpacity>
        </View>

        {profileData.experience.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={40} color={profileTheme.textLight} />
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
                  <Ionicons name="briefcase" size={20} color={profileTheme.primary} />
                </View>
                <View style={styles.itemContent}>
                  <TextInput
                    style={styles.itemInput}
                    value={exp.position}
                    onChangeText={(text) => updateExperience(exp.id, 'position', text)}
                    placeholder="Puesto (ej: Psicóloga Clínica)"
                    placeholderTextColor={profileTheme.textLight}
                  />
                  <TextInput
                    style={styles.itemInputSmall}
                    value={exp.organization}
                    onChangeText={(text) => updateExperience(exp.id, 'organization', text)}
                    placeholder="Organización"
                    placeholderTextColor={profileTheme.textLight}
                  />
                  <View style={styles.itemRow}>
                    <TextInput
                      style={[styles.itemInputSmall, styles.itemInputYear]}
                      value={exp.startYear}
                      onChangeText={(text) => updateExperience(exp.id, 'startYear', text)}
                      placeholder="Inicio"
                      placeholderTextColor={profileTheme.textLight}
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
                        placeholderTextColor={profileTheme.textLight}
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
                        color={profileTheme.primary}
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
                  <Ionicons name="close-circle" size={22} color={profileTheme.error} />
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

  const renderCredentialsTab = () => (
    <View style={styles.tabContent}>
      {/* Verification Status Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado de verificación</Text>
        <View style={styles.verificationOverview}>
          <View style={styles.verificationItem}>
            <Ionicons
              name={profileData.identityVerified ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={profileData.identityVerified ? profileTheme.success : profileTheme.warning}
            />
            <View style={styles.verificationItemContent}>
              <Text style={styles.verificationItemTitle}>Identidad verificada</Text>
              <Text style={styles.verificationItemStatus}>
                {profileData.identityVerified ? 'Completado' : 'Pendiente de verificar'}
              </Text>
            </View>
          </View>
          <View style={styles.verificationItem}>
            <Ionicons
              name={profileData.licenseVerified ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={profileData.licenseVerified ? profileTheme.success : profileTheme.warning}
            />
            <View style={styles.verificationItemContent}>
              <Text style={styles.verificationItemTitle}>Número de colegiado validado</Text>
              <Text style={styles.verificationItemStatus}>
                {profileData.licenseVerified ? 'Verificado' : 'En revisión'}
              </Text>
            </View>
          </View>
          <View style={styles.verificationItem}>
            <Ionicons
              name={profileData.insuranceUploaded ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={profileData.insuranceUploaded ? profileTheme.success : profileTheme.error}
            />
            <View style={styles.verificationItemContent}>
              <Text style={styles.verificationItemTitle}>Seguro profesional</Text>
              <Text style={styles.verificationItemStatus}>
                {profileData.insuranceUploaded ? 'Subido' : 'Pendiente de subir'}
              </Text>
            </View>
          </View>

          {/* Profile Completion Bar */}
          <View style={styles.completionSection}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Perfil completado</Text>
              <Text style={styles.completionValue}>{profileCompletion}%</Text>
            </View>
            <View style={styles.completionBar}>
              <View style={[styles.completionFill, { width: `${profileCompletion}%` }]} />
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
                name={profileData.identityVerified ? 'shield-checkmark' : 'shield'}
                size={32}
                color={profileData.identityVerified ? profileTheme.success : profileTheme.textMedium}
              />
            </View>
            <View style={styles.verificationCardContent}>
              <Text style={styles.verificationCardTitle}>DNI/NIE</Text>
              <Text style={styles.verificationCardStatus}>
                {profileData.identityVerified
                  ? 'Verificado el 10 Oct 2024'
                  : 'Sube tu documento de identidad'}
              </Text>
            </View>
            <TouchableOpacity style={styles.verificationCardButton} activeOpacity={0.7}>
              <Text style={styles.verificationCardButtonText}>
                {profileData.identityVerified ? 'Actualizar' : 'Verificar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Professional Insurance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguro de responsabilidad civil</Text>
        <View style={styles.formCard}>
          {profileData.insuranceUploaded ? (
            <View style={styles.documentCard}>
              <View style={styles.documentIcon}>
                <Ionicons name="document-text" size={24} color={profileTheme.primary} />
              </View>
              <View style={styles.documentContent}>
                <Text style={styles.documentTitle}>Póliza de seguro</Text>
                <Text style={styles.documentMeta}>Subido el 15 Nov 2024</Text>
              </View>
              <View style={styles.documentActions}>
                <TouchableOpacity style={styles.documentAction} activeOpacity={0.7}>
                  <Ionicons name="eye-outline" size={20} color={profileTheme.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.documentAction} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={20} color={profileTheme.error} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.uploadArea}>
              <Ionicons name="cloud-upload-outline" size={40} color={profileTheme.textLight} />
              <Text style={styles.uploadTitle}>Subir póliza de seguro</Text>
              <Text style={styles.uploadDescription}>
                Requerido para ofrecer sesiones presenciales
              </Text>
              <TouchableOpacity style={styles.uploadButton} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={profileTheme.textOnPrimary} />
                <Text style={styles.uploadButtonText}>Subir documento</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Certificates */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Certificados y acreditaciones</Text>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={profileTheme.primary} />
            <Text style={styles.addButtonText}>Añadir certificado</Text>
          </TouchableOpacity>
        </View>

        {profileData.certificates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={40} color={profileTheme.textLight} />
            <Text style={styles.emptyStateTitle}>No has añadido certificados</Text>
            <Text style={styles.emptyStateDescription}>
              Añade tus certificaciones profesionales para aumentar la confianza.
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {profileData.certificates.map((cert) => (
              <View key={cert.id} style={styles.documentCard}>
                <View style={styles.documentIcon}>
                  <Ionicons name="ribbon" size={24} color={profileTheme.primary} />
                </View>
                <View style={styles.documentContent}>
                  <Text style={styles.documentTitle}>{cert.name}</Text>
                  <Text style={styles.documentMeta}>{cert.issuer}</Text>
                  {cert.validUntil && (
                    <Text style={styles.documentMeta}>Válido hasta: {cert.validUntil}</Text>
                  )}
                </View>
                <View style={styles.documentActions}>
                  <TouchableOpacity style={styles.documentAction} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={20} color={profileTheme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.documentAction} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={20} color={profileTheme.error} />
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
      {/* Session Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tarifas de sesión</Text>
        <View style={styles.formCard}>
          <View style={styles.priceRow}>
            {renderFormField(
              '60 minutos (estándar)',
              profileData.priceStandard,
              (text) => updateField('priceStandard', text.replace(/[^0-9]/g, '')),
              { placeholder: '65', keyboardType: 'numeric', required: true }
            )}
            <Text style={styles.priceCurrency}>€ / sesión</Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => updateField('offerExtended', !profileData.offerExtended)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.offerExtended ? 'checkbox' : 'square-outline'}
                size={22}
                color={profileTheme.primary}
              />
              <Text style={styles.toggleText}>Ofrecer sesión de 90 minutos</Text>
            </TouchableOpacity>
          </View>

          {profileData.offerExtended && (
            <View style={styles.priceRow}>
              {renderFormField(
                '90 minutos (extendida)',
                profileData.priceExtended,
                (text) => updateField('priceExtended', text.replace(/[^0-9]/g, '')),
                { placeholder: '95', keyboardType: 'numeric' }
              )}
              <Text style={styles.priceCurrency}>€ / sesión</Text>
            </View>
          )}

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => updateField('offerFirstSessionDiscount', !profileData.offerFirstSessionDiscount)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.offerFirstSessionDiscount ? 'checkbox' : 'square-outline'}
                size={22}
                color={profileTheme.primary}
              />
              <Text style={styles.toggleText}>Precio especial primera sesión</Text>
            </TouchableOpacity>
          </View>

          {profileData.offerFirstSessionDiscount && (
            <View style={styles.priceRow}>
              {renderFormField(
                'Primera sesión',
                profileData.priceFirstSession,
                (text) => updateField('priceFirstSession', text.replace(/[^0-9]/g, '')),
                { placeholder: '60', keyboardType: 'numeric' }
              )}
              <Text style={styles.priceCurrency}>€ / sesión</Text>
            </View>
          )}
        </View>
      </View>

      {/* Session Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipos de sesión</Text>
        <View style={styles.formCard}>
          {renderChipSelector(
            'Tipos de sesión que ofreces',
            SESSION_TYPES,
            profileData.sessionTypes,
            'sessionTypes'
          )}
        </View>
      </View>

      {/* Modality Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Precios por modalidad</Text>
        <View style={styles.formCard}>
          <View style={styles.priceRow}>
            {renderFormField(
              'Videollamada',
              profileData.modalityOnline,
              (text) => updateField('modalityOnline', text.replace(/[^0-9]/g, '')),
              { placeholder: '65', keyboardType: 'numeric' }
            )}
            <Text style={styles.priceCurrency}>€</Text>
          </View>
          <View style={styles.priceRow}>
            {renderFormField(
              'Presencial',
              profileData.modalityInPerson,
              (text) => updateField('modalityInPerson', text.replace(/[^0-9]/g, '')),
              { placeholder: '70', keyboardType: 'numeric' }
            )}
            <Text style={styles.priceCurrency}>€</Text>
          </View>
          <Text style={styles.fieldHint}>
            Puedes cobrar diferente según la modalidad de la sesión
          </Text>
        </View>
      </View>

      {/* Bank Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta bancaria</Text>
        <View style={styles.formCard}>
          {renderFormField(
            'IBAN',
            profileData.bankIban,
            (text) => updateField('bankIban', text.toUpperCase()),
            {
              placeholder: 'ES00 0000 0000 0000 0000 0000',
              verified: profileData.bankVerified,
            }
          )}
          {renderFormField(
            'Titular de la cuenta',
            profileData.bankHolder,
            (text) => updateField('bankHolder', text),
            { placeholder: 'Elena Rodríguez García' }
          )}
        </View>
      </View>

      {/* Tax Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos fiscales</Text>
        <View style={styles.formCard}>
          {renderFormField(
            'NIF/CIF',
            profileData.taxId,
            (text) => updateField('taxId', text.toUpperCase()),
            { placeholder: '12345678X' }
          )}
          {renderFormField(
            'Dirección fiscal',
            profileData.taxAddress,
            (text) => updateField('taxAddress', text),
            { placeholder: 'Calle Principal 123' }
          )}
          {renderFormField(
            'Ciudad y código postal',
            profileData.taxCity,
            (text) => updateField('taxCity', text),
            { placeholder: '28001 Madrid' }
          )}

          <View style={styles.taxSection}>
            <Text style={styles.taxLabel}>IVA</Text>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => updateField('applyVat', false)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={!profileData.applyVat ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={profileTheme.primary}
              />
              <Text style={styles.radioText}>No aplicar IVA (profesional exento)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => updateField('applyVat', true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.applyVat ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={profileTheme.primary}
              />
              <Text style={styles.radioText}>Aplicar 21% IVA</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => updateField('applyIrpf', !profileData.applyIrpf)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.applyIrpf ? 'checkbox' : 'square-outline'}
                size={22}
                color={profileTheme.primary}
              />
              <Text style={styles.toggleText}>Retención del 15% IRPF en facturas</Text>
            </TouchableOpacity>
          </View>
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
              verified: profileData.emailVerified,
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
          <View style={styles.accountActions}>
            <TouchableOpacity style={styles.accountAction} activeOpacity={0.7}>
              <Text style={styles.accountActionText}>Cambiar email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountAction} activeOpacity={0.7}>
              <Text style={styles.accountActionText}>Cambiar teléfono</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Password & Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contraseña y seguridad</Text>
        <View style={styles.formCard}>
          <View style={styles.passwordRow}>
            <View style={styles.passwordInfo}>
              <Text style={styles.passwordLabel}>Contraseña</Text>
              <Text style={styles.passwordValue}>••••••••••••</Text>
              <Text style={styles.passwordMeta}>Última actualización: Hace 3 meses</Text>
            </View>
            <TouchableOpacity style={styles.changePasswordButton} activeOpacity={0.7}>
              <Text style={styles.changePasswordText}>Cambiar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityRow}>
            <View style={styles.securityInfo}>
              <Ionicons
                name={profileData.twoFactorEnabled ? 'shield-checkmark' : 'shield'}
                size={24}
                color={profileData.twoFactorEnabled ? profileTheme.success : profileTheme.textMedium}
              />
              <View>
                <Text style={styles.securityLabel}>Autenticación de dos factores</Text>
                <Text style={styles.securityStatus}>
                  {profileData.twoFactorEnabled ? 'Activada' : 'No activada'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.securityButton} activeOpacity={0.7}>
              <Text style={styles.securityButtonText}>
                {profileData.twoFactorEnabled ? 'Gestionar' : 'Activar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        <View style={styles.formCard}>
          <Text style={styles.notificationCategory}>Email</Text>
          <View style={styles.notificationToggle}>
            <Text style={styles.notificationLabel}>Nuevas reservas</Text>
            <TouchableOpacity style={styles.switchTrack} activeOpacity={0.7}>
              <View style={[styles.switchThumb, styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
          <View style={styles.notificationToggle}>
            <Text style={styles.notificationLabel}>Cancelaciones</Text>
            <TouchableOpacity style={styles.switchTrack} activeOpacity={0.7}>
              <View style={[styles.switchThumb, styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
          <View style={styles.notificationToggle}>
            <Text style={styles.notificationLabel}>Mensajes de clientes</Text>
            <TouchableOpacity style={styles.switchTrack} activeOpacity={0.7}>
              <View style={[styles.switchThumb, styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.notificationCategory, { marginTop: spacing.lg }]}>Push</Text>
          <View style={styles.notificationToggle}>
            <Text style={styles.notificationLabel}>Recordatorios de sesión (30min antes)</Text>
            <TouchableOpacity style={styles.switchTrack} activeOpacity={0.7}>
              <View style={[styles.switchThumb, styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidad</Text>
        <View style={styles.formCard}>
          <View style={styles.privacySection}>
            <Text style={styles.privacyLabel}>Perfil público</Text>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => updateField('profileVisible', true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.profileVisible ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={profileTheme.primary}
              />
              <Text style={styles.radioText}>Visible (aparecer en búsquedas)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => updateField('profileVisible', false)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={!profileData.profileVisible ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={profileTheme.primary}
              />
              <Text style={styles.radioText}>Oculto (solo enlace directo)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => updateField('showReviewCount', !profileData.showReviewCount)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.showReviewCount ? 'checkbox' : 'square-outline'}
                size={22}
                color={profileTheme.primary}
              />
              <Text style={styles.toggleText}>Mostrar número de reseñas</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => updateField('showLastOnline', !profileData.showLastOnline)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={profileData.showLastOnline ? 'checkbox' : 'square-outline'}
                size={22}
                color={profileTheme.primary}
              />
              <Text style={styles.toggleText}>Mostrar última conexión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones de cuenta</Text>
        <View style={styles.formCard}>
          <TouchableOpacity style={styles.accountLink} activeOpacity={0.7}>
            <Ionicons name="download-outline" size={20} color={profileTheme.textMedium} />
            <Text style={styles.accountLinkText}>Descargar mis datos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.accountLink} activeOpacity={0.7}>
            <Ionicons name="pause-circle-outline" size={20} color={profileTheme.warning} />
            <Text style={styles.accountLinkText}>Pausar cuenta temporalmente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.accountLink, styles.accountLinkDanger]} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={profileTheme.error} />
            <Text style={[styles.accountLinkText, styles.accountLinkTextDanger]}>Eliminar cuenta</Text>
          </TouchableOpacity>
          <Text style={styles.accountWarning}>
            Las acciones permanentes requieren confirmación
          </Text>
        </View>
      </View>
    </View>
  );

  // ============================================================================
  // RENDER: SAVE BUTTON (Fixed at bottom)
  // ============================================================================

  const renderSaveButton = () => (
    <View style={[styles.saveButtonContainer, isDesktop && styles.saveButtonContainerDesktop]}>
      <TouchableOpacity
        style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!hasChanges || isSaving}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={profileTheme.textOnPrimary} />
        ) : (
          <>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={hasChanges ? profileTheme.textOnPrimary : profileTheme.textLight}
            />
            <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
              Guardar cambios
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={profileTheme.primary} />
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
          style={[styles.formArea, isDesktop && showPreview && styles.formAreaWithPreview]}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={true}
        >
          {activeTab === 'information' && renderInformationTab()}
          {activeTab === 'credentials' && renderCredentialsTab()}
          {activeTab === 'pricing' && renderPricingTab()}
          {activeTab === 'account' && renderAccountTab()}

          {/* Spacer for save button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Preview Sidebar (Desktop only) */}
        {isDesktop && showPreview && renderProfilePreview()}

        {/* Mobile Preview Toggle */}
        {isMobile && (
          <TouchableOpacity
            style={styles.previewToggle}
            onPress={() => setShowPreview(!showPreview)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={20} color={profileTheme.textOnPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Save Button */}
      {renderSaveButton()}

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
                  <Ionicons name="close" size={24} color={profileTheme.textDark} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: profileTheme.background, // #F5F7F5 - THE ABSOLUTE TRUTH
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: profileTheme.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: profileTheme.textMedium,
  },

  // ===== TAB NAVIGATION =====
  tabsContainer: {
    backgroundColor: profileTheme.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: profileTheme.border,
  },
  tabsContainerDesktop: {
    borderBottomWidth: 2,
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
    backgroundColor: profileTheme.cardBackground,
    borderWidth: 1,
    borderColor: profileTheme.border,
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
    backgroundColor: profileTheme.primaryMuted,
    borderColor: profileTheme.primary,
  },
  tabActiveDesktop: {
    backgroundColor: 'transparent',
    borderBottomColor: profileTheme.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: profileTheme.textMedium,
  },
  tabTextDesktop: {
    fontSize: 15,
  },
  tabTextActive: {
    color: profileTheme.textDark,
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
    padding: spacing.lg,
    paddingBottom: 120,
  },

  // ===== PREVIEW SIDEBAR =====
  previewContainer: {
    flex: 0.4,
    backgroundColor: profileTheme.cardBackground,
    borderLeftWidth: 1,
    borderLeftColor: profileTheme.border,
    maxWidth: 380,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: profileTheme.border,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textMedium,
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
    color: profileTheme.textOnPrimary,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '700',
    color: profileTheme.textDark,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  previewTitle2: {
    fontSize: 15,
    color: profileTheme.textMedium,
    textAlign: 'center',
  },
  previewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: profileTheme.background,
    borderRadius: borderRadius.lg,
  },
  previewStat: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  previewStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: profileTheme.textDark,
  },
  previewStatLabel: {
    fontSize: 12,
    color: profileTheme.textMedium,
  },
  previewStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: profileTheme.border,
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
    backgroundColor: profileTheme.primaryMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  previewTagMore: {
    backgroundColor: profileTheme.border,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: profileTheme.primary,
  },
  previewBio: {
    fontSize: 14,
    color: profileTheme.textMedium,
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
    color: profileTheme.success,
    fontWeight: '500',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: profileTheme.border,
    borderRadius: borderRadius.md,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.primary,
  },

  // ===== MOBILE PREVIEW =====
  previewToggle: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: profileTheme.primary,
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
    backgroundColor: profileTheme.cardBackground,
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
    borderBottomColor: profileTheme.border,
  },
  previewModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: profileTheme.textDark,
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
    color: profileTheme.textDark,
    marginBottom: spacing.md,
  },

  // ===== FORM CARD =====
  formCard: {
    backgroundColor: profileTheme.cardBackground,
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
    color: profileTheme.textMedium,
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: '400',
    color: profileTheme.textLight,
  },
  required: {
    color: profileTheme.error,
  },
  fieldInput: {
    backgroundColor: profileTheme.inputBackground,
    borderWidth: 2,
    borderColor: profileTheme.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    color: profileTheme.textDark,
    minHeight: 48,
  },
  fieldInputDisabled: {
    backgroundColor: profileTheme.inputBackgroundDisabled,
    color: profileTheme.textMedium,
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
    color: profileTheme.textLight,
    fontStyle: 'italic',
  },
  characterCount: {
    fontSize: 12,
    color: profileTheme.textLight,
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
  },
  verifiedTextSuccess: {
    color: profileTheme.success,
  },
  verifiedTextPending: {
    color: profileTheme.warning,
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
    backgroundColor: profileTheme.background,
    borderWidth: 2,
    borderColor: profileTheme.border,
    gap: spacing.xs,
  },
  chipSelected: {
    backgroundColor: profileTheme.primary,
    borderColor: profileTheme.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: profileTheme.textMedium,
  },
  chipTextSelected: {
    color: profileTheme.textOnPrimary,
  },
  chipTextDisabled: {
    color: profileTheme.textLight,
  },

  // ===== PHOTO SECTION =====
  photoSection: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: profileTheme.cardBackground,
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
    color: profileTheme.textOnPrimary,
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
    borderColor: profileTheme.border,
  },
  photoButtonDanger: {
    borderColor: profileTheme.error,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.primary,
  },
  photoButtonTextDanger: {
    color: profileTheme.error,
  },
  photoHint: {
    fontSize: 12,
    color: profileTheme.textLight,
    textAlign: 'center',
  },

  // ===== EMPTY STATE =====
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: profileTheme.cardBackground,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: profileTheme.textDark,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: profileTheme.textMedium,
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
    color: profileTheme.primary,
  },

  // ===== ITEMS LIST (Education/Experience) =====
  itemsList: {
    gap: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: profileTheme.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: profileTheme.primaryMuted,
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
    color: profileTheme.textDark,
    borderBottomWidth: 1,
    borderBottomColor: profileTheme.border,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemInputSmall: {
    fontSize: 14,
    color: profileTheme.textMedium,
    borderBottomWidth: 1,
    borderBottomColor: profileTheme.border,
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
    color: profileTheme.textLight,
  },
  itemRemove: {
    padding: spacing.xs,
  },
  currentBadge: {
    backgroundColor: profileTheme.primaryMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: profileTheme.primary,
  },
  currentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  currentToggleText: {
    fontSize: 13,
    color: profileTheme.textMedium,
  },

  // ===== VERIFICATION =====
  verificationOverview: {
    backgroundColor: profileTheme.cardBackground,
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
    borderBottomColor: profileTheme.border,
  },
  verificationItemContent: {
    flex: 1,
  },
  verificationItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: profileTheme.textDark,
  },
  verificationItemStatus: {
    fontSize: 13,
    color: profileTheme.textMedium,
  },
  completionSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: profileTheme.border,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  completionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textMedium,
  },
  completionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: profileTheme.primary,
  },
  completionBar: {
    height: 8,
    backgroundColor: profileTheme.progressIncomplete,
    borderRadius: 4,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: profileTheme.progressComplete,
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
    backgroundColor: profileTheme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationCardContent: {
    flex: 1,
  },
  verificationCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: profileTheme.textDark,
  },
  verificationCardStatus: {
    fontSize: 13,
    color: profileTheme.textMedium,
  },
  verificationCardButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: profileTheme.primary,
  },
  verificationCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textOnPrimary,
  },

  // ===== DOCUMENT CARD =====
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: profileTheme.background,
    borderRadius: borderRadius.md,
  },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: profileTheme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentContent: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: profileTheme.textDark,
  },
  documentMeta: {
    fontSize: 13,
    color: profileTheme.textMedium,
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
    borderColor: profileTheme.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: profileTheme.textDark,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  uploadDescription: {
    fontSize: 14,
    color: profileTheme.textMedium,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: profileTheme.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textOnPrimary,
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
    color: profileTheme.textMedium,
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
    color: profileTheme.textDark,
  },
  taxSection: {
    marginBottom: spacing.md,
  },
  taxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textMedium,
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
    color: profileTheme.textDark,
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
    color: profileTheme.primary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: profileTheme.border,
    marginBottom: spacing.lg,
  },
  passwordInfo: {},
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textMedium,
    marginBottom: spacing.xs,
  },
  passwordValue: {
    fontSize: 16,
    fontWeight: '600',
    color: profileTheme.textDark,
    marginBottom: spacing.xs,
  },
  passwordMeta: {
    fontSize: 12,
    color: profileTheme.textLight,
  },
  changePasswordButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: profileTheme.border,
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textMedium,
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
    color: profileTheme.textDark,
  },
  securityStatus: {
    fontSize: 13,
    color: profileTheme.textMedium,
  },
  securityButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: profileTheme.primary,
  },
  securityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textOnPrimary,
  },
  notificationCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: profileTheme.textMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  notificationLabel: {
    fontSize: 15,
    color: profileTheme.textDark,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: profileTheme.primary,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: profileTheme.cardBackground,
    ...shadows.sm,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  privacySection: {
    marginBottom: spacing.md,
  },
  privacyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: profileTheme.textMedium,
    marginBottom: spacing.sm,
  },
  accountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: profileTheme.border,
  },
  accountLinkDanger: {
    borderBottomWidth: 0,
  },
  accountLinkText: {
    fontSize: 15,
    color: profileTheme.textDark,
  },
  accountLinkTextDanger: {
    color: profileTheme.error,
  },
  accountWarning: {
    fontSize: 12,
    color: profileTheme.textLight,
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
    backgroundColor: profileTheme.cardBackground,
    borderTopWidth: 1,
    borderTopColor: profileTheme.border,
    ...shadows.lg,
  },
  saveButtonContainerDesktop: {
    right: 380, // Account for preview sidebar
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: profileTheme.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  saveButtonDisabled: {
    backgroundColor: profileTheme.border,
    ...shadows.none,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: profileTheme.textOnPrimary,
  },
  saveButtonTextDisabled: {
    color: profileTheme.textLight,
  },
});

export default SpecialistProfileScreen;
