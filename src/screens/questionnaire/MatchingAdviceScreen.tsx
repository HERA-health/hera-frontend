import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import {
  listAdvice,
  readAdvice,
  respondAdvice,
  deleteAdviceDraft,
  getQuestionnaireDefinition,
  type AdviceRequest,
  type QuestionnaireDefinition,
} from '../../services/questionnaireService';
import { buildQuestionnaireReviewItems } from '../../utils/questionnaireReview';
import { getErrorMessage } from '../../constants/errors';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { AdviceRequestForm } from './components/AdviceRequestForm';
import { useAdviceRequest } from './components/useAdviceRequest';

export function MatchingAdviceScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'MatchingAdvice' | 'AdminMatchingAdvice'>
    >();
  const admin = route.name === 'AdminMatchingAdvice';
  const [items, setItems] = useState<AdviceRequest[]>([]);
  const [definition, setDefinition] = useState<QuestionnaireDefinition | null>(
    null,
  );
  const [error, setError] = useState('');
  const [loading, setBusy] = useState(false);
  const [selected, setSelected] = useState(route.params?.id);
  const [showAnswers, setShowAnswers] = useState(false);
  const [response, setResponse] = useState('');
  const [sent, setSent] = useState(false);
  const current = items.find((item) => item.id === selected);
  const composer = useAdviceRequest({
    draftId: current?.status === 'DRAFT' ? current.id : undefined,
    specialistId: route.params && 'specialistId' in route.params ? route.params.specialistId : undefined,
    onSent: async (result) => { setSelected(result.id); setSent(true); await load(); },
  });
  const busy = loading || composer.busy;
  const text = {
    fontFamily: theme.fontSans,
    fontSize: 16,
    lineHeight: 24,
    color: theme.textPrimary,
  };
  const inputStyle = {
    ...text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    minHeight: 130,
  };
  const load = async (ignoreRouteTarget = false) => {
    setBusy(true);
    setError('');
    try {
      const [rows, catalog] = await Promise.all([
        listAdvice(admin),
        getQuestionnaireDefinition(),
      ]);
      const target = ignoreRouteTarget ? undefined : route.params?.id;
      if (target && !rows.some((row) => row.id === target))
        rows.unshift(await readAdvice(target, admin));
      setItems(rows);
      setDefinition(catalog);
    } catch (e) {
      setError(getErrorMessage(e, 'No se han podido cargar las solicitudes.'));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    composer.reset();
    setSelected(route.params?.id);
    void load();
  }, [admin, route.params?.id]);
  useEffect(() => { setShowAnswers(false); }, [selected]);
  if (admin && !user?.isAdmin)
    return <Text style={text}>No tienes acceso a esta bandeja.</Text>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: !admin && width < 600 ? 16 : 28, alignItems: 'center' }}
    >
      <View style={{ width: '100%', maxWidth: 850, gap: admin ? 20 : 16 }}>
        {!admin ? <Text style={{ ...text, fontSize: 12, lineHeight: 18, color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }}>ORIENTACIÓN HERA</Text> : null}
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: theme.fontDisplay,
            fontSize: admin ? 34 : width < 600 ? 28 : 32,
            color: theme.textPrimary,
          }}
        >
          {admin
            ? 'Solicitudes de orientación'
            : 'Te ayudamos a dar el siguiente paso'}
        </Text>
        {!admin ? (
          <Text style={text}>
            El equipo coordinará el contacto. Este canal no sustituye una
            consulta clínica ni ofrece atención urgente.
          </Text>
        ) : null}
        {busy ? <ActivityIndicator color={theme.primary} /> : null}
        {!!error && (
          <>
            <Text
              accessibilityRole="alert"
              style={{ ...text, color: theme.error }}
            >
              {error}
            </Text>
            <Button variant="outline" onPress={() => void load()}>
              Actualizar solicitudes
            </Button>
          </>
        )}
        {sent ? (
          <Text accessibilityLiveRegion="polite" style={text}>
            Solicitud guardada. Podrás consultar la respuesta aquí.
          </Text>
        ) : null}
        {items.length ? (
          <View style={{ gap: 8 }}>
            {items.map((item) => !admin ? (
              <AnimatedPressable
                key={item.id}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Solicitud del ${new Date(item.createdAt).toLocaleDateString('es-ES')}: ${item.status === 'DRAFT' ? 'Borrador privado' : item.status === 'SUBMITTED' ? 'Enviada' : 'Respondida'}`}
                accessibilityState={{ selected: selected === item.id, disabled: busy }}
                onPress={() => { if (selected !== item.id) composer.reset(); setSelected(item.id); setResponse(''); setSent(false); }}
                style={{ minHeight: 56, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: selected === item.id ? theme.primary : theme.borderLight, backgroundColor: selected === item.id ? theme.bgMuted : theme.bgCard, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <Ionicons name={item.status === 'DRAFT' ? 'document-text-outline' : 'chatbubble-ellipses-outline'} size={20} color={theme.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...text, fontSize: 14, fontFamily: theme.fontSansSemiBold }}>{new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                  <Text style={{ ...text, fontSize: 12, lineHeight: 18, color: theme.textSecondary }}>{item.status === 'DRAFT' ? 'Borrador privado' : item.status === 'SUBMITTED' ? 'Enviada' : 'Respondida'}{item.notificationPending ? ' · Aviso pendiente' : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </AnimatedPressable>
            ) : (
              <Button
                key={item.id}
                disabled={busy}
                variant={selected === item.id ? 'secondary' : 'outline'}
                onPress={() => {
                  setSelected(item.id);
                  setResponse('');
                }}
              >
                {new Date(item.createdAt).toLocaleDateString('es-ES')} ·{' '}
                {item.status === 'DRAFT'
                  ? 'Borrador privado'
                  : item.status === 'SUBMITTED'
                    ? 'Enviada'
                    : 'Respondida'}
                {item.notificationPending ? ' · Aviso pendiente' : ''}
              </Button>
            ))}
          </View>
        ) : (
          <Text style={text}>Todavía no hay solicitudes.</Text>
        )}
        {current ? (
          <View
            style={{
              padding: 22,
              backgroundColor: theme.bgCard,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              gap: 14,
            }}
          >
            <Text style={admin ? text : { ...text, fontSize: 12, color: theme.textSecondary }}>Referencia: {current.id}</Text>
            {current.contact ? (
              <Text style={text}>
                {current.contact.name} · {current.contact.email} ·{' '}
                {current.contact.phone}
              </Text>
            ) : null}
            {admin && current.specialistId ? (
              <Button
                variant="outline"
                onPress={() => {
                  if (current.specialistId)
                    navigation.navigate('SpecialistDetailAdmin', {
                      specialistId: current.specialistId,
                    });
                }}
              >
                Ver profesional de interés
              </Button>
            ) : null}
            {current.expiresAt ? (
              <Text style={text}>
                Las respuestas privadas caducan el{' '}
                {new Date(current.expiresAt).toLocaleDateString('es-ES')}.
              </Text>
            ) : null}
            {current.request ? (
              <>
                <Text style={text}>{current.request.message}</Text>
                {[
                  'therapyType',
                  'familyPopulations',
                  'childAgeGroup',
                  'respondentRole',
                ].map((key) => {
                  const value = current.request?.[key];
                  const values = Array.isArray(value)
                    ? value
                    : value
                      ? [value]
                      : [];
                  return values.length ? (
                    <Text key={key} style={text}>
                      {definition?.labels[key]}:{' '}
                      {values
                        .map(
                          (v) =>
                            definition?.choices[key]?.find(
                              (choice) => choice.value === v,
                            )?.label ?? v,
                        )
                        .join(' · ')}
                    </Text>
                  ) : null;
                })}
              </>
            ) : null}
            {current.response ? (
              <>
                <Text style={{ ...text, fontFamily: theme.fontSansSemiBold }}>
                  Respuesta del equipo
                </Text>
                <Text style={admin ? text : { ...text, padding: 16, borderRadius: 12, backgroundColor: theme.bgMuted }}>{current.response.text}</Text>
              </>
            ) : null}
            {current.notificationPending ? (
              <Text style={text}>
                La solicitud está guardada. El aviso por correo está pendiente y
                se reintentará automáticamente.
              </Text>
            ) : null}
            {current.questionnaire ? (
              <>
                <Button
                  variant="outline"
                  accessibilityState={{ expanded: showAnswers }}
                  onPress={() => setShowAnswers((visible) => !visible)}
                >
                  {showAnswers ? 'Ocultar respuestas' : 'Ver respuestas'}{' '}
                  {current.request?.sharedQuestionnaire === 'true' ? 'compartidas' : 'privadas'}
                </Button>
                {showAnswers ? buildQuestionnaireReviewItems(
                  current.questionnaire,
                  definition,
                ).map((item) => (
                  <View key={item.questionId}>
                    <Text
                      style={{ ...text, fontFamily: theme.fontSansSemiBold }}
                    >
                      {item.question}
                    </Text>
                    <Text style={text}>{item.answers.join(' · ')}</Text>
                  </View>
                )) : null}
              </>
            ) : null}
            {current.status === 'DRAFT' ? (
              <View style={{ gap: 10 }}>
                <Button
                  variant="outline"
                  onPress={() =>
                    navigation.navigate('QuestionnaireResults', {
                      adviceId: current.id,
                    })
                  }
                >
                  Ver profesionales compatibles
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onPress={() => {
                    setBusy(true);
                    void deleteAdviceDraft(current.id)
                      .then(() => {
                        setSelected(undefined);
                        navigation.setParams({ id: undefined });
                        return load(true);
                      })
                      .catch((e) =>
                        setError(
                          getErrorMessage(
                            e,
                            'No se pudo eliminar el borrador.',
                          ),
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Eliminar borrador
                </Button>
              </View>
            ) : null}
          </View>
        ) : null}
        {admin && current?.status === 'SUBMITTED' ? (
          <>
            <TextInput
              accessibilityLabel="Respuesta del equipo"
              value={response}
              onChangeText={setResponse}
              editable={!busy}
              multiline
              maxLength={4000}
              style={inputStyle}
            />
            <Button
              loading={busy}
              disabled={!response.trim()}
              onPress={() => {
                setBusy(true);
                void respondAdvice(current.id, response)
                  .then(() => load())
                  .catch((e) =>
                    setError(
                      getErrorMessage(e, 'No se pudo guardar la respuesta.'),
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Guardar y notificar respuesta
            </Button>
          </>
        ) : null}
        {!admin && (!selected || current?.status === 'DRAFT') ? (
          <View style={{ padding: width < 600 ? 16 : 22, borderRadius: 16, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderLight }}>
            <AdviceRequestForm controller={composer} disabled={busy} />
          </View>
        ) : !admin ? (
          <Button
            variant="outline"
            onPress={() => {
              setSelected(undefined);
              navigation.setParams({ id: undefined, specialistId: undefined });
              setSent(false);
              composer.reset();
            }}
          >
            Nueva solicitud
          </Button>
        ) : null}
      </View>
    </ScrollView>
  );
}
