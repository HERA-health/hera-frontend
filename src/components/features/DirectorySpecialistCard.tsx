import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { optionLabel } from '../../utils/profileOptions';
import type { ProfileOptions } from '../../services/profileDiscoveryService';
import {
  matchingChoiceLabel,
  PROFESSIONAL_SPECIALTY_OPTIONS,
  PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS,
} from '../../constants/professionalMatchingOptions';
import type { PublicSpecialistCard, PublicSpecialistDirectoryCard } from '../../services/specialistsService';
import { getCloudinaryProfileImageUrl } from '../../screens/specialist-profile/profilePresentation';
import { AnimatedPressable } from '../common/AnimatedPressable';

interface Props {
  specialist: PublicSpecialistCard | PublicSpecialistDirectoryCard;
  onPress: () => void;
  href?: string;
  style?: StyleProp<ViewStyle>;
  compactDirectory?: boolean;
  mobileDirectory?: boolean;
  profileOptions?: ProfileOptions | null;
}

const priceFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export function DirectorySpecialistCard({ specialist, onPress, href, style, compactDirectory = false, mobileDirectory = false, profileOptions: options }: Props) {
  const { theme } = useTheme();
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const details = 'specialties' in specialist ? specialist : null;
  const photo = specialist.avatar ? getCloudinaryProfileImageUrl(specialist.avatar, 336, 384) : null;
  const initials = specialist.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const specialties = [...new Set([...(details?.specialties ?? []), ...(details?.customSpecialties ?? [])])];
  const approaches = [...new Set([...(details?.therapeuticApproaches ?? []), ...(details?.customTherapeuticApproaches ?? [])])];
  const languages = (details?.languages ?? []).map(value => optionLabel(options?.languages ?? [], value));
  const modalities = [
    specialist.offersOnline ? 'Online' : null,
    specialist.offersInPerson ? 'Presencial' : null,
    specialist.offersPhone ? 'Llamada' : null,
  ].filter(Boolean).join(' · ');
  const hasReviews = specialist.rating !== null && specialist.reviewCount !== null && specialist.reviewCount > 0;
  const reviewText = specialist.reviewCount === null
    ? 'Valoraciones no públicas'
    : hasReviews
      ? `${specialist.rating?.toFixed(1).replace('.', ',')} · ${specialist.reviewCount} ${specialist.reviewCount === 1 ? 'reseña' : 'reseñas'}`
      : 'Aún sin reseñas';
  const priceCents = Math.round(specialist.pricePerSession * 100);
  const offersAtPrice = specialist.publicOptions?.filter(option => option.priceCents === priceCents) ?? [];
  const matched = offersAtPrice.find(option => option.optionId === specialist.matchedOptionId);
  const durations = new Set(offersAtPrice.map(option => option.durationMinutes));
  const duration = matched?.durationMinutes ?? (durations.size === 1 ? offersAtPrice[0]?.durationMinutes : undefined);
  const fromPrice = specialist.publicOptions?.some(option => option.priceCents > priceCents);
  const body = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const label = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };

  const specialtyChip = (value: string) => (
    <View key={value} style={[styles.chip, compactDirectory && styles.compactChip, { backgroundColor: theme.secondaryMuted }]}>
      <Text numberOfLines={1} style={[styles.chipText, label]}>
        {matchingChoiceLabel(value, PROFESSIONAL_SPECIALTY_OPTIONS)}
      </Text>
    </View>
  );

  const reputation = (
    <View style={[styles.reputation, compactDirectory && styles.compactReputation]}>
      <View style={styles.fact}>
        <Ionicons name={hasReviews ? 'star' : 'star-outline'} size={13} color={hasReviews ? theme.starRating : theme.textSecondary} />
        <Text style={[styles.smallText, body]}>{reviewText}</Text>
      </View>
      {!!specialist.yearsInPractice && specialist.yearsInPractice > 0 ? (
        <Text style={[styles.smallText, body]}>{specialist.yearsInPractice} {specialist.yearsInPractice === 1 ? 'año' : 'años'} de experiencia</Text>
      ) : null}
    </View>
  );
  const facts = (
    <View style={[styles.facts, compactDirectory && styles.compactFacts]}>
      {!!modalities && <View style={styles.fact}>
        <Ionicons name={specialist.offersInPerson ? 'location-outline' : specialist.offersOnline ? 'videocam-outline' : 'call-outline'} size={16} color={theme.primary} />
        <Text style={[styles.factText, body]} numberOfLines={2}>{modalities}{specialist.offersInPerson && details?.officeCity ? ` · ${details.officeCity}` : ''}</Text>
      </View>}
      {languages.length > 0 ? <View style={styles.fact}>
        <Ionicons name="globe-outline" size={16} color={theme.primary} />
        <Text style={[styles.factText, body]} numberOfLines={1}>{languages.slice(0, 3).join(', ')}{languages.length > 3 ? ` · +${languages.length - 3}` : ''}</Text>
      </View> : null}
      {options?.religionEnabled && details?.religionCode ? (
        <Text style={[styles.smallText, body]} numberOfLines={1}>Perspectiva: {details.religionCode === 'other' ? details.religionOtherText || 'Otra' : optionLabel(options.religions, details.religionCode)}</Text>
      ) : null}
    </View>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      href={href}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={`Abrir el perfil de ${specialist.name}`}
      hoverLift
      pressScale={0.99}
      style={[styles.card, mobileDirectory && styles.mobileCard, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }, style]}
    >
      <View style={[styles.identityRow, compactDirectory && styles.compactIdentityRow, mobileDirectory && styles.mobileIdentityRow]}>
        <View style={[styles.portraitFrame, mobileDirectory && styles.mobilePortrait, { backgroundColor: theme.secondaryMuted }]}>
          {photo && failedPhoto !== photo ? (
            <Image source={{ uri: photo }} style={styles.portrait} resizeMode="cover"
              accessibilityLabel={`Retrato de ${specialist.name}`} onError={() => setFailedPhoto(photo)} />
          ) : (
            <Text style={[styles.initials, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{initials}</Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text style={[styles.name, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]} numberOfLines={2}>
            {specialist.name}
          </Text>
          <Text style={[styles.profession, body]} numberOfLines={2}>{specialist.professionalTypeLabel}</Text>
          <View style={[styles.credentials, compactDirectory && styles.credentialsRow]}>
            <View style={styles.verified}>
              <Ionicons name="shield-checkmark" size={13} color={theme.primary} />
              <Text style={[styles.verifiedText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>Verificado</Text>
            </View>
            {details?.collegiateNumber ? <Text style={[styles.credential, body]} numberOfLines={1}>Col. {details.collegiateNumber}</Text> : null}
          </View>
          {compactDirectory ? reputation : null}
          {compactDirectory ? facts : null}
        </View>
      </View>

      {!compactDirectory ? reputation : null}

      {specialties.length > 0 ? (
        compactDirectory ? <View style={[styles.specialties, styles.wrappedChips]}>
          {specialties.slice(0, 3).map(specialtyChip)}
          {specialties.length > 3 ? <Text style={[styles.more, body]}>+{specialties.length - 3}</Text> : null}
        </View> : <View style={styles.specialties}>
          <View style={styles.chipRow}>{specialties.slice(0, 2).map(specialtyChip)}</View>
          {specialties.length > 2 ? <View style={styles.chipRow}>
            {specialtyChip(specialties[2])}
            {specialties.length > 3 ? <Text style={[styles.more, body]}>+{specialties.length - 3}</Text> : null}
          </View> : null}
        </View>
      ) : null}
      {approaches.length > 0 ? (
        <Text style={[styles.approach, body]} numberOfLines={1}>
          <Text style={{ fontFamily: theme.fontSansSemiBold }}>Enfoque: </Text>
          {matchingChoiceLabel(approaches[0], PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS)}
          {approaches.length > 1 ? ` · +${approaches.length - 1}` : ''}
        </Text>
      ) : null}

      {!compactDirectory ? facts : null}
      {details?.descriptionExcerpt ? <Text style={[styles.description, body]} numberOfLines={2}>{details.descriptionExcerpt}</Text> : null}

      <View style={styles.footerSpace} />
      <View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
        <View style={styles.priceGroup}>
          {fromPrice && priceCents > 0 ? <Text style={[styles.smallText, body]}>Desde</Text> : null}
          <Text style={[styles.price, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>
            {priceCents === 0 ? 'Sin coste' : `${priceFormat.format(specialist.pricePerSession)}\u00a0€`}
          </Text>
          <Text style={[styles.smallText, body]}>por sesión{duration ? ` · ${duration} min` : ''}</Text>
        </View>
        <View style={[styles.action, !compactDirectory && styles.actionNarrow, { backgroundColor: theme.actionPrimary }]}>
          <Text style={[styles.actionText, { color: theme.actionPrimaryText, fontFamily: theme.fontSansSemiBold }]}>Ver perfil</Text>
          <Ionicons name="arrow-forward" size={17} color={theme.actionPrimaryText} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderWidth: 1, borderRadius: 18, minWidth: 0 },
  mobileCard: { padding: 16 },
  mobileIdentityRow: { gap: 12, alignItems: 'flex-start' },
  mobilePortrait: { width: 92, height: 108 },
  identityRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  compactIdentityRow: { alignItems: 'flex-start' },
  credentials: { gap: 5 },
  credentialsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  compactReputation: { marginTop: 1, justifyContent: 'flex-start', columnGap: 12, rowGap: 2 },
  compactFacts: { marginTop: 3, gap: 4 },
  portraitFrame: { width: 112, height: 128, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  portrait: { width: '100%', height: '100%' },
  initials: { fontSize: 38 },
  identity: { flex: 1, minWidth: 0, gap: 5 },
  name: { fontSize: 19, lineHeight: 24 },
  profession: { fontSize: 13, lineHeight: 19 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  verifiedText: { fontSize: 11, lineHeight: 16 },
  credential: { fontSize: 11, lineHeight: 16 },
  reputation: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginTop: 14 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  smallText: { fontSize: 12, lineHeight: 18 },
  specialties: { gap: 5, marginTop: 12 },
  wrappedChips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, alignItems: 'center' },
  chipRow: { flexDirection: 'row', gap: 6, alignItems: 'center', minWidth: 0 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexShrink: 1 },
  compactChip: { maxWidth: '46%' },
  chipText: { fontSize: 12, lineHeight: 17 },
  more: { fontSize: 12, lineHeight: 25, flexShrink: 0 },
  approach: { fontSize: 12, lineHeight: 19, marginTop: 7 },
  facts: { gap: 6, marginTop: 12 },
  factText: { fontSize: 13, lineHeight: 19, flex: 1, minWidth: 0 },
  description: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  footerSpace: { flex: 1, minHeight: 12 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 13, gap: 12 },
  priceGroup: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, rowGap: 2, flexShrink: 1 },
  price: { fontSize: 22, lineHeight: 28 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 44, paddingHorizontal: 17, borderRadius: 9 },
  actionNarrow: { width: '100%' },
  actionText: { fontSize: 13 },
});
