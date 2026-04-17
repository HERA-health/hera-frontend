/**
 * ForgotPasswordScreen - Password recovery request screen
 * Wraps EmailInputScreen component for password reset email request
 */

import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { EmailInputScreen } from '../../components/auth';
import * as authService from '../../services/authService';
import * as analyticsService from '../../services/analyticsService';
import type { AppNavigationProp } from '../../constants/types';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(() => {
    analyticsService.trackScreen('forgot_password');
  }, []);

  const handleSubmit = async (email: string) => {
    try {
      analyticsService.track('password_reset_requested');
      await authService.requestPasswordReset(email);
      navigation.navigate('EmailSentPasswordReset', { email });
    } catch (error) {
      throw error;
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <EmailInputScreen
      title="Recuperar contraseña"
      description="Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña."
      buttonText="Enviar enlace"
      onSubmit={handleSubmit}
      onBack={handleBack}
    />
  );
}

export default ForgotPasswordScreen;
