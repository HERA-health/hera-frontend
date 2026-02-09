/**
 * EmailVerificationScreen - Handles email verification deep links
 * User clicks link in email → App opens this screen → Validates token → Shows success/error
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LoadingState, ErrorState } from '../../components/common';
import { SuccessScreen } from '../../components/auth';
import * as authService from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../constants/errors';
import { heraLanding } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';

type VerificationState = 'loading' | 'success' | 'error';

export function EmailVerificationScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'EmailVerification'>>();
  const { user, updateUser } = useAuth();

  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState<string | null>(null);
  const hasVerified = useRef(false);

  const { token } = route.params;

  useEffect(() => {
    // Prevent double verification
    if (hasVerified.current) return;

    const verifyEmail = async () => {
      // Check if token is present
      if (!token) {
        setError('Enlace de verificación inválido. Falta el token.');
        setState('error');
        return;
      }

      try {
        hasVerified.current = true;
        await authService.verifyEmail(token);

        // Update user state with emailVerified = true
        if (user) {
          updateUser({ emailVerified: true });
        }

        setState('success');
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Error al verificar el correo'));
        setState('error');
      }
    };

    verifyEmail();
  }, [token, user, updateUser]);

  const handleRetry = () => {
    hasVerified.current = false;
    setError(null);
    setState('loading');
    // Re-trigger verification by updating state
    const verifyAgain = async () => {
      if (!token) {
        setError('Enlace de verificación inválido. Falta el token.');
        setState('error');
        return;
      }

      try {
        hasVerified.current = true;
        await authService.verifyEmail(token);

        if (user) {
          updateUser({ emailVerified: true });
        }

        setState('success');
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Error al verificar el correo'));
        setState('error');
      }
    };

    verifyAgain();
  };

  const handleContinue = () => {
    // Navigate to login or dashboard
    if (user) {
      // User is authenticated, go to dashboard based on type
      // Professionals have already completed colegiado verification before reaching here
      const isProfessional = user.type === 'professional';
      navigation.reset({
        index: 0,
        routes: [{ name: isProfessional ? 'ProfessionalHome' : 'Home' }],
      });
    } else {
      // User not authenticated, go to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { userType: 'CLIENT' } }],
      });
    }
  };

  if (state === 'loading') {
    return (
      <View style={styles.container}>
        <LoadingState
          message="Verificando tu correo electrónico..."
          fullScreen
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.container}>
        <ErrorState
          message={error || 'Error desconocido'}
          onRetry={handleRetry}
          fullScreen
          icon="mail-unread-outline"
        />
      </View>
    );
  }

  // Success state
  return (
    <SuccessScreen
      type="emailVerified"
      onContinue={handleContinue}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
});

export default EmailVerificationScreen;
