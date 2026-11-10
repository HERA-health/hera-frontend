import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable, type AnimatedPressableHandle } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import {
  addFavoriteSpecialist,
  getFavoriteSpecialistStatus,
  removeFavoriteSpecialist,
  type SpecialistData,
} from '../../../services/specialistsService';
import { getErrorMessage } from '../../../constants/errors';
import { matchingChoiceLabel, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS } from '../../../constants/professionalMatchingOptions';

interface Props {
  specialist: SpecialistData;
  languages: string[];
  identityContentHeight?: number;
  onIdentityContentLayout?: (height: number) => void;

  assisted: boolean;
  onChoose: (trigger: AnimatedPressableHandle | null) => void;
  onProfile: () => void;
  onRetryAvailability: () => void;
}

export function MatchedSpecialistRow({ specialist, languages, identityContentHeight, onIdentityContentLayout, assisted, onChoose, onProfile, onRetryAvailability }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const horizontalActions = width >= 600;
  const chooseButton = useRef<AnimatedPressableHandle>(null);
  const [expanded, setExpanded] = useState(false);
  const [presentationExpanded, setPresentationExpanded] = useState(false);
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
  const description = specialist.description?.trim() ?? '';
  const approaches = [...new Set([
    specialist.matchingProfile?.therapeuticApproach,
    specialist.matchingProfile?.customTherapeuticApproaches,
  ].flatMap(values => Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string' && !!value.trim()) : [])
    .map(value => matchingChoiceLabel(value, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS)))];
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
    <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
      <View style={styles.profile}>
        <View style={[styles.identity, { backgroundColor: theme.secondaryMuted }]}>
          <View style={{ minHeight: identityContentHeight }}>
            <View style={styles.identityContent} onLayout={event => onIdentityContentLayout?.(Math.ceil(event.nativeEvent.layout.height))}>
              <View style={[styles.portrait, { backgroundColor: theme.bgMuted }]}>
                {specialist.avatar && !photoFailed ? (
                  <Image source={{ uri: specialist.avatar }} style={styles.photo} onError={() => setPhotoFailed(true)} accessibilityLabel={`Fotografía de ${specialist.user.name}`} />
                ) : (
                  <Text style={[styles.initials, strong]}>{specialist.user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</Text>
                )}
              </View>
              <View style={styles.identityCopy}>
                <Text accessibilityRole="header" style={[styles.name, strong]}>{specialist.user.name}</Text>
                <Text style={[styles.detail, muted]}>{specialist.professionalTitle || specialist.professionalTypeLabel}</Text>
                {languages.length ? <Text style={[styles.languages, muted]}>{languages.join(' · ')}</Text> : null}
              </View>
            </View>
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
        {description || approaches.length ? <View style={styles.reasons}>
          {description ? <Text style={[styles.detail, muted]} numberOfLines={presentationExpanded ? undefined : 3}>{description}</Text> : null}
          {approaches.length ? <Text style={[styles.detail, muted]}>Enfoques declarados: {(presentationExpanded ? approaches : approaches.slice(0, 2)).join(' · ')}{!presentationExpanded && approaches.length > 2 ? '…' : ''}</Text> : null}
          {description || approaches.length > 2 ? <Button size="small" variant="outline" style={styles.presentationToggle} iconPosition="right"
            icon={<Ionicons aria-hidden name={presentationExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.primary} />}
            accessibilityState={{ expanded: presentationExpanded }} onPress={() => setPresentationExpanded(!presentationExpanded)}>{presentationExpanded ? 'Ocultar presentación' : 'Presentación completa'}</Button> : null}
        </View> : null}
        {reasons.length ? <View style={styles.reasons}>
          <Text style={[styles.reasonHeading, strong]}>Afinidad contigo</Text>
          {(expanded ? reasons : reasons.slice(0, 3)).map(reason => (
            <View key={reason} style={styles.reason}>
              <View style={[styles.reasonIcon, { backgroundColor: theme.secondaryMuted }]}><Ionicons aria-hidden name="checkmark" size={14} color={theme.textPrimary} /></View>
              <Text style={[styles.detail, body, styles.reasonText]}>{reason}</Text>
            </View>
          ))}
          {reasons.length > 3 ? <Button size="small" variant="ghost" style={styles.moreReasons} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)}>{expanded ? 'Ver menos motivos' : `Ver todos los motivos (${reasons.length})`}</Button> : null}
        </View> : null}
      </View>
      <View style={[styles.booking, styles.bookingBelow, { borderColor: theme.borderLight }]}>
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
        <View style={[styles.actions, horizontalActions && styles.actionsHorizontal]}>
          <Button size="small" focusRef={chooseButton} style={horizontalActions ? { ...styles.action, flex: 1 } : styles.action} onPress={() => onChoose(chooseButton.current)}>{assisted ? 'Me interesa este profesional' : 'Elegir cita'}</Button>
          <Button size="small" variant="outline" style={horizontalActions ? { ...styles.action, flex: 1 } : styles.action} onPress={onProfile}>Ver perfil</Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 16, height: '100%' },
  profile: { flex: 1, minWidth: 0, gap: 10 },
  identity: { margin: -18, marginBottom: 6, padding: 18, paddingTop: 22, paddingRight: 48, borderTopLeftRadius: 19, borderTopRightRadius: 19 },
  identityContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  portrait: { width: 84, height: 104, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  initials: { fontSize: 28 },
  identityCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 20, lineHeight: 25 },
  detail: { fontSize: 15, lineHeight: 21 },
  languages: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  heart: { position: 'absolute', top: 8, right: 6, width: 44, height: 44, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  reasons: { gap: 8 },
  reasonHeading: { fontSize: 13, lineHeight: 19, marginBottom: 3 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  reasonIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reasonText: { flex: 1 },
  presentationToggle: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 14 },
  moreReasons: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 0 },
  booking: { gap: 8, justifyContent: 'center' },
  bookingBelow: { borderTopWidth: 1, paddingTop: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  price: { fontSize: 24, lineHeight: 30 },
  availability: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  actions: { marginTop: 4, gap: 8 },
  actionsHorizontal: { flexDirection: 'row', alignItems: 'stretch' },
  action: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, shadowOpacity: 0, elevation: 0 },
});
