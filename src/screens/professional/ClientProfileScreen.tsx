import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  borderRadius,
  shadows,
  spacing,
  typography,
} from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { BrandText } from '../../components/common/BrandText';
import { useTheme } from '../../contexts/ThemeContext';
import * as professionalService from '../../services/professionalService';
import { questionnaire, categoryLabels } from '../../utils/questionnaireData';

interface QuestionnaireAnswer {
  questionId: string;
  answers: string[];
}

interface QuestionnaireDisplayItem {
  category: string;
  question: string;
  answers: string[];
}

interface TherapyPreferences {
  concerns?: string[];
  approach?: string;
  sessionStyle?: string;
  modality?: string;
  availability?: string;
  budget?: string;
  frequency?: string;
}

interface SessionStats {
  total: number;
  completed: number;
  nextSession: professionalService.Session | null;
}

interface ClientProfileScreenProps {
  route?: AppRouteProp<'ClientProfile'>;
  navigation?: AppNavigationProp;
}

export function ClientProfileScreen(props: ClientProfileScreenProps) {
  const navigationFromHook = useNavigation<AppNavigationProp>();
  const routeFromHook = useRoute<AppRouteProp<'ClientProfile'>>();
  const navigation = props.navigation ?? navigationFromHook;
  const route = props.route ?? routeFromHook;
  const { clientId } = route.params;
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const isDesktop = width >= 1100;
  const isTablet = width >= 768 && width < 1100;

  const [client, setClient] = useState<professionalService.Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClientProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await professionalService.getProfessionalClientDetail(clientId);

      if (!data) {
        setError('No se encontró el cliente');
        return;
      }

      setClient(data);
    } catch (loadError) {
      console.error('Error loading client profile:', loadError);
      setError('No se pudo cargar el perfil del cliente');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClientProfile();
  }, [loadClientProfile]);

  const getClientAge = useCallback((birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, []);

  const getClientSince = useCallback((createdAt?: string) => {
    if (!createdAt) return '-';
    return new Date(createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, []);

  const getMonthsSince = useCallback((createdAt?: string) => {
    if (!createdAt) return 0;
    const start = new Date(createdAt);
    const now = new Date();
    return Math.max(
      0,
      Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );
  }, []);

  const formatFullDate = useCallback((dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const getQuestionnaireDisplay = useCallback(
    (answers?: unknown): QuestionnaireDisplayItem[] | null => {
      if (!answers || !Array.isArray(answers) || answers.length === 0) return null;

      const displayData: QuestionnaireDisplayItem[] = [];

      answers.forEach((answer) => {
        const safeAnswer = answer as Partial<QuestionnaireAnswer>;
        if (!safeAnswer?.questionId || !Array.isArray(safeAnswer.answers)) return;

        const question = questionnaire.find((item) => item.id === safeAnswer.questionId);
        if (!question || safeAnswer.answers.length === 0) return;

        const answerTexts = safeAnswer.answers.map((value) => {
          const option = question.options.find((item) => item.value === value || item.id === value);
          return option ? (option.emoji ? `${option.emoji} ${option.text}` : option.text) : value;
        });

        displayData.push({
          category: categoryLabels[question.category] || question.category,
          question: question.text,
          answers: answerTexts,
        });
      });

      return displayData;
    },
    [],
  );

  const getTherapyPreferences = useCallback((answers?: unknown): TherapyPreferences | null => {
    if (!answers || !Array.isArray(answers) || answers.length === 0) return null;

    const preferences: TherapyPreferences = {};

    answers.forEach((answer) => {
      const safeAnswer = answer as Partial<QuestionnaireAnswer>;
      if (!safeAnswer?.questionId || !Array.isArray(safeAnswer.answers) || safeAnswer.answers.length === 0) {
        return;
      }

      const question = questionnaire.find((item) => item.id === safeAnswer.questionId);
      if (!question) return;

      const getAnswerText = (value: string) => {
        const option = question.options.find((item) => item.value === value || item.id === value);
        return option?.text || value;
      };

      switch (question.category) {
        case 'specialties':
          preferences.concerns = safeAnswer.answers.map(getAnswerText);
          break;
        case 'approach':
          preferences.approach = getAnswerText(safeAnswer.answers[0]);
          break;
        case 'style':
          preferences.sessionStyle = getAnswerText(safeAnswer.answers[0]);
          break;
        case 'format':
          preferences.modality = getAnswerText(safeAnswer.answers[0]);
          break;
        case 'availability':
          preferences.availability = getAnswerText(safeAnswer.answers[0]);
          break;
        case 'budget':
          preferences.budget = getAnswerText(safeAnswer.answers[0]);
          break;
        case 'frequency':
          preferences.frequency = getAnswerText(safeAnswer.answers[0]);
          break;
      }
    });

    return preferences;
  }, []);

  const getSessionStats = useCallback((sessions?: professionalService.Session[]): SessionStats => {
    if (!sessions?.length) {
      return { total: 0, completed: 0, nextSession: null };
    }

    const completed = sessions.filter(
      (session) => session.status === 'COMPLETED' || session.status === 'completed',
    ).length;

    const nextSession =
      sessions
        .filter((session) => {
          const isUpcoming = new Date(session.date) > new Date();
          const isBookableStatus =
            session.status === 'CONFIRMED' ||
            session.status === 'confirmed' ||
            session.status === 'scheduled' ||
            session.status === 'PENDING';
          return isUpcoming && isBookableStatus;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;

    return {
      total: sessions.length,
      completed,
      nextSession,
    };
  }, []);

  const handleSendEmail = useCallback(async () => {
    if (!client?.user.email) return;
    await Linking.openURL(`mailto:${client.user.email}`);
  }, [client]);

  const handleCall = useCallback(async () => {
    if (!client?.user.phone) return;
    await Linking.openURL(`tel:${client.user.phone}`);
  }, [client]);

  const handleScheduleSession = useCallback(() => {
    navigation.navigate('ProfessionalAvailability');
  }, [navigation]);

  const age = getClientAge(client?.user.birthDate);
  const clientSince = getClientSince(client?.createdAt);
  const monthsSince = getMonthsSince(client?.createdAt);
  const questionnaireData = getQuestionnaireDisplay(client?.questionnaireAnswers);
  const preferences = getTherapyPreferences(client?.questionnaireAnswers);
  const sessionStats = getSessionStats(client?.sessions);
  const initials = (client?.user.name || 'U')
    .split(' ')
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Cargando perfil del cliente...</Text>
      </View>
    );
  }

  if (error || !client) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconCircle}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.warning} />
        </View>
        <Text style={styles.errorTitle}>No se pudo cargar el perfil</Text>
        <Text style={styles.errorMessage}>{error || 'Cliente no encontrado'}</Text>
        <Button variant="secondary" size="medium" onPress={() => navigation.goBack()}>
          Volver
        </Button>
      </View>
    );
  }

  const summaryCard = (
    <Card variant="default" padding="large" style={styles.sidebarCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="stats-chart-outline" size={20} color={theme.primary} />
        <Text style={styles.sectionTitle}>Resumen</Text>
      </View>

      <View style={styles.summaryList}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Cliente desde</Text>
          <Text style={styles.summaryValue}>{clientSince}</Text>
          <Text style={styles.summaryMeta}>({monthsSince} meses)</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryGrid}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryLabel}>Total sesiones</Text>
            <Text style={styles.summaryValue}>{sessionStats.total}</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryLabel}>Completadas</Text>
            <Text style={styles.summaryValue}>{sessionStats.completed}</Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Estado</Text>
          <View style={styles.summaryStatusRow}>
            <View style={styles.summaryStatusDot} />
            <Text style={[styles.summaryValue, styles.summaryValueSuccess]}>Activo</Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const nextSessionCard = (
    <Card variant="default" padding="large" style={styles.sidebarCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar-outline" size={20} color={theme.primary} />
        <Text style={styles.sectionTitle}>Próxima sesión</Text>
      </View>

      {sessionStats.nextSession ? (
        <View style={styles.nextSessionBlock}>
          <Text style={styles.nextSessionDate}>
            {new Date(sessionStats.nextSession.date).toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
          <Text style={styles.nextSessionTime}>
            {new Date(sessionStats.nextSession.date).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text style={styles.nextSessionType}>
            {sessionStats.nextSession.type === 'VIDEO' ? 'Videollamada' : 'Sesión programada'}
          </Text>
        </View>
      ) : (
        <View style={styles.nextSessionEmpty}>
          <Text style={styles.nextSessionEmptyText}>No programada</Text>
        </View>
      )}

      <Button
        variant="primary"
        size="large"
        onPress={handleScheduleSession}
        fullWidth
        icon={<Ionicons name="add" size={18} color={theme.textOnPrimary} />}
      >
        Agendar sesión
      </Button>
    </Card>
  );

  const mainContent = (
    <>
      <Card variant="default" padding="large" style={styles.heroCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            {client.user.avatar ? (
              <Image source={{ uri: client.user.avatar }} style={styles.avatarLargeImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
            <View style={styles.statusDotLarge} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.clientName}>{client.user.name}</Text>
            {age ? <Text style={styles.clientAge}>{age} años</Text> : null}
            <View style={styles.clientMetaRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
              <Text style={styles.clientMeta}>Cliente desde {clientSince}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusBadgeDot} />
              <Text style={styles.statusBadgeText}>Activo</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card variant="default" padding="large" style={styles.mainCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mail-outline" size={20} color={theme.primary} />
          <Text style={styles.sectionTitle}>Información de contacto</Text>
        </View>

        <View style={styles.contactList}>
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={18} color={theme.textSecondary} />
            <Text style={styles.contactText}>{client.user.email}</Text>
          </View>
          {client.user.phone ? (
            <View style={styles.contactItem}>
              <Ionicons name="call" size={18} color={theme.textSecondary} />
              <Text style={styles.contactText}>{client.user.phone}</Text>
            </View>
          ) : null}
          {client.user.occupation ? (
            <View style={styles.contactItem}>
              <Ionicons name="briefcase-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.contactText}>{client.user.occupation}</Text>
            </View>
          ) : null}
          {client.user.birthDate ? (
            <View style={styles.contactItem}>
              <Ionicons name="gift-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.contactText}>{formatFullDate(client.user.birthDate)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.contactActions}>
          <View style={styles.inlineAction}>
            <Button variant="outline" size="medium" onPress={handleSendEmail}>
              Enviar email
            </Button>
          </View>
          {client.user.phone ? (
            <View style={styles.inlineAction}>
              <Button variant="ghost" size="medium" onPress={handleCall}>
                Llamar
              </Button>
            </View>
          ) : null}
        </View>
      </Card>

      {preferences?.concerns?.length ? (
        <Card variant="default" padding="large" style={styles.mainCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flag-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Motivo de consulta</Text>
          </View>

          <Text style={styles.sectionDescription}>
            {(client.user.name || 'El cliente').split(' ')[0]} busca ayuda con:
          </Text>

          <View style={styles.tagsRow}>
            {preferences.concerns.map((concern) => (
              <View key={concern} style={styles.tag}>
                <Text style={styles.tagText}>{concern}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {preferences?.approach || preferences?.modality || preferences?.availability ? (
        <Card variant="default" padding="large" style={styles.mainCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Preferencias terapéuticas</Text>
          </View>

          <View style={styles.preferenceGrid}>
            {preferences.approach ? (
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Enfoque</Text>
                <Text style={styles.preferenceValue}>{preferences.approach}</Text>
              </View>
            ) : null}
            {preferences.modality ? (
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Modalidad</Text>
                <Text style={styles.preferenceValue}>{preferences.modality}</Text>
              </View>
            ) : null}
            {preferences.availability ? (
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Disponibilidad</Text>
                <Text style={styles.preferenceValue}>{preferences.availability}</Text>
              </View>
            ) : null}
            {preferences.frequency ? (
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Frecuencia</Text>
                <Text style={styles.preferenceValue}>{preferences.frequency}</Text>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      {questionnaireData?.length ? (
        <Card variant="default" padding="large" style={styles.mainCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Respuestas del cuestionario</Text>
          </View>

          <View style={styles.questionnaireList}>
            {questionnaireData.slice(0, 8).map((item) => (
              <View key={`${item.category}-${item.question}`} style={styles.questionnaireItem}>
                <Text style={styles.questionCategory}>{item.category}</Text>
                <Text style={styles.questionText}>{item.question}</Text>
                <View style={styles.answerList}>
                  {item.answers.map((answer) => (
                    <Text key={answer} style={styles.answerText}>{answer}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : (
        <Card variant="default" padding="large" style={styles.mainCard}>
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>Cuestionario no completado</Text>
            <Text style={styles.emptyDescription}>
              Este cliente todavía no tiene respuestas registradas en el cuestionario inicial.
            </Text>
          </View>
        </Card>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <AnimatedPressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hoverLift={false}
          pressScale={0.98}
        >
          <Ionicons name="arrow-back" size={20} color={theme.textSecondary} />
          <Text style={styles.backButtonText}>Volver a pacientes</Text>
        </AnimatedPressable>

        {isDesktop || isTablet ? (
          <View style={styles.desktopLayout}>
            <View style={styles.mainColumn}>{mainContent}</View>
            <View style={styles.sidebarColumn}>
              {summaryCard}
              {nextSessionCard}
              <Card variant="default" padding="large" style={styles.sidebarCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbubbles-outline" size={20} color={theme.primary} />
                  <Text style={styles.sectionTitle}>Contacto</Text>
                </View>
                <View style={styles.sidebarActions}>
                  <View style={styles.sidebarActionWrap}>
                    <Button variant="outline" size="medium" onPress={handleSendEmail} fullWidth>
                      Enviar email
                    </Button>
                  </View>
                  {client.user.phone ? (
                    <View style={styles.sidebarActionWrap}>
                      <Button variant="ghost" size="medium" onPress={handleCall} fullWidth>
                        Llamar
                      </Button>
                    </View>
                  ) : null}
                </View>
              </Card>
            </View>
          </View>
        ) : (
          <View style={styles.mobileStack}>
            {mainContent}
            {summaryCard}
            {nextSessionCard}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      maxWidth: 1280,
      width: '100%',
      alignSelf: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.bg,
      gap: spacing.md,
    },
    loadingText: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      gap: spacing.md,
      backgroundColor: theme.bg,
    },
    errorIconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.warningBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorTitle: {
      fontSize: typography.fontSizes.xl,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    errorMessage: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      textAlign: 'center',
      maxWidth: 420,
      fontFamily: theme.fontSans,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      alignSelf: 'flex-start',
      paddingVertical: spacing.xs,
    },
    backButtonText: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
    },
    desktopLayout: {
      flexDirection: 'row',
      gap: spacing.lg,
      alignItems: 'flex-start',
    },
    mainColumn: {
      flex: 1.85,
      gap: spacing.lg,
    },
    sidebarColumn: {
      flex: 1,
      gap: spacing.lg,
    },
    mobileStack: {
      gap: spacing.lg,
    },
    heroCard: {
      borderRadius: borderRadius.xl,
    },
    mainCard: {
      borderRadius: borderRadius.xl,
    },
    sidebarCard: {
      borderRadius: borderRadius.xl,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    avatarLarge: {
      width: 148,
      height: 148,
      borderRadius: 74,
      backgroundColor: theme.primaryAlpha12,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatarLargeImage: {
      width: 148,
      height: 148,
      borderRadius: 74,
    },
    avatarInitials: {
      fontSize: 56,
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    statusDotLarge: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.success,
      borderWidth: 3,
      borderColor: theme.bgCard,
    },
    profileInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    clientName: {
      fontSize: 32,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    clientAge: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    clientMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    clientMeta: {
      fontSize: typography.fontSizes.md,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryMuted,
    },
    statusBadgeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.success,
    },
    statusBadgeText: {
      fontSize: typography.fontSizes.sm,
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.fontSizes.xl,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    sectionDescription: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      marginBottom: spacing.md,
      fontFamily: theme.fontSans,
    },
    contactList: {
      gap: spacing.md,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    contactText: {
      flex: 1,
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
    },
    contactActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    inlineAction: {
      minWidth: 140,
    },
    summaryList: {
      gap: spacing.md,
    },
    summaryItem: {
      gap: 4,
    },
    summaryDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    summaryLabel: {
      fontSize: typography.fontSizes.sm,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    summaryValue: {
      fontSize: typography.fontSizes.xl,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    summaryMeta: {
      fontSize: typography.fontSizes.sm,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    summaryGrid: {
      flexDirection: 'row',
      gap: spacing.lg,
    },
    summaryMetric: {
      flex: 1,
      gap: 4,
    },
    summaryStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    summaryStatusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.success,
    },
    summaryValueSuccess: {
      color: theme.success,
    },
    nextSessionBlock: {
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    nextSessionDate: {
      fontSize: typography.fontSizes.lg,
      color: theme.textPrimary,
      textTransform: 'capitalize',
      fontFamily: theme.fontSansSemiBold,
    },
    nextSessionTime: {
      fontSize: typography.fontSizes.md,
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    nextSessionType: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    nextSessionEmpty: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    nextSessionEmptyText: {
      fontSize: typography.fontSizes.lg,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    sidebarActions: {
      gap: spacing.sm,
    },
    sidebarActionWrap: {
      width: '100%',
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tag: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: borderRadius.full,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    tagText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
    },
    preferenceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    preferenceItem: {
      minWidth: 220,
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
      gap: 6,
    },
    preferenceLabel: {
      fontSize: typography.fontSizes.sm,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    preferenceValue: {
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    questionnaireList: {
      gap: spacing.md,
    },
    questionnaireItem: {
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: spacing.xs,
    },
    questionCategory: {
      fontSize: typography.fontSizes.xs,
      color: theme.primary,
      textTransform: 'uppercase',
      fontFamily: theme.fontSansSemiBold,
    },
    questionText: {
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    answerList: {
      gap: 4,
    },
    answerText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    emptyTitle: {
      fontSize: typography.fontSizes.lg,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    emptyDescription: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      textAlign: 'center',
      maxWidth: 420,
      fontFamily: theme.fontSans,
    },
  });
}
