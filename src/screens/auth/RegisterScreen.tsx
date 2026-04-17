import React, { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as authService from '../../services/authService';
import * as analyticsService from '../../services/analyticsService';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useAuth, UserType } from '../../contexts/AuthContext';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/colors';
import { AuthSplitLayout } from '../../components/auth';

type RegisterRouteParams = AppRouteProp<'Register'>;
type PasswordStrength = 'weak' | 'medium' | 'strong';

export function RegisterScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RegisterRouteParams>();
  const { theme } = useTheme();
  const { register, loading: authLoading, clearError } = useAuth();

  const initialUserType: UserType = route.params.userType === 'PROFESSIONAL'
    ? 'professional'
    : 'client';

  const [userType, setUserType] = useState<UserType>(initialUserType);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    analyticsService.trackScreen('register');
  }, []);

  const getPasswordStrength = (value: string): PasswordStrength => {
    if (!value) return 'weak';

    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsDontMatch = confirmPassword.length > 0 && password !== confirmPassword;

  const strengthMeta = {
    weak: { label: 'Débil', color: theme.warning, width: '34%' as const },
    medium: { label: 'Media', color: theme.warningAmber, width: '67%' as const },
    strong: { label: 'Fuerte', color: theme.success, width: '100%' as const },
  }[passwordStrength];

  const introCopy = useMemo(() => {
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
  }, [theme.success, theme.warning, userType]);

  const validateEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Landing');
  };

  const openTerms = () => {
    const placeholderUrl = 'https://hera-app.com/terms';
    Linking.openURL(placeholderUrl).catch(() => {
      setLocalError('No se pudo abrir los términos.');
    });
  };

  const openPrivacy = () => {
    const placeholderUrl = 'https://hera-app.com/privacy';
    Linking.openURL(placeholderUrl).catch(() => {
      setLocalError('No se pudo abrir la política de privacidad.');
    });
  };

  const handleRegister = async () => {
    setLocalError('');
    clearError();

    if (!name.trim()) {
      setLocalError('Introduce tu nombre completo.');
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

    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    if (!termsAccepted) {
      setLocalError('Debes aceptar los términos y la política de privacidad.');
      return;
    }

    try {
      analyticsService.track('register_submitted', {
        userType: userType === 'client' ? 'CLIENT' : 'PROFESSIONAL',
      });

      await register(email, password, name, userType);

      if (userType === 'professional') {
        navigation.navigate('ProfessionalVerification');
        return;
      }

      try {
        await authService.sendVerificationEmail(email);
      } catch {
        // no-op: the user can retry from the next screen
      }

      navigation.navigate('EmailSentVerification', {
        email,
        userType: 'CLIENT',
      });
    } catch (error: unknown) {
      setLocalError(getErrorMessage(error, 'Error al registrarse.'));
    }
  };

  return (
    <AuthSplitLayout
      eyebrow={introCopy.eyebrow}
      title={introCopy.title}
      subtitle={introCopy.subtitle}
      accent={introCopy.accent}
      features={introCopy.features}
      form={
        <View>
          <View style={styles.header}>
            <AnimatedPressable
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
                Empieza con una configuración clara desde el principio.
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
            <AnimatedPressable
              onPress={() => setUserType('client')}
              hoverLift={false}
              pressScale={0.98}
              style={[
                styles.userTypeCard,
                {
                  backgroundColor: userType === 'client' ? theme.primaryAlpha12 : theme.bgMuted,
                  borderColor: userType === 'client' ? theme.primary : theme.border,
                },
              ]}
            >
              <View style={[styles.userTypeIcon, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={userType === 'client' ? theme.primary : theme.textSecondary}
                />
              </View>
              <View style={styles.userTypeCopy}>
                <Text
                  style={[
                    styles.userTypeTitle,
                    {
                      color: theme.textPrimary,
                      fontFamily: theme.fontSansSemiBold,
                    },
                  ]}
                >
                  Paciente
                </Text>
                <Text style={[styles.userTypeHint, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                  Buscar ayuda y gestionar sesiones
                </Text>
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => setUserType('professional')}
              hoverLift={false}
              pressScale={0.98}
              style={[
                styles.userTypeCard,
                {
                  backgroundColor: userType === 'professional' ? theme.secondaryAlpha12 : theme.bgMuted,
                  borderColor: userType === 'professional' ? theme.secondary : theme.border,
                },
              ]}
            >
              <View style={[styles.userTypeIcon, { backgroundColor: theme.secondaryAlpha12 }]}>
                <Ionicons
                  name="medical-outline"
                  size={18}
                  color={userType === 'professional' ? theme.secondaryDark : theme.textSecondary}
                />
              </View>
              <View style={styles.userTypeCopy}>
                <Text
                  style={[
                    styles.userTypeTitle,
                    {
                      color: theme.textPrimary,
                      fontFamily: theme.fontSansSemiBold,
                    },
                  ]}
                >
                  Especialista
                </Text>
                <Text style={[styles.userTypeHint, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                  Perfil profesional y verificación
                </Text>
              </View>
            </AnimatedPressable>
          </View>

          <Input
            label="Nombre completo"
            placeholder="Tu nombre y apellidos"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            leftIcon={<Ionicons name="person-outline" size={18} color={theme.textMuted} />}
          />

          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Ionicons name="mail-outline" size={18} color={theme.textMuted} />}
          />

          <Input
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />}
            rightIcon={(
              <AnimatedPressable
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

          <View style={styles.strengthRow}>
            <View style={[styles.strengthTrack, { backgroundColor: theme.borderLight }]}>
              <View
                style={[
                  styles.strengthFill,
                  {
                    width: strengthMeta.width,
                    backgroundColor: strengthMeta.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.strengthText, { color: strengthMeta.color, fontFamily: theme.fontSansSemiBold }]}>
              {strengthMeta.label}
            </Text>
          </View>

          <Input
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

          <AnimatedPressable
            onPress={() => setTermsAccepted((value) => !value)}
            hoverLift={false}
            pressScale={0.99}
            style={styles.termsRow}
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
            <Text style={[styles.termsText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              Acepto los{' '}
              <Text style={[styles.inlineLink, { color: theme.primary }]} onPress={openTerms}>
                términos
              </Text>
              {' '}y la{' '}
              <Text style={[styles.inlineLink, { color: theme.primary }]} onPress={openPrivacy}>
                política de privacidad
              </Text>
              .
            </Text>
          </AnimatedPressable>

          <Button
            onPress={handleRegister}
            variant="primary"
            size="large"
            fullWidth
            loading={authLoading}
            disabled={!termsAccepted}
            icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            iconPosition="right"
            textStyle={{ fontFamily: theme.fontSansBold }}
          >
            Crear cuenta
          </Button>

          <View style={[styles.divider, { borderTopColor: theme.border }]} />

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              ¿Ya tienes cuenta?
            </Text>
            <AnimatedPressable
              onPress={() => navigation.navigate('Login', { userType: route.params.userType })}
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  userTypeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  userTypeCopy: {
    flex: 1,
  },
  userTypeTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  userTypeHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -6,
    marginBottom: spacing.md,
  },
  strengthTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 999,
  },
  strengthText: {
    fontSize: 12,
    minWidth: 46,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: spacing.md,
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
