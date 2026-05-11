import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from '../../components/common/Button';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { borderRadius, spacing, typography } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import {
  PROFESSIONAL_PLAN_LABELS,
  createProfessionalPortalSession,
  getProfessionalSubscriptionStatus,
  redirectToStripeUrl,
  type ProfessionalSubscriptionStatusDto,
} from '../../services/professionalSubscriptionService';

const STATUS_LABELS: Record<ProfessionalSubscriptionStatusDto['status'], string> = {
  none: 'Sin suscripción',
  incomplete: 'Checkout pendiente',
  trialing: 'Trial activo',
  active: 'Activa',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  unpaid: 'Impagada',
  incomplete_expired: 'Checkout caducado',
  paused: 'Pausada',
};

const formatDate = (value: string | null): string | null => {
  if (!value) return null;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

export function ProfessionalSubscriptionScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ProfessionalSubscription'>>();
  const appAlert = useAppAlert();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const [status, setStatus] = useState<ProfessionalSubscriptionStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const styles = useMemo(
    () => createStyles(theme, width >= 900),
    [theme, width]
  );

  const checkoutState = route.params?.checkout;

  const loadStatus = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const nextStatus = await getProfessionalSubscriptionStatus();
      setStatus(nextStatus);
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'No hemos podido cargar el estado de tu suscripción.';
      showAppAlert(appAlert, 'Suscripción no disponible', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appAlert]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const openPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const session = await createProfessionalPortalSession();
      await redirectToStripeUrl(session.url);
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'No hemos podido abrir el portal de Stripe.';
      showAppAlert(appAlert, 'Portal no disponible', message);
    } finally {
      setPortalLoading(false);
    }
  }, [appAlert]);

  const hasConfirmedSubscription = Boolean(status?.hasStripeSubscription);
  const hasCommercialAccess = Boolean(status?.subscriptionAccessAllowed);
  const planLabel = status?.plan && hasConfirmedSubscription
    ? PROFESSIONAL_PLAN_LABELS[status.plan]
    : 'Sin plan activo';
  const planEyebrow = hasConfirmedSubscription ? 'Plan actual' : 'Suscripción no activa';
  const statusLabel = status ? STATUS_LABELS[status.status] : 'Cargando';
  const periodEnd = formatDate(status?.currentPeriodEnd ?? null);
  const trialEnd = formatDate(status?.trialEndsAt ?? null);
  const graceEnd = formatDate(status?.gracePeriodEndsAt ?? null);
  const patientLimit = status?.activePatientLimit === null
    ? 'Ilimitados'
    : String(status?.activePatientLimit ?? 0);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadStatus('refresh')}
          tintColor={theme.primary}
        />
      )}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Suscripción profesional</Text>
        <Text style={styles.title}>Tu plan HERA</Text>
        <Text style={styles.subtitle}>
          Gestiona el estado de tu suscripción, tus facturas y los datos fiscales desde Stripe.
        </Text>
      </View>

      {checkoutState === 'success' && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle-outline" size={22} color={theme.success} />
          <Text style={styles.bannerText}>
            Checkout completado. El acceso se confirma con los webhooks de Stripe y puede tardar unos segundos.
          </Text>
        </View>
      )}

      <View style={styles.grid}>
        <View style={styles.mainCard}>
          <View style={styles.cardTitleRow}>
            <View>
              <Text style={styles.cardEyebrow}>{planEyebrow}</Text>
              <Text style={styles.planName}>{planLabel}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <Metric
              icon="people-outline"
              label="Pacientes activos"
              value={`${status?.activePatientCount ?? 0} / ${patientLimit}`}
              iconColor={theme.primary}
              styles={styles}
            />
            <Metric
              icon="calendar-outline"
              label={trialEnd ? 'Trial hasta' : 'Periodo hasta'}
              value={trialEnd || periodEnd || 'Pendiente'}
              iconColor={theme.primary}
              styles={styles}
            />
            <Metric
              icon="shield-checkmark-outline"
              label="Límites backend"
              value={status?.enforcementEnabled ? 'Activos' : 'Preparados'}
              iconColor={theme.primary}
              styles={styles}
            />
          </View>

          {status?.status === 'past_due' && (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.warningAmber} />
              <Text style={styles.warningText}>
                Hay un pago pendiente. Mantendremos el acceso hasta {graceEnd || 'el final del margen de cortesía'}.
              </Text>
            </View>
          )}

          {status?.subscriptionNeedsSync && (
            <View style={styles.infoBox}>
              <Ionicons name="sync-outline" size={20} color={theme.primary} />
              <Text style={styles.infoText}>
                Stripe esta terminando de sincronizar tu suscripcion. El estado puede tardar unos minutos en actualizarse.
              </Text>
            </View>
          )}

          {status && !hasCommercialAccess && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
              <Text style={styles.infoText}>
                Empieza con 14 días gratis para publicar tu perfil, recibir reservas y crear nuevos pacientes.
                Mientras tanto puedes completar tu perfil, enviar la verificación y preparar tu disponibilidad.
              </Text>
            </View>
          )}

          {status && !status.canCreateActivePatient && (
            <View style={styles.warningBox}>
              <Ionicons name="people-outline" size={20} color={theme.warningAmber} />
              <Text style={styles.warningText}>
                Has alcanzado el límite para nuevos pacientes activos. Podrás seguir gestionando los ya existentes.
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {hasCommercialAccess ? (
              <Button
                variant="primary"
                size="medium"
                onPress={openPortal}
                loading={portalLoading}
                disabled={!status?.hasStripeSubscription}
              >
                Abrir portal de Stripe
              </Button>
            ) : (
              <Button
                variant="primary"
                size="medium"
                onPress={() => navigation.navigate('Pricing')}
              >
                Empezar 14 días gratis
              </Button>
            )}
            <Button
              variant="outline"
              size="medium"
              onPress={() => navigation.navigate('Pricing')}
            >
              Ver planes
            </Button>
          </View>
        </View>

        <View style={styles.sideCard}>
          <Text style={styles.sideTitle}>Desde el portal podrás</Text>
          {[
            'Actualizar método de pago',
            'Editar datos de facturación',
            'Añadir Tax ID o datos fiscales',
            'Ver y descargar facturas',
            'Cancelar al final del periodo',
          ].map((item) => (
            <View key={item} style={styles.sideRow}>
              <Ionicons name="checkmark" size={18} color={theme.primary} />
              <Text style={styles.sideText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

interface MetricProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconColor: string;
  styles: ReturnType<typeof createStyles>;
}

const Metric: React.FC<MetricProps> = ({ icon, label, value, iconColor, styles }) => (
  <View style={styles.metricCard}>
    <Ionicons name={icon} size={20} color={iconColor} />
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

function createStyles(theme: ReturnType<typeof useTheme>['theme'], isWide: boolean) {
  return StyleSheet.create({
    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg,
    },
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      padding: isWide ? spacing.xl : spacing.lg,
      gap: spacing.lg,
    },
    header: {
      gap: spacing.xs,
      maxWidth: 760,
    },
    kicker: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
      textTransform: 'uppercase',
      letterSpacing: 0,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplayBold,
      fontSize: isWide ? 40 : 32,
      lineHeight: isWide ? 48 : 40,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.md,
      lineHeight: 24,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.success,
      backgroundColor: theme.successBg,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    bannerText: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
      lineHeight: 21,
    },
    grid: {
      flexDirection: isWide ? 'row' : 'column',
      alignItems: 'stretch',
      gap: spacing.lg,
    },
    mainCard: {
      flex: 1,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: isWide ? spacing.xl : spacing.lg,
      gap: spacing.lg,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 18,
      elevation: 3,
    },
    sideCard: {
      width: isWide ? 340 : '100%',
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      alignSelf: 'stretch',
    },
    cardTitleRow: {
      flexDirection: isWide ? 'row' : 'column',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    cardEyebrow: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
      textTransform: 'uppercase',
    },
    planName: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplayBold,
      fontSize: 34,
      lineHeight: 42,
    },
    statusPill: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primaryAlpha12,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    statusText: {
      color: theme.primaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    metricGrid: {
      flexDirection: isWide ? 'row' : 'column',
      gap: spacing.md,
    },
    metricCard: {
      flex: 1,
      minHeight: 116,
      backgroundColor: theme.bgMuted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    metricLabel: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
    },
    metricValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.lg,
      lineHeight: 26,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.warningAmber,
      backgroundColor: theme.warningBg,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    warningText: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
      lineHeight: 21,
    },
    infoText: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
      lineHeight: 21,
    },
    actions: {
      flexDirection: isWide ? 'row' : 'column',
      gap: spacing.md,
      alignItems: isWide ? 'center' : 'stretch',
    },
    sideTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.lg,
    },
    sideRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    sideText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
      lineHeight: 21,
    },
  });
}

export default ProfessionalSubscriptionScreen;
