import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { borderRadius, spacing } from '../../constants/colors';
import { getErrorMessage } from '../../constants/errors';
import type { AppRouteProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as authService from '../../services/authService';
import { resendVerificationEmailWithRefresh } from '../../services/emailVerificationService';

const RESEND_COOLDOWN_SECONDS = 30;
const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function EmailSentVerificationScreen() {
  const route = useRoute<AppRouteProp<'EmailSentVerification'>>();
  const { theme } = useTheme();
  const { user, logout, refreshCurrentUser, updateUser } = useAuth();
  const currentEmail = user?.type === 'professional' ? user.email : route.params.email;

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(currentEmail);
  const [checking, setChecking] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(
    user?.verificationEmailSent === true ? 'Te hemos enviado un enlace para confirmar tu correo.' : null
  );
  const [error, setError] = useState<string | null>(
    user?.verificationEmailSent === false
      ? 'Tu cuenta está creada, pero no hemos podido enviar el correo. Pulsa “Reenviar enlace” para intentarlo de nuevo.'
      : null
  );

  useEffect(() => {
    setEmailDraft(currentEmail);
  }, [currentEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshCurrentUser().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [refreshCurrentUser]);

  const handleCheckVerification = useCallback(async () => {
    setChecking(true);
    setError(null);
    setMessage(null);
    try {
      const refreshedUser = await refreshCurrentUser();
      if (refreshedUser?.emailVerified !== true) {
        setMessage('Aún no aparece confirmado. Abre el enlace del correo y vuelve a comprobarlo.');
      }
    } catch (refreshError: unknown) {
      setError(getErrorMessage(refreshError, 'No hemos podido comprobar el estado del correo.'));
    } finally {
      setChecking(false);
    }
  }, [refreshCurrentUser]);

  const handleResend = async () => {
    if (resending || savingEmail || cooldown > 0) return;
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await resendVerificationEmailWithRefresh(currentEmail, refreshCurrentUser);
      setMessage(result.message);
      if (result.outcome === 'sent') {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (resendError: unknown) {
      setError(getErrorMessage(resendError, 'No hemos podido reenviar el correo.'));
    } finally {
      setResending(false);
    }
  };

  const handleSaveEmail = async () => {
    if (savingEmail || resending) return;
    const normalizedEmail = emailDraft.trim().toLowerCase();
    setError(null);
    setMessage(null);

    if (!isValidEmail(normalizedEmail)) {
      setError('Introduce un email válido.');
      return;
    }

    setSavingEmail(true);
    try {
      const result = await authService.updateUnverifiedProfessionalEmail(normalizedEmail);
      updateUser({ email: result.email, emailVerified: false });
      setEditingEmail(false);
      if (result.verificationEmailSent) {
        setMessage('Correo actualizado. Te hemos enviado un enlace nuevo.');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setCooldown(0);
        setError('Correo actualizado, pero no hemos podido enviar el enlace. Pulsa “Reenviar enlace” para volver a intentarlo.');
      }
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError, 'No hemos podido actualizar el correo.'));
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.page, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.shell}>
          <View style={[styles.stepPill, { backgroundColor: theme.secondaryMuted }]}>
            <Text style={[styles.stepText, { color: theme.secondaryDark, fontFamily: theme.fontSansSemiBold }]}>
              PASO 1 DE 2 · IDENTIDAD DIGITAL
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                shadowColor: theme.shadowCard,
              },
            ]}
          >
            <View style={[styles.iconFrame, { backgroundColor: theme.primaryMuted }]}>
              <Ionicons name="mail-unread-outline" size={34} color={theme.primary} />
            </View>

            <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
              Confirma tu correo antes de continuar
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              Así vinculamos el carnet profesional y la póliza a una sola cuenta segura.
            </Text>

            <View style={[styles.emailPanel, { backgroundColor: theme.bgMuted, borderColor: theme.borderLight }]}>
              <View style={styles.emailCopy}>
                <Text style={[styles.emailLabel, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                  Correo a verificar
                </Text>
                <Text style={[styles.emailValue, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  {currentEmail}
                </Text>
              </View>
              <Ionicons name="shield-checkmark-outline" size={22} color={theme.success} />
            </View>

            {editingEmail ? (
              <View style={[styles.editPanel, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
                <Input
                  label="Correo correcto"
                  value={emailDraft}
                  onChangeText={setEmailDraft}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!savingEmail}
                  leftIcon={<Ionicons name="at-outline" size={18} color={theme.textMuted} />}
                />
                <View style={styles.editActions}>
                  <Button
                    variant="ghost"
                    onPress={() => {
                      setEmailDraft(currentEmail);
                      setEditingEmail(false);
                      setError(null);
                    }}
                    disabled={savingEmail}
                  >
                    Cancelar
                  </Button>
                  <Button onPress={() => void handleSaveEmail()} loading={savingEmail} disabled={resending}>
                    Guardar y enviar
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                variant="ghost"
                onPress={() => setEditingEmail(true)}
                icon={<Ionicons name="create-outline" size={17} color={theme.link} />}
              >
                Corregir email
              </Button>
            )}

            {message ? (
              <View style={[styles.notice, { backgroundColor: theme.successBg }]}>
                <Ionicons name="information-circle-outline" size={18} color={theme.success} />
                <Text style={[styles.noticeText, { color: theme.success, fontFamily: theme.fontSans }]}>{message}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.notice, { backgroundColor: theme.errorBg }]}>
                <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
                <Text style={[styles.noticeText, { color: theme.error, fontFamily: theme.fontSans }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.primaryActions}>
              <Button
                fullWidth
                size="large"
                onPress={() => void handleCheckVerification()}
                loading={checking}
                icon={<Ionicons name="checkmark-circle-outline" size={20} color={theme.actionPrimaryText} />}
              >
                Ya lo he verificado
              </Button>
              <Button
                fullWidth
                variant="outline"
                onPress={() => void handleResend()}
                loading={resending}
                disabled={cooldown > 0 || savingEmail}
                icon={<Ionicons name="refresh-outline" size={18} color={theme.focus} />}
              >
                {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar enlace'}
              </Button>
            </View>

            <View style={[styles.nextStep, { borderTopColor: theme.borderLight }]}>
              <View style={[styles.nextStepNumber, { backgroundColor: theme.secondaryMuted }]}>
                <Text style={[styles.nextStepNumberText, { color: theme.secondaryDark, fontFamily: theme.fontSansSemiBold }]}>2</Text>
              </View>
              <View style={styles.nextStepCopy}>
                <Text style={[styles.nextStepTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Después: carnet profesional
                </Text>
                <Text style={[styles.nextStepText, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                  La aplicación abrirá el siguiente paso automáticamente al confirmar tu correo.
                </Text>
              </View>
            </View>
          </View>

          <Button variant="ghost" onPress={() => void logout()}>
            Cerrar sesión
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  shell: { width: '100%', maxWidth: 580, alignSelf: 'center', alignItems: 'center', gap: spacing.md },
  stepPill: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  stepText: { fontSize: 11, letterSpacing: 1.1 },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 4,
  },
  iconFrame: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: 30, lineHeight: 36, textAlign: 'center', marginBottom: spacing.sm },
  description: { fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 450, marginBottom: spacing.xl },
  emailPanel: { width: '100%', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  emailCopy: { flex: 1, minWidth: 0 },
  emailLabel: { fontSize: 12, marginBottom: 3 },
  emailValue: { fontSize: 16 },
  editPanel: { width: '100%', borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
  notice: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.md },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
  primaryActions: { width: '100%', gap: spacing.sm, marginTop: spacing.lg },
  nextStep: { width: '100%', flexDirection: 'row', gap: spacing.md, borderTopWidth: 1, paddingTop: spacing.lg, marginTop: spacing.xl },
  nextStepNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  nextStepNumberText: { fontSize: 14 },
  nextStepCopy: { flex: 1 },
  nextStepTitle: { fontSize: 15, marginBottom: 3 },
  nextStepText: { fontSize: 13, lineHeight: 19 },
});

export default EmailSentVerificationScreen;
