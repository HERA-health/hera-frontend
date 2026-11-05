import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  const [loading, setLoading] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(80);
  const alert = useAppAlert();
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const heading = useRef<Text>(null);
  const loaded = useRef(false);
  const desktop = width >= 1050;
  const shortDesktop = height - headerHeight < 900;
  const [formWidth, setFormWidth] = useState(0);
  const twoColumns = formWidth >= 580;
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
    fontSize: 17,
    lineHeight: 25,
    color: theme.textPrimary,
  };
  const muted = { ...text, fontSize: 15, color: theme.textSecondary };
  const set = (field: string, value: string | string[]) => {
    setAnswers((current) => updateQuestionnaire(current, field, value));
    setError('');
  };
  const title = (label: string) => (
    <Text
      accessibilityRole="header"
      style={{
        ...text,
        fontFamily: theme.fontSansSemiBold,
        fontSize: 19,
        marginTop: 12,
      }}
    >
      {label}
    </Text>
  );
  const choices = (field: string, multiple = false, group?: string) => {
    const list =
      definition?.choices[field]?.filter(
        (option) => !group || option.group === group,
      ) ?? [];
    return (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: field === 'concerns' ? 4 : 10,
          marginTop: 10,
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
            if (field === 'concerns' && next.length > 3) {
              setError(
                'Puedes elegir hasta tres áreas. Quita una antes de añadir otra para centrarnos en lo más importante.',
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
          const icon = choiceIcons[field]?.[option.value];
          const compact = field === 'concerns';
          const columns = compact
            ? 1
            : field === 'gender' && groupColumns
              ? 4
              : twoColumns || (field === 'gender' && formWidth >= 320)
                ? 2
                : 1;
          return (
            <Pressable
              key={option.value}
              {...choiceKeyboardProps(toggle, false)}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={toggle}
              style={{
                width:
                  columns > 1
                    ? (formWidth - 10 * (columns - 1)) / columns
                    : '100%',
                flexGrow: 0,
                padding: compact ? 8 : 12,
                minHeight: compact ? 44 : field === 'therapyType' ? 88 : 64,
                borderWidth: 1,
                borderRadius: compact ? 8 : 14,
                borderColor: selected
                  ? theme.primary
                  : compact
                    ? 'transparent'
                    : theme.border,
                backgroundColor: selected
                  ? theme.primaryAlpha12
                  : compact
                    ? 'transparent'
                    : theme.bgCard,
                flexDirection: 'row',
                alignItems: 'center',
                gap: compact ? 8 : 10,
              }}
            >
              {compact ? (
                <Ionicons
                  aria-hidden
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={selected ? theme.primary : theme.textMuted}
                />
              ) : null}
              {icon ? (
                <View
                  aria-hidden
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    width: field === 'gender' ? 24 : 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor:
                      field === 'gender' ? 'transparent' : theme.bgMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={icon}
                    size={field === 'therapyType' ? 25 : 21}
                    color={theme.textPrimary}
                  />
                </View>
              ) : null}
              <Text
                style={{
                  ...text,
                  fontSize: compact || field === 'gender' ? 15 : 16,
                  lineHeight: compact ? 21 : 23,
                  flex: 1,
                }}
              >
                {option.label}
              </Text>
              {!compact ? (
                <Ionicons
                  aria-hidden
                  name={
                    multiple
                      ? selected
                        ? 'checkbox'
                        : 'square-outline'
                      : selected
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                  }
                  size={20}
                  color={selected ? theme.primary : theme.textMuted}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  };
  const field = (key: string, multiple = false) => (
    <View style={{ marginBottom: 12 }}>
      {title(definition?.labels[key] ?? key)}
      {choices(key, multiple)}
    </View>
  );
  const openText = (key: string) => (
    <View style={{ gap: 8, marginTop: 14, marginBottom: 20 }}>
      {title(`${definition?.labels[key] ?? key} · opcional`)}
      <TextInput
        accessibilityLabel={definition?.labels[key] ?? key}
        value={answerText(answers, key)}
        onChangeText={(value) => set(key, value)}
        maxLength={500}
        multiline
        placeholder="Escribe lo que te apetezca compartir…"
        placeholderTextColor={theme.textMuted}
        style={{
          ...text,
          textAlignVertical: 'top',
          minHeight: 104,
          padding: 16,
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
    <View style={{ marginVertical: 14 }}>
      <SearchableProfileSelect
        label={definition?.labels[key] ?? key}
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
        paddingVertical: 12,
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
    <View
      style={{
        flex: 1,
        minHeight: 0,
        maxHeight: height,
        backgroundColor: theme.bg,
      }}
    >
      <LandingHeader
        context="directory"
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
      <View
        style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: theme.bg,
          flexDirection: desktop ? 'row' : 'column',
          marginTop: headerHeight,
        }}
      >
        {desktop ? (
          <ScrollView
            testID="questionnaire-sidebar"
            style={{
              width: '28%',
              maxWidth: 360,
              flexGrow: 0,
              flexShrink: 0,
              backgroundColor: theme.bgMuted,
            }}
            contentContainerStyle={{
              padding: shortDesktop ? 20 : 32,
              flexGrow: 1,
            }}
          >
            <Text
              style={{
                fontFamily: theme.fontDisplay,
                fontSize: shortDesktop ? 26 : 30,
                lineHeight: shortDesktop ? 34 : 39,
                color: theme.textPrimary,
              }}
            >
              Un espacio para empezar a cuidarte.
            </Text>
            <Text style={{ ...muted, lineHeight: 22, marginTop: 12 }}>
              A tu ritmo. Cada respuesta nos ayuda a acercarte a un profesional
              que encaje contigo.
            </Text>
            <View
              style={{
                gap: shortDesktop ? 0 : 2,
                marginTop: shortDesktop ? 16 : 24,
                marginBottom: shortDesktop ? 12 : 20,
              }}
            >
              {definition?.steps.map((item, index) => (
                <Pressable
                  key={item.shortTitle}
                  disabled={index + 1 > step}
                  onPress={() => {
                    setStep(index + 1);
                    setError('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Ir al paso ${index + 1}: ${item.shortTitle}`}
                  accessibilityState={{
                    disabled: index + 1 > step,
                    selected: index + 1 === step,
                  }}
                  style={{
                    minHeight: shortDesktop ? 34 : 36,
                    paddingVertical: 5,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 10,
                    backgroundColor:
                      index + 1 === step ? theme.primaryAlpha12 : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      ...muted,
                      fontSize: 14,
                      lineHeight: 22,
                      color:
                        index + 1 === step ? theme.primary : theme.textMuted,
                    }}
                  >
                    {index + 1 < step
                      ? '✓'
                      : String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text
                    style={{
                      ...muted,
                      fontSize: 14,
                      lineHeight: 22,
                      flex: 1,
                      color:
                        index + 1 === step
                          ? theme.primary
                          : theme.textSecondary,
                    }}
                  >
                    {item.shortTitle}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Image
              testID="questionnaire-sidebar-art"
              source={require('../../../assets/questionnaire/still-life-desktop.webp')}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                width: '100%',
                height: shortDesktop ? 132 : 200,
                marginTop: 'auto',
                borderRadius: 16,
              }}
              resizeMode="cover"
            />
          </ScrollView>
        ) : null}
        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <ScrollView
            testID="questionnaire-form-scroll"
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: width < 600 ? 20 : 32,
              paddingTop: width < 600 ? 24 : 28,
              paddingBottom: 24,
              alignItems: 'center',
              flexGrow: 1,
            }}
          >
            <View
              onLayout={(event) => setFormWidth(event.nativeEvent.layout.width)}
              style={{ width: '100%', maxWidth: 880, gap: 12 }}
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
                  Tu cuestionario
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
                    height: 4,
                    backgroundColor: theme.border,
                    borderRadius: 2,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: `${(step / 8) * 100}%`,
                      height: 4,
                      backgroundColor: theme.primary,
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
                  fontSize: width < 600 ? 28 : 34,
                  lineHeight: width < 600 ? 36 : 44,
                  color: theme.textPrimary,
                  marginBottom: 12,
                }}
              >
                {step === 0
                  ? 'Encontrar ayuda empieza por escucharte.'
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
                      {!desktop ? (
                        <Image
                          source={require('../../../assets/questionnaire/still-life-mobile.webp')}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          style={{
                            width: '100%',
                            height: 150,
                            borderRadius: 16,
                          }}
                          resizeMode="cover"
                        />
                      ) : null}
                      <Text style={text}>
                        Cuéntanos qué necesitas. Te mostraremos profesionales
                        compatibles y los motivos del encaje, para que puedas
                        elegir con calma.
                      </Text>
                      <Text style={muted}>
                        No es una evaluación clínica ni un diagnóstico. Los
                        campos abiertos son opcionales.
                      </Text>
                      {!user ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 10,
                            alignItems: 'flex-start',
                          }}
                        >
                          <Ionicons
                            aria-hidden
                            name="person-circle-outline"
                            size={22}
                            color={theme.primary}
                          />
                          <Text style={{ ...muted, flex: 1 }}>
                            Al terminar, necesitarás crear una cuenta gratuita o
                            iniciar sesión para guardar tus respuestas y ver los
                            profesionales recomendados.
                          </Text>
                        </View>
                      ) : null}
                      <View
                        style={{
                          padding: 22,
                          borderRadius: 16,
                          backgroundColor: theme.bgMuted,
                          marginVertical: 12,
                        }}
                      >
                        <Text style={muted}>{definition.notice}</Text>
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
                      <Text style={muted}>
                        Antes de guardar, el borrador solo permanece en esta
                        pestaña. Si recargas o la cierras, se perderá.
                      </Text>
                    </>
                  ) : null}
                  {step > 0 &&
                  !!answers.therapyType &&
                  answers.therapyType !== 'individual' ? (
                    <Text
                      style={{
                        ...muted,
                        backgroundColor: theme.bgMuted,
                        padding: 16,
                        borderRadius: 12,
                      }}
                    >
                      {assisted
                        ? 'Responde como adulto sobre la atención que buscas. El inicio será asistido para comprobar destinatario, representación y consentimientos.'
                        : 'Responde desde tu perspectiva como participante. Esta información quedará guardada como contexto para el profesional.'}{' '}
                      No incluyas nombres ni datos identificativos de otras
                      personas.
                    </Text>
                  ) : null}
                  {step === 1 ? (
                    <>
                      {choices('therapyType')}
                      <Text style={muted}>
                        Guardamos el tipo de terapia y las edades como contexto
                        para la atención. Por ahora no se utilizan para filtrar
                        ni ordenar las recomendaciones.
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
                      <Text style={muted}>
                        Puedes elegir ambas modalidades.
                      </Text>
                      {answerList(answers, 'modalities').includes(
                        'in-person',
                      ) ? (
                        <AddressAutocomplete
                          localityOnly
                          onTextChange={(value) => set('city', value)}
                          label="Ciudad para las sesiones presenciales"
                          placeholder="Busca tu localidad"
                          value={answerText(answers, 'city')}
                          onAddressSelect={(location) =>
                            set('city', location.city)
                          }
                        />
                      ) : null}
                      {select('languages', true)}
                    </>
                  ) : null}
                  {step === 3 ? (
                    <>
                      {field('budget')}
                      {field('start')}
                    </>
                  ) : null}
                  {step === 4 ? (
                    <>
                      <Text accessibilityLiveRegion="polite" style={muted}>
                        {answerList(answers, 'concerns').length} de 3 áreas
                        seleccionadas. Elige entre una y tres para centrarnos en
                        lo más importante. No necesitas tener un diagnóstico.
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 16,
                          alignItems: 'flex-start',
                        }}
                      >
                        {definition.groups.map(([id, label]) => (
                          <View
                            key={id}
                            style={{
                              width: groupColumns ? '48.5%' : '100%',
                              borderTopWidth: 1,
                              borderTopColor: theme.border,
                              paddingTop: 12,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                gap: 10,
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
                      </View>
                      {openText('concernsNote')}
                    </>
                  ) : null}
                  {step === 5 ? (
                    <>
                      {field('workingStyles', true)}
                      {field('goals', true)}
                    </>
                  ) : null}
                  {step === 6 ? (
                    <>
                      {field('previousTherapy')}
                      {answers.previousTherapy &&
                      answers.previousTherapy !== 'first' ? (
                        <>
                          {openText('previousPositive')}
                          {openText('previousImprovement')}
                        </>
                      ) : null}
                    </>
                  ) : null}
                  {step === 7 ? (
                    <>
                      <Text style={muted}>
                        Todas estas preferencias son opcionales. Puedes
                        continuar sin responder.
                      </Text>
                      {field('gender')}
                      {field('contexts', true)}
                      {answerList(answers, 'contexts').includes('religion')
                        ? select('religion')
                        : null}
                      {answerList(answers, 'contexts').includes(
                        'discrimination',
                      )
                        ? field('discrimination', true)
                        : null}
                      {openText('contextNote')}
                    </>
                  ) : null}
                  {step === 8 ? (
                    <>
                      {openText('additionalNote')}
                      <Text style={muted}>
                        Puedes revisar cualquier sección antes de guardar. Los
                        textos abiertos se conservarán como contexto para el
                        profesional; no se utilizan para ordenar
                        recomendaciones.
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        {definition.steps.map((item, index) => (
                          <Button
                            key={item.shortTitle}
                            size="small"
                            variant="outline"
                            onPress={() => setStep(index + 1)}
                          >
                            {index + 1}. {item.shortTitle}
                          </Button>
                        ))}
                      </View>
                      {!user ? (
                        <Text style={muted}>
                          Para guardar y ver los resultados, crea tu cuenta o
                          inicia sesión.
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>
          <View
            testID="questionnaire-navigation"
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.bg,
              paddingHorizontal: width < 600 ? 16 : 32,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <View style={{ width: '100%', maxWidth: 880 }}>
              {!!error && (
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
                      variant="outline"
                      onPress={() => {
                        setStep(step - 1);
                        setError('');
                      }}
                    >
                      Anterior
                    </Button>
                  ) : null}
                  <Button
                    style={step === 0 ? { marginLeft: 'auto' } : undefined}
                    onPress={() => advance()}
                  >
                    {step === 8
                      ? user
                        ? 'Guardar y ver resultados'
                        : 'Crear cuenta gratuita'
                      : step === 0
                        ? 'Comenzar'
                        : 'Continuar'}
                  </Button>
                  {step === 8 && !user ? (
                    <Button variant="ghost" onPress={() => advance('Login')}>
                      Ya tengo cuenta
                    </Button>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
