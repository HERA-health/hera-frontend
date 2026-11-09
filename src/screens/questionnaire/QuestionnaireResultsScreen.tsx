import React, { useEffect, useRef, useState } from 'react';
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
  invalidateSpecialistsCache,
} from '../../services/specialistsService';
import {
  getAssistedResults,
  withdrawQuestionnaireConsent,
} from '../../services/questionnaireService';
import { getErrorMessage } from '../../constants/errors';
import { AdviceRequestModal } from './components/AdviceRequestModal';
import type { AnimatedPressableHandle } from '../../components/common/AnimatedPressable';
import { MatchedSpecialistRow } from './components/MatchedSpecialistRow';
import { useProfileOptions } from '../../hooks/useProfileOptions';
import { optionLabel } from '../../utils/profileOptions';

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
  const [count, setCount] = useState(3);
  const [contentWidth, setContentWidth] = useState(0);
  const [identityHeights, setIdentityHeights] = useState<Record<string, { width: number | undefined; height: number }>>({});
  const requestVersion = useRef(0);
  const [withdrawing, setWithdrawing] = useState(false);
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
  const columns = Math.min(3, Math.max(1, Math.floor((contentWidth + 16) / 336)));
  const cardWidth = contentWidth ? Math.floor((contentWidth - (columns - 1) * 16) / columns) : undefined;
  const { options } = useProfileOptions();
  const load = async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    setSpecialists([]);
    setRefresh(false);
    setCount(3);
    setPrivateDraft(false);
    try {
      invalidateSpecialistsCache();
      if (adviceId) {
        const result = await getAssistedResults(adviceId);
        if (version !== requestVersion.current) return;
        setSpecialists(result.specialists);
        setRefresh(result.consentWithdrawn);
        setPrivateDraft(result.privateDraft);
      }
      else {
        const result = await getMatchedSpecialists();
        if (version !== requestVersion.current) return;
        setSpecialists(result.specialists);
        setRefresh(!result.hasCompletedQuestionnaire);
      }
    } catch (e) {
      if (version !== requestVersion.current) return;
      setError(
        getErrorMessage(e, 'No hemos podido cargar las recomendaciones.'),
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    setAdvice(null);
    return () => { requestVersion.current++; };
  }, [adviceId]);
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
      <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)} style={{ maxWidth: 1120, width: '100%', gap: 14 }}>
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
          Te mostramos el encaje con sus especialidades y enfoques declarados.
          El tipo de terapia y las edades indicadas no se usan para seleccionar
          estos resultados. Confirma con el profesional que atiende tu caso
          antes de reservar.
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            variant="ghost"
            onPress={() =>
              adviceId
                ? navigation.navigate('MatchingAdvice', { id: adviceId })
                : navigation.navigate('Questionnaire')
            }
          >
            {adviceId
              ? 'Ver respuestas guardadas'
              : refresh
                ? 'Completar cuestionario actualizado'
                : 'Revisar cuestionario'}
          </Button>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            variant={adviceId || (!loading && !specialists.length) ? 'primary' : 'outline'}
            focusRef={orientationButton}
            disabled={!!adviceId && loading}
            onPress={() => openAdvice()}
          >
            {adviceId ? privateDraft ? 'Solicitar ayuda para empezar' : 'Ver solicitud' : 'Pedir orientación'}
          </Button>
          {width >= 600 ? <Button
            size="small"
            style={{ minHeight: 44 }}
            variant="ghost"
            onPress={() => navigation.navigate('MatchingAdvice')}
          >
            Mis solicitudes
          </Button> : null}
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
            <Button onPress={() => void load()}>Reintentar</Button>
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
                : 'No encontramos un encaje suficiente con estas preferencias.'}
            </Text>
            <Text style={text}>
              Puedes pedir orientación al equipo o explorar el directorio por tu
              cuenta. Los profesionales del directorio no son recomendaciones de
              este cuestionario.
            </Text>
            <Button
              variant="outline"
              onPress={() => navigation.navigate('Specialists')}
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
            onRetryAvailability={() => void load()}
            onChoose={(trigger) => adviceId
              ? openAdvice(specialist.id, trigger)
              : navigation.navigate('Booking', { specialistId: specialist.id, optionId: specialist.matchedOptionId ?? undefined })}
            onProfile={() => navigation.navigate('SpecialistDetail', { adviceId, specialistId: specialist.id, optionId: specialist.matchedOptionId ?? undefined })}
          />
          </View>
        )) : null}
        </View>
        {count < specialists.length ? (
          <Button size="small" style={{ minHeight: 44, alignSelf: 'center' }} variant="outline" onPress={() => setCount(count + 3)}>
            Ver más profesionales
          </Button>
        ) : null}
        {width < 600 ? <Button size="small" style={{ minHeight: 44, alignSelf: 'flex-start' }} variant="ghost" onPress={() => navigation.navigate('MatchingAdvice')}>Mis solicitudes</Button> : null}
        {!refresh ? (
          <Button
            variant="ghost"
            size="small"
            style={{ minHeight: 44, alignSelf: 'flex-start', marginTop: 8 }}
            textStyle={{ fontSize: 12 }}
            loading={withdrawing}
            onPress={() => {
              requestVersion.current++;
              setLoading(false);
              setWithdrawing(true);
              void withdrawQuestionnaireConsent(adviceId)
                .then(() => {
                  requestVersion.current++;
                  setRefresh(true);
                  setSpecialists([]);
                })
                .catch((e) =>
                  setError(
                    getErrorMessage(
                      e,
                      'No se ha podido retirar el consentimiento.',
                    ),
                  ),
                )
                .finally(() => setWithdrawing(false));
            }}
          >
            Retirar consentimiento para nuevas recomendaciones
          </Button>
        ) : null}
      </View>
    </ScrollView>
    {advice ? <AdviceRequestModal key={advice.key} visible={advice.visible} draftId={advice.draftId} specialistId={advice.specialistId} onClose={closeAdvice} onDismiss={() => requestAnimationFrame(() => returnFocus.current?.focus?.())} onSent={() => { if (adviceId) setPrivateDraft(false); }} onViewRequest={(id) => { closeAdvice(); navigation.navigate('MatchingAdvice', { id }); }} /> : null}
    </>
  );
}
