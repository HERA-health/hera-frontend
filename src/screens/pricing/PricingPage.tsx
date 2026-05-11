import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import type { Theme } from '../../constants/theme';
import type { RootStackParamList } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  createProfessionalCheckoutSession,
  redirectToStripeUrl,
  savePendingProfessionalPlan,
  type ProfessionalPlanSlug,
} from '../../services/professionalSubscriptionService';
import { LandingHeader } from '../landing/components/LandingHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Pricing'>;

interface PricingPlan {
  id: ProfessionalPlanSlug;
  name: string;
  price: string;
  summary: string;
  patientLimit: string;
  features: string[];
  highlighted?: boolean;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'calma',
    name: 'Calma',
    price: '29,99',
    summary: 'Para digitalizar tu consulta con orden, sencillez y sin complicaciones.',
    patientLimit: '20 pacientes activos',
    features: [
      '2 GB de almacenamiento',
      'Recordatorios por mail',
      'Videollamadas ilimitadas',
      'Soporte personalizado',
      'Facturación personalizada',
    ],
  },
  {
    id: 'crecimiento',
    name: 'Crecimiento',
    price: '49,99',
    summary: 'Para especialistas que quieren ampliar su actividad con más capacidad y mejor gestión.',
    patientLimit: '60 pacientes activos',
    features: [
      '10 GB de almacenamiento',
      'Recordatorios por mail',
      'Videollamadas ilimitadas',
      'Soporte personalizado',
      'Facturación personalizada',
    ],
    highlighted: true,
  },
  {
    id: 'horizonte',
    name: 'Horizonte',
    price: '89,99',
    summary: 'Para especialistas que miran lejos y quieren crecer sin límites.',
    patientLimit: 'Pacientes ilimitados',
    features: [
      '50 GB de almacenamiento',
      'Recordatorios por mail',
      'Videollamadas ilimitadas',
      'Soporte personalizado',
      'Facturación personalizada',
    ],
  },
];

export const PricingPage: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const appAlert = useAppAlert();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const { isAuthenticated, user, verificationSubmitted } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<ProfessionalPlanSlug | null>(null);
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const styles = useMemo(
    () => createStyles(theme, isDark, isDesktop, isTablet),
    [theme, isDark, isDesktop, isTablet]
  );

  const handleFindSpecialist = useCallback(() => {
    navigation.navigate('Login', { userType: 'CLIENT' });
  }, [navigation]);

  const handleJoinAsProfessional = useCallback(() => {
    navigation.navigate('Login', { userType: 'PROFESSIONAL' });
  }, [navigation]);

  const handleGoHome = useCallback(() => {
    navigation.navigate('Landing');
  }, [navigation]);

  const handleSelectPlan = useCallback(async (plan: ProfessionalPlanSlug) => {
    if (loadingPlan) {
      return;
    }

    if (isAuthenticated && user?.type === 'client') {
      showAppAlert(
        appAlert,
        'Plan para especialistas',
        'Este plan es para profesionales. Crea o accede con una cuenta de especialista para continuar.'
      );
      return;
    }

    if (!isAuthenticated) {
      await savePendingProfessionalPlan(plan);
      navigation.navigate('Login', { userType: 'PROFESSIONAL' });
      return;
    }

    if (user?.type === 'professional' && verificationSubmitted !== true) {
      await savePendingProfessionalPlan(plan);
      navigation.navigate('ProfessionalVerification');
      return;
    }

    setLoadingPlan(plan);
    try {
      const session = await createProfessionalCheckoutSession(plan);
      await redirectToStripeUrl(session.url);
    } catch (error: unknown) {
      if (getErrorCode(error) === 'PROFESSIONAL_SUBSCRIPTION_ALREADY_EXISTS') {
        navigation.navigate('ProfessionalSubscription');
        return;
      }

      if (getErrorCode(error) === 'PROFESSIONAL_VERIFICATION_REQUIRED') {
        await savePendingProfessionalPlan(plan);
        navigation.navigate('ProfessionalVerification');
        return;
      }

      const message = getErrorMessage(
        error,
        'No hemos podido iniciar el checkout. Inténtalo de nuevo en unos minutos.'
      );
      showAppAlert(appAlert, 'Checkout no disponible', message);
    } finally {
      setLoadingPlan(null);
    }
  }, [
    appAlert,
    isAuthenticated,
    loadingPlan,
    navigation,
    user?.type,
    verificationSubmitted,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      <LandingHeader
        isScrolled
        activeRoute="pricing"
        onFindSpecialist={handleFindSpecialist}
        onJoinAsProfessional={handleJoinAsProfessional}
        onGoHome={handleGoHome}
        onOpenPricing={() => undefined}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>Planes para especialistas</Text>
          <Text style={styles.title}>Precios claros para especialistas en HERA</Text>
          <Text style={styles.subtitle}>
            Tres niveles mensuales con 14 días gratis, facturación desde Stripe y precios sin IVA incluido.
          </Text>
        </View>

        <View style={styles.planGrid}>
          {PRICING_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              styles={styles}
              theme={theme}
              isDark={isDark}
              loading={loadingPlan === plan.id}
              disabled={loadingPlan !== null}
              onSelect={() => void handleSelectPlan(plan.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

interface PlanCardProps {
  plan: PricingPlan;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  isDark: boolean;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  styles,
  theme,
  isDark,
  loading,
  disabled,
  onSelect,
}) => {
  const accentColor = isDark ? theme.primary : theme.secondary;
  const card = (
    <View style={[styles.planCard, plan.highlighted && styles.planCardFeatured]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.planName, plan.highlighted && styles.planNameFeatured]}>
            {plan.name}
          </Text>
          {plan.highlighted && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recomendado</Text>
            </View>
          )}
        </View>
        <Text style={[styles.planSummary, plan.highlighted && styles.planSummaryFeatured]}>
          {plan.summary}
        </Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={[styles.priceValue, plan.highlighted && styles.priceValueFeatured]}>
          {plan.price}
        </Text>
        <View style={styles.priceMeta}>
          <Text style={[styles.priceCurrency, plan.highlighted && styles.priceCurrencyFeatured]}>
            €
          </Text>
          <Text style={[styles.priceInterval, plan.highlighted && styles.priceIntervalFeatured]}>
            /mes
          </Text>
        </View>
      </View>
      <Text style={[styles.taxText, plan.highlighted && styles.taxTextFeatured]}>+ IVA</Text>

      <View style={[styles.patientBand, plan.highlighted && styles.patientBandFeatured]}>
        <Ionicons
          name="people-outline"
          size={17}
          color={plan.highlighted ? '#FFFFFF' : accentColor}
        />
        <Text style={[styles.patientText, plan.highlighted && styles.patientTextFeatured]}>
          {plan.patientLimit}
        </Text>
      </View>

      <View style={styles.featureList}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Ionicons
              name="checkmark"
              size={20}
              color={accentColor}
            />
            <Text style={[styles.featureText, plan.highlighted && styles.featureTextFeatured]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Elegir plan ${plan.name}`}
        onPress={onSelect}
        disabled={disabled}
        pressScale={0.97}
        hoverLift
        style={[
          styles.planCta,
          plan.highlighted && styles.planCtaFeatured,
          disabled && !loading && styles.planCtaDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={plan.highlighted ? '#FFFFFF' : accentColor} />
        ) : (
          <Text style={[styles.planCtaText, plan.highlighted && styles.planCtaTextFeatured]}>
            Elegir plan
          </Text>
        )}
      </AnimatedPressable>
      <Text style={[styles.pendingText, plan.highlighted && styles.pendingTextFeatured]}>
        14 días gratis. Checkout seguro con Stripe.
      </Text>
    </View>
  );

  if (!plan.highlighted) {
    return <View style={styles.planWrap}>{card}</View>;
  }

  return (
    <View style={styles.planWrap}>
      <LinearGradient
        colors={isDark ? ['#1B1724', '#141A15'] : [theme.secondaryLight, theme.secondaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredFrame}
      >
        {card}
      </LinearGradient>
    </View>
  );
};

function createStyles(
  theme: Theme,
  isDark: boolean,
  isDesktop: boolean,
  isTablet: boolean
) {
  const accent = isDark ? theme.primary : theme.secondary;
  const accentDark = isDark ? theme.primaryDark : theme.secondaryDark;
  const accentLight = isDark ? theme.primaryLight : theme.secondaryLight;
  const accentAlpha = isDark ? theme.primaryAlpha12 : theme.secondaryAlpha12;
  const accentAlphaStrong = isDark ? theme.primaryAlpha20 : theme.secondaryAlpha12;

  const cardBasis = isDesktop
    ? ({ flexBasis: 0 } as const)
    : isTablet
      ? ({ flexBasis: '31%' as unknown as number } as const)
      : ({ width: '100%' as unknown as number } as const);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: isDesktop ? 116 : 100,
      paddingHorizontal: isDesktop ? 48 : spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.xl,
    },
    hero: {
      width: '100%',
      maxWidth: 880,
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.md,
    },
    kicker: {
      color: accentDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
      textTransform: 'uppercase',
      letterSpacing: 0,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplayBold,
      fontSize: isDesktop ? 40 : 32,
      lineHeight: isDesktop ? 48 : 40,
      textAlign: 'center',
      letterSpacing: 0,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.md,
      lineHeight: 24,
      textAlign: 'center',
      maxWidth: 680,
    },
    planGrid: {
      width: '100%',
      maxWidth: 1120,
      alignSelf: 'center',
      flexDirection: isDesktop || isTablet ? 'row' : 'column',
      alignItems: 'stretch',
      gap: spacing.md,
    },
    planWrap: {
      flexGrow: isDesktop ? 1 : 0,
      flexShrink: 1,
      minWidth: isDesktop ? 0 : undefined,
      ...cardBasis,
    },
    featuredFrame: {
      borderRadius: borderRadius.xl,
      padding: 2,
      height: '100%',
      shadowColor: isDark ? theme.shadowPrimary : theme.shadowSecondary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 22,
      elevation: 5,
    },
    planCard: {
      minHeight: isDesktop ? 548 : undefined,
      height: '100%',
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      padding: isDesktop ? spacing.xl : spacing.lg,
      gap: spacing.md,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 2,
    },
    planCardFeatured: {
      backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
      borderColor: 'transparent',
      shadowColor: 'transparent',
      elevation: 0,
    },
    cardHeader: {
      gap: spacing.xs,
      minHeight: isDesktop ? 88 : undefined,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    planName: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplayBold,
      fontSize: isDesktop ? 28 : 26,
      lineHeight: isDesktop ? 34 : 32,
    },
    planNameFeatured: {
      color: theme.textPrimary,
    },
    recommendedBadge: {
      backgroundColor: isDark ? accentAlphaStrong : accent,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
    },
    recommendedText: {
      color: isDark ? accentLight : theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.xs,
      textTransform: 'uppercase',
    },
    planSummary: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 22,
    },
    planSummaryFeatured: {
      color: theme.textSecondary,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    priceValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplayBold,
      fontSize: isDesktop ? 42 : 38,
      lineHeight: isDesktop ? 48 : 44,
      letterSpacing: 0,
    },
    priceValueFeatured: {
      color: theme.textPrimary,
    },
    priceMeta: {
      paddingTop: isDesktop ? 5 : 4,
      gap: 0,
    },
    priceCurrency: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.lg,
    },
    priceCurrencyFeatured: {
      color: theme.textPrimary,
    },
    priceInterval: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
    },
    priceIntervalFeatured: {
      color: theme.textSecondary,
    },
    taxText: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
      marginTop: -spacing.sm,
    },
    taxTextFeatured: {
      color: theme.textMuted,
    },
    patientBand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      backgroundColor: accentAlpha,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    patientBandFeatured: {
      backgroundColor: accent,
    },
    patientText: {
      color: accentDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
      flexShrink: 1,
    },
    patientTextFeatured: {
      color: '#FFFFFF',
    },
    featureList: {
      gap: spacing.sm + 2,
      flexGrow: 1,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      minHeight: 24,
    },
    featureText: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
      lineHeight: 21,
    },
    featureTextFeatured: {
      color: theme.textPrimary,
    },
    planCta: {
      minHeight: 46,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: accentAlphaStrong,
      backgroundColor: accentAlpha,
    },
    planCtaFeatured: {
      borderColor: 'transparent',
      backgroundColor: accent,
    },
    planCtaDisabled: {
      opacity: 0.6,
    },
    planCtaText: {
      color: accentDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    planCtaTextFeatured: {
      color: theme.textOnPrimary,
    },
    pendingText: {
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.xs,
      textAlign: 'center',
    },
    pendingTextFeatured: {
      color: theme.textMuted,
    },
  });
}

export default PricingPage;
