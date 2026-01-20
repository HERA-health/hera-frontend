/**
 * EmailSentVerificationScreen - Email verification sent confirmation
 * Wraps the EmailSentScreen component with navigation and service integration
 */

import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { EmailSentScreen } from '../../components/auth';
import * as authService from '../../services/authService';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';

export function EmailSentVerificationScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'EmailSentVerification'>>();

  const { email, userType } = route.params;

  const handleResend = async () => {
    await authService.resendVerificationEmail(email);
  };

  const handleChangeEmail = () => {
    // Navigate back to register screen
    navigation.navigate('Register', { userType });
  };

  const handleContinue = () => {
    // Navigate to appropriate dashboard based on userType
    // The user is already authenticated, so we reset navigation to main stack
    if (userType === 'PROFESSIONAL') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ProfessionalHome' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  };

  return (
    <EmailSentScreen
      type="verification"
      email={email}
      onResend={handleResend}
      onChangeEmail={handleChangeEmail}
      onContinue={handleContinue}
    />
  );
}

export default EmailSentVerificationScreen;
