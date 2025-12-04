/**
 * ProfileScreen
 * User profile with tabs for information, payment, referrals, and diary
 * Displays editable form fields in a two-column grid layout
 *
 * LAYOUT STRUCTURE:
 * - Header with title and subtitle
 * - Horizontal scrollable tabs (4 tabs)
 * - Avatar section (centered, 120px)
 * - Two-column form grid with all personal information fields
 * - Save button at bottom
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { GradientBackground } from '../../components/common/GradientBackground';
import { colors, spacing, typography, borderRadius, branding } from '../../constants/colors';
import { mockUserProfile } from '../../utils/mockData';
import { ProfileTab } from '../../constants/types';

const ProfileScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('information');
  const [formData, setFormData] = useState({
    fullName: mockUserProfile.fullName,
    email: mockUserProfile.email,
    phone: mockUserProfile.phone,
    birthDate: mockUserProfile.birthDate ? mockUserProfile.birthDate.toLocaleDateString('es-ES') : '',
    gender: mockUserProfile.gender || '',
    occupation: mockUserProfile.occupation || '',
  });

  const handleChangePhoto = () => {
    Alert.alert(
      'Cambiar foto de perfil',
      'Selecciona una opción',
      [
        { text: 'Tomar foto' },
        { text: 'Elegir de galería' },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleSaveProfile = () => {
    Alert.alert('Perfil actualizado', 'Los cambios se han guardado correctamente');
  };

  const handleDatePicker = () => {
    Alert.alert('Selector de fecha', 'Abre el selector de fecha. Esta funcionalidad se implementará próximamente.');
  };

  const handleGenderPicker = () => {
    Alert.alert(
      'Selecciona tu género',
      '',
      [
        { text: 'Masculino', onPress: () => setFormData({ ...formData, gender: 'Masculino' }) },
        { text: 'Femenino', onPress: () => setFormData({ ...formData, gender: 'Femenino' }) },
        { text: 'Otro', onPress: () => setFormData({ ...formData, gender: 'Otro' }) },
        { text: 'Prefiero no decir', onPress: () => setFormData({ ...formData, gender: 'Prefiero no decir' }) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const getGenderDisplay = () => {
    if (!formData.gender) return 'Selecciona género';
    return formData.gender;
  };

  // Render form field with label and input
  const renderFormField = (
    label: string,
    value: string,
    placeholder: string,
    onChangeText: (text: string) => void,
    options?: {
      disabled?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      isPickerField?: boolean;
      onPickerPress?: () => void;
    }
  ) => {
    const { disabled = false, keyboardType = 'default', isPickerField = false, onPickerPress } = options || {};

    return (
      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isPickerField ? (
          <TouchableOpacity
            style={[styles.fieldInput, styles.pickerInput]}
            onPress={onPickerPress}
          >
            <Text style={[styles.pickerText, !value && styles.placeholderText]}>
              {value || placeholder}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.neutral.gray600} />
          </TouchableOpacity>
        ) : (
          <TextInput
            style={[
              styles.fieldInput,
              disabled && styles.fieldInputDisabled,
            ]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral.gray300}
            onChangeText={onChangeText}
            editable={!disabled}
            keyboardType={keyboardType}
          />
        )}
      </View>
    );
  };

  // Information Tab Content
  const renderInformationTab = () => (
    <View style={styles.tabContent}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{mockUserProfile.initial}</Text>
        </View>
        <Button
          variant="outline"
          size="small"
          onPress={handleChangePhoto}
          style={styles.changePhotoButton}
        >
          Cambiar foto
        </Button>
      </View>

      {/* Two-Column Form Grid */}
      <View style={styles.formGrid}>
        {/* Row 1: Nombre completo | Email */}
        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            {renderFormField(
              'Nombre completo',
              formData.fullName,
              'Tu nombre completo',
              (text) => setFormData({ ...formData, fullName: text })
            )}
          </View>
          <View style={styles.formColumn}>
            {renderFormField(
              'Email',
              formData.email,
              'tu@email.com',
              (text) => setFormData({ ...formData, email: text }),
              { disabled: true, keyboardType: 'email-address' }
            )}
          </View>
        </View>

        {/* Row 2: Teléfono | Fecha de nacimiento */}
        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            {renderFormField(
              'Teléfono',
              formData.phone,
              '+34 XXX XXX XXX',
              (text) => setFormData({ ...formData, phone: text }),
              { keyboardType: 'phone-pad' }
            )}
          </View>
          <View style={styles.formColumn}>
            {renderFormField(
              'Fecha de nacimiento',
              formData.birthDate,
              'dd/mm/aaaa',
              () => {},
              { isPickerField: true, onPickerPress: handleDatePicker }
            )}
          </View>
        </View>

        {/* Row 3: Género | Ocupación */}
        <View style={styles.formRow}>
          <View style={styles.formColumn}>
            {renderFormField(
              'Género',
              getGenderDisplay(),
              'Selecciona género',
              () => {},
              { isPickerField: true, onPickerPress: handleGenderPicker }
            )}
          </View>
          <View style={styles.formColumn}>
            {renderFormField(
              'Ocupación',
              formData.occupation,
              'Tu profesión',
              (text) => setFormData({ ...formData, occupation: text })
            )}
          </View>
        </View>
      </View>

      {/* Save Button */}
      <Button
        variant="primary"
        size="large"
        onPress={handleSaveProfile}
        fullWidth
        style={styles.saveButton}
      >
        Guardar cambios
      </Button>
    </View>
  );

  // Payment Tab Content
  const renderPaymentTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptyTabState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="card" size={48} color={branding.accent} />
        </View>
        <Text style={styles.emptyTabTitle}>Métodos de pago</Text>
        <Text style={styles.emptyTabDescription}>
          Administra tus métodos de pago y consulta tu saldo disponible
        </Text>
        <Button variant="primary" size="medium" onPress={() => {}} style={styles.emptyTabButton}>
          Agregar método de pago
        </Button>
      </View>
    </View>
  );

  // Referrals Tab Content
  const renderReferralsTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.referralCard} padding="large">
        <View style={styles.referralHeader}>
          <View style={styles.referralIconContainer}>
            <Ionicons name="gift" size={32} color={branding.accent} />
          </View>
          <Text style={styles.referralTitle}>Invita y gana</Text>
        </View>
        <Text style={styles.referralDescription}>
          Comparte HERA con tus amigos y ambos recibirán 20€ de crédito
          cuando completen su primera sesión.
        </Text>

        <View style={styles.referralCodeContainer}>
          <Text style={styles.referralCodeLabel}>Tu código de referido:</Text>
          <View style={styles.referralCode}>
            <Text style={styles.referralCodeText}>MIND-{mockUserProfile.id.toUpperCase()}</Text>
            <TouchableOpacity>
              <Ionicons name="copy" size={20} color={branding.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <Button variant="primary" size="medium" onPress={() => {}} fullWidth>
          Compartir código
        </Button>
      </Card>

      <Text style={styles.sectionTitle}>Referidos activos</Text>
      <Card style={styles.emptyReferralsCard} padding="large">
        <Text style={styles.emptyReferralsText}>
          Aún no has invitado a nadie. ¡Comparte tu código y empieza a ganar!
        </Text>
      </Card>
    </View>
  );

  // Diary Tab Content
  const renderDiaryTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptyTabState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="book" size={48} color={branding.accent} />
        </View>
        <Text style={styles.emptyTabTitle}>Diario personal</Text>
        <Text style={styles.emptyTabDescription}>
          Registra tus pensamientos, emociones y progreso en tu viaje de bienestar mental
        </Text>
        <Button variant="primary" size="medium" onPress={() => {}} style={styles.emptyTabButton}>
          Crear primera entrada
        </Button>
      </View>
    </View>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Tabs - Horizontal Scrollable */}
        <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsContainer}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'information' && styles.tabActive]}
          onPress={() => setActiveTab('information')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'information' && styles.tabTextActive,
            ]}
          >
            Información
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'payment' && styles.tabActive]}
          onPress={() => setActiveTab('payment')}
        >
          <Text
            style={[styles.tabText, activeTab === 'payment' && styles.tabTextActive]}
          >
            Pago & Saldo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'referrals' && styles.tabActive]}
          onPress={() => setActiveTab('referrals')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'referrals' && styles.tabTextActive,
            ]}
          >
            Referidos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'diary' && styles.tabActive]}
          onPress={() => setActiveTab('diary')}
        >
          <Text
            style={[styles.tabText, activeTab === 'diary' && styles.tabTextActive]}
          >
            Diario
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Content - Scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'information' && renderInformationTab()}
        {activeTab === 'payment' && renderPaymentTab()}
        {activeTab === 'referrals' && renderReferralsTab()}
        {activeTab === 'diary' && renderDiaryTab()}
      </ScrollView>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // GradientBackground handles the background
  },
  tabsScrollView: {
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    flexGrow: 0,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: branding.accent,
  },
  tabText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: colors.neutral.gray600,
  },
  tabTextActive: {
    color: branding.accent,
    fontWeight: typography.fontWeights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg + spacing.sm, // 24px
    flexGrow: 1,
  },
  tabContent: {
    flex: 1,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl, // 32px gap
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: branding.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 4,
    borderColor: branding.primary,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: typography.fontWeights.bold,
    color: colors.neutral.white,
  },
  changePhotoButton: {
    minWidth: 150,
  },

  // Form Grid
  formGrid: {
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md, // 16px gap between columns
    marginBottom: spacing.md + spacing.xs, // 20px margin bottom
  },
  formColumn: {
    flex: 1,
  },
  formField: {
    // Individual field styling
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.neutral.gray600,
    marginBottom: spacing.xs, // 16px gap is achieved with additional spacing
  },
  fieldInput: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.neutral.gray900,
  },
  fieldInputDisabled: {
    backgroundColor: colors.neutral.gray100,
    color: colors.neutral.gray600,
  },
  pickerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    color: colors.neutral.gray900,
  },
  placeholderText: {
    color: colors.neutral.gray300,
  },
  saveButton: {
    marginTop: spacing.lg,
  },

  // Empty States
  emptyTabState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: branding.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTabTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  emptyTabDescription: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  emptyTabButton: {
    minWidth: 200,
  },

  // Referrals Tab
  referralCard: {
    marginBottom: spacing.lg,
  },
  referralHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  referralIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${branding.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  referralTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.neutral.gray900,
  },
  referralDescription: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
    marginBottom: spacing.lg,
  },
  referralCodeContainer: {
    marginBottom: spacing.lg,
  },
  referralCodeLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  referralCode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  referralCodeText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: branding.accent,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  emptyReferralsCard: {
    alignItems: 'center',
  },
  emptyReferralsText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
});

export default ProfileScreen;
