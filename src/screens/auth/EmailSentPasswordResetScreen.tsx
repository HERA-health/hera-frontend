/**
 * EmailSentPasswordResetScreen - Password reset email sent confirmation
 * Wraps EmailSentScreen component for password reset flow
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { EmailSentScreen } from '../../components/auth';
import * as authService from '../../services/authService';
import { heraLanding, spacing, borderRadius } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';

export function EmailSentPasswordResetScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'EmailSentPasswordReset'>>();

  const { email } = route.params;

  const handleResend = async () => {
    await authService.requestPasswordReset(email);
  };

  const handleChangeEmail = () => {
    // Navigate back to forgot password screen to enter different email
    navigation.navigate('ForgotPassword');
  };

  const handleBackToLogin = () => {
    // Navigate to login screen
    navigation.navigate('Login', { userType: 'CLIENT' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.emailSentContainer}>
        <EmailSentScreen
          type="passwordReset"
          email={email}
          onResend={handleResend}
          onChangeEmail={handleChangeEmail}
        />
      </View>

      {/* Back to Login Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.backToLoginButton}
          onPress={handleBackToLogin}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={heraLanding.primary} />
          <Text style={styles.backToLoginText}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  emailSentContainer: {
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.cardBg,
    borderWidth: 2,
    borderColor: heraLanding.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  backToLoginText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.primary,
  },
});

export default EmailSentPasswordResetScreen;
