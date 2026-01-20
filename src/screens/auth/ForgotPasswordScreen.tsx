/**
 * ForgotPasswordScreen - Password recovery request screen
 * Wraps EmailInputScreen component for password reset email request
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { EmailInputScreen } from '../../components/auth';
import * as authService from '../../services/authService';
import type { AppNavigationProp } from '../../constants/types';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<AppNavigationProp>();

  const handleSubmit = async (email: string) => {
    console.log('═══════════════════════════════════════');
    console.log('🔐 ForgotPasswordScreen.handleSubmit called');
    console.log('📧 Email:', email);
    console.log('═══════════════════════════════════════');

    try {
      // Request password reset - this will throw on error
      // EmailInputScreen handles the error display
      console.log('📤 Calling authService.requestPasswordReset...');
      await authService.requestPasswordReset(email);
      console.log('✅ Password reset request successful, navigating...');

      // On success, navigate to email sent screen
      navigation.navigate('EmailSentPasswordReset', { email });
    } catch (error) {
      console.error('❌ ForgotPasswordScreen error:', error);
      throw error; // Re-throw for EmailInputScreen to handle
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
