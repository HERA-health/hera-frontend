import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AnimatedPressable, Button, Card } from '../../components/common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicalService from '../../services/clinicalService';

const textStyles = {
  eyebrow: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: typography.fontSizes.xxxl,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  body: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  strong: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.9,
  },
};

export function ClinicalConsentScreen() {
  const route = useRoute<AppRouteProp<'ClinicalConsent'>>();
  const navigation = useNavigation<AppNavigationProp>();
  const { requestId, token } = route.params;
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 720;

  const [resolution, setResolution] = useState<clinicalService.ClinicalConsentRequestResolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [consentDocumentAccepted, setConsentDocumentAccepted] = useState(false);

  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontDisplayBold }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);

  const loadResolution = useCallback(async () => {
    try {
      setLoading(true);
      const nextResolution = await clinicalService.resolveDigitalConsentRequest(requestId, token);
      setResolution(nextResolution);
      setError(null);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'No se pudo abrir la solicitud de consentimiento'));
    } finally {
      setLoading(false);
    }
  }, [requestId, token]);

  useEffect(() => {
    void loadResolution();
  }, [loadResolution]);

  const handleAccept = async () => {
    try {
      setSubmitting(true);
      const nextResolution = await clinicalService.acceptDigitalConsent(requestId, token);
      setResolution(nextResolution);
      setSuccessMessage('Tu consentimiento ha quedado registrado correctamente.');
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'No se pudo registrar el consentimiento'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setSubmitting(true);
      const nextResolution = await clinicalService.revokeDigitalConsent(requestId, token);
      setResolution(nextResolution);
      setSuccessMessage('Has retirado tu consentimiento clínico.');
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'No se pudo retirar el consentimiento'));
    } finally {
      setSubmitting(false);
    }
  };

  const needsLogin = !isAuthenticated || user?.type !== 'client';
  const isPending = resolution?.status === 'PENDING';
  const isGranted = resolution?.consentStatus === 'GRANTED' || resolution?.status === 'ACCEPTED';
  const canConfirm = Boolean(resolution) && isPending && !needsLogin;
  const canRevoke = Boolean(resolution) && isGranted && !needsLogin;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      <Card variant="default" padding="large">
        <View style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryAlpha12 }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[textStyles.eyebrow, { color: theme.textMuted }, labelStyle]}>
              Consentimiento clínico
            </Text>
            <Text style={[textStyles.title, { color: theme.textPrimary }, displayTitleStyle]}>
              Confirma tu autorización en HERA
            </Text>
            <Text style={[textStyles.subtitle, { color: theme.textSecondary }]}>
              Este paso deja constancia de tu autorización para que tu especialista pueda trabajar
              con tu expediente clínico dentro de HERA.
            </Text>
          </View>
        </View>
      </Card>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[textStyles.body, { color: theme.textSecondary }]}>Preparando la solicitud...</Text>
        </View>
      ) : error ? (
        <Card variant="default" padding="large">
          <View style={styles.stateWrap}>
            <Ionicons name="alert-circle-outline" size={28} color={theme.warning} />
            <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
              No se pudo abrir la solicitud
            </Text>
            <Text style={[textStyles.body, { color: theme.textSecondary, textAlign: 'center' }]}>
              {error}
            </Text>
            <Button variant="secondary" size="medium" onPress={() => void loadResolution()}>
              Reintentar
            </Button>
          </View>
        </Card>
      ) : resolution ? (
        <View style={styles.contentStack}>
          {isPending && needsLogin ? (
            <Card variant="default" padding="large">
              <View style={styles.contentStack}>
                <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
                  Inicia sesión para continuar
                </Text>
                <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                  Para responder a esta solicitud debes entrar con tu cuenta de paciente. Si después del login no vuelves automáticamente aquí, reabre este mismo enlace.
                </Text>
                <Button
                  variant="primary"
                  size="large"
                  onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
                >
                  Iniciar sesión
                </Button>
              </View>
            </Card>
          ) : null}

          <Card variant="default" padding="large">
            <View style={styles.metaStack}>
              <View style={styles.metaRow}>
                <Text style={[textStyles.label, { color: theme.textMuted }, labelStyle]}>Estado</Text>
                <Text style={[textStyles.strong, { color: isGranted ? theme.success : theme.warning }, emphasisStyle]}>
                  {isGranted
                    ? 'Consentimiento vigente'
                    : resolution.status === 'PENDING'
                      ? 'Pendiente de confirmar'
                      : resolution.status}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[textStyles.label, { color: theme.textMuted }, labelStyle]}>Caduca</Text>
                <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
                  {new Date(resolution.expiresAt).toLocaleString('es-ES')}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[textStyles.label, { color: theme.textMuted }, labelStyle]}>Acceso</Text>
                <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
                  {resolution.requiresLogin ? 'Requiere iniciar sesión' : 'Disponible'}
                </Text>
              </View>
            </View>
          </Card>

          <Card variant="default" padding="large">
            <View style={styles.contentStack}>
              <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
                Qué estás confirmando
              </Text>
              <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                Autorizas el tratamiento de tus datos clínicos dentro de HERA para tu atención
                profesional. Podrás retirar este consentimiento más adelante.
              </Text>

              {canConfirm ? (
                <View style={styles.contentStack}>
                  <AnimatedPressable
                    onPress={() => setConsentDocumentAccepted((value) => !value)}
                    hoverLift={false}
                    pressScale={0.99}
                    style={styles.acceptRow}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: consentDocumentAccepted ? theme.primary : theme.bgCard,
                          borderColor: consentDocumentAccepted ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      {consentDocumentAccepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[textStyles.body, { color: theme.textSecondary, flex: 1 }]}>
                      He leído y acepto el{' '}
                      <Text
                        style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold }}
                        onPress={() => navigation.navigate('LegalDocument', { documentKey: 'CLINICAL_PATIENT_CONSENT' })}
                      >
                        consentimiento clínico del paciente
                      </Text>
                      .
                    </Text>
                  </AnimatedPressable>
                  <Button
                    variant="primary"
                    size="large"
                    onPress={() => void handleAccept()}
                    loading={submitting}
                    disabled={!consentDocumentAccepted}
                  >
                    Confirmar consentimiento
                  </Button>
                </View>
              ) : canRevoke ? (
                <View style={styles.contentStack}>
                  <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                    Tu consentimiento ya está activo. Si necesitas retirarlo, puedes hacerlo desde aquí.
                  </Text>
                  <Button
                    variant="secondary"
                    size="large"
                    onPress={() => void handleRevoke()}
                    loading={submitting}
                  >
                    Retirar consentimiento
                  </Button>
                </View>
              ) : isGranted ? (
                <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                  Tu consentimiento ya consta como vigente. Si necesitas retirarlo, inicia sesión
                  en tu cuenta de paciente y vuelve a este enlace.
                </Text>
              ) : (
                <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                  Esta solicitud ya no se puede utilizar. Si necesitas una nueva, pídela a tu especialista.
                </Text>
              )}

              {successMessage ? (
                <View style={[styles.notice, { backgroundColor: theme.successBg, borderColor: `${theme.success}35` }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
                  <Text style={[textStyles.body, { color: theme.textPrimary }]}>{successMessage}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  contentStack: {
    gap: spacing.md,
  },
  stateWrap: {
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  metaStack: {
    gap: spacing.md,
  },
  metaRow: {
    gap: 4,
  },
  notice: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
