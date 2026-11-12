import React, { useMemo, useState } from 'react';
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
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const colors = useMemo(() => getGradientColors(specialist.gradientId), [specialist.gradientId]);
  const fromPrice = specialist.publicOptions?.some(option => option.priceCents > Math.round(specialist.pricePerSession * 100));
  const modalities = [specialist.offersOnline && 'Online', specialist.offersInPerson && 'Presencial', specialist.offersPhone && 'Llamada'].filter(Boolean).join(' · ');

  return (
    <AnimatedPressable
      onPress={onPress}
      href={href}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={'Abrir el perfil de ' + specialist.name}
      hoverLift
      pressScale={0.98}
      style={[styles.card, style]}
    >
      {specialist.avatar && failedPhoto !== specialist.avatar ? (
        <Image
          source={{ uri: specialist.avatar }}
          style={styles.portrait}
          resizeMode="cover"
          accessibilityLabel={'Retrato de ' + specialist.name}
          onError={() => setFailedPhoto(specialist.avatar)}
        />
      ) : (
        <LinearGradient colors={colors} style={[styles.portrait, styles.fallback]}>
          <Text style={[styles.initials, { fontFamily: theme.fontDisplay }]}>{getInitials(specialist.name)}</Text>
        </LinearGradient>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(16, 27, 23, 0.38)', 'rgba(16, 27, 23, 0.92)']}
        locations={[0.32, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.verified, { backgroundColor: theme.bgCard }]}>
        <Ionicons name="shield-checkmark" size={12} color={theme.primary} />
        <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 10 }}>Verificado</Text>
      </View>
      <View style={[styles.arrow, { backgroundColor: theme.bgCard }]}>
        <Ionicons name="arrow-forward" size={16} color={theme.primary} />
      </View>
      <View style={styles.content}>
        <Text accessibilityRole="header" aria-level={3} numberOfLines={2} style={[styles.name, { fontFamily: theme.fontSansBold }]}>
          {specialist.name}
        </Text>
        {!!specialist.professionalTypeLabel && (
          <Text numberOfLines={1} style={[styles.profession, { fontFamily: theme.fontSans }]}>{specialist.professionalTypeLabel}</Text>
        )}
        <View style={styles.footer}>
          <Text style={[styles.price, { fontFamily: theme.fontSansBold }]}>
            {fromPrice ? 'Desde ' : ''}{formatPrice(specialist.pricePerSession)} €<Text style={[styles.unit, { fontFamily: theme.fontSans }]}> / sesión</Text>
          </Text>
          {!!modalities && <Text numberOfLines={1} style={[styles.modality, { fontFamily: theme.fontSans }]}>{modalities}</Text>}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 1, borderRadius: 16, overflow: 'hidden', minWidth: 0 },
  portrait: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 48, color: '#FFFFFF' },
  verified: { position: 'absolute', left: 11, top: 11, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 20 },
  arrow: { position: 'absolute', right: 11, top: 11, width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  content: { position: 'absolute', left: 14, right: 14, bottom: 14, gap: 4 },
  name: { fontSize: 16, lineHeight: 20, color: '#FFFFFF' },
  profession: { fontSize: 11, lineHeight: 16, color: '#FFFFFF' },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 2, marginTop: 3 },
  price: { fontSize: 12, lineHeight: 17, color: '#FFFFFF' },
  unit: { fontSize: 10 },
  modality: { fontSize: 10, lineHeight: 16, color: '#FFFFFF' },
});
