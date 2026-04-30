import React, { useCallback, useMemo } from 'react';
import {
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

import { Button } from '../../components/common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import type { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { LandingHeader } from '../landing/components/LandingHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Pricing'>;
type PlanId = 'basic' | 'pro' | 'diamond';

interface PricingPlan {
  id: PlanId;
  name: string;
  price: string;
  summary: string;
  patientLimit: string;
  features: string[];
  highlighted?: boolean;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '29,99',
    summary: 'Para especialistas que quieren empezar con una agenda organizada y visible desde el primer mes.',
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
    id: 'pro',
    name: 'Pro',
    price: '49,99',
    summary: 'Para especialistas en crecimiento que necesitan más capacidad y gestión fiscal.',
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
    id: 'diamond',
    name: 'Diamond',
    price: '89,99',
    summary: 'Para especialistas con alto volumen que quieren operar sin límites de pacientes.',
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
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
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

  const handleNoopCheckout = useCallback(() => undefined, []);

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
        onOpenPricing={handleNoopCheckout}
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
            Tres niveles mensuales, sin funciones futuras mezcladas con lo disponible para esta fase.
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
              onSelect={handleNoopCheckout}
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
  onSelect: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  styles,
  theme,
  isDark,
  onSelect,
}) => {
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

      <View style={[styles.patientBand, plan.highlighted && styles.patientBandFeatured]}>
        <Ionicons
          name="people-outline"
          size={17}
          color={plan.highlighted ? '#FFFFFF' : theme.primary}
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
              color={theme.primary}
            />
            <Text style={[styles.featureText, plan.highlighted && styles.featureTextFeatured]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>

      <Button
        variant={plan.highlighted ? 'primary' : 'outline'}
        size="medium"
        onPress={onSelect}
        disabled
        fullWidth
      >
        Elegir plan
      </Button>
      <Text style={[styles.pendingText, plan.highlighted && styles.pendingTextFeatured]}>
        Activación con Stripe en fase 2
      </Text>
    </View>
  );

  if (!plan.highlighted) {
    return <View style={styles.planWrap}>{card}</View>;
  }

  return (
    <View style={styles.planWrap}>
      <LinearGradient
        colors={isDark ? ['#1B1724', '#141A15'] : [theme.primary, theme.primaryDark]}
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
      color: theme.primary,
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
      maxWidth: 640,
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
      shadowColor: theme.shadowPrimary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 22,
      elevation: 5,
    },
    planCard: {
      minHeight: isDesktop ? 520 : undefined,
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
      backgroundColor: isDark ? theme.primaryAlpha20 : theme.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
    },
    recommendedText: {
      color: isDark ? theme.primaryLight : theme.textOnPrimary,
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
    },
    priceValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplayBold,
      fontSize: isDesktop ? 44 : 40,
      lineHeight: isDesktop ? 52 : 48,
      letterSpacing: 0,
    },
    priceValueFeatured: {
      color: theme.textPrimary,
    },
    priceMeta: {
      paddingTop: isDesktop ? 6 : 5,
      gap: 0,
    },
    priceCurrency: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.xl,
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
    patientBand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      backgroundColor: theme.primaryAlpha12,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    patientBandFeatured: {
      backgroundColor: theme.primary,
    },
    patientText: {
      color: theme.primaryDark,
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
