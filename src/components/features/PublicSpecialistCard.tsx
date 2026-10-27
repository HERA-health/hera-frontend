import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { getGradientColors } from '../../constants/gradients';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { DirectorySpecialistCard } from './DirectorySpecialistCard';
import type { ProfileOptions } from '../../services/profileDiscoveryService';
import type { PublicSpecialistCard as PublicSpecialistCardData, PublicSpecialistDirectoryCard } from '../../services/specialistsService';

interface PublicSpecialistCardProps {
  specialist: PublicSpecialistCardData | PublicSpecialistDirectoryCard;
  onPress: () => void;
  variant: 'featured' | 'directory';
  style?: StyleProp<ViewStyle>;
  href?: string;
  compactDirectory?: boolean;
  mobileDirectory?: boolean;
  profileOptions?: ProfileOptions | null;
}

export function PublicSpecialistCard(props: PublicSpecialistCardProps) {
  return props.variant === 'directory' ? <DirectorySpecialistCard {...props} /> : <FeaturedSpecialistCard {...props} />;
}

const formatPrice = (price: number): string => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(price);
const getInitials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');

function FeaturedSpecialistCard({ specialist, onPress, href, style }: PublicSpecialistCardProps) {
  const { theme } = useTheme();
  const colors = useMemo(() => getGradientColors(specialist.gradientId), [specialist.gradientId]);
  const hasVisibleReviews = specialist.rating !== null && specialist.reviewCount !== null && specialist.reviewCount > 0;
  const reviewSummary = specialist.reviewCount === null ? 'Valoraciones no públicas' : hasVisibleReviews
    ? specialist.rating?.toFixed(1) + ' · ' + specialist.reviewCount + (specialist.reviewCount === 1 ? ' reseña' : ' reseñas') : 'Aún sin reseñas';
  return (
    <AnimatedPressable onPress={onPress} href={href} accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={'Abrir el perfil de ' + specialist.name} hoverLift pressScale={0.98} style={[styles.featuredCard, style]}>
      <View style={styles.featuredMedia}>
        {specialist.avatar ? <Image source={{ uri: specialist.avatar }} style={styles.portrait} resizeMode="cover" accessibilityLabel={'Retrato de ' + specialist.name} /> : (
          <LinearGradient colors={colors} style={[styles.portrait, styles.portraitFallback]}>
            <Text style={[styles.initials, { fontFamily: theme.fontDisplay }]}>{getInitials(specialist.name)}</Text>
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(16, 27, 23, 0.78)']} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.featuredArrow}>
        <Ionicons name="arrow-forward" size={15} color={theme.primaryDark} />
      </View>
      <View style={styles.featuredContent}>
        <Text style={[styles.featuredName, { color: '#FFFFFF', fontFamily: theme.fontSansBold }]} numberOfLines={1}>
          {specialist.name}
        </Text>
        <View style={styles.featuredReviewRow}>
          <Ionicons
            name={hasVisibleReviews ? 'star' : 'star-outline'}
            size={12}
            color={hasVisibleReviews ? theme.starRating : 'rgba(255, 255, 255, 0.82)'}
          />
          <Text style={[styles.featuredReviewText, { color: 'rgba(255, 255, 255, 0.9)', fontFamily: theme.fontSansMedium }]} numberOfLines={1}>
            {reviewSummary}
          </Text>
        </View>
        <Text style={[styles.featuredPrice, { color: '#FFFFFF', fontFamily: theme.fontSansBold }]}>{formatPrice(specialist.pricePerSession)} €</Text>
      </View>

    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    minWidth: 0,
  },
  featuredMedia: {
    ...StyleSheet.absoluteFill,
  },
  portrait: {
    width: '100%',
    height: '100%',
  },
  portraitFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  featuredContent: {
    position: 'absolute',
    left: 14,
    right: 12,
    bottom: 12,
  },
  featuredName: {
    fontSize: 16,
    lineHeight: 20,
  },
  featuredReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  featuredReviewText: {
    flex: 1,
    fontSize: 10,
  },
  featuredArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 253, 248, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredPrice: {
    fontSize: 11,
    marginTop: 5,
  },
});
