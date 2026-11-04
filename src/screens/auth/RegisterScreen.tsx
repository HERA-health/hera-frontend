import { legalReaderUrl } from '../../services/legalReader';
import { getLegalCatalog } from '../../services/legalService';
import { type LegalDocumentContent } from '../../constants/legal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as authService from '../../services/authService';
import * as analyticsService from '../../services/analyticsService';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useAuth, type PublicUserType } from '../../contexts/AuthContext';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/colors';
import { getRequiredRegistrationDocumentKeys } from '../../constants/legal';
import { AuthSplitLayout, GoogleAuthButton, PasswordRequirementsChecklist } from '../../components/auth';
import { getPasswordError, validatePassword } from '../../utils/validation';
import { normalizeRegistrationPhone, PHONE_CONTACT_HELP, PHONE_FORMAT_HELP, RegistrationPhoneError } from '../../utils/registrationPhone';
import { LandingHeader } from '../landing/components/LandingHeader';

type RegisterRouteParams = AppRouteProp<'Register'>;

const mapRouteUserType = (
  userType: NonNullable<RegisterRouteParams['params']>['userType']
): PublicUserType => {
  if (userType === 'PROFESSIONAL') {
    return 'professional';
  }

  if (userType === 'CLINIC') {
    return 'clinic';
  }

  return 'client';
};

const mapFrontendUserTypeToBackend = (
  userType: PublicUserType
): authService.BackendUserType => {
  if (userType === 'client') {
    return 'CLIENT';
  }

  if (userType === 'professional') {
    return 'PROFESSIONAL';
  }

  return 'CLINIC';
};

export function RegisterScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RegisterRouteParams>();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const pairedFields = width >= 600;
  const { register, authenticateWithGoogle, loading: authLoading, clearError } = useAuth();
  const initialUserType: PublicUserType = mapRouteUserType(route.params?.userType);

  const [userType, setUserType] = useState<PublicUserType>(initialUserType);
  const isWide = width >= 1024 && userType !== 'client';
  const [clinicCommercialName, setClinicCommercialName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const phoneInputRef = useRef<TextInput>(null);
  const formScrollRef = useRef<ScrollView>(null);
  const phoneFieldRef = useRef<View>(null);
  const formContentRef = useRef<View>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localError, setLocalError] = useState('');
  const [legalDocuments, setLegalDocuments] = useState<LegalDocumentContent[]>([]);
  const [legalRevision, setLegalRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const audience = mapFrontendUserTypeToBackend(userType);
    setTermsAccepted(false);
    setLegalDocuments([]);
    getLegalCatalog(audience).then(docs => {
      if (!active) return;
      const complete = getRequiredRegistrationDocumentKeys(audience).every(key =>
        docs.some(doc => doc.key === key && doc.version && doc.contentHash));
      if (!complete) throw new Error('Catálogo incompleto');
      setLegalDocuments(docs);
    }).catch(() => {
      if (active) setLocalError('No se pudieron cargar las condiciones. Reintenta.');
    });
    return () => { active = false; };
  }, [legalRevision, userType]);
  const currentProofs = (keys: ReturnType<typeof getRequiredRegistrationDocumentKeys>) => keys.map(documentKey => { const doc = legalDocuments.find(item => item.key === documentKey); if (!doc) throw new Error('Espera a que se carguen los documentos.'); return { documentKey, version: doc.version, contentHash: doc.contentHash }; });

  useEffect(() => {
    analyticsService.trackScreen('register');
  }, []);

  const isPasswordValid = validatePassword(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsDontMatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = legalDocuments.length > 0 && termsAccepted && isPasswordValid && passwordsMatch && !authLoading;
  const isClinic = userType === 'clinic';

  const showPhoneError = useCallback((error: RegistrationPhoneError) => {
    setPhoneError(error.message);
    phoneInputRef.current?.focus();
    // Measure now: loading the legal catalog can move the field without resizing it.
    requestAnimationFrame(() => {
      const content = formContentRef.current;
      if (content) {
        phoneFieldRef.current?.measureLayout(content, (_x, y) => {
          formScrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.md), animated: false });
        });
      }
    });
  }, []);

  const selectUserType = (next: PublicUserType) => {
    setPhoneError('');
    setLocalError('');
    clearError();
    setUserType(next);
  };

  const introCopy = useMemo(() => {
    if (userType === 'clinic') {
      return {
        eyebrow: 'Alta de clínica',
        title: 'Coordina tu centro desde HERA.',
        subtitle: 'Crea una cuenta de clínica para probar el panel, la configuración y las próximas capas de equipo y pacientes.',
        accent: 'primary' as const,
        features: [
          { icon: 'business-outline' as const, title: 'Cuenta propia de clínica' },
          { icon: 'people-circle-outline' as const, title: 'Base preparada para equipo' },
          { icon: 'shield-checkmark-outline' as const, title: 'Separación clara de permisos' },
        ],
      };
    }

    if (userType === 'professional') {
      return {
        eyebrow: 'Alta profesional',
        title: 'Únete a la red clínica de HERA.',
        subtitle: 'Prepara tu perfil, agenda y flujo de pacientes desde una base más sólida y moderna.',
        accent: 'secondary' as const,
        features: [
          { icon: 'briefcase-outline' as const, title: 'Perfil profesional y marca personal' },
          { icon: 'calendar-outline' as const, title: 'Agenda y sesiones centralizadas' },
          { icon: 'card-outline' as const, title: 'Cobros y facturación integrados' },
        ],
      };
    }

    return {
      eyebrow: 'Alta paciente',
      title: 'Empieza tu proceso con una base mejor.',
      subtitle: 'Crea tu cuenta y accede a una experiencia más coherente desde el primer paso.',
      accent: 'primary' as const,
      features: [
        { icon: 'sparkles-outline' as const, title: 'Matching inteligente con especialistas' },
        { icon: 'videocam-outline' as const, title: 'Sesiones seguras y seguimiento' },
        { icon: 'shield-checkmark-outline' as const, title: 'Privacidad y datos protegidos' },
      ],
    };
  }, [userType]);

  const validateEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Landing');
  };

  const registrationLink = (documentKey: LegalDocumentContent['key'], label: string) => {
    const doc = legalDocuments.find(item => item.key === documentKey);
    if (!doc) return <Text>{label}</Text>;
    const audience = mapFrontendUserTypeToBackend(userType);
    if (Platform.OS === 'web') {
      return React.createElement('a', {
        href: legalReaderUrl(documentKey, doc.version, audience), target: '_blank', rel: 'noopener noreferrer',
        style: { color: theme.primary }, 'aria-label': label + ' (abre otra pestaña)',
      }, label);
    }
    return <Text accessibilityRole="link" style={[styles.inlineLink, { color: theme.primary }]}
      onPress={() => navigation.navigate('LegalDocument', { documentKey, version: doc.version, audience })}>{label}</Text>;
  };

  const handleRegister = async () => {
    setLocalError('');
    clearError();

    if (!name.trim()) {
      setLocalError(isClinic ? 'Introduce el nombre de la persona responsable.' : 'Introduce tu nombre completo.');
      return;
    }

    if (isClinic && clinicCommercialName.trim().length < 2) {
      setLocalError('Introduce el nombre de la clínica.');
      return;
    }

    if (!email.trim()) {
      setLocalError('Introduce tu email.');
      return;
    }

    if (!validateEmail(email)) {
      setLocalError('Introduce un email válido.');
      return;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setLocalError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    if (!termsAccepted) {
      setLocalError('Debes aceptar la documentación legal aplicable.');
      return;
    }

    try {
      const registrationPhone = userType === 'professional' ? normalizeRegistrationPhone(phone) : undefined;
      setPhoneError('');
      analyticsService.track('register_submitted', {
        userType: mapFrontendUserTypeToBackend(userType),
      });

      const backendUserType = mapFrontendUserTypeToBackend(userType);
      const acceptedLegalDocumentKeys = getRequiredRegistrationDocumentKeys(backendUserType);

      await register(
        email,
        password,
        name,
        userType,
        acceptedLegalDocumentKeys,
        isClinic ? clinicCommercialName : undefined,
        currentProofs(acceptedLegalDocumentKeys),
        registrationPhone
      );

      if (userType === 'client') {
        void authService.sendVerificationEmail(email).catch(() => {
          // no-op: the user can retry from their profile
        });
      }
    } catch (error: unknown) {
      if (error instanceof RegistrationPhoneError) {
        showPhoneError(error);
        return;
      }
      setLocalError(getErrorMessage(error, 'Error al registrarse.'));
      setLegalRevision(v => v + 1);
    }
  };

  const handleGoogleCredential = useCallback(async (idToken: string) => {
    setLocalError('');
    setPhoneError('');
    clearError();

    if (!termsAccepted) {
      setLocalError('Debes aceptar la documentación legal aplicable.');
      return;
    }

    if (isClinic && clinicCommercialName.trim().length < 2) {
      setLocalError('Introduce el nombre de la clínica.');
      return;
    }

    const backendUserType: authService.PublicAuthUserType = mapFrontendUserTypeToBackend(userType);
    const acceptedLegalDocumentKeys = getRequiredRegistrationDocumentKeys(backendUserType);

    try {
      analyticsService.track('google_register_submitted', { userType: backendUserType });
      await authenticateWithGoogle({
        idToken,
        userType: backendUserType,
        expectedUserType: backendUserType,
        acceptedLegalDocumentKeys,
        acceptedLegalDocuments: currentProofs(acceptedLegalDocumentKeys),
        clinicCommercialName: isClinic ? clinicCommercialName.trim() : undefined,
        ...(userType === 'professional' ? { phone } : {}),
      });
    } catch (error: unknown) {
      if (error instanceof RegistrationPhoneError) {
        showPhoneError(error);
        return;
      }
      setLocalError(getErrorMessage(error, 'No se pudo continuar con Google.'));
      setLegalRevision(v => v + 1);
    }
  }, [
    authenticateWithGoogle,
    clearError,
    clinicCommercialName,
    isClinic,
    termsAccepted,
    userType,
    legalDocuments,
    phone,
    showPhoneError,
  ]);

  return (
    <AuthSplitLayout
      variant="form"
      formHeader={
        <View style={styles.publicHeader}>
          <LandingHeader
            context="access"
            isScrolled={false}
            onLogoPress={() => navigation.navigate('Landing')}
            onAccess={() => navigation.navigate('Login', { userType: mapFrontendUserTypeToBackend(userType) })}
            onViewPlans={() => navigation.navigate('Pricing')}
            onScrollToSection={(section) => navigation.navigate('Landing', { section })}
          />
        </View>
      }
      eyebrow={introCopy.eyebrow}
      title={introCopy.title}
      subtitle={introCopy.subtitle}
      accent={introCopy.accent}
      features={introCopy.features}
      formScrollRef={formScrollRef}
      form={
        <View ref={formContentRef} collapsable={false} style={userType === 'client' ? styles.patientForm : undefined}>
          {legalDocuments.length === 0 ? <Button variant="ghost" onPress={() => setLegalRevision(v => v + 1)}>Reintentar carga de condiciones</Button> : null}
          <View style={styles.header}>
            <AnimatedPressable
              accessibilityLabel="Volver"
              onPress={handleGoBack}
              hoverLift={false}
              pressScale={0.94}
              style={[
                styles.backButton,
                {
                  backgroundColor: theme.bgMuted,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
            </AnimatedPressable>

            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
                Crear cuenta
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                {Platform.OS === 'web'
                  ? 'Elige tu tipo de cuenta y regístrate con Google o email.'
                  : 'Elige tu tipo de cuenta y completa tus datos.'}
              </Text>
            </View>
          </View>

          {localError ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.warningBg,
                  borderColor: theme.warning,
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={18} color={theme.warning} />
              <Text style={[styles.errorText, { color: theme.warning, fontFamily: theme.fontSans }]}>
                {localError}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>
            Quiero entrar como
          </Text>
          <View style={styles.userTypeRow}>
            {([
              { type: 'client', label: 'Paciente', icon: 'person-outline' },
              { type: 'professional', label: 'Especialista', icon: 'medical-outline' },
              { type: 'clinic', label: 'Clínica', icon: 'business-outline' },
            ] as const).map(option => (
              <AnimatedPressable
                key={option.type}
                onPress={() => selectUserType(option.type)}
                accessibilityRole="button"
                accessibilityState={{ selected: userType === option.type }}
                accessibilityLabel={option.label}
                hoverLift={false}
                pressScale={0.98}
                style={[
                  styles.userTypeCard,
                  {
                    backgroundColor: userType === option.type ? theme.primaryAlpha12 : theme.bgCard,
                    borderColor: userType === option.type ? theme.primary : theme.border,
                  },
                ]}
              >
                {width >= 600 ? <Ionicons name={option.icon} size={18} color={theme.textSecondary} /> : null}
                <Text style={[styles.userTypeTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  {option.label}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={[styles.registrationBody, isWide && styles.registrationBodyWide]}>
            <View style={isWide ? styles.sharedColumn : undefined}>
              {userType === 'professional' ? (
                <View
                  ref={phoneFieldRef}
                  collapsable={false}
                  style={styles.phoneField}
                >
                  <Input
                    inputRef={phoneInputRef}
                    label="Teléfono de contacto (obligatorio)"
                    accessibilityLabel="Teléfono de contacto (obligatorio)"
                    placeholder="600 123 456"
                    value={phone}
                    onChangeText={(value) => { setPhone(value); setPhoneError(''); }}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    maxLength={40}
                    error={phoneError}
                    supportingTextStyle={{ fontSize: 13, lineHeight: 18, color: phoneError ? theme.error : theme.textSecondary }}
                    helperText={`${PHONE_FORMAT_HELP}\n${PHONE_CONTACT_HELP}`}
                    leftIcon={<Ionicons name="call-outline" size={18} color={theme.textMuted} />}
                  />
                </View>
              ) : null}

              {isClinic ? (
                <Input
                  label="Nombre de la clínica"
                  placeholder="Clínica HERA Norte"
                  value={clinicCommercialName}
                  onChangeText={setClinicCommercialName}
                  autoCapitalize="words"
                  leftIcon={<Ionicons name="business-outline" size={18} color={theme.textMuted} />}
                />
              ) : null}

              <View style={styles.termsRow}>
                <AnimatedPressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: termsAccepted }}
                  accessibilityLabel="Aceptar la documentación legal aplicable"
                  onPress={() => { if (legalDocuments.length) setTermsAccepted((value) => !value); }}
                  hoverLift={false}
                  pressScale={0.99}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: termsAccepted ? theme.primary : theme.bgCard,
                        borderColor: termsAccepted ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {termsAccepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </AnimatedPressable>
                <Text style={[styles.termsText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                  <Text onPress={() => { if (legalDocuments.length) setTermsAccepted(value => !value); }}>Confirmo haber recibido la</Text>{' '}
                  {registrationLink('PRIVACY_POLICY', 'política de privacidad')}
                  {' y acepto los '}
                  {registrationLink('TERMS_OF_SERVICE', userType === 'professional' ? 'términos para especialistas' : userType === 'clinic' ? 'términos aplicables a clínicas' : 'términos para pacientes')}
                  {userType === 'professional' ? (
                    <>
                      {' (incluidas las condiciones de comisiones del Directorio) y el '}
                      {registrationLink('PROFESSIONAL_DATA_PROCESSING_TERMS', 'acuerdo de tratamiento de datos')}
                    </>
                  ) : null}
                  .
                </Text>
              </View>

            </View>
            <View style={isWide ? [styles.emailColumn, { borderLeftColor: theme.border }] : undefined}>
              <GoogleAuthButton
                onCredential={handleGoogleCredential}
                disabled={authLoading}
              />
              <View style={styles.authDivider}>
                <View style={[styles.authDividerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.authDividerText, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>
                  {Platform.OS === 'web' ? 'O crea tu cuenta con email' : 'Datos de acceso'}
                </Text>
                <View style={[styles.authDividerLine, { backgroundColor: theme.border }]} />
              </View>

              <View style={pairedFields ? styles.fieldRow : undefined}>
                <Input
                  containerStyle={pairedFields ? styles.fieldCell : undefined}
                  label={isClinic ? 'Persona responsable' : 'Nombre completo'}
                  placeholder={isClinic ? 'Nombre y apellidos' : 'Tu nombre y apellidos'}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  leftIcon={<Ionicons name="person-outline" size={18} color={theme.textMuted} />}
                />

                <Input
                  containerStyle={pairedFields ? styles.fieldCell : undefined}
                  label="Email"
                  placeholder="tu@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon={<Ionicons name="mail-outline" size={18} color={theme.textMuted} />}
                />

              </View>
              <View style={pairedFields ? styles.fieldRow : undefined}>
                <Input
                  containerStyle={pairedFields ? styles.fieldCell : undefined}
                  label="Contraseña"
                  placeholder="Crea tu contraseña"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />}
                  rightIcon={(
                    <AnimatedPressable
                      accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onPress={() => setShowPassword((value) => !value)}
                      hoverLift={false}
                      pressScale={0.94}
                      style={styles.iconButton}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={theme.textMuted}
                      />
                    </AnimatedPressable>
                  )}
                />

                <Input
                  containerStyle={pairedFields ? styles.fieldCell : undefined}
                  label="Confirmar contraseña"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  error={passwordsDontMatch ? 'Las contraseñas no coinciden.' : undefined}
                  helperText={passwordsMatch ? 'Las contraseñas coinciden.' : undefined}
                  leftIcon={(
                    <Ionicons
                      name={passwordsMatch ? 'checkmark-circle-outline' : 'lock-closed-outline'}
                      size={18}
                      color={passwordsMatch ? theme.success : theme.textMuted}
                    />
                  )}
                  rightIcon={(
                    <AnimatedPressable
                      accessibilityLabel={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                      onPress={() => setShowConfirmPassword((value) => !value)}
                      hoverLift={false}
                      pressScale={0.94}
                      style={styles.iconButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={theme.textMuted}
                      />
                    </AnimatedPressable>
                  )}
                />

              </View>
              <PasswordRequirementsChecklist password={password} />

              <Button
                onPress={handleRegister}
                variant="primary"
                size="large"
                fullWidth
                loading={authLoading}
                disabled={!canSubmit}
                icon={<Ionicons name="arrow-forward" size={18} color={theme.textOnPrimary} />}
                iconPosition="right"
                textStyle={{ fontFamily: theme.fontSansBold }}
              >
                Crear cuenta
              </Button>

            </View>
          </View>

          <View style={[styles.divider, { borderTopColor: theme.border }]} />

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              ¿Ya tienes cuenta?
            </Text>
            <AnimatedPressable
              onPress={() => navigation.navigate('Login', { userType: mapFrontendUserTypeToBackend(userType) })}
              hoverLift={false}
              pressScale={0.98}
            >
              <Text style={[styles.inlineLink, { color: theme.primary, fontFamily: theme.fontSansBold }]}>
                Iniciar sesión
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  publicHeader: {
    height: 78,
    zIndex: 1,
  },
  patientForm: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: 10,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  userTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  userTypeCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userTypeTitle: {
    fontSize: 14,
  },
  registrationBody: {
    gap: spacing.sm,
  },
  registrationBodyWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  sharedColumn: {
    flex: 4,
    minWidth: 0,
  },
  emailColumn: {
    flex: 6,
    minWidth: 0,
    borderLeftWidth: 1,
    paddingLeft: 32,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  fieldCell: {
    flex: 1,
    minWidth: 0,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: spacing.md,
  },
  phoneField: {
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  inlineLink: {
    fontSize: 14,
  },
  divider: {
    borderTopWidth: 1,
    marginVertical: spacing.md,
  },
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
  },
  authDividerText: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 15,
  },
});
