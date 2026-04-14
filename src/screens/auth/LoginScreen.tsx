import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { spacing } from '../../constants/colors';
import { AuthSplitLayout } from '../../components/auth';
import * as analyticsService from '../../services/analyticsService';

type LoginRouteParams = AppRouteProp<'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<LoginRouteParams>();
  const { theme } = useTheme();
  const { login, logout, loading: authLoading, error: authError, clearError } = useAuth();

  const expectedUserType = route.params?.userType;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    analyticsService.trackScreen('login');
  }, []);

  const displayError = localError || authError;

  const introCopy = useMemo(() => {
    if (expectedUserType === 'PROFESSIONAL') {
      return {
        eyebrow: 'Acceso profesional',
        title: 'Tu espacio clínico, sin fricción.',
        subtitle: 'Gestiona sesiones, pacientes y seguimiento en un entorno más limpio y actual.',
        features: [
          { icon: 'calendar-outline' as const, title: 'Agenda clara y operativa' },
          { icon: 'document-text-outline' as const, title: 'Resumen y seguimiento de sesiones' },
          { icon: 'shield-checkmark-outline' as const, title: 'Acceso seguro y privado' },
        ],
      };
    }

    return {
      eyebrow: 'Acceso paciente',
      title: 'Vuelve a tu proceso con claridad.',
      subtitle: 'Retoma tu bienestar, tus sesiones y tu seguimiento desde una experiencia más coherente.',
      features: [
        { icon: 'people-outline' as const, title: 'Accede a tus especialistas' },
        { icon: 'videocam-outline' as const, title: 'Sesiones online seguras' },
        { icon: 'heart-outline' as const, title: 'Tu seguimiento en un solo lugar' },
      ],
    };
  }, [expectedUserType]);

  const validateEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Landing');
  };

  const handleLogin = async () => {
    setLocalError('');
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Completa email y contraseña.');
      return;
    }

    if (!validateEmail(email)) {
      setLocalError('Introduce un email válido.');
      return;
    }

    try {
      analyticsService.track('login_attempted', { userType: expectedUserType || 'unknown' });
      const response = await login(email, password);
      analyticsService.track('login_success', { userType: response.user.userType });

      if (expectedUserType && response.user.userType !== expectedUserType) {
        const actualTypeName = response.user.userType === 'CLIENT' ? 'cliente' : 'profesional';
        const expectedTypeName = expectedUserType === 'CLIENT' ? 'cliente' : 'profesional';
        const correctButton = expectedUserType === 'CLIENT' ? 'Soy especialista' : 'Busco ayuda';

        setLocalError(
          `Esta cuenta pertenece a ${actualTypeName}. Has intentado entrar como ${expectedTypeName}. Vuelve atrás y usa "${correctButton}".`,
        );
        await logout();
      }
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Error al iniciar sesión.';
      analyticsService.track('login_failed', { reason: reason.slice(0, 50) });
      setLocalError(reason);
    }
  };

  return (
    <AuthSplitLayout
      eyebrow={introCopy.eyebrow}
      title={introCopy.title}
      subtitle={introCopy.subtitle}
      accent={expectedUserType === 'PROFESSIONAL' ? 'secondary' : 'primary'}
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
              <Text
                style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}
              >
                {expectedUserType === 'PROFESSIONAL' ? 'Iniciar sesión profesional' : 'Iniciar sesión'}
              </Text>
              <Text
                style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}
              >
                Accede con tu cuenta para continuar.
              </Text>
            </View>
          </View>

          {displayError ? (
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
                {displayError}
              </Text>
            </View>
          ) : null}

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
            placeholder="Introduce tu contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
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

          <View style={styles.linkRow}>
            <AnimatedPressable
              onPress={() => navigation.navigate('ForgotPassword')}
              hoverLift={false}
              pressScale={0.98}
            >
              <Text style={[styles.linkText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                ¿Olvidaste tu contraseña?
              </Text>
            </AnimatedPressable>
          </View>

          <Button
            onPress={handleLogin}
            variant="primary"
            size="large"
            fullWidth
            loading={authLoading}
            icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            iconPosition="right"
            textStyle={{ fontFamily: theme.fontSansBold }}
          >
            Iniciar sesión
          </Button>

          <View style={[styles.divider, { borderTopColor: theme.border }]} />

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              ¿No tienes cuenta?
            </Text>
            <AnimatedPressable
              onPress={() => navigation.navigate('Register', { userType: expectedUserType ?? 'CLIENT' })}
              hoverLift={false}
              pressScale={0.98}
            >
              <Text style={[styles.linkText, { color: theme.primary, fontFamily: theme.fontSansBold }]}>
                Crear cuenta
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
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: spacing.md,
  },
  linkText: {
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
