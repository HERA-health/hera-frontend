import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useQuestionnaireDraft } from '../../contexts/QuestionnaireDraftContext';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { Button } from '../../components/common/Button';
import { SearchableProfileSelect } from '../../components/common/SearchableProfileSelect';
import { renderLanguageIcon } from '../../components/common/LanguageIcon';
import { AddressAutocomplete } from '../../components/location/AddressAutocomplete';
import {
  getQuestionnaireDefinition,
  getCurrentQuestionnaire,
  type QuestionnaireDefinition,
} from '../../services/questionnaireService';
import {
  answerList,
  answerText,
  assistedQuestionnaire,
  updateQuestionnaire,
  questionnaireStepError,
} from '../../utils/questionnaireForm';
import { choiceKeyboardProps } from '../../utils/choiceKeyboard';
import { getErrorMessage } from '../../constants/errors';
import { LandingHeader } from '../landing/components/LandingHeader';
import { buildQuestionnaireReviewItems } from '../../utils/questionnaireReview';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { QuestionnaireLayout } from './components/QuestionnaireLayout';
import { QuestionnaireBackdrop } from './components/QuestionnaireArtwork';
import { questionnairePictogram } from './components/QuestionnairePictogram';
import { QuestionnaireOption } from './components/QuestionnaireOption';

type ChoiceIcon = React.ComponentProps<typeof Ionicons>['name'];
const choiceIcons: Record<string, Record<string, ChoiceIcon>> = {
  therapyType: {
    individual: 'person-outline',
    couple: 'heart-outline',
    family: 'people-outline',
    child: 'happy-outline',
  },
  modalities: { online: 'videocam-outline', 'in-person': 'location-outline' },
  budget: {
    upTo50: 'wallet-outline',
    upTo70: 'wallet-outline',
    upTo100: 'wallet-outline',
    under50: 'wallet-outline',
    '50to70': 'wallet-outline',
    over70: 'wallet-outline',
    any: 'options-outline',
  },
  start: {
    urgent: 'flash-outline',
    soon: 'calendar-outline',
    flexible: 'leaf-outline',
  },
  workingStyles: {
    tools: 'construct-outline',
    thoughts: 'bulb-outline',
    emotions: 'heart-outline',
    past: 'time-outline',
    relationships: 'people-outline',
    trauma: 'shield-checkmark-outline',
    acceptance: 'leaf-outline',
    combined: 'layers-outline',
    guided: 'compass-outline',
  },
  goals: {
    relief: 'leaf-outline',
    emotions: 'heart-outline',
    habits: 'repeat-outline',
    history: 'book-outline',
    relationships: 'people-outline',
    pain: 'bandage-outline',
    coping: 'compass-outline',
    'self-esteem': 'sunny-outline',
    solutions: 'bulb-outline',
    growth: 'flower-outline',
    'trauma-recovery': 'shield-checkmark-outline',
    boundaries: 'hand-left-outline',
    'couple-family-conflicts': 'people-circle-outline',
    unsure: 'help-circle-outline',
  },
  previousTherapy: {
    first: 'sparkles-outline',
    positive: 'heart-outline',
    uncomfortable: 'compass-outline',
    several: 'chatbubbles-outline',
  },
  gender: {
    woman: 'person-outline',
    man: 'person-outline',
    nonbinary: 'person-outline',
    any: 'people-outline',
  },
  contexts: {
    culture: 'globe-outline',
    religion: 'leaf-outline',
    lgbtq: 'color-palette-outline',
    relationships: 'heart-outline',
    migration: 'earth-outline',
    discrimination: 'shield-checkmark-outline',
    other: 'add-circle-outline',
  },
};
const groupIcons: Record<string, ChoiceIcon> = {
  emotional: 'heart-outline',
  psychological: 'pulse-outline',
  relationships: 'people-outline',
  life: 'leaf-outline',
  growth: 'sparkles-outline',
};
export function QuestionnaireScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const draft = useQuestionnaireDraft();
  const { answers, setAnswers, step, setStep } = draft;
  const [definition, setDefinition] = useState<QuestionnaireDefinition | null>(
    null,
  );
  const [error, setError] = useState('');
  const [errorChoice, setErrorChoice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [introDetailsOpen, setIntroDetailsOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80);
  const alert = useAppAlert();
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const heading = useRef<Text>(null);
  const loaded = useRef(false);
  const [formWidth, setFormWidth] = useState(0);
  const pairedPreferences = formWidth >= 960;
  const groupColumns = formWidth >= 720;
  usePreventRemove(step > 0 && !draft.ready, ({ data }) =>
    showAppAlert(
      alert,
      'Cuestionario sin guardar',
      'Tus respuestas siguen en esta pestaña. Puedes continuar después mientras no recargues ni cierres la página.',
      [
        { text: 'Seguir respondiendo', style: 'cancel' },
        { text: 'Salir', onPress: () => navigation.dispatch(data.action) },
      ],
    ),
  );
  const assisted = assistedQuestionnaire(answers);
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setDefinition(await getQuestionnaireDefinition());
      if (user?.type === 'client' && step === 0 && !loaded.current) {
        const current = await getCurrentQuestionnaire();
        if (current.answers) setAnswers(current.answers);
      }
      loaded.current = true;
    } catch (e) {
      setError(getErrorMessage(e, 'No se ha podido cargar el cuestionario.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === 'web' && step > 0) heading.current?.focus();
  }, [step]);
  const text = {
    fontFamily: theme.fontSans,
    fontSize: 15,
    lineHeight: 21,
    color: theme.textPrimary,
  };
  const muted = { ...text, fontSize: 14, lineHeight: 20, color: theme.textSecondary };
  const focusStyle = Platform.OS === 'web' ? { outlineColor: theme.focus } : {};
  const set = (field: string, value: string | string[]) => {
    setAnswers((current) => updateQuestionnaire(current, field, value));
    setError('');
    setErrorChoice(null);
  };
  const optionalFields = ['gender', 'contexts', 'religion', 'discrimination'];
  const title = (label: string, optional = false) => (
    <Text
      accessibilityRole="header"
      style={{
        ...text,
        fontFamily: theme.fontSansSemiBold,
        fontSize: 17,
        marginTop: 6,
      }}
    >
      {label}
      {optional ? <Text style={{ ...muted, fontFamily: theme.fontSans }}> (opcional)</Text> : null}
    </Text>
  );
  const choices = (field: string, multiple = false, group?: string, availableWidth = formWidth) => {
    const list =
      definition?.choices[field]?.filter(
        (option) => (!group || option.group === group) &&
          (!option.deprecated || answers[field] === option.value),
      ) ?? [];
    return (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: field === 'concerns' ? 0 : 8,
          marginTop: 6,
        }}
      >
        {list.map((option) => {
          const selected = multiple
            ? answerList(answers, field).includes(option.value)
            : answers[field] === option.value;
          const toggle = () => {
            if (!multiple) {
              set(field, selected && field === 'gender' ? '' : option.value);
              return;
            }
            let next = selected
              ? answerList(answers, field).filter((v) => v !== option.value)
              : [...answerList(answers, field), option.value];
            if (field === 'concerns' && next.length > 5) {
              setErrorChoice(option.value);
              setError(
                'Puedes elegir hasta cinco áreas. Quita una antes de añadir otra para centrarnos en lo más importante.',
              );
              return;
            }
            const exclusive =
              field === 'workingStyles'
                ? 'guided'
                : field === 'goals'
                  ? 'unsure'
                  : null;
            if (exclusive && !selected)
              next =
                option.value === exclusive
                  ? [exclusive]
                  : next.filter((v) => v !== exclusive);
            set(field, next);
          };
          const compact = field === 'concerns';
          const illustration = questionnairePictogram(field, option.value);
          const brief = ['therapyType', 'modalities', 'budget', 'gender'].includes(field);
          const columns = compact ? 1
            : brief ? field !== 'modalities' && availableWidth >= 600 ? 4 : availableWidth >= 296 ? 2 : 1
              : ['workingStyles', 'goals', 'contexts', 'start'].includes(field)
                ? Math.min(3, Math.max(1, Math.floor((availableWidth + 8) / 208)))
                : availableWidth >= 520 ? 2 : 1;
          const tile = !!illustration && columns > 1;
          return (
            <QuestionnaireOption
              key={option.value}
              label={option.label}
              icon={choiceIcons[field]?.[option.value]}
              illustration={illustration}
              multiple={multiple}
              selected={selected}
              variant={compact ? 'list' : tile ? 'tile' : 'row'}
              width={
                columns > 1
                  ? Math.floor((availableWidth - 8 * (columns - 1)) / columns)
                  : '100%'
              }
              onPress={toggle}
              error={
                compact && errorChoice === option.value ? error : undefined
              }
            />
          );
        })}
      </View>
    );
  };
  const field = (key: string, multiple = false, availableWidth = formWidth) => (
    <View style={{ marginBottom: 6 }}>
      {title(definition?.labels[key] ?? key, optionalFields.includes(key))}
      {choices(key, multiple, undefined, availableWidth)}
    </View>
  );
  const openText = (key: string) => (
    <View
      style={{
        gap: 8,
        marginTop: 8,
        marginBottom: 6,
        padding: 12,
        borderRadius: 16,
        backgroundColor: theme.bgMuted,
      }}
    >
      {title(definition?.labels[key] ?? key, true)}
      <TextInput
        accessibilityLabel={`${definition?.labels[key] ?? key} (opcional)`}
        value={answerText(answers, key)}
        onChangeText={(value) => set(key, value)}
        maxLength={500}
        multiline
        placeholder="Escribe lo que te apetezca compartir…"
        placeholderTextColor={theme.textMuted}
        style={{
          ...text,
          ...focusStyle,
          textAlignVertical: 'top',
          minHeight: 64,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 14,
          backgroundColor: theme.bgCard,
        }}
      />
      <Text style={{ ...muted, textAlign: 'right' }}>
        {answerText(answers, key).length}/500
      </Text>
    </View>
  );
  const select = (key: string, multiple = false) => (
    <View style={{ marginVertical: 8 }}>
      <SearchableProfileSelect
        label={definition?.labels[key] ?? key}
        optional={optionalFields.includes(key)}
        renderIcon={key === 'languages' ? renderLanguageIcon : undefined}
        emptyLabel={
          key === 'languages'
            ? answerList(answers, key).length
              ? 'Añadir otro idioma'
              : 'Seleccionar idiomas'
            : 'Seleccionar'
        }
        options={(definition?.choices[key] ?? []).map((option) => ({
          ...option,
          aliases: [],
        }))}
        values={
          multiple
            ? answerList(answers, key)
            : answerText(answers, key)
              ? [answerText(answers, key)]
              : []
        }
        onChange={(values) => set(key, multiple ? values : (values[0] ?? ''))}
        multiple={multiple}
        max={key === 'languages' ? 20 : 5}
      />
    </View>
  );
  const advance = (destination: 'Register' | 'Login' = 'Register') => {
    if (step === 0) {
      if (!draft.adult || !draft.accepted) {
        setError(
          'Confirma que eres mayor de edad y acepta el uso del cuestionario.',
        );
        return;
      }
    } else {
      const problem = questionnaireStepError(answers, step);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setError('');
    if (step < 8) {
      setStep(step + 1);
      return;
    }
    for (let index = 1; index <= 8; index++) {
      const problem = questionnaireStepError(answers, index);
      if (problem) {
        setStep(index);
        setError(problem);
        return;
      }
    }
    if (!definition) return;
    draft.prepare(definition.noticeVersion);
    if (!user) navigation.navigate(destination, { userType: 'CLIENT' });
  };
  const check = (label: string, checked: boolean, toggle: () => void) => (
    <Pressable
      {...choiceKeyboardProps(toggle, false)}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={toggle}
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 10,
        ...focusStyle,
        minHeight: 44,
        borderWidth: 1,
        borderColor: checked ? theme.actionPrimary : theme.borderLight,
        borderRadius: 12,
        backgroundColor: checked ? theme.bgMuted : theme.bgCard,
        alignItems: 'flex-start',
      }}
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={25}
        color={theme.primary}
      />
      <Text style={{ ...muted, flex: 1 }}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{
        flex: 1,
        minHeight: 0,
        maxHeight: height,
        backgroundColor: theme.bg,
      }}
    >
      <QuestionnaireBackdrop />
      <LandingHeader
        context="questionnaire"
        isScrolled
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        accessLabel={user ? 'Mi espacio' : 'Acceder'}
        onAccess={() =>
          user
            ? navigation.navigate('Home')
            : navigation.navigate('Login', { userType: 'CLIENT' })
        }
        onLogoPress={() =>
          user ? navigation.navigate('Home') : navigation.navigate('Landing')
        }
        onViewPlans={() => navigation.navigate('Pricing')}
        onScrollToSection={
          !user
            ? (section) => navigation.navigate('Landing', { section })
            : undefined
        }
        onExploreProfessionals={
          !user
            ? () =>
                navigation.navigate('Landing', { section: 'forSpecialists' })
            : undefined
        }
      />
      <QuestionnaireLayout
        definition={definition}
        step={step}
        onStep={(next) => {
          setStep(next);
          setError('');
        }}
        onFormLayout={(event) => setFormWidth(event.nativeEvent.layout.width)}
        scrollRef={scroll}
        headerHeight={headerHeight}
        footer={
          <View
            testID="questionnaire-navigation"
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.bgCard,
              paddingHorizontal: 0,
              paddingTop: 12,
              alignItems: 'center',
            }}
          >
            <View style={{ width: '100%' }}>
              {!!error && !(step === 4 && errorChoice) && (
                <Text
                  accessibilityRole="alert"
                  style={{ ...text, color: theme.error, paddingVertical: 10 }}
                >
                  {error}
                </Text>
              )}
              {definition && !loading ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 10,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {step > 0 ? (
                    <Button
                      size="small"
                      style={{
                        ...focusStyle,
                        minHeight: 44,
                        backgroundColor: theme.bgMuted,
                        borderRadius: 12,
                      }}
                      textStyle={{ color: theme.textPrimary }}
                      icon={
                        <Ionicons
                          aria-hidden
                          name="arrow-back"
                          size={18}
                          color={theme.textPrimary}
                        />
                      }
                      variant="ghost"
                      onPress={() => {
                        setStep(step - 1);
                        setError('');
                      }}
                    >
                      Anterior
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    style={{
                      ...focusStyle,
                      minHeight: 44,
                      borderRadius: 12,
                      marginLeft: 'auto',
                      shadowOpacity: 0,
                      elevation: 0,
                    }}
                    icon={
                      <Ionicons
                        aria-hidden
                        name="arrow-forward"
                        size={18}
                        color={theme.actionPrimaryText}
                      />
                    }
                    iconPosition="right"
                    onPress={() => advance()}
                  >
                    {step === 8
                      ? user
                        ? 'Guardar y ver resultados'
                        : 'Crear cuenta gratuita'
                      : step === 0
                        ? 'Comenzar cuestionario'
                        : 'Continuar'}
                  </Button>
                  {step === 8 && !user ? (
                    <Button
                      size="small"
                      style={{
                        minHeight: 44,
                        ...focusStyle,
                        backgroundColor: theme.bgCard,
                        borderRadius: 12,
                      }}
                      variant="outline"
                      onPress={() => advance('Login')}
                    >
                      Ya tengo cuenta
                    </Button>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        }
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <Text style={{ ...muted, fontFamily: theme.fontSansSemiBold }}>
            TU CUESTIONARIO
          </Text>
          <Text style={muted}>
            {step ? `Paso ${step} de 8` : 'Tu punto de partida'}
          </Text>
        </View>
        {step > 0 ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Progreso del cuestionario"
            accessibilityValue={{ min: 0, max: 8, now: step }}
            style={{
              height: 6,
              backgroundColor: theme.border,
              borderRadius: 2,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                width: `${(step / 8) * 100}%`,
                height: 6,
                backgroundColor: theme.actionPrimary,
              }}
            />
          </View>
        ) : null}
        <Text
          ref={heading}
          {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})}
          accessibilityRole="header"
          style={{
            fontFamily: theme.fontDisplay,
            ...(Platform.OS === 'web'
              ? {
                  outlineColor: 'transparent',
                  outlineStyle: 'solid' as const,
                  outlineWidth: 0,
                }
              : {}),
            fontSize: width < 600 ? 25 : 28,
            lineHeight: width < 600 ? 32 : 36,
            color: theme.textPrimary,
            marginBottom: 6,
          }}
        >
          {step === 0
            ? 'Encuentra un profesional para ti.'
            : step === 8
              ? 'Tu siguiente paso: encontrar a tu profesional'
            : definition?.steps[step - 1]?.title}
        </Text>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Cargando cuestionario"
            color={theme.primary}
          />
        ) : !definition ? (
          <Button onPress={() => void load()}>Volver a cargar</Button>
        ) : (
          <>
            {step === 0 ? (
              <>
                <Text style={text}>
                  Cuéntanos qué necesitas y te mostraremos profesionales compatibles.
                </Text>
                {!user ? (
                  <Text style={muted}>
                    Al terminar, crea tu cuenta gratuita o inicia sesión para ver tus resultados.
                  </Text>
                ) : null}
                <View style={{ borderRadius: 16, backgroundColor: theme.bgMuted, marginVertical: 4 }}>
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel="Sobre el cuestionario y tus datos"
                    accessibilityState={{ expanded: introDetailsOpen }}
                    onPress={() => setIntroDetailsOpen(open => !open)}
                    hoverLift={false}
                    style={{ minHeight: 48, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Ionicons aria-hidden name="information-circle-outline" size={22} color={theme.textPrimary} />
                    <Text style={{ ...text, flex: 1, fontFamily: theme.fontSansSemiBold }}>
                      Sobre el cuestionario y tus datos
                    </Text>
                    <Ionicons aria-hidden name={introDetailsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textPrimary} />
                  </AnimatedPressable>
                  {introDetailsOpen ? (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
                      <Text style={muted}>
                        No es una evaluación clínica ni un diagnóstico. Los campos abiertos son opcionales.
                      </Text>
                      <Text style={muted}>{definition.notice}</Text>
                      <Text style={muted}>
                        Hasta que lo guardes, el borrador solo está en esta pestaña. Si la cierras o recargas, se pierde.
                      </Text>
                    </View>
                  ) : null}
                </View>
                {check(
                  'Soy mayor de 18 años y respondo como persona adulta.',
                  draft.adult,
                  () => draft.setAdult(!draft.adult),
                )}
                {check(
                  'Acepto el uso de mis respuestas para las recomendaciones y el almacenamiento descrito en este aviso.',
                  draft.accepted,
                  () => draft.setAccepted(!draft.accepted),
                )}
              </>
            ) : null}
            {step > 0 &&
            !!answers.therapyType &&
            answers.therapyType !== 'individual' ? (
              <Text
                style={{
                  ...muted,
                  backgroundColor: theme.bgMuted,
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                {assisted
                  ? 'Responde como adulto sobre la atención que buscas. El inicio será asistido para comprobar destinatario, representación y consentimientos.'
                  : 'Responde desde tu perspectiva como participante. Esta información quedará guardada como contexto para el profesional.'}{' '}
                No incluyas nombres ni datos identificativos de otras personas.
              </Text>
            ) : null}
            {step === 1 ? (
              <>
                {choices('therapyType')}
                <Text style={muted}>
                  Guardamos el tipo de terapia y las edades como contexto para
                  la atención. Por ahora no se utilizan para filtrar ni ordenar
                  las recomendaciones.
                </Text>
                {answers.therapyType === 'family'
                  ? field('familyPopulations', true)
                  : null}
                {answers.therapyType === 'child'
                  ? field('childAgeGroup')
                  : null}
                {assisted ? field('respondentRole') : null}
              </>
            ) : null}
            {step === 2 ? (
              <>
                {field('modalities', true)}
                <Text style={muted}>Puedes elegir ambas modalidades.</Text>
                {answerList(answers, 'modalities').includes('in-person') ? (
                  <AddressAutocomplete
                    localityOnly
                    onTextChange={(value) => set('city', value)}
                    label="Ciudad para las sesiones presenciales"
                    placeholder="Busca tu localidad"
                    value={answerText(answers, 'city')}
                    onAddressSelect={(location) => set('city', location.city)}
                  />
                ) : null}
                {select('languages', true)}
              </>
            ) : null}
            {step === 3 ? (
              <>
                {field('budget')}
                <Text style={muted}>
                  Elige el máximo que quieres pagar por sesión. Incluiremos también opciones más económicas.
                </Text>
                {definition.choices.budget?.some(option => option.deprecated && option.value === answers.budget) ? (
                  <Text style={muted}>Tu respuesta anterior se conserva como una franja de precio. Elige un máximo si quieres actualizarla.</Text>
                ) : null}
                {field('start')}
              </>
            ) : null}
            {step === 4 ? (
              <>
                <Text accessibilityLiveRegion="polite" style={muted}>
                  {answerList(answers, 'concerns').length} de 5 áreas
                  seleccionadas. Elige entre una y cinco para centrarnos en lo
                  más importante. No necesitas tener un diagnóstico.
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  {(groupColumns ? [0, 1] : [0]).map((column) => (
                    <View
                      key={column}
                      style={{
                        width: groupColumns ? (formWidth - 12) / 2 : '100%',
                        gap: 12,
                      }}
                    >
                      {definition.groups
                        .filter(
                          (_, index) => !groupColumns || index % 2 === column,
                        )
                        .map(([id, label]) => (
                          <View
                            key={id}
                            style={{
                              borderWidth: 1,
                              borderColor: theme.borderLight,
                              borderRadius: 14,
                              padding: 8,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                gap: 10,
                                padding: 10,
                                borderRadius: 10,
                                backgroundColor: theme.bgMuted,
                                alignItems: 'center',
                              }}
                            >
                              <Ionicons
                                aria-hidden
                                name={groupIcons[id] ?? 'ellipse-outline'}
                                size={23}
                                color={theme.primary}
                              />
                              <Text
                                accessibilityRole="header"
                                style={{
                                  ...text,
                                  fontSize: 17,
                                  fontFamily: theme.fontSansSemiBold,
                                  flex: 1,
                                }}
                              >
                                {label}
                              </Text>
                            </View>
                            {choices('concerns', true, id)}
                          </View>
                        ))}
                      {column === (groupColumns ? 1 : 0)
                        ? openText('concernsNote')
                        : null}
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            {step === 5 ? (
              <View style={{ flexDirection: pairedPreferences ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
                {['workingStyles', 'goals'].map(key => <View key={key} style={{ width: pairedPreferences ? (formWidth - 16) / 2 : '100%' }}>
                  {field(key, true, pairedPreferences ? (formWidth - 16) / 2 : formWidth)}
                </View>)}
              </View>
            ) : null}
            {step === 6 ? (
              <>
                {field('previousTherapy')}
                {answers.previousTherapy &&
                answers.previousTherapy !== 'first' ? (
                  <View
                    style={{
                      flexDirection: formWidth >= 720 ? 'row' : 'column',
                      gap: 8,
                    }}
                  >
                    {['previousPositive', 'previousImprovement'].map((key) => (
                      <View
                        key={key}
                        style={{
                          flex: formWidth >= 720 ? 1 : undefined,
                          minWidth: 0,
                        }}
                      >
                        {openText(key)}
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
            {step === 7 ? (
              <>
                <Text style={muted}>
                  Todas estas preferencias son opcionales. Puedes continuar sin
                  responder.
                </Text>
                {field('gender')}
                {field('contexts', true)}
                {answerList(answers, 'contexts').includes('religion')
                  ? select('religion')
                  : null}
                {answerList(answers, 'contexts').includes('discrimination')
                  ? field('discrimination', true)
                  : null}
                {openText('contextNote')}
              </>
            ) : null}
            {step === 8 ? (
              <>
                <View
                  testID="questionnaire-completion"
                  style={{ backgroundColor: theme.bgMuted, borderRadius: 16, padding: 16, gap: 12, marginBottom: 12 }}
                >
                  <Text style={text}>
                    {user
                      ? 'Guarda tus respuestas para ver los especialistas compatibles contigo.'
                      : 'Crea tu cuenta gratuita para guardar tus respuestas y ver los especialistas compatibles contigo.'}
                  </Text>
                  <View style={{ flexDirection: formWidth >= 520 ? 'row' : 'column', alignItems: formWidth >= 520 ? 'center' : 'stretch', gap: 8 }}>
                    <Button
                      style={{ ...focusStyle, minHeight: 48, borderRadius: 12, shadowOpacity: 0, elevation: 0 }}
                      icon={<Ionicons aria-hidden name="arrow-forward" size={18} color={theme.actionPrimaryText} />}
                      iconPosition="right"
                      onPress={() => advance()}
                    >
                      {user ? 'Guardar y ver resultados' : 'Crear cuenta gratuita'}
                    </Button>
                    {!user ? (
                      <Button variant="outline" style={{ ...focusStyle, minHeight: 48, borderRadius: 12, backgroundColor: theme.bgCard }} onPress={() => advance('Login')}>
                        Ya tengo cuenta
                      </Button>
                    ) : null}
                  </View>
                </View>
                {title('Revisa tus respuestas')}
                <Text style={muted}>Puedes editar cualquier sección o añadir algo más antes de continuar.</Text>
                {openText('additionalNote')}
                <Text style={muted}>
                  Los textos abiertos se conservarán como contexto para el profesional; no
                  se utilizan para ordenar recomendaciones.
                </Text>
                <View
                  style={{
                    flexDirection: pairedPreferences ? 'row' : 'column',
                    flexWrap: 'wrap',
                    columnGap: 16,
                    borderTopWidth: 1,
                    borderTopColor: theme.borderLight,
                  }}
                >
                  {definition.steps.map((item, index) => {
                    const review = buildQuestionnaireReviewItems(
                      answers,
                      definition,
                    ).filter((answer) => answer.category === String(index));
                    return (
                      <View
                        key={item.shortTitle}
                        style={{
                          width: pairedPreferences ? Math.floor((formWidth - 16) / 2) : '100%',
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.borderLight,
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <Text
                            style={{
                              ...text,
                              flex: 1,
                              fontFamily: theme.fontSansSemiBold,
                            }}
                          >
                            {index + 1}. {item.shortTitle}
                          </Text>
                          <AnimatedPressable
                            accessibilityRole="button"
                            accessibilityLabel={`Editar ${item.shortTitle}`}
                            onPress={() => setStep(index + 1)}
                            style={{
                              ...focusStyle,
                              minHeight: 44,
                              paddingHorizontal: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Ionicons
                              name="create-outline"
                              size={16}
                              color={theme.primary}
                            />
                            <Text style={{ ...muted, color: theme.primary }}>
                              Editar
                            </Text>
                          </AnimatedPressable>
                        </View>
                        {review.length ? (
                          review.map((answer) => (
                            <View key={answer.questionId} style={{ gap: 2 }}>
                              <Text
                                style={{
                                  ...muted,
                                  fontSize: 12,
                                  lineHeight: 18,
                                }}
                              >
                                {answer.question}
                              </Text>
                              <Text
                                style={{
                                  ...text,
                                  fontSize: 15,
                                  lineHeight: 21,
                                }}
                              >
                                {answer.answers.join(' · ')}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={muted}>
                            Sin respuestas en esta sección.
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                {!user ? (
                  <Text style={muted}>
                    Para guardar y ver los resultados, crea tu cuenta o inicia
                    sesión.
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </QuestionnaireLayout>
    </KeyboardAvoidingView>
  );
}
