import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import {
  addFavoriteSpecialist,
  getFavoriteSpecialistStatus,
  removeFavoriteSpecialist,
  type SpecialistData,
} from '../../../services/specialistsService';
import { getErrorMessage } from '../../../constants/errors';

interface Props {
  specialist: SpecialistData;
  languages: string[];
  horizontal: boolean;
  assisted: boolean;
  onChoose: () => void;
  onProfile: () => void;
  onRetryAvailability: () => void;
}

export function MatchedSpecialistRow({ specialist, languages, horizontal, assisted, onChoose, onProfile, onRetryAvailability }: Props) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [favorite, setFavorite] = useState<boolean | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(true);
  const [favoriteError, setFavoriteError] = useState('');
  const operation = useRef(0);
  const busyRef = useRef(false);
  const loadFavorite = useCallback(async () => {
    const version = ++operation.current;
    busyRef.current = true;
    setFavoriteBusy(true);
    setFavoriteError('');
    try {
      const value = await getFavoriteSpecialistStatus(specialist.id);
      if (version === operation.current) setFavorite(value);
    } catch (error) {
      if (version === operation.current) {
        setFavorite(null);
        setFavoriteError(getErrorMessage(error, 'No se pudo consultar el favorito.'));
      }
    } finally {
      if (version === operation.current) {
        busyRef.current = false;
        setFavoriteBusy(false);
      }
    }
  }, [specialist.id]);
  useFocusEffect(useCallback(() => {
    void loadFavorite();
    return () => { operation.current++; };
  }, [loadFavorite]));

  const toggleFavorite = async () => {
    if (busyRef.current || favorite === null) return;
    busyRef.current = true;
    const version = ++operation.current;
    setFavoriteBusy(true);
    setFavoriteError('');
    try {
      await (favorite ? removeFavoriteSpecialist : addFavoriteSpecialist)(specialist.id);
      if (version === operation.current) setFavorite(!favorite);
    } catch (error) {
      if (version === operation.current) setFavoriteError(getErrorMessage(error, 'No se pudo actualizar el favorito.'));
    } finally {
      if (version === operation.current) {
        busyRef.current = false;
        setFavoriteBusy(false);
      }
    }
  };
  const option = specialist.publicOptions?.find(item => item.optionId === specialist.matchedOptionId);
  const reasons = [...new Set(specialist.matchingReasons?.map(reason =>
    `${reason.kind === 'related' ? 'Relación parcial: ' : ''}${reason.label}`,
  ) ?? [])];
  const body = { fontFamily: theme.fontSans, color: theme.textPrimary };
  const muted = { ...body, color: theme.textSecondary };
  const strong = { ...body, fontFamily: theme.fontSansSemiBold };
  const modality = option?.modality === 'VIDEO_CALL' ? 'Online'
    : option?.modality === 'IN_PERSON' ? `Presencial${specialist.officeCity ? ` en ${specialist.officeCity}` : ''}`
      : option?.modality === 'PHONE_CALL' ? 'Teléfono' : null;

  return (
    <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }, horizontal ? styles.horizontal : styles.compact]}>
      <View style={styles.profile}>
        <View style={styles.identity}>
          <View style={[styles.portrait, !horizontal && styles.compactPortrait, { backgroundColor: theme.bgMuted }]}>
            {specialist.avatar && !photoFailed ? (
              <Image source={{ uri: specialist.avatar }} style={styles.photo} onError={() => setPhotoFailed(true)} accessibilityLabel={`Fotografía de ${specialist.user.name}`} />
            ) : (
              <Text style={[styles.initials, strong]}>{specialist.user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</Text>
            )}
          </View>
          <View style={styles.identityCopy}>
            <Text accessibilityRole="header" style={[styles.name, !horizontal && styles.compactName, strong]}>{specialist.user.name}</Text>
            <Text style={[styles.detail, muted]}>{specialist.professionalTitle || specialist.professionalTypeLabel}</Text>
            {languages.length ? <Text style={[styles.languages, muted]}>{languages.join(' · ')}</Text> : null}
          </View>
          <AnimatedPressable
            onPress={() => void (favorite === null ? loadFavorite() : toggleFavorite())}
            disabled={favoriteBusy}
            accessibilityRole="button"
            accessibilityLabel={favorite === null ? 'Consultar favorito' : favorite ? `Quitar a ${specialist.user.name} de favoritos` : `Guardar a ${specialist.user.name} en favoritos`}
            accessibilityState={{ disabled: favoriteBusy, busy: favoriteBusy, selected: favorite === true }}
            style={[styles.heart, { backgroundColor: favorite ? theme.secondaryMuted : theme.bg, borderColor: theme.borderLight }]}
          >
            {favoriteBusy ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons aria-hidden name={favorite === null ? 'refresh-outline' : favorite ? 'heart' : 'heart-outline'} size={21} color={favorite ? theme.textPrimary : theme.textSecondary} />}
          </AnimatedPressable>
        </View>
        {favoriteError ? <Text accessibilityRole="alert" style={[styles.detail, { color: theme.error, fontFamily: theme.fontSans }]}>{favoriteError}{favorite === null ? ' Pulsa el icono para reintentar.' : ''}</Text> : null}
        <View style={styles.reasons}>
          <Text style={[styles.reasonHeading, strong]}>Por qué aparece en tus resultados</Text>
          {specialist.partialMatch ? <Text style={[styles.detail, { ...strong, color: theme.warning }]}>Coincidencia parcial con tus áreas</Text> : null}
          {(expanded ? reasons : reasons.slice(0, 3)).map(reason => (
            <View key={reason} style={styles.reason}>
              <Ionicons aria-hidden name="checkmark" size={17} color={theme.primary} />
              <Text style={[styles.detail, body, styles.reasonText]}>{reason}</Text>
            </View>
          ))}
          {!reasons.length ? <Text style={[styles.detail, muted]}>No hay motivos detallados disponibles.</Text> : null}
          {reasons.length > 3 ? <Button size="small" variant="ghost" style={styles.moreReasons} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)}>{expanded ? 'Ver menos motivos' : `Ver todos los motivos (${reasons.length})`}</Button> : null}
        </View>
      </View>
      <View style={[styles.booking, horizontal ? styles.bookingSide : styles.bookingBelow, { borderColor: theme.borderLight }]}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, strong]}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(specialist.pricePerSession)} €<Text style={[styles.detail, muted]}> / sesión</Text></Text>
          {option?.durationMinutes ? <Text style={[styles.detail, muted]}>{option.durationMinutes} min</Text> : null}
        </View>
        {option ? <Text style={[styles.detail, muted]}>{[option.serviceName, modality && !option.serviceName?.toLowerCase().includes(modality.toLowerCase()) ? modality : null].filter(Boolean).join(' · ')}</Text> : null}
        <View style={styles.availability}>
          <Ionicons aria-hidden name="calendar-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.detail, muted, styles.reasonText]}>
            {specialist.availabilityStatus === 'UNKNOWN' ? 'No hemos podido verificar la agenda.' : specialist.nextAvailable
              ? `Próxima cita: ${new Date(specialist.nextAvailable).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (hora peninsular)`
              : 'Sin huecos en los próximos 30 días.'}
          </Text>
        </View>
        {specialist.availabilityStatus === 'UNKNOWN' ? <Button size="small" variant="ghost" onPress={onRetryAvailability}>Reintentar agenda</Button> : null}
        <View style={styles.actions}>
          <Button size="small" style={styles.action} onPress={onChoose}>{assisted ? 'Me interesa este profesional' : 'Elegir cita'}</Button>
          <Button size="small" variant="ghost" style={styles.action} onPress={onProfile}>Ver perfil</Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 20 },
  horizontal: { flexDirection: 'row', alignItems: 'stretch' },
  compact: { padding: 16, gap: 14 },
  profile: { flex: 1, minWidth: 0, gap: 10 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  portrait: { width: 64, height: 72, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  compactPortrait: { width: 56, height: 64 },
  photo: { width: '100%', height: '100%' },
  initials: { fontSize: 22 },
  identityCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 20, lineHeight: 25 },
  compactName: { fontSize: 18, lineHeight: 23 },
  detail: { fontSize: 14, lineHeight: 20 },
  languages: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  heart: { width: 44, height: 44, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  reasons: { gap: 5 },
  reasonHeading: { fontSize: 12, lineHeight: 18, marginBottom: 2 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  reasonText: { flex: 1 },
  moreReasons: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 0 },
  booking: { gap: 8, justifyContent: 'center' },
  bookingSide: { width: 270, borderLeftWidth: 1, paddingLeft: 20 },
  bookingBelow: { borderTopWidth: 1, paddingTop: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  price: { fontSize: 24, lineHeight: 30 },
  availability: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  actions: { marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  action: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, shadowOpacity: 0, elevation: 0 },
});
