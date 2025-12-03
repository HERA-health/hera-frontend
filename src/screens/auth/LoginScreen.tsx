import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { colors, spacing, branding, borderRadius, shadows } from '../../constants/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/common/GradientBackground';
import { StyledLogo } from '../../components/common/StyledLogo';

const { width: screenWidth } = Dimensions.get('window');

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login, logout, loading: authLoading, error: authError, clearError } = useAuth();

  // Get expected userType from navigation params (CLIENT or PROFESSIONAL)
  const expectedUserType = route.params?.userType as 'CLIENT' | 'PROFESSIONAL' | undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    // Clear previous errors
    setLocalError('');
    clearError();

    // Validate empty fields
    if (!email.trim() || !password.trim()) {
      setLocalError('Por favor, completa todos los campos');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Por favor, introduce un email válido');
      return;
    }

    try {
      const response = await login(email, password);

      // ✅ VALIDATE USER TYPE if expected type was specified
      if (expectedUserType && response.user.userType !== expectedUserType) {
        // User type mismatch - clear login and show error
        const actualTypeName = response.user.userType === 'CLIENT' ? 'cliente' : 'profesional';
        const expectedTypeName = expectedUserType === 'CLIENT' ? 'cliente' : 'profesional';
        const correctButton = expectedUserType === 'CLIENT' ? 'Soy Profesional' : 'Busco Ayuda';

        setLocalError(
          `Esta cuenta es de ${actualTypeName}. Has intentado acceder como ${expectedTypeName}. ` +
          `Por favor, regresa y usa el botón "${correctButton}".`
        );

        // Immediately logout to clear the wrong login
        await logout();
        return;
      }

      // Login successful with correct type - navigation handled by RootNavigator
    } catch (error: any) {
      // Error is already set in AuthContext, but we can also use local error
      // The error message should already be user-friendly from authService
      setLocalError(error.message || 'Error al iniciar sesión. Intenta de nuevo');
    }
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={branding.text} />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <StyledLogo size={150} />
        </View>

        {/* Constrained form container */}
        <View style={styles.formContainer}>
          <View style={styles.formCard}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {expectedUserType === 'PROFESSIONAL'
                  ? 'Portal Profesional'
                  : expectedUserType === 'CLIENT'
                  ? 'Portal Cliente'
                  : 'Iniciar Sesión'}
              </Text>
              <Text style={styles.subtitle}>
                {expectedUserType === 'PROFESSIONAL'
                  ? 'Accede a tu panel de profesional'
                  : expectedUserType === 'CLIENT'
                  ? 'Inicia sesión para continuar'
                  : 'Inicia sesión en tu cuenta'}
              </Text>
            </View>

            <View style={styles.form}>
          {/* Error Display */}
          {(authError || localError) && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.feedback.error} />
              <Text style={styles.errorText}>
                {localError || authError}
              </Text>
            </View>
          )}

          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            variant="primary"
            size="large"
            onPress={handleLogin}
            loading={authLoading}
          >
            Iniciar Sesión
          </Button>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>¿No tienes cuenta?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register', { userType: expectedUserType })}>
                <Text style={styles.registerLink}>Regístrate aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  formContainer: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  formCard: {
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: branding.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: branding.textSecondary,
  },
  form: {
    gap: spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: branding.accent,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: 14,
    color: branding.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: branding.accent,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.error,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: branding.error,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: branding.error,
    fontWeight: '500',
  },
});
