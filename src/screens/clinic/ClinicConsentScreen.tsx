import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function ClinicConsentScreen(): React.ReactElement {
  const route = useRoute<AppRouteProp<'ClinicConsent'>>();
  const navigation = useNavigation<AppNavigationProp>();
  const { requestId, token } = route.params;
  const { isAuthenticated, user, logout } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [resolution, setResolution] = useState<clinicService.ClinicPatientConsentResolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const redactedPath = `/clinic-consent/${encodeURIComponent(requestId)}/redacted`;
    if (window.location.pathname !== redactedPath) {
      window.history.replaceState(window.history.state, document.title, redactedPath);
    }
  }, [requestId]);

  const loadResolution = useCallback(async () => {
    try {
      setLoading(true);
      const nextResolution = await clinicService.resolveClinicPatientConsentRequest(requestId, token);
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
      const nextResolution = await clinicService.acceptClinicPatientConsentRequest(requestId, token);
      setResolution(nextResolution);
      setSuccessMessage('Tu consentimiento de clínica ha quedado registrado correctamente.');
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, 'No se pudo aceptar el consentimiento'));
    } finally {
      setSubmitting(false);
    }
  };

  const needsPatientLogin = !isAuthenticated || user?.type !== 'client';
  const isWrongAccount = isAuthenticated && user?.type !== 'client';
  const isPending = resolution?.status === 'PENDING';
  const isGranted = resolution?.consentStatus === 'GRANTED' || resolution?.status === 'ACCEPTED';
  const canConfirm = Boolean(resolution) && isPending && !needsPatientLogin;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <Card variant="default" padding="large">
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Consentimiento de clínica</Text>
            <Text style={styles.title}>Confirma tu autorización administrativa</Text>
            <Text style={styles.subtitle}>
              Esta confirmación pertenece a la gestión de clínica y no abre tu historia clínica,
              notas, sesiones ni facturas.
            </Text>
          </View>
        </View>
      </Card>

      {loading ? (
        <Card variant="outlined" padding="large">
          <View style={styles.state}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.stateText}>Preparando la solicitud...</Text>
          </View>
        </Card>
      ) : error ? (
        <Card variant="outlined" padding="large">
          <View style={styles.state}>
            <Ionicons name="alert-circle-outline" size={28} color={theme.warning} />
            <Text style={styles.stateTitle}>No se pudo abrir la solicitud</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Button variant="secondary" size="medium" onPress={() => void loadResolution()}>
              Reintentar
            </Button>
          </View>
        </Card>
      ) : resolution ? (
        <View style={styles.stack}>
          {isPending && needsPatientLogin ? (
            <Card variant="default" padding="large">
              <View style={styles.stack}>
                <Text style={styles.cardTitle}>
                  {isWrongAccount ? 'Usa la cuenta de paciente vinculada' : 'Inicia sesión para continuar'}
                </Text>
                <Text style={styles.body}>
                  {isWrongAccount
                    ? 'Esta solicitud solo puede aceptarla el paciente de la ficha. Cierra sesión y entra con esa cuenta.'
                    : 'Para responder debes entrar con tu cuenta de paciente HERA.'}
                </Text>
                <Button
                  variant="primary"
                  size="large"
                  onPress={() => {
                    if (isWrongAccount) {
                      void logout();
                      return;
                    }
                    navigation.navigate('Login', { userType: 'CLIENT' });
                  }}
                >
                  {isWrongAccount ? 'Cerrar sesión' : 'Iniciar sesión'}
                </Button>
              </View>
            </Card>
          ) : null}

          <Card variant="default" padding="large">
            <View style={styles.metaStack}>
              <InfoRow
                label="Estado"
                value={isGranted ? 'Consentimiento vigente' : isPending ? 'Pendiente de confirmar' : resolution.status}
                accent={isGranted ? theme.success : theme.warning}
              />
              <InfoRow label="Clínica" value={resolution.clinic.name} />
              <InfoRow label="Paciente" value={resolution.patient.displayName} />
              <InfoRow label="Caduca" value={formatDateTime(resolution.expiresAt)} />
              <InfoRow label="Versión" value={resolution.version} />
            </View>
          </Card>

          <Card variant="default" padding="large">
            <View style={styles.stack}>
              <Text style={styles.cardTitle}>Qué estás confirmando</Text>
              <Text style={styles.body}>
                Autorizas a la clínica indicada a dejar constancia administrativa de tu consentimiento
                y a conservar la evidencia asociada en HERA.
              </Text>

              {canConfirm ? (
                <View style={styles.stack}>
                  <AnimatedPressable
                    onPress={() => setAccepted((current) => !current)}
                    hoverLift={false}
                    pressScale={0.99}
                    style={styles.acceptRow}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: accepted ? theme.primary : theme.bgCard,
                          borderColor: accepted ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      {accepted ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </View>
                    <Text style={styles.bodySmall}>
                      Entiendo y acepto que HERA registre este consentimiento administrativo de clínica.
                    </Text>
                  </AnimatedPressable>
                  <Button
                    variant="primary"
                    size="large"
                    onPress={() => void handleAccept()}
                    loading={submitting}
                    disabled={!accepted}
                  >
                    Confirmar consentimiento
                  </Button>
                </View>
              ) : isGranted ? (
                <Text style={styles.body}>
                  Este consentimiento ya consta como vigente.
                </Text>
              ) : (
                <Text style={styles.body}>
                  Esta solicitud ya no se puede utilizar. Pide a tu clínica que genere una nueva si hace falta.
                </Text>
              )}

              {successMessage ? (
                <View style={styles.notice}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
                  <Text style={styles.noticeText}>{successMessage}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      width: '100%',
      maxWidth: 780,
      alignSelf: 'center',
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
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
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    heroCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    eyebrow: {
      color: theme.textMuted,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.xs,
      lineHeight: 18,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: typography.fontSizes.xxxl,
      lineHeight: 38,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.md,
      lineHeight: 24,
    },
    state: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
    },
    stateText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    stack: {
      gap: spacing.md,
    },
    cardTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 17,
      lineHeight: 23,
    },
    body: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 22,
    },
    bodySmall: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 20,
    },
    metaStack: {
      gap: spacing.sm,
    },
    infoRow: {
      minHeight: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      paddingVertical: spacing.sm,
    },
    infoLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    infoValue: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'right',
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
    notice: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: `${theme.success}35`,
      backgroundColor: theme.successBg,
      padding: spacing.md,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    noticeText: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
    },
  });

export default ClinicConsentScreen;
