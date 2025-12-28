/**
 * LoginScreen - Premium Split-Screen Design
 * Modern, clean authentication with split-screen layout on desktop
 * Follows HERA design language with sage green and lavender palette
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, shadows, typography } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const { login, logout, loading: authLoading, error: authError, clearError } = useAuth();

  // Responsive breakpoints
  const isDesktop = width >= 768;
  const isLargeDesktop = width >= 1200;

  // Get expected userType from navigation params
  const expectedUserType = route.params?.userType as 'CLIENT' | 'PROFESSIONAL' | undefined;

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formSlideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(formSlideAnim, {
        toValue: 0,
        duration: 700,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Shake animation for errors
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    setLocalError('');
    clearError();

    // Validate empty fields
    if (!email.trim() || !password.trim()) {
      setLocalError('Por favor, completa todos los campos');
      triggerShake();
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setLocalError('Por favor, introduce un email válido');
      triggerShake();
      return;
    }

    try {
      const response = await login(email, password);

      // Validate user type if expected type was specified
      if (expectedUserType && response.user.userType !== expectedUserType) {
        const actualTypeName = response.user.userType === 'CLIENT' ? 'cliente' : 'profesional';
        const expectedTypeName = expectedUserType === 'CLIENT' ? 'cliente' : 'profesional';
        const correctButton = expectedUserType === 'CLIENT' ? 'Soy Profesional' : 'Busco Ayuda';

        setLocalError(
          `Esta cuenta es de ${actualTypeName}. Has intentado acceder como ${expectedTypeName}. ` +
          `Por favor, regresa y usa el botón "${correctButton}".`
        );
        triggerShake();
        await logout();
        return;
      }
    } catch (error: any) {
      setLocalError(error.message || 'Error al iniciar sesión. Intenta de nuevo');
      triggerShake();
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google SSO
    console.log('Google login pressed');
  };

  const displayError = localError || authError;

  // Brand Side Content
  const renderBrandSide = () => (
    <LinearGradient
      colors={[heraLanding.primary, heraLanding.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.brandSide,
        isDesktop && styles.brandSideDesktop,
        !isDesktop && styles.brandSideMobile,
      ]}
    >
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
      <View style={[styles.decorCircle, styles.decorCircle3]} />

      <Animated.View
        style={[
          styles.brandContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="heart" size={isDesktop ? 40 : 32} color={heraLanding.primary} />
          </View>
          <Text style={[styles.logoText, !isDesktop && styles.logoTextMobile]}>HERA</Text>
        </View>

        {isDesktop && (
          <>
            <Text style={styles.brandTitle}>Bienvenido de vuelta</Text>
            <Text style={styles.brandSubtitle}>
              Tu bienestar mental te espera.{'\n'}
              Inicia sesión para continuar tu camino.
            </Text>

            {/* Features */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Sesiones 100% privadas</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="videocam" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Videollamadas seguras</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="people" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Especialistas verificados</Text>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </LinearGradient>
  );

  // Form Side Content
  const renderFormSide = () => (
    <Animated.View
      style={[
        styles.formSide,
        isDesktop && styles.formSideDesktop,
        {
          opacity: fadeAnim,
          transform: [{ translateY: formSlideAnim }],
        },
      ]}
    >
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button (mobile only) */}
        {!isDesktop && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={heraLanding.textPrimary} />
          </TouchableOpacity>
        )}

        <View style={[styles.formContainer, isLargeDesktop && styles.formContainerLarge]}>
          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {expectedUserType === 'PROFESSIONAL'
                ? 'Portal Profesional'
                : expectedUserType === 'CLIENT'
                ? 'Portal Cliente'
                : 'Iniciar sesión'}
            </Text>
            <Text style={styles.formSubtitle}>
              {expectedUserType === 'PROFESSIONAL'
                ? 'Accede a tu panel de profesional'
                : 'Continúa con tu cuenta de HERA'}
            </Text>
          </View>

          {/* Error Display */}
          {displayError && (
            <Animated.View
              style={[
                styles.errorContainer,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={heraLanding.warning} />
              <Text style={styles.errorText}>{displayError}</Text>
            </Animated.View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailFocused ? heraLanding.primary : heraLanding.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={heraLanding.textMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? heraLanding.primary : heraLanding.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={heraLanding.textMuted}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={heraLanding.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.primaryButton, authLoading && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={authLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[heraLanding.primary, heraLanding.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {authLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Iniciando sesión...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google SSO */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
          >
            <View style={styles.googleIconContainer}>
              <Text style={styles.googleIcon}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register', { userType: expectedUserType })}
            >
              <Text style={styles.registerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Desktop back button */}
      {isDesktop && (
        <TouchableOpacity
          style={styles.backButtonDesktop}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={heraLanding.textSecondary} />
          <Text style={styles.backButtonDesktopText}>Volver</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {renderBrandSide()}
        {renderFormSide()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  content: {
    flex: 1,
  },
  contentDesktop: {
    flexDirection: 'row',
  },

  // Brand Side
  brandSide: {
    overflow: 'hidden',
    position: 'relative',
  },
  brandSideDesktop: {
    width: '40%',
    minHeight: '100%',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  brandSideMobile: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  brandContent: {
    zIndex: 1,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: 50,
    left: -80,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    top: '50%',
    right: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...shadows.md,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  logoTextMobile: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 44,
  },
  brandSubtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 26,
    marginBottom: 40,
  },
  features: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },

  // Form Side
  formSide: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  formSideDesktop: {
    width: '60%',
    justifyContent: 'center',
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  backButtonDesktop: {
    position: 'absolute',
    top: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonDesktopText: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  formContainer: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  formContainerLarge: {
    maxWidth: 460,
  },
  formHeader: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: heraLanding.textSecondary,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(232, 157, 136, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: heraLanding.warning,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: heraLanding.warning,
    fontWeight: '500',
    lineHeight: 20,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputContainerFocused: {
    borderColor: heraLanding.primary,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: heraLanding.textPrimary,
    marginLeft: 12,
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 4,
  },

  // Forgot Password
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: heraLanding.primary,
    fontWeight: '600',
  },

  // Primary Button
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.md,
    shadowColor: heraLanding.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: heraLanding.border,
  },
  dividerText: {
    fontSize: 14,
    color: heraLanding.textMuted,
    marginHorizontal: 16,
  },

  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 12,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },

  // Register Link
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 6,
  },
  registerText: {
    fontSize: 15,
    color: heraLanding.textSecondary,
  },
  registerLink: {
    fontSize: 15,
    color: heraLanding.primary,
    fontWeight: '700',
  },
});
