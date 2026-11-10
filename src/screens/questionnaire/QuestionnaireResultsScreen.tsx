import { navigatePatientSpecialists } from '../../navigation/patientSpecialistsNavigation';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/common/Button';
import {
  getMatchedSpecialists,
  type SpecialistData,
} from '../../services/specialistsService';
import {
  getAssistedResults,
} from '../../services/questionnaireService';
import { getErrorMessage } from '../../constants/errors';
import { AdviceRequestModal } from './components/AdviceRequestModal';
import type { AnimatedPressableHandle } from '../../components/common/AnimatedPressable';
import { MatchedSpecialistRow } from './components/MatchedSpecialistRow';
import { useProfileOptions } from '../../hooks/useProfileOptions';
import { optionLabel } from '../../utils/profileOptions';
import { useDiscoveryRevalidation } from '../../hooks/useDiscoveryRevalidation';
import { getSpecialistDiscoveryRevision } from '../../utils/specialistDiscoveryRevision';

export function QuestionnaireResultsScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'QuestionnaireResults'>>();
  const adviceId = route.params?.adviceId;
  const [specialists, setSpecialists] = useState<SpecialistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [count, setCount] = useState(4);
  const [contentWidth, setContentWidth] = useState(0);
  const [identityHeights, setIdentityHeights] = useState<Record<string, { width: number | undefined; height: number }>>({});
  const requestVersion = useRef(0);
  const [privateDraft, setPrivateDraft] = useState(false);
  const [advice, setAdvice] = useState<{ key: string; specialistId?: string; draftId?: string; visible: boolean } | null>(null);
  const orientationButton = useRef<AnimatedPressableHandle>(null);
  const returnFocus = useRef<AnimatedPressableHandle | null>(null);
  const openAdvice = (specialistId?: string, trigger = orientationButton.current) => {
    if (adviceId && !privateDraft) { navigation.navigate('MatchingAdvice', { id: adviceId, specialistId }); return; }
    returnFocus.current = trigger;
    setAdvice({ key: (adviceId ?? 'new') + ':' + (specialistId ?? 'none'), draftId: adviceId, specialistId, visible: true });
  };
  const closeAdvice = () => {
    setAdvice(current => current ? { ...current, visible: false } : null);
  };
  const columns = Math.min(2, Math.max(1, Math.floor((contentWidth + 16) / 336)));
  const cardWidth = contentWidth ? Math.floor((contentWidth - (columns - 1) * 16) / columns) : undefined;
  const { options } = useProfileOptions();
  const load = useCallback(async (prioritizeAvailabilityFor?: string) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    setSpecialists([]);
    setRefresh(false);
    setNeedsClarification(false);
    setPrivateDraft(false);
    const revision = getSpecialistDiscoveryRevision();
    const assertCurrentRevision = () => {
      if (revision !== getSpecialistDiscoveryRevision()) throw new Error('La búsqueda ha cambiado. Actualiza los resultados.');
    };
    try {
      if (adviceId) {
        const result = await getAssistedResults(adviceId, prioritizeAvailabilityFor ? {prioritizeAvailabilityFor} : undefined);
        if (version !== requestVersion.current) return;
        assertCurrentRevision();
        setSpecialists(result.specialists);
        setRefresh(result.consentWithdrawn);
        setPrivateDraft(result.privateDraft);
        setNeedsClarification(result.needsClarification ?? false);
      }
      else {
        const result = await getMatchedSpecialists({forceRefresh: true, ...(prioritizeAvailabilityFor ? {prioritizeAvailabilityFor} : {})});
        if (version !== requestVersion.current) return;
        assertCurrentRevision();
        setSpecialists(result.specialists);
        setRefresh(!result.hasCompletedQuestionnaire);
        setNeedsClarification(result.needsClarification ?? false);
      }
    } catch (e) {
      if (version !== requestVersion.current) return;
      setError(
        getErrorMessage(e, 'No hemos podido cargar las recomendaciones.'),
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [adviceId]);
  const revalidate = useCallback(() => load(), [load]);
  useDiscoveryRevalidation(revalidate);
  useEffect(() => {
    void load();
    setAdvice(null);
    setCount(4);
    return () => { requestVersion.current++; };
  }, [load]);
  const text = {
    fontFamily: theme.fontSans,
    fontSize: 16,
    lineHeight: 24,
    color: theme.textPrimary,
  };
  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: width < 600 ? 16 : 28,
        alignItems: 'center',
      }}
    >
      <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)} style={{ width: '100%', gap: 14 }}>
        <Text style={{ ...text, fontSize: 12, lineHeight: 18, fontFamily: theme.fontSansSemiBold, color: theme.textSecondary }}>TU SIGUIENTE PASO</Text>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: theme.fontDisplay,
            color: theme.textPrimary,
            fontSize: width < 600 ? 28 : 32,
          }}
        >
          Profesionales para ti
        </Text>
        <Text style={{ ...text, fontSize: 14, lineHeight: 21, color: theme.textSecondary, maxWidth: 900 }}>
          Profesionales con especialidades afines a tus respuestas. Explora sus perfiles y encuentra el apoyo que necesitas.
        </Text>
        {adviceId ? (
          <Text
            style={{
              ...text,
              padding: 18,
              borderRadius: 14,
              backgroundColor: theme.bgMuted,
            }}
          >
            Esta búsqueda incluye menores. {privateDraft ? 'Tu borrador es privado y caduca a los siete días de guardarlo. ' : ''}El equipo puede ayudarte a concertar la primera atención
            y comprobar quién recibirá la terapia.
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            variant={adviceId ? 'outline' : 'primary'}
            icon={!adviceId ? <Ionicons aria-hidden name="refresh-outline" size={18} color={theme.actionPrimaryText} /> : undefined}
            onPress={() =>
              adviceId
                ? navigation.navigate('MatchingAdvice', { id: adviceId })
                : navigation.navigate('Questionnaire')
            }
          >
            {adviceId
              ? 'Ver respuestas guardadas'
              : 'Rehacer cuestionario'}
          </Button>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            variant={adviceId ? 'primary' : 'outline'}
            focusRef={orientationButton}
            disabled={!!adviceId && loading}
            onPress={() => openAdvice()}
          >
            {adviceId ? privateDraft ? 'Solicitar ayuda para empezar' : 'Ver solicitud' : 'Pedir orientación'}
          </Button>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            variant="outline"
            onPress={() => navigation.navigate('MatchingAdvice')}
          >
            Mis solicitudes
          </Button>
          <Button
            size="small"
            variant="outline"
            style={{ minHeight: 44, ...(width >= 600 ? { marginLeft: 'auto' } : {}) }}
            icon={<Ionicons aria-hidden name="grid-outline" size={18} color={theme.primary} />}
            onPress={() => navigatePatientSpecialists(navigation, 'SpecialistsDirectory')}
          >
            Ver todos los especialistas
          </Button>
        </View>
        {loading ? (
          <ActivityIndicator
            color={theme.primary}
            accessibilityLabel="Comprobando profesionales y agendas"
          />
        ) : null}
        {!!error && (
          <View>
            <Text
              accessibilityRole="alert"
              style={{ ...text, color: theme.error }}
            >
              {error}
            </Text>
            <Button onPress={() => void load()}>Actualizar búsqueda</Button>
          </View>
        )}
        {!loading && !error && !specialists.length ? (
          <View
            style={{
              padding: 28,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 18,
              gap: 16,
            }}
          >
            <Text
              style={{ ...text, fontFamily: theme.fontDisplay, fontSize: 25 }}
            >
              {refresh
                ? adviceId
                  ? 'Has retirado el consentimiento para nuevas recomendaciones.'
                  : 'Actualiza tus respuestas para recibir recomendaciones.'
                : needsClarification ? 'Necesitamos concretar un área de apoyo.'
                : 'No encontramos un encaje suficiente con estas preferencias.'}
            </Text>
            <Text style={text}>
              {needsClarification
                ? 'Has elegido solo «Otro motivo». Tus respuestas están guardadas. Selecciona al menos un área concreta o pide orientación al equipo. También puedes explorar el directorio por tu cuenta. '
                : 'Puedes pedir orientación al equipo o explorar el directorio por tu cuenta. '}
              Los profesionales del directorio no son recomendaciones de
              este cuestionario.
            </Text>
            {needsClarification && adviceId ? <Button variant="outline" onPress={() => navigation.navigate('Questionnaire')}>Iniciar otro cuestionario</Button> : null}
            <Button
              variant="outline"
              onPress={() => navigatePatientSpecialists(navigation, 'SpecialistsDirectory')}
            >
              Explorar directorio
            </Button>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        {!loading ? specialists.slice(0, count).map((specialist, index) => (
          <View key={specialist.id} style={{ width: cardWidth ?? '100%' }}>
          <MatchedSpecialistRow
            key={specialist.id}
            specialist={specialist}
            // Equalize only peers in this row, using unconstrained content measurements.
            // Width-keyed measurements let headers shrink again after a resize.
            identityContentHeight={columns > 1 ? Math.max(0, ...specialists
              .slice(Math.floor(index / columns) * columns, Math.min(Math.floor(index / columns) * columns + columns, count))
              .map(peer => identityHeights[peer.id]?.width === cardWidth ? identityHeights[peer.id]?.height ?? 0 : 0)) : undefined}
            onIdentityContentLayout={height => setIdentityHeights(current =>
              current[specialist.id]?.width === cardWidth && current[specialist.id]?.height === height
                ? current : { ...current, [specialist.id]: { width: cardWidth, height } })}
            assisted={!!adviceId}
            languages={specialist.languagesSpoken?.map(language => optionLabel(options?.languages ?? [], language)) ?? []}
            onRetryAvailability={() => void load(specialist.id)}
            onChoose={(trigger) => adviceId
              ? openAdvice(specialist.id, trigger)
              : navigation.navigate('Booking', { specialistId: specialist.id, optionId: specialist.matchedOptionId ?? undefined })}
            onProfile={() => navigation.navigate('SpecialistDetail', { adviceId, specialistId: specialist.id, optionId: specialist.matchedOptionId ?? undefined })}
          />
          </View>
        )) : null}
        </View>
        {count < specialists.length ? (
          <Button size="small" style={{ minHeight: 44, alignSelf: 'center' }} variant="outline" onPress={() => setCount(count + 4)}>
            Ver más profesionales
          </Button>
        ) : null}
      </View>
    </ScrollView>
    {advice ? <AdviceRequestModal key={advice.key} visible={advice.visible} draftId={advice.draftId} specialistId={advice.specialistId} onClose={closeAdvice} onDismiss={() => requestAnimationFrame(() => returnFocus.current?.focus?.())} onSent={() => { if (adviceId) setPrivateDraft(false); }} onViewRequest={(id) => { closeAdvice(); navigation.navigate('MatchingAdvice', { id }); }} /> : null}
    </>
  );
}
