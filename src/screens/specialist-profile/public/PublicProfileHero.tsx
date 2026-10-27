import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useProfileOptions } from '../../../hooks/useProfileOptions';
import { optionLabel } from '../../../utils/profileOptions';
import { getProfessionalTypeLabel } from '../../../constants/professionalTypes';
import { translateSpecialty } from '../../../constants/specialties';
import { getCloudinaryProfileImageUrl, getProfileLanguages } from '../profilePresentation';
import type { Specialist } from '../types';
import { publicProfileExcerpt } from './publicProfilePresentation';
import { LanguageIcon } from '../../../components/common/LanguageIcon';

interface Props {
  specialist: Specialist;
  onPractice: () => void;
  onReviews: () => void;
  reviewsVisible?: boolean;
  onShare: () => void;
  onFavorite: () => void;
  showFavorite: boolean;
  isFavorite: boolean;
  favoriteLoading: boolean;
}

export function PublicProfileHero({ specialist, onPractice, onReviews, reviewsVisible = true, onShare, onFavorite, showFavorite, isFavorite, favoriteLoading }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const desktop = width >= 1200;
  const { options } = useProfileOptions();
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [trustWidth, setTrustWidth] = useState(0);
  const [presentationExpanded, setPresentationExpanded] = useState(false);
  const photo = specialist.avatar ? getCloudinaryProfileImageUrl(specialist.avatar, 600, 750) : null;
  const body = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const link = { color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 13 };
  const years = specialist.yearsInPractice ?? specialist.experienceYears;
  const languages = getProfileLanguages(specialist).map(value => {
    const label = optionLabel(options?.languages ?? [], value);
    return { label, code: options?.languages.find(item => item.label === label)?.value ?? value };
  }).filter((item, index, items) => items.findIndex(other => other.label === item.label) === index);
  const modalities = [specialist.offersOnline && 'Online', specialist.offersInPerson && 'Presencial', specialist.offersPhone && 'Teléfono'].filter(Boolean).join(' · ');
  const city = specialist.offersInPerson ? specialist.address?.city : undefined;
  const excerpt = publicProfileExcerpt(specialist.bio);
  const canExpandPresentation = specialist.bio.trim().replace(/\s+/g, ' ') !== excerpt;
  const trust = <View onLayout={event => setTrustWidth(event.nativeEvent.layout.width)} style={styles.credentials}>
    {specialist.verificationStatus === 'VERIFIED' ? <View style={styles.verificationAnchor}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ver información de verificación"
        accessibilityState={{ expanded: verificationOpen }} onPress={() => setVerificationOpen(value => !value)}
        style={[styles.verified, { backgroundColor: theme.secondaryMuted }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} />
        <Text style={[link, { flexShrink: 1 }]}>{specialist.collegiateNumber ? `Col. ${specialist.collegiateNumber}` : 'Verificado'}</Text>
        <Ionicons name={verificationOpen ? 'chevron-up' : 'chevron-down'} size={13} color={theme.primary} />
      </Pressable>
      {verificationOpen ? <View testID="public-verification-details" accessibilityLiveRegion="polite"
        style={[styles.verification, { width: Math.min(360, trustWidth || width - 40), backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
        <Ionicons name="checkmark-circle-outline" size={18} color={theme.textPrimary} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.small, strong]}>Colegiación revisada por HERA</Text>
          <Text style={[styles.small, body]}>Hemos comprobado el número y el carnet profesional aportado.</Text>
          {specialist.collegiateNumber ? <Text style={[styles.small, body]}>N.º de colegiado: {specialist.collegiateNumber}</Text> : null}
        </View>
      </View> : null}
    </View> : specialist.collegiateNumber ? <Text style={[styles.small, body]}>Col. {specialist.collegiateNumber}</Text> : null}
    {reviewsVisible ? <Pressable accessibilityRole="button" accessibilityLabel={specialist.reviewCount > 0 ? 'Ver opiniones' : 'Ver sección de opiniones'} onPress={onReviews} style={styles.rating}>
      <Ionicons name={specialist.reviewCount > 0 ? 'star' : 'star-outline'} size={15} color={specialist.reviewCount > 0 ? theme.starRating : theme.textSecondary} />
      <Text style={[styles.small, { flexShrink: 1 }, specialist.reviewCount > 0 ? strong : body]}>{specialist.reviewCount > 0
        ? `${specialist.rating.toFixed(1).replace('.', ',')} · ${specialist.reviewCount} ${specialist.reviewCount === 1 ? 'opinión' : 'opiniones'}`
        : 'Aún sin reseñas'}</Text>
    </Pressable> : null}
    {years != null && years > 0 ? <Text style={[styles.small, body]}>{years} {years === 1 ? 'año' : 'años'} de experiencia</Text> : null}
  </View>;
  const details = <View style={styles.details}>
    {modalities || city ? <View style={styles.fact}><Ionicons name={city ? 'location-outline' : specialist.offersPhone && !specialist.offersOnline ? 'call-outline' : 'videocam-outline'} size={17} color={theme.primary} /><Text style={[styles.factText, body]}>{[modalities, city].filter(Boolean).join(' · ')}</Text></View> : null}
    {languages.length ? <View testID="public-profile-languages" style={styles.languages}>
      {languages.map(language => <View key={language.label} style={styles.language}>
        <LanguageIcon language={language.code} />
        <Text style={[styles.languageText, body]}>{language.label}</Text>
      </View>)}
    </View> : null}
    {excerpt ? <View style={styles.introduction}>
      <Text style={[styles.excerpt, body]}>{presentationExpanded || !canExpandPresentation ? specialist.bio.trim() : excerpt}</Text>
      {canExpandPresentation ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: presentationExpanded }}
        onPress={() => setPresentationExpanded(value => !value)} style={styles.textAction}>
        <Text style={link}>{presentationExpanded ? 'Leer menos' : 'Leer presentación completa'}</Text>
        <Ionicons name={presentationExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.primary} />
      </Pressable> : null}
    </View> : null}
  </View>;
  return <View>
    <View style={[styles.top, mobile && styles.topMobile]}>
      <View style={[styles.portrait, !desktop && styles.portraitTablet, mobile && styles.portraitMobile, { backgroundColor: theme.secondaryMuted }]}>
        {photo && failedPhoto !== photo ? <Image source={{ uri: photo }} resizeMode="cover" style={styles.photo}
          accessibilityLabel={`Fotografía de ${specialist.name}`} onError={() => setFailedPhoto(photo)} /> :
          <Text style={{ fontFamily: theme.fontDisplay, fontSize: mobile ? 40 : 72, color: theme.textPrimary }}>
            {specialist.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
          </Text>}
      </View>
      <View style={[styles.identity, mobile && styles.identityMobile]}>
        <View style={styles.nameRow}>
        <Text accessibilityRole="header" style={[styles.name, mobile && styles.nameMobile, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{specialist.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Compartir perfil" onPress={onShare} style={styles.iconAction}><Ionicons name="share-social-outline" size={19} color={theme.primary} /></Pressable>
        </View>
        <Text style={[styles.profession, body]}>{getProfessionalTypeLabel(specialist.professionalType, specialist.professionalTypeLabel)}</Text>
        {!mobile ? trust : null}
        {!mobile ? details : null}
      </View>
    </View>
    {mobile ? trust : null}
    {mobile ? details : null}
    {!desktop || showFavorite ? <View style={[styles.bottom, desktop && { justifyContent: 'flex-end' }]}>
      {!desktop ? <View style={styles.specialties}>
        {specialist.specializations.slice(0, 3).map(value => <View key={value} style={[styles.chip, { backgroundColor: theme.bgCard }]}><Text style={[styles.small, strong]}>{translateSpecialty(value)}</Text></View>)}
        {specialist.specializations.length > 3 ? <Pressable accessibilityRole="button" onPress={onPractice} style={styles.textAction}><Text style={link}>Ver todas (+{specialist.specializations.length - 3})</Text></Pressable> : null}
      </View> : null}
      {showFavorite ? <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={isFavorite ? 'Quitar de guardados' : 'Guardar perfil'} disabled={favoriteLoading}
          accessibilityState={{ disabled: favoriteLoading, selected: isFavorite }} onPress={onFavorite} style={styles.iconAction}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={theme.primary} />
        </Pressable>
      </View> : null}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  top: { zIndex: 2, flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  topMobile: { gap: 16 },
  portrait: { width: 240, height: 300, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  portraitTablet: { width: 200, height: 250 },
  portraitMobile: { width: 120, height: 150, borderRadius: 16 },
  photo: { width: '100%', height: '100%' },
  identity: { flex: 1, minWidth: 0, paddingTop: 4 },
  identityMobile: { paddingTop: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontSize: 38, lineHeight: 46, letterSpacing: -0.6 },
  nameMobile: { fontSize: 28, lineHeight: 35, letterSpacing: -0.4 },
  profession: { fontSize: 15, lineHeight: 22, marginTop: 6 },
  credentials: { zIndex: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 0, marginTop: 10 },
  verificationAnchor: { position: 'relative', zIndex: 21, maxWidth: '100%' },
  verified: { flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, alignItems: 'center' },
  rating: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', flexShrink: 1 },
  small: { fontSize: 12, lineHeight: 19 },
  details: { marginTop: 8, gap: 8 },
  fact: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  factText: { flex: 1, fontSize: 13, lineHeight: 20 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8 },
  language: { flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '100%' },
  languageText: { flexShrink: 1, fontSize: 13, lineHeight: 20 },
  introduction: { marginTop: 8, maxWidth: 640, width: '100%' },
  excerpt: { fontSize: 15, lineHeight: 24 },
  textAction: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-start' },
  verification: { position: 'absolute', top: '100%', marginTop: 6, left: 0, zIndex: 30, borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: 'row', gap: 10 },
  bottom: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  specialties: { flex: 1, minWidth: 180, flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, maxWidth: '100%' },
  actions: { flexDirection: 'row' },
  iconAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
