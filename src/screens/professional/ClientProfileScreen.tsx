/**
 * ClientProfileScreen - HERA Redesign
 * Professional view of client profile - beautifully organized client information
 *
 * DESIGN PHILOSOPHY:
 * - This is the client's 'about me' from the specialist's perspective
 * - Their preferences, concerns, and what they're looking for
 * - As polished as specialist profiles are for clients
 *
 * FEATURES:
 * - Two-column layout (desktop) / Single column (mobile)
 * - Client information and contact details
 * - Questionnaire responses beautifully displayed
 * - Therapy preferences and concerns
 * - Quick actions for scheduling and messaging
 * - HERA design system with #F5F7F5 background
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { questionnaire, categoryLabels } from '../../utils/questionnaireData';
import { heraLanding } from '../../constants/colors';

// ============================================================================
// TYPES
// ============================================================================
interface ClientProfileScreenProps {
  route: any;
  navigation: any;
}

interface QuestionnaireAnswer {
  questionId: string;
  answers: string[];
}

interface ClientData {
  id: string;
  userId: string;
  completedQuestionnaire: boolean;
  questionnaireAnswers: QuestionnaireAnswer[] | Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    birthDate?: string;
    gender?: string;
    occupation?: string;
    avatar?: string;
    createdAt: string;
  };
  sessions?: SessionData[];
}

interface SessionData {
  id: string;
  date: string;
  duration: number;
  status: string;
  type: string;
  notes?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ClientProfileScreen: React.FC<ClientProfileScreenProps> = ({
  route,
  navigation,
}) => {
  const { clientId } = route?.params || {};
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load client data
  const loadClientProfile = useCallback(async () => {
    if (!clientId) {
      setError('No se proporcionó ID del cliente');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/clients/${clientId}`);

      if (response.data.success && response.data.data) {
        setClient(response.data.data);
      } else {
        setError('No se encontró el cliente');
      }
    } catch (err: any) {
      console.error('Error loading client:', err);
      setError(err.response?.data?.error || 'Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClientProfile();
  }, [loadClientProfile]);

  // Calculate derived data
  const getClientAge = (birthDate?: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getClientSince = (createdAt: string): string => {
    const date = new Date(createdAt);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const getMonthsSince = (createdAt: string): number => {
    const start = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get questionnaire answer text
  const getQuestionnaireDisplay = (answers: QuestionnaireAnswer[] | null | Record<string, unknown>) => {
    // Validate answers is actually an array
    if (!answers || !Array.isArray(answers) || answers.length === 0) return null;

    const displayData: { category: string; question: string; answers: string[] }[] = [];

    answers.forEach((answer) => {
      if (!answer || typeof answer !== 'object') return;

      const question = questionnaire.find(q => q.id === answer.questionId);
      const answerValues = Array.isArray(answer.answers) ? answer.answers : [];

      if (question && answerValues.length > 0) {
        const answerTexts = answerValues.map(ansValue => {
          if (typeof ansValue !== 'string') return String(ansValue);
          const option = question.options.find(o => o.value === ansValue || o.id === ansValue);
          return option ? (option.emoji ? `${option.emoji} ${option.text}` : option.text) : ansValue;
        });

        displayData.push({
          category: categoryLabels[question.category] || question.category,
          question: question.text,
          answers: answerTexts,
        });
      }
    });

    return displayData;
  };

  // Extract specific preferences from questionnaire
  const getTherapyPreferences = (answers: QuestionnaireAnswer[] | null | Record<string, unknown>) => {
    // Validate answers is actually an array
    if (!answers || !Array.isArray(answers) || answers.length === 0) return null;

    const prefs: {
      concerns?: string[];
      approach?: string;
      sessionStyle?: string;
      modality?: string;
      availability?: string;
      budget?: string;
      frequency?: string;
    } = {};

    answers.forEach((answer) => {
      if (!answer || typeof answer !== 'object') return;

      const question = questionnaire.find(q => q.id === answer.questionId);
      if (!question) return;

      const answerValues = Array.isArray(answer.answers) ? answer.answers : [];
      if (answerValues.length === 0) return;

      const getAnswerText = (value: unknown) => {
        const strValue = typeof value === 'string' ? value : String(value);
        const opt = question.options.find(o => o.value === strValue || o.id === strValue);
        return opt?.text || strValue;
      };

      switch (question.category) {
        case 'specialties':
          prefs.concerns = answerValues.map(getAnswerText);
          break;
        case 'approach':
          prefs.approach = answerValues.map(getAnswerText)[0];
          break;
        case 'style':
          prefs.sessionStyle = answerValues.map(getAnswerText)[0];
          break;
        case 'format':
          prefs.modality = answerValues.map(getAnswerText)[0];
          break;
        case 'availability':
          prefs.availability = answerValues.map(getAnswerText)[0];
          break;
        case 'budget':
          prefs.budget = answerValues.map(getAnswerText)[0];
          break;
        case 'frequency':
          prefs.frequency = answerValues.map(getAnswerText)[0];
          break;
      }
    });

    return prefs;
  };

  // Calculate session stats
  const getSessionStats = (sessions?: SessionData[]) => {
    if (!sessions || sessions.length === 0) {
      return { total: 0, completed: 0, nextSession: null };
    }

    const completed = sessions.filter(s =>
      s.status === 'COMPLETED' || s.status === 'completed'
    ).length;

    const upcoming = sessions
      .filter(s =>
        (s.status === 'CONFIRMED' || s.status === 'confirmed' || s.status === 'scheduled') &&
        new Date(s.date) > new Date()
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      total: sessions.length,
      completed,
      nextSession: upcoming[0] || null,
    };
  };

  // Handlers
  const handleScheduleSession = () => {
    navigation.navigate('ProfessionalAvailability', { clientId });
  };

  const handleSendMessage = () => {
    // TODO: Navigate to messaging screen
    console.log('Send message to client:', clientId);
  };

  const handleSendEmail = () => {
    if (client?.user.email) {
      // In web, we'd use window.open
      // For React Native, we'd use Linking
      console.log('Send email to:', client.user.email);
    }
  };

  const handleCall = () => {
    if (client?.user.phone) {
      console.log('Call:', client.user.phone);
    }
  };

  const handleViewHistory = () => {
    // Navigate to session history
    console.log('View history for:', clientId);
  };

  const handleViewNotes = () => {
    // Navigate to notes
    console.log('View notes for:', clientId);
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Cargando perfil del cliente...</Text>
      </View>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error || !client) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconCircle}>
          <Ionicons name="alert-circle-outline" size={48} color={heraLanding.warning} />
        </View>
        <Text style={styles.errorTitle}>No se pudo cargar el perfil</Text>
        <Text style={styles.errorMessage}>{error || 'Cliente no encontrado'}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================================================
  // DERIVED DATA
  // ============================================================================
  const age = getClientAge(client.user.birthDate);
  const clientSince = getClientSince(client.createdAt);
  const monthsSince = getMonthsSince(client.createdAt);
  const questionnaireData = getQuestionnaireDisplay(client.questionnaireAnswers);
  const preferences = getTherapyPreferences(client.questionnaireAnswers);
  const sessionStats = getSessionStats(client.sessions);
  const initials = (client.user.name || 'U')
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // ============================================================================
  // RENDER - DESKTOP/TABLET TWO-COLUMN LAYOUT
  // ============================================================================
  if (isDesktop || isTablet) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.desktopContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={heraLanding.textSecondary} />
            <Text style={styles.backButtonText}>Volver a clientes</Text>
          </TouchableOpacity>

          <View style={styles.desktopLayout}>
            {/* LEFT COLUMN - Main Profile (65%) */}
            <View style={[styles.mainColumn, isTablet && styles.mainColumnTablet]}>
              {/* Profile Header Card */}
              <View style={styles.card}>
                <View style={styles.profileHeader}>
                  {/* Avatar */}
                  <View style={styles.avatarLarge}>
                    {client.user.avatar ? (
                      <Image
                        source={{ uri: client.user.avatar }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    )}
                    {/* Status indicator */}
                    <View style={styles.statusDot} />
                  </View>

                  {/* Name and Info */}
                  <View style={styles.profileInfo}>
                    <Text style={styles.clientName}>{client.user.name}</Text>
                    {age && (
                      <Text style={styles.clientAge}>{age} años</Text>
                    )}
                    <View style={styles.clientMetaRow}>
                      <Ionicons name="calendar-outline" size={14} color={heraLanding.textMuted} />
                      <Text style={styles.clientMeta}>
                        Cliente desde {clientSince}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusBadgeDot} />
                      <Text style={styles.statusBadgeText}>Activo</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Contact Information Card */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="mail-outline" size={20} color={heraLanding.primary} />
                  <Text style={styles.sectionTitle}>Información de contacto</Text>
                </View>

                <View style={styles.contactList}>
                  <View style={styles.contactItem}>
                    <Ionicons name="mail" size={18} color={heraLanding.textSecondary} />
                    <Text style={styles.contactText}>{client.user.email}</Text>
                  </View>

                  {client.user.phone && (
                    <View style={styles.contactItem}>
                      <Ionicons name="call" size={18} color={heraLanding.textSecondary} />
                      <Text style={styles.contactText}>{client.user.phone}</Text>
                    </View>
                  )}

                  {client.user.birthDate && (
                    <View style={styles.contactItem}>
                      <Ionicons name="gift" size={18} color={heraLanding.textSecondary} />
                      <Text style={styles.contactText}>
                        {formatDate(client.user.birthDate)}
                      </Text>
                    </View>
                  )}

                  {client.user.occupation && (
                    <View style={styles.contactItem}>
                      <Ionicons name="briefcase" size={18} color={heraLanding.textSecondary} />
                      <Text style={styles.contactText}>{client.user.occupation}</Text>
                    </View>
                  )}
                </View>

                {/* Contact Actions */}
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.contactActionButton}
                    onPress={handleSendEmail}
                  >
                    <Text style={styles.contactActionText}>Enviar email</Text>
                  </TouchableOpacity>
                  {client.user.phone && (
                    <TouchableOpacity
                      style={styles.contactActionButton}
                      onPress={handleCall}
                    >
                      <Text style={styles.contactActionText}>Llamar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Motivo de Consulta Card */}
              {preferences?.concerns && Array.isArray(preferences.concerns) && preferences.concerns.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="flag-outline" size={20} color={heraLanding.primary} />
                    <Text style={styles.sectionTitle}>Motivo de consulta</Text>
                  </View>

                  <Text style={styles.sectionDescription}>
                    {(client.user.name || 'El cliente').split(' ')[0] || 'El cliente'} busca ayuda con:
                  </Text>

                  <View style={styles.concernsList}>
                    {Array.isArray(preferences.concerns) && preferences.concerns.map((concern, index) => (
                      <View key={index} style={styles.concernItem}>
                        <View style={styles.concernDot} />
                        <Text style={styles.concernText}>{concern || ''}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.tagsRow}>
                    {Array.isArray(preferences.concerns) && preferences.concerns.slice(0, 4).map((concern, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{concern || ''}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Preferencias de Terapia Card */}
              {(preferences?.approach || preferences?.modality || preferences?.availability) && (
                <View style={styles.card}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="options-outline" size={20} color={heraLanding.primary} />
                    <Text style={styles.sectionTitle}>Preferencias de terapia</Text>
                  </View>

                  <View style={styles.preferencesList}>
                    {preferences.approach && (
                      <View style={styles.preferenceItem}>
                        <Text style={styles.preferenceLabel}>Tipo de terapia</Text>
                        <View style={styles.preferenceValueRow}>
                          <Ionicons name="bulb-outline" size={16} color={heraLanding.primary} />
                          <Text style={styles.preferenceValue}>{preferences.approach}</Text>
                        </View>
                      </View>
                    )}

                    {preferences.modality && (
                      <View style={styles.preferenceItem}>
                        <Text style={styles.preferenceLabel}>Modalidad preferida</Text>
                        <View style={styles.preferenceValueRow}>
                          <Ionicons
                            name={preferences.modality.toLowerCase().includes('video') ? 'videocam-outline' : 'business-outline'}
                            size={16}
                            color={heraLanding.primary}
                          />
                          <Text style={styles.preferenceValue}>{preferences.modality}</Text>
                        </View>
                      </View>
                    )}

                    {preferences.availability && (
                      <View style={styles.preferenceItem}>
                        <Text style={styles.preferenceLabel}>Disponibilidad</Text>
                        <View style={styles.preferenceValueRow}>
                          <Ionicons name="time-outline" size={16} color={heraLanding.primary} />
                          <Text style={styles.preferenceValue}>{preferences.availability}</Text>
                        </View>
                      </View>
                    )}

                    {preferences.budget && (
                      <View style={styles.preferenceItem}>
                        <Text style={styles.preferenceLabel}>Presupuesto</Text>
                        <View style={styles.preferenceValueRow}>
                          <Ionicons name="wallet-outline" size={16} color={heraLanding.primary} />
                          <Text style={styles.preferenceValue}>{preferences.budget}</Text>
                        </View>
                      </View>
                    )}

                    {preferences.frequency && (
                      <View style={styles.preferenceItem}>
                        <Text style={styles.preferenceLabel}>Frecuencia preferida</Text>
                        <View style={styles.preferenceValueRow}>
                          <Ionicons name="calendar-outline" size={16} color={heraLanding.primary} />
                          <Text style={styles.preferenceValue}>{preferences.frequency}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Cuestionario Inicial Card */}
              {questionnaireData && questionnaireData.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={20} color={heraLanding.primary} />
                    <Text style={styles.sectionTitle}>Respuestas del cuestionario</Text>
                  </View>

                  <Text style={styles.questionnaireDate}>
                    Completado el: {formatDate(client.createdAt)}
                  </Text>

                  <View style={styles.questionnaireList}>
                    {questionnaireData.slice(0, 8).map((item, index) => (
                      <View key={index} style={styles.questionnaireItem}>
                        <Text style={styles.questionText}>{item.question || ''}</Text>
                        <View style={styles.answersList}>
                          {Array.isArray(item.answers) && item.answers.map((answer, aIndex) => (
                            <Text key={aIndex} style={styles.answerText}>
                              {answer || ''}
                            </Text>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>

                  {questionnaireData.length > 8 && (
                    <TouchableOpacity style={styles.viewMoreButton}>
                      <Text style={styles.viewMoreText}>
                        Ver cuestionario completo ({questionnaireData.length} respuestas)
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={heraLanding.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Empty Questionnaire State */}
              {!client.completedQuestionnaire && (
                <View style={styles.card}>
                  <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color={heraLanding.textMuted} />
                    <Text style={styles.emptyTitle}>
                      Este cliente no completó el cuestionario inicial
                    </Text>
                    <TouchableOpacity style={styles.emptyAction}>
                      <Text style={styles.emptyActionText}>Enviar cuestionario</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* RIGHT COLUMN - Info Sidebar (35%) */}
            <View style={[styles.sidebarColumn, isTablet && styles.sidebarColumnTablet]}>
              {/* Resumen Card */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="stats-chart-outline" size={20} color={heraLanding.primary} />
                  <Text style={styles.sectionTitle}>Resumen</Text>
                </View>

                <View style={styles.summaryList}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Cliente desde</Text>
                    <Text style={styles.summaryValue}>{clientSince}</Text>
                    <Text style={styles.summaryMeta}>({monthsSince} meses)</Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total sesiones</Text>
                    <Text style={styles.summaryValue}>{sessionStats.total}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Completadas</Text>
                    <Text style={styles.summaryValue}>{sessionStats.completed}</Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Estado</Text>
                    <View style={styles.summaryStatusRow}>
                      <View style={[styles.summaryStatusDot, { backgroundColor: heraLanding.success }]} />
                      <Text style={[styles.summaryValue, { color: heraLanding.success }]}>Activo</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Próxima Sesión Card */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={20} color={heraLanding.primary} />
                  <Text style={styles.sectionTitle}>Próxima sesión</Text>
                </View>

                {sessionStats.nextSession ? (
                  <View style={styles.nextSession}>
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
                    <View style={styles.nextSessionMeta}>
                      <Ionicons
                        name={sessionStats.nextSession.type === 'VIDEO' ? 'videocam-outline' : 'call-outline'}
                        size={14}
                        color={heraLanding.textSecondary}
                      />
                      <Text style={styles.nextSessionType}>
                        {sessionStats.nextSession.type === 'VIDEO' ? 'Videollamada' : 'Llamada'}
                      </Text>
                    </View>

                    <View style={styles.nextSessionActions}>
                      <TouchableOpacity style={styles.nextSessionButton}>
                        <Text style={styles.nextSessionButtonText}>Ver detalles</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.nextSessionButton, styles.nextSessionButtonPrimary]}>
                        <Text style={styles.nextSessionButtonTextPrimary}>Unirse</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noSession}>
                    <Text style={styles.noSessionText}>No programada</Text>
                    <TouchableOpacity
                      style={styles.scheduleButton}
                      onPress={handleScheduleSession}
                    >
                      <Ionicons name="add" size={18} color={heraLanding.textOnPrimary} />
                      <Text style={styles.scheduleButtonText}>Agendar sesión</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Contacto Rápido Card */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbubbles-outline" size={20} color={heraLanding.primary} />
                  <Text style={styles.sectionTitle}>Contacto</Text>
                </View>

                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={handleSendEmail}
                  >
                    <Ionicons name="mail-outline" size={18} color={heraLanding.primary} />
                    <Text style={styles.quickActionText}>Enviar email</Text>
                  </TouchableOpacity>

                  {client.user.phone && (
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={handleCall}
                    >
                      <Ionicons name="call-outline" size={18} color={heraLanding.primary} />
                      <Text style={styles.quickActionText}>Llamar</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={handleSendMessage}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={heraLanding.primary} />
                    <Text style={styles.quickActionText}>Mensaje en app</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Acciones Card */}
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flash-outline" size={20} color={heraLanding.primary} />
                  <Text style={styles.sectionTitle}>Acciones</Text>
                </View>

                <View style={styles.actionsList}>
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleScheduleSession}
                  >
                    <Ionicons name="calendar-outline" size={18} color={heraLanding.textSecondary} />
                    <Text style={styles.actionItemText}>Agendar sesión</Text>
                    <Ionicons name="chevron-forward" size={16} color={heraLanding.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleViewHistory}
                  >
                    <Ionicons name="time-outline" size={18} color={heraLanding.textSecondary} />
                    <Text style={styles.actionItemText}>Ver historial</Text>
                    <Ionicons name="chevron-forward" size={16} color={heraLanding.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleViewNotes}
                  >
                    <Ionicons name="document-text-outline" size={18} color={heraLanding.textSecondary} />
                    <Text style={styles.actionItemText}>Ver notas</Text>
                    <Ionicons name="chevron-forward" size={16} color={heraLanding.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ============================================================================
  // RENDER - MOBILE SINGLE-COLUMN LAYOUT
  // ============================================================================
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.mobileContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Mobile Header */}
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            style={styles.mobileBackButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={heraLanding.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Perfil del cliente</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.mobileProfileHeader}>
            <View style={styles.avatarMobile}>
              {client.user.avatar ? (
                <Image
                  source={{ uri: client.user.avatar }}
                  style={styles.avatarImageMobile}
                />
              ) : (
                <Text style={styles.avatarInitialsMobile}>{initials}</Text>
              )}
              <View style={styles.statusDotMobile} />
            </View>
            <Text style={styles.clientNameMobile}>{client.user.name}</Text>
            {age && <Text style={styles.clientAgeMobile}>{age} años</Text>}
            <Text style={styles.clientSinceMobile}>
              Cliente desde {clientSince}
            </Text>
          </View>
        </View>

        {/* Quick Info Card */}
        <View style={styles.card}>
          <View style={styles.mobileStatsRow}>
            <View style={styles.mobileStat}>
              <Text style={styles.mobileStatValue}>{sessionStats.total}</Text>
              <Text style={styles.mobileStatLabel}>Sesiones</Text>
            </View>
            <View style={styles.mobileStatDivider} />
            <View style={styles.mobileStat}>
              <Text style={styles.mobileStatValue}>{sessionStats.completed}</Text>
              <Text style={styles.mobileStatLabel}>Completadas</Text>
            </View>
            <View style={styles.mobileStatDivider} />
            <View style={styles.mobileStat}>
              <Text style={[styles.mobileStatValue, { color: heraLanding.success }]}>Activo</Text>
              <Text style={styles.mobileStatLabel}>Estado</Text>
            </View>
          </View>
        </View>

        {/* Contact Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={20} color={heraLanding.primary} />
            <Text style={styles.sectionTitle}>Contacto</Text>
          </View>
          <View style={styles.contactList}>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={18} color={heraLanding.textSecondary} />
              <Text style={styles.contactText}>{client.user.email}</Text>
            </View>
            {client.user.phone && (
              <View style={styles.contactItem}>
                <Ionicons name="call" size={18} color={heraLanding.textSecondary} />
                <Text style={styles.contactText}>{client.user.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Concerns Card */}
        {preferences?.concerns && Array.isArray(preferences.concerns) && preferences.concerns.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag-outline" size={20} color={heraLanding.primary} />
              <Text style={styles.sectionTitle}>Motivo de consulta</Text>
            </View>
            <View style={styles.tagsRow}>
              {preferences.concerns.map((concern, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{concern || ''}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Preferences Card */}
        {preferences?.approach && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="options-outline" size={20} color={heraLanding.primary} />
              <Text style={styles.sectionTitle}>Preferencias</Text>
            </View>
            <View style={styles.preferencesList}>
              {preferences.approach && (
                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceLabel}>Enfoque</Text>
                  <Text style={styles.preferenceValue}>{preferences.approach}</Text>
                </View>
              )}
              {preferences.modality && (
                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceLabel}>Modalidad</Text>
                  <Text style={styles.preferenceValue}>{preferences.modality}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.mobileActions}>
          <TouchableOpacity
            style={styles.mobileActionPrimary}
            onPress={handleScheduleSession}
          >
            <Ionicons name="calendar" size={20} color={heraLanding.textOnPrimary} />
            <Text style={styles.mobileActionPrimaryText}>Agendar sesión</Text>
          </TouchableOpacity>

          <View style={styles.mobileActionRow}>
            <TouchableOpacity
              style={styles.mobileActionSecondary}
              onPress={handleSendMessage}
            >
              <Ionicons name="chatbubble-outline" size={20} color={heraLanding.primary} />
              <Text style={styles.mobileActionSecondaryText}>Mensaje</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mobileActionSecondary}
              onPress={handleViewHistory}
            >
              <Ionicons name="time-outline" size={20} color={heraLanding.primary} />
              <Text style={styles.mobileActionSecondaryText}>Historial</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  scrollView: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    padding: 24,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: heraLanding.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      web: { boxShadow: `0 2px 8px ${heraLanding.shadowColor}` },
    }),
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: heraLanding.primary,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },

  // Desktop Layout
  desktopContent: {
    padding: 24,
    paddingBottom: 48,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  desktopLayout: {
    flexDirection: 'row',
    gap: 24,
  },
  mainColumn: {
    flex: 0.65,
    gap: 20,
  },
  mainColumnTablet: {
    flex: 0.6,
  },
  sidebarColumn: {
    flex: 0.35,
    gap: 20,
  },
  sidebarColumnTablet: {
    flex: 0.4,
  },

  // Cards
  card: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 12,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: heraLanding.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: { boxShadow: `0 2px 8px ${heraLanding.shadowColor}` },
    }),
  },

  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    gap: 20,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: heraLanding.success,
    borderWidth: 3,
    borderColor: heraLanding.cardBg,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  clientName: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  clientAge: {
    fontSize: 16,
    color: heraLanding.textSecondary,
  },
  clientMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  clientMeta: {
    fontSize: 14,
    color: heraLanding.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${heraLanding.success}15`,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: heraLanding.success,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.success,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  sectionDescription: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    marginBottom: 12,
  },

  // Contact List
  contactList: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 15,
    color: heraLanding.textPrimary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  contactActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: heraLanding.border,
  },
  contactActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },

  // Concerns
  concernsList: {
    gap: 10,
    marginBottom: 16,
  },
  concernItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  concernDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: heraLanding.primary,
  },
  concernText: {
    fontSize: 15,
    color: heraLanding.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: heraLanding.primaryMuted,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.primaryDark,
  },

  // Preferences
  preferencesList: {
    gap: 16,
  },
  preferenceItem: {
    gap: 4,
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preferenceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceValue: {
    fontSize: 15,
    color: heraLanding.textPrimary,
  },

  // Questionnaire
  questionnaireDate: {
    fontSize: 14,
    color: heraLanding.textMuted,
    marginBottom: 16,
  },
  questionnaireList: {
    gap: 20,
  },
  questionnaireItem: {
    gap: 6,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  answersList: {
    gap: 2,
  },
  answerText: {
    fontSize: 15,
    color: heraLanding.textPrimary,
    paddingLeft: 12,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: heraLanding.primary,
    borderRadius: 8,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },

  // Summary Sidebar
  summaryList: {
    gap: 12,
  },
  summaryItem: {
    gap: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: heraLanding.textMuted,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  summaryMeta: {
    fontSize: 12,
    color: heraLanding.textMuted,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: heraLanding.borderLight,
    marginVertical: 4,
  },
  summaryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Next Session
  nextSession: {
    gap: 4,
  },
  nextSessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    textTransform: 'capitalize',
  },
  nextSessionTime: {
    fontSize: 24,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  nextSessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  nextSessionType: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },
  nextSessionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  nextSessionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: heraLanding.border,
    alignItems: 'center',
  },
  nextSessionButtonPrimary: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  nextSessionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  nextSessionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },
  noSession: {
    alignItems: 'center',
    gap: 12,
  },
  noSessionText: {
    fontSize: 15,
    color: heraLanding.textMuted,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: heraLanding.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
  },
  scheduleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },

  // Quick Actions
  quickActions: {
    gap: 10,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: heraLanding.background,
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },

  // Actions List
  actionsList: {
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  actionItemText: {
    flex: 1,
    fontSize: 15,
    color: heraLanding.textPrimary,
  },

  // Mobile Styles
  mobileContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: heraLanding.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  mobileBackButton: {
    padding: 4,
  },
  mobileHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  mobileProfileHeader: {
    alignItems: 'center',
    gap: 8,
  },
  avatarMobile: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImageMobile: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarInitialsMobile: {
    fontSize: 36,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  statusDotMobile: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: heraLanding.success,
    borderWidth: 3,
    borderColor: heraLanding.cardBg,
  },
  clientNameMobile: {
    fontSize: 24,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  clientAgeMobile: {
    fontSize: 16,
    color: heraLanding.textSecondary,
  },
  clientSinceMobile: {
    fontSize: 14,
    color: heraLanding.textMuted,
  },
  mobileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  mobileStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  mobileStatLabel: {
    fontSize: 12,
    color: heraLanding.textMuted,
  },
  mobileStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: heraLanding.borderLight,
  },
  mobileActions: {
    gap: 12,
  },
  mobileActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: heraLanding.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  mobileActionPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },
  mobileActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mobileActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: heraLanding.border,
  },
  mobileActionSecondaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: heraLanding.primary,
  },
});

export default ClientProfileScreen;
