import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  addFavoriteSpecialist,
  type SpecialistData,
  invalidateSpecialistsCache,
} from '../../services/specialistsService';
import {
  getAssistedResults,
  withdrawQuestionnaireConsent,
} from '../../services/questionnaireService';
import { getErrorMessage } from '../../constants/errors';
import {
  PROFESSIONAL_SPECIALTY_OPTIONS,
  PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS,
} from '../../constants/professionalMatchingCatalog';
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
  const [saved, setSaved] = useState<string[]>([]);
  const requestVersion = useRef(0);
  const [withdrawing, setWithdrawing] = useState(false);
  const [privateDraft, setPrivateDraft] = useState(false);
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
    return () => { requestVersion.current++; };
  }, [adviceId]);
  const text = {
    fontFamily: theme.fontSans,
    fontSize: 16,
    lineHeight: 24,
    color: theme.textPrimary,
  };
  const labelList = (
    values: unknown,
    catalog: ReadonlyArray<{ value: string; label: string }>,
  ) =>
    Array.isArray(values)
      ? values
          .filter((v): v is string => typeof v === 'string')
          .map(
            (value) => catalog.find((c) => c.value === value)?.label ?? value,
          )
          .join(' · ')
      : '';
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: width < 600 ? 20 : 36,
        alignItems: 'center',
      }}
    >
      <View style={{ maxWidth: 1100, width: '100%', gap: 16 }}>
        <Text style={{ ...text, color: theme.primary }}>TU PRÓXIMO PASO</Text>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: theme.fontDisplay,
            color: theme.textPrimary,
            fontSize: width < 600 ? 30 : 38,
          }}
        >
          Un profesional con quien empezar.
        </Text>
        <Text style={text}>
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Button
            variant="outline"
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
            variant={adviceId || (!loading && !specialists.length) ? 'primary' : 'outline'}
            onPress={() =>
              navigation.navigate('MatchingAdvice', { id: adviceId })
            }
          >
            {adviceId ? 'Solicitar ayuda para empezar' : 'Pedir orientación'}
          </Button>
          <Button
            variant="ghost"
            onPress={() => navigation.navigate('MatchingAdvice')}
          >
            Mis solicitudes
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
        {!loading
          ? specialists.slice(0, count).map((specialist) => {
              const option = specialist.publicOptions?.find(
                (o) => o.optionId === specialist.matchedOptionId,
              );
              return (
                <View
                  key={specialist.id}
                  style={{
                    backgroundColor: theme.bgCard,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 22,
                    padding: width < 600 ? 18 : 24,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 14,
                      alignItems: 'center',
                    }}
                  >
                    {specialist.avatar ? (
                      <Image
                        source={{ uri: specialist.avatar }}
                        style={{ width: width < 600 ? 64 : 80, height: width < 600 ? 76 : 92, borderRadius: 16 }}
                        accessibilityLabel={`Fotografía de ${specialist.user.name}`}
                      />
                    ) : (
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          flexShrink: 0,
                          backgroundColor: theme.primaryAlpha12,
                          borderRadius: 38,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ ...text, fontSize: 30 }}>
                          {specialist.user.name[0]}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text
                        style={{
                          ...text,
                          fontFamily: theme.fontDisplay,
                          fontSize: width < 600 ? 22 : 25,
                        }}
                      >
                        {specialist.user.name}
                      </Text>
                      <Text style={text}>
                        {specialist.professionalTitle ||
                          specialist.professionalTypeLabel}
                      </Text>
                      <Text style={{ ...text, color: theme.primary }}>
                        {specialist.partialMatch
                          ? 'Coincidencia parcial con tus áreas'
                          : specialist.matchingReasons?.some(
                                (reason) => reason.kind === 'direct',
                              )
                            ? 'Coincidencia con tus áreas'
                            : 'Coincide con tu modalidad y presupuesto'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    {[
                      ...new Set(
                        specialist.matchingReasons?.map(
                          (r) =>
                            `${r.kind === 'related' ? 'Relación parcial: ' : ''}${r.label}`,
                        ) ?? [],
                      ),
                    ].map((reason) => (
                      <Text key={reason} style={text}>
                        ✓ {reason}
                      </Text>
                    ))}
                  </View>
                  <Text
                    style={{ ...text, color: theme.textSecondary }}
                    numberOfLines={3}
                  >
                    {specialist.description}
                  </Text>
                  <View style={{ gap: 4 }}>
                    <Text style={text}>
                      Especialidades:{' '}
                      {labelList(
                        specialist.matchingProfile?.specialties,
                        PROFESSIONAL_SPECIALTY_OPTIONS,
                      )}
                    </Text>
                    <Text style={text}>
                      Enfoques:{' '}
                      {labelList(
                        specialist.matchingProfile?.therapeuticApproach,
                        PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS,
                      )}
                    </Text>
                    <Text style={text}>
                      {specialist.languagesSpoken
                        ?.map((l) => optionLabel(options?.languages ?? [], l))
                        .join(' · ')}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: theme.bgMuted,
                      borderRadius: 14,
                      padding: 16,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{ ...text, fontFamily: theme.fontSansSemiBold }}
                    >
                      {option?.serviceName} ·{' '}
                      {option?.modality === 'VIDEO_CALL'
                        ? 'Online'
                        : `Presencial en ${specialist.officeCity}`}{' '}
                      · {option?.durationMinutes} min ·{' '}
                      {specialist.pricePerSession} €
                    </Text>
                    <Text style={text}>
                      {specialist.availabilityStatus === 'UNKNOWN'
                        ? 'No hemos podido verificar la agenda. Puedes reintentar.'
                        : specialist.nextAvailable
                          ? `Próximo hueco: ${new Date(specialist.nextAvailable).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' })} (hora peninsular)`
                          : 'Sin huecos disponibles en los próximos 30 días.'}
                    </Text>
                    {specialist.availabilityStatus === 'UNKNOWN' ? (
                      <Button
                        size="small"
                        variant="ghost"
                        onPress={() => void load()}
                      >
                        Reintentar agenda
                      </Button>
                    ) : null}
                  </View>
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
                  >
                    <Button
                      onPress={() =>
                        adviceId
                          ? navigation.navigate('MatchingAdvice', {
                              id: adviceId,
                              specialistId: specialist.id,
                            })
                          : navigation.navigate('Booking', {
                              specialistId: specialist.id,
                              optionId: specialist.matchedOptionId ?? undefined,
                            })
                      }
                    >
                      {adviceId
                        ? 'Me interesa este profesional'
                        : 'Elegir una cita'}
                    </Button>
                    <Button
                      variant="outline"
                      onPress={() =>
                        navigation.navigate('SpecialistDetail', {
                          adviceId,
                          specialistId: specialist.id,
                          optionId: specialist.matchedOptionId ?? undefined,
                        })
                      }
                    >
                      Ver perfil y formación
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={saved.includes(specialist.id)}
                      onPress={() => {
                        void addFavoriteSpecialist(specialist.id)
                          .then(() =>
                            setSaved((ids) => [...ids, specialist.id]),
                          )
                          .catch((e) =>
                            setError(
                              getErrorMessage(
                                e,
                                'No se ha podido guardar el favorito.',
                              ),
                            ),
                          );
                      }}
                    >
                      {saved.includes(specialist.id)
                        ? 'Guardado en favoritos'
                        : 'Guardar favorito'}
                    </Button>
                  </View>
                </View>
              );
            })
          : null}
        {count < specialists.length ? (
          <Button variant="outline" onPress={() => setCount(count + 3)}>
            Ver más profesionales
          </Button>
        ) : null}
        {!refresh ? (
          <Button
            variant="ghost"
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
  );
}
