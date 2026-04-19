import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Button, Card } from '../../components/common';
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

  const [resolution, setResolution] = useState<clinicalService.ClinicalConsentRequestResolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setSuccessMessage('Has retirado tu consentimiento clinico.');
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
              Consentimiento clinico
            </Text>
            <Text style={[textStyles.title, { color: theme.textPrimary }, displayTitleStyle]}>
              Confirma tu autorizacion en HERA
            </Text>
            <Text style={[textStyles.subtitle, { color: theme.textSecondary }]}>
              Este paso deja constancia de tu autorizacion para que tu especialista pueda trabajar
              con tu expediente clinico dentro de HERA.
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
                  {resolution.requiresLogin ? 'Requiere iniciar sesion' : 'Disponible'}
                </Text>
              </View>
            </View>
          </Card>

          <Card variant="default" padding="large">
            <View style={styles.contentStack}>
              <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
                Que estas confirmando
              </Text>
              <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                Autorizas el tratamiento de tus datos clinicos dentro de HERA para tu atencion
                profesional. Podras retirar este consentimiento mas adelante.
              </Text>

              {isPending && needsLogin ? (
                <View style={styles.contentStack}>
                  <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                    Para responder a esta solicitud debes iniciar sesion con tu cuenta de paciente en HERA.
                    Si al iniciar sesion no vuelves automaticamente aqui, reabre este mismo enlace.
                  </Text>
                  <Button
                    variant="primary"
                    size="large"
                    onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
                  >
                    Iniciar sesion
                  </Button>
                </View>
              ) : canConfirm ? (
                <Button
                  variant="primary"
                  size="large"
                  onPress={() => void handleAccept()}
                  loading={submitting}
                >
                  Confirmar consentimiento
                </Button>
              ) : canRevoke ? (
                <View style={styles.contentStack}>
                  <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                    Tu consentimiento ya esta activo. Si necesitas retirarlo, puedes hacerlo desde aqui.
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
                  Tu consentimiento ya consta como vigente. Si necesitas retirarlo, inicia sesion
                  en tu cuenta de paciente y vuelve a este enlace.
                </Text>
              ) : (
                <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                  Esta solicitud ya no se puede utilizar. Si necesitas una nueva, pidela a tu especialista.
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
});
