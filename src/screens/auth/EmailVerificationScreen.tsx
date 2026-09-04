/**
 * EmailVerificationScreen - Handles email verification deep links
 * User clicks link in email → App opens this screen → Validates token → Shows success/error
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LoadingState, ErrorState } from '../../components/common';
import { SuccessScreen } from '../../components/auth';
import { verifyEmailLinkOnce } from '../../services/emailVerificationService';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../constants/errors';
import { heraLanding } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';

type VerificationState = 'loading' | 'success' | 'error';
type VerifiedUserType = 'CLIENT' | 'PROFESSIONAL' | 'CLINIC';

export function EmailVerificationScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'EmailVerification'>>();
  const { user, refreshCurrentUser, verificationSubmitted } = useAuth();

  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [verifiedUserType, setVerifiedUserType] = useState<VerifiedUserType | null>(null);
  const hasVerified = useRef(false);

  const { token } = route.params;

  const verifyEmail = useCallback(async () => {
    if (!token) {
      setError('Enlace de verificación inválido. Falta el token.');
      setState('error');
      return;
    }

    try {
      hasVerified.current = true;
      const result = await verifyEmailLinkOnce(token);
      setVerifiedUserType(result.userType);

      if (user) {
        await refreshCurrentUser();
      }

      setState('success');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al verificar el correo'));
      setState('error');
    }
  }, [refreshCurrentUser, token, user]);

  useEffect(() => {
    if (hasVerified.current) return;
    verifyEmail();
  }, [verifyEmail]);

  const handleRetry = () => {
    hasVerified.current = false;
    setError(null);
    setState('loading');
    void verifyEmail();
  };

  const handleContinue = () => {
    if (user?.type === 'professional' && user.emailVerified !== true) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'EmailSentVerification', params: { email: user.email, userType: 'PROFESSIONAL' } }],
      });
      return;
    }

    if (user) {
      const destination = user.type === 'professional'
        ? verificationSubmitted === false ? 'ProfessionalVerification' : 'ProfessionalHome'
        : user.type === 'clinic' ? 'ClinicDashboard' : 'Home';
      navigation.reset({
        index: 0,
        routes: [{ name: destination }],
      });
    } else {
      const loginUserType = verifiedUserType === 'PROFESSIONAL'
        ? 'PROFESSIONAL'
        : verifiedUserType === 'CLINIC'
          ? 'CLINIC'
          : 'CLIENT';
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { userType: loginUserType } }],
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
