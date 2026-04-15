import React, { useMemo } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Specialist } from '../../constants/types';
import { spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';

interface SpecialistCardProps {
  specialist: Specialist;
  onPress: () => void;
  style?: ViewStyle;
  position?: 1 | 2 | 3;
}

const APPROACH_LABELS: Record<string, string> = {
  cbt: 'TCC',
  'cognitive-behavioral': 'TCC',
  act: 'ACT',
  emdr: 'EMDR',
  psychodynamic: 'Psicodinámico',
  humanistic: 'Humanista',
  systemic: 'Sistémico',
  mindfulness: 'Mindfulness',
  gestalt: 'Gestalt',
};

const TAG_LABELS: Record<string, string> = {
  ansiedad: 'Ansiedad',
  anxiety: 'Ansiedad',
  depresion: 'Depresión',
  depression: 'Depresión',
  pareja: 'Pareja',
  couples: 'Pareja',
  trauma: 'Trauma',
  estres: 'Estrés',
  stress: 'Estrés',
  autoestima: 'Autoestima',
  self_esteem: 'Autoestima',
  selfesteem: 'Autoestima',
  duelo: 'Duelo',
  grief: 'Duelo',
  infantil: 'Infantil',
  adolescentes: 'Adolescentes',
  familia: 'Familia',
  comunicacion: 'Comunicación',
  conflictos: 'Conflictos',
  adultos: 'Adultos',
  mindfulness: 'Mindfulness',
  emdr: 'EMDR',
  tcc: 'TCC',
};

const prettifyTag = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/\s+/g, '_');
  return (
    TAG_LABELS[normalized] ??
    value
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const getDisplayTags = (specialist: Specialist): string[] => {
  const therapyTags = (specialist.matchingProfile?.therapeuticApproach ?? [])
    .map((approach) => APPROACH_LABELS[approach.trim().toLowerCase()] ?? prettifyTag(approach))
    .filter(Boolean);

  const specialtyTags = (specialist.matchingProfile?.specialties ?? [])
    .map((specialty) => prettifyTag(specialty))
    .filter(Boolean);

  const fallbackTags = (specialist.tags ?? [])
    .map((tag) => prettifyTag(tag))
    .filter((tag) =>
      ![
        'Especialidad Coincidente',
        'Enfoque Terapéutico',
        'Personalidad Compatible',
        'Estilo De Sesión',
        'Disponibilidad',
        'Modalidad Compatible',
        'Alta Experiencia',
      ].includes(tag),
    );

  return Array.from(new Set([...therapyTags, ...specialtyTags, ...fallbackTags])).slice(0, 4);
};

function AffinityRing({ pct, theme }: { pct: number; theme: Theme }) {
  const radius = 20;
  const stroke = 3;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (pct / 100) * circumference;

  const ringColor = pct >= 80
    ? theme.success
    : pct >= 60
      ? theme.warningAmber
      : theme.secondary;

  return (
    <View style={styles.affinityRingWrapper}>
      <Svg width={50} height={50}>
        <Circle
          cx={25}
          cy={25}
          r={radius}
          stroke={theme.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={25}
          cy={25}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progress}
          strokeLinecap="round"
          fill="none"
          transform="rotate(-90, 25, 25)"
        />
      </Svg>
      <View style={styles.affinityLabel}>
        <Text style={[styles.affinityPct, { color: ringColor, fontFamily: theme.fontSansBold }]}>
          {pct}%
        </Text>
      </View>
    </View>
  );
}

export function SpecialistCard({ specialist, onPress, style, position }: SpecialistCardProps) {
  const { theme, isDark } = useTheme();
  const dynamicStyles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;
  const affinityPct = specialist.affinityPercentage ?? 0;
  const visibleTags = getDisplayTags(specialist);

  const medalGradients: Record<number, [string, string]> = {
    1: theme.medals.gold,
    2: theme.medals.silver,
    3: theme.medals.bronze,
  };

  const avatarUri = specialist.user?.avatar || specialist.avatar;

  return (
    <AnimatedPressable
      onPress={onPress}
      pressScale={0.985}
      hoverLift
      style={[
        dynamicStyles.card,
        position ? { borderColor: `${medalGradients[position][0]}55`, borderWidth: 1.5 } : null,
        style,
      ]}
    >
      {position ? (
        <LinearGradient
          colors={medalGradients[position]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.medalBadge}
        >
          <Text style={styles.medalNumber}>#{position}</Text>
        </LinearGradient>
      ) : null}

      <View style={[styles.mainContent, { flexDirection: isWideScreen ? 'row' : 'column' }]}>
        <View style={[styles.leftSection, { flexDirection: isWideScreen ? 'row' : 'column' }]}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={[styles.avatarImage, { borderColor: theme.primaryMuted }]}
              />
            ) : (
              <LinearGradient
                colors={[theme.primary, theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={[styles.avatarText, { fontFamily: theme.fontSansBold }]}>
                  {specialist.initial}
                </Text>
              </LinearGradient>
            )}

            {specialist.verified ? (
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: theme.primaryAlpha12, borderColor: theme.bgCard },
                ]}
              >
                <Ionicons name="shield-checkmark" size={13} color={theme.primary} />
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.infoSection,
              {
                marginLeft: isWideScreen ? spacing.md : 0,
                marginTop: isWideScreen ? 0 : spacing.md,
                flex: isWideScreen ? 1 : undefined,
              },
            ]}
          >
            <Text
              style={[styles.name, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}
              numberOfLines={1}
            >
              {specialist.name}
            </Text>
            <Text
              style={[
                styles.specialization,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
              numberOfLines={1}
            >
              {specialist.specialization}
            </Text>
            <View style={styles.ratingRow}>
              <View style={[styles.ratingPill, { backgroundColor: `${theme.starRating}18` }]}>
                <Ionicons name="star" size={14} color={theme.starRating} />
                <Text
                  style={[styles.ratingText, { color: theme.starRating, fontFamily: theme.fontSansBold }]}
                >
                  {specialist.rating}
                </Text>
              </View>
              <Text style={[styles.reviewCount, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                ({specialist.reviewCount} reseñas)
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.affinitySection,
            { marginTop: isWideScreen ? 0 : spacing.md, marginLeft: isWideScreen ? spacing.md : 0 },
          ]}
        >
          <AffinityRing pct={affinityPct} theme={theme} />
          <Text style={[styles.matchLabel, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
            match
          </Text>
        </View>
      </View>

      <Text
        style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}
        numberOfLines={2}
      >
        {specialist.description}
      </Text>

      <View style={styles.tags}>
        {visibleTags.map((tag, index) => (
          <View
            key={`${specialist.id}-${tag}-${index}`}
            style={[
              styles.tag,
              {
                backgroundColor: theme.primaryAlpha12,
                borderColor: theme.primaryMuted,
              },
            ]}
          >
            <Text
              style={[styles.tagText, { color: theme.primaryDark, fontFamily: theme.fontSansSemiBold }]}
              numberOfLines={1}
            >
              {tag}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
            €{specialist.pricePerSession}
          </Text>
          <Text style={[styles.priceLabel, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
            / sesión
          </Text>
          {specialist.firstVisitFree ? (
            <View style={[styles.pricePerkBadge, { backgroundColor: theme.secondaryAlpha12 }]}>
              <Ionicons name="gift-outline" size={12} color={theme.secondary} />
              <Text
                style={[
                  styles.pricePerkText,
                  { color: isDark ? theme.secondaryLight : theme.secondaryDark, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                Gratis
              </Text>
            </View>
          ) : null}
        </View>

        <AnimatedPressable
          onPress={onPress}
          pressScale={0.95}
          hoverLift={false}
          style={[styles.ctaWrapper, { overflow: 'hidden' }]}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={[styles.ctaText, { fontFamily: theme.fontSansBold }]}>Ver perfil</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      padding: spacing.lg,
      marginBottom: spacing.md,
      position: 'relative',
      width: '100%',
      maxWidth: 1200,
      alignSelf: 'center',
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.9,
      shadowRadius: 22,
      elevation: 4,
    },
  });
}

const styles = StyleSheet.create({
  medalBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  medalNumber: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  mainContent: {
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  infoSection: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    marginBottom: 2,
  },
  specialization: {
    fontSize: 14,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
  },
  reviewCount: {
    fontSize: 12,
  },
  affinitySection: {
    alignItems: 'center',
  },
  affinityRingWrapper: {
    width: 50,
    height: 50,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  affinityLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  affinityPct: {
    fontSize: 11,
  },
  matchLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  tag: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  price: {
    fontSize: 26,
  },
  priceLabel: {
    fontSize: 12,
  },
  pricePerkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pricePerkText: {
    fontSize: 11,
  },
  ctaWrapper: {
    borderRadius: 12,
    shadowColor: 'rgba(139, 157, 131, 0.25)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  ctaText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default SpecialistCard;
