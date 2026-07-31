import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button, Input, SimpleDropdown } from '../common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_CATEGORY_OPTIONS,
  FEEDBACK_STATUS_LABELS,
  HELP_CATEGORY_LABELS,
  HELP_CATEGORY_OPTIONS,
  HELP_IMPACT_LABELS,
  HELP_IMPACT_OPTIONS,
  HELP_STATUS_LABELS,
} from '../../constants/specialistContact';
import * as contactService from '../../services/specialistContactService';
import type {
  FeedbackListItem,
  HelpRequestDetail,
  HelpRequestListItem,
  SpecialistFeedbackCategory,
  SpecialistHelpCategory,
  SpecialistHelpImpact,
} from '../../services/specialistContactService';
import { track } from '../../services/analyticsService';

type ContactSection = 'help' | 'feedback';

interface ProfessionalContactWorkspaceProps {
  initialSection?: ContactSection;
  initialRequestId?: string;
  onRouteChange?: (params: { section: ContactSection; requestId?: string }) => void;
}

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const mergeUniqueById = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
};

const getStatusTone = (
  status: string,
  theme: Theme
): { background: string; border: string; text: string } => {
  if (status === 'RESOLVED' || status === 'IMPLEMENTED' || status === 'CLOSED') {
    return {
      background: theme.status.confirmed.bg,
      border: theme.status.confirmed.border,
      text: theme.status.confirmed.text,
    };
  }
  if (status === 'WAITING_FOR_SPECIALIST' || status === 'PLANNED') {
    return {
      background: theme.status.pending.bg,
      border: theme.status.pending.border,
      text: theme.status.pending.text,
    };
  }
  return {
    background: theme.status.completed.bg,
    border: theme.status.completed.border,
    text: theme.status.completed.text,
  };
};

function StatusPill({ status, label }: { status: string; label: string }) {
  const { theme } = useTheme();
  const tone = getStatusTone(status, theme);
  return (
    <View
      style={[
        stylesStatic.statusPill,
        { backgroundColor: tone.background, borderColor: tone.border },
      ]}
    >
      <Text style={[stylesStatic.statusPillText, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={[stylesStatic.fieldLabel, { color: theme.textSecondary }]}>{children}</Text>;
}

export function ProfessionalContactWorkspace({
  initialSection = 'feedback',
  initialRequestId,
  onRouteChange,
}: ProfessionalContactWorkspaceProps) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
  const styles = useMemo(() => createStyles(theme, isDark, isDesktop), [theme, isDark, isDesktop]);

  const [section, setSection] = useState<ContactSection>(initialSection);
  const [helpItems, setHelpItems] = useState<HelpRequestListItem[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackListItem[]>([]);
  const [helpCursor, setHelpCursor] = useState<string | null>(null);
  const [feedbackCursor, setFeedbackCursor] = useState<string | null>(null);
  const [selectedHelp, setSelectedHelp] = useState<HelpRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [helpLoadingMore, setHelpLoadingMore] = useState(false);
  const [feedbackLoadingMore, setFeedbackLoadingMore] = useState(false);
  const loadedSectionsRef = useRef<Record<ContactSection, boolean>>({
    help: false,
    feedback: false,
  });
  const helpListRequestRef = useRef(0);
  const feedbackListRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const helpLoadingMoreRef = useRef(false);
  const feedbackLoadingMoreRef = useRef(false);
  const dismissedInitialRequestIdRef = useRef<string | null>(null);

  const [helpCategory, setHelpCategory] = useState<SpecialistHelpCategory | null>(null);
  const [helpImpact, setHelpImpact] = useState<SpecialistHelpImpact | null>(null);
  const [helpSubject, setHelpSubject] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpSubmitting, setHelpSubmitting] = useState(false);
  const [helpSuccess, setHelpSuccess] = useState<string | null>(null);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [feedbackCategory, setFeedbackCategory] =
    useState<SpecialistFeedbackCategory | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const reply = selectedHelp ? replyDrafts[selectedHelp.id] ?? '' : '';
  const setReply = useCallback((value: string) => {
    if (!selectedHelp) return;
    setReplyDrafts((current) => ({ ...current, [selectedHelp.id]: value }));
  }, [selectedHelp]);

  const loadHelpList = useCallback(async () => {
    const requestVersion = ++helpListRequestRef.current;
    const helpPage = await contactService.listHelpRequests();
    if (requestVersion !== helpListRequestRef.current) return;
    setHelpItems(helpPage.items);
    setHelpCursor(helpPage.nextCursor);
    loadedSectionsRef.current.help = true;
  }, []);

  const loadFeedbackList = useCallback(async () => {
    const requestVersion = ++feedbackListRequestRef.current;
    const feedbackPage = await contactService.listFeedback();
    if (requestVersion !== feedbackListRequestRef.current) return;
    setFeedbackItems(feedbackPage.items);
    setFeedbackCursor(feedbackPage.nextCursor);
    loadedSectionsRef.current.feedback = true;
  }, []);

  const loadMoreHelp = async () => {
    if (!helpCursor || helpLoadingMoreRef.current) return;
    const requestVersion = helpListRequestRef.current;
    helpLoadingMoreRef.current = true;
    setHelpLoadingMore(true);
    try {
      const page = await contactService.listHelpRequests(helpCursor);
      if (requestVersion !== helpListRequestRef.current) return;
      setHelpItems((current) => mergeUniqueById(current, page.items));
      setHelpCursor(page.nextCursor);
    } catch (error) {
      setGlobalError(getErrorMessage(error, 'No se pudo cargar más historial.'));
    } finally {
      helpLoadingMoreRef.current = false;
      setHelpLoadingMore(false);
    }
  };

  const loadMoreFeedback = async () => {
    if (!feedbackCursor || feedbackLoadingMoreRef.current) return;
    const requestVersion = feedbackListRequestRef.current;
    feedbackLoadingMoreRef.current = true;
    setFeedbackLoadingMore(true);
    try {
      const page = await contactService.listFeedback(feedbackCursor);
      if (requestVersion !== feedbackListRequestRef.current) return;
      setFeedbackItems((current) => mergeUniqueById(current, page.items));
      setFeedbackCursor(page.nextCursor);
    } catch (error) {
      setGlobalError(getErrorMessage(error, 'No se pudo cargar más historial.'));
    } finally {
      feedbackLoadingMoreRef.current = false;
      setFeedbackLoadingMore(false);
    }
  };

  const openHelp = useCallback(async (requestId: string) => {
    dismissedInitialRequestIdRef.current = null;
    const requestVersion = ++detailRequestRef.current;
    setLoadingDetail(true);
    setGlobalError(null);
    setRefreshWarning(null);
    try {
      const detail = await contactService.getHelpRequest(requestId);
      if (requestVersion !== detailRequestRef.current) return;
      setSelectedHelp(detail);
      onRouteChange?.({ section: 'help', requestId });
      const lastAdminMessage = detail.messages.filter((message) => message.author === 'ADMIN').at(-1);
      if (lastAdminMessage) {
        try {
          await contactService.markHelpRequestRead(requestId, lastAdminMessage.id);
          if (requestVersion !== detailRequestRef.current) return;
          setHelpItems((current) => current.map((item) =>
            item.id === requestId ? { ...item, unreadAdminMessages: 0 } : item
          ));
          track('specialist_help_response_read', { status: detail.status });
        } catch {
          if (requestVersion === detailRequestRef.current) {
            setRefreshWarning('La solicitud está abierta, pero no se pudo actualizar su indicador de lectura.');
          }
        }
      }
    } catch (error) {
      if (requestVersion === detailRequestRef.current) {
        setGlobalError(getErrorMessage(error, 'No se pudo abrir la solicitud.'));
      }
    } finally {
      if (requestVersion === detailRequestRef.current) setLoadingDetail(false);
    }
  }, [onRouteChange]);

  useEffect(() => {
    track('specialist_contact_screen_opened', { section: initialSection });
  }, []);

  useEffect(() => {
    if (loadedSectionsRef.current[section]) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let active = true;
    void (async () => {
      try {
        if (section === 'help') {
          await loadHelpList();
        } else {
          await loadFeedbackList();
        }
      } catch (error) {
        if (active) setGlobalError(getErrorMessage(error, 'No se pudo cargar esta sección.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadFeedbackList, loadHelpList, section]);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (!initialRequestId) {
      dismissedInitialRequestIdRef.current = null;
      return;
    }
    if (
      initialRequestId !== dismissedInitialRequestIdRef.current
      && selectedHelp?.id !== initialRequestId
    ) {
      void openHelp(initialRequestId);
    }
  }, [initialRequestId, openHelp, selectedHelp?.id]);

  const refresh = useCallback(async () => {
    const selectedId = selectedHelp?.id;
    const detailVersion = detailRequestRef.current;
    setRefreshing(true);
    setRefreshWarning(null);
    try {
      if (section === 'help') {
        await loadHelpList();
      } else {
        await loadFeedbackList();
      }
      if (selectedId) {
        const detail = await contactService.getHelpRequest(selectedId);
        if (detailVersion === detailRequestRef.current) setSelectedHelp(detail);
      }
      setGlobalError(null);
    } catch (error) {
      setGlobalError(getErrorMessage(error, 'No se pudo actualizar la información.'));
    } finally {
      setRefreshing(false);
    }
  }, [loadFeedbackList, loadHelpList, section, selectedHelp?.id]);

  const changeSection = (nextSection: ContactSection) => {
    dismissedInitialRequestIdRef.current = selectedHelp?.id ?? initialRequestId ?? null;
    detailRequestRef.current += 1;
    setSection(nextSection);
    setSelectedHelp(null);
    setGlobalError(null);
    setRefreshWarning(null);
    onRouteChange?.({ section: nextSection, requestId: undefined });
    track('specialist_contact_tab_opened', { section: nextSection });
  };

  const submitHelp = async () => {
    setHelpSuccess(null);
    if (!helpCategory || !helpImpact || helpSubject.trim().length < 5 || helpMessage.trim().length < 20) {
      setGlobalError('Completa la categoría, el impacto, un asunto de al menos 5 caracteres y una descripción de al menos 20.');
      return;
    }

    setHelpSubmitting(true);
    setGlobalError(null);
    let created: HelpRequestDetail;
    try {
      created = await contactService.createHelpRequest({
        category: helpCategory,
        impact: helpImpact,
        subject: helpSubject.trim(),
        message: helpMessage.trim(),
        ...contactService.getTechnicalContext('ProfessionalHelp'),
      });
      setHelpCategory(null);
      setHelpImpact(null);
      setHelpSubject('');
      setHelpMessage('');
      setHelpSuccess(`Solicitud ${created.reference} guardada correctamente.`);
      track('specialist_help_created', { category: helpCategory, impact: helpImpact });
      loadedSectionsRef.current.help = true;
      setHelpItems((current) => [{
        id: created.id,
        reference: created.reference,
        category: created.category,
        impact: created.impact,
        subject: created.subject,
        status: created.status,
        lastActivityAt: created.lastActivityAt,
        resolvedAt: created.resolvedAt,
        createdAt: created.createdAt,
        unreadAdminMessages: 0,
      }, ...current.filter((item) => item.id !== created.id)]);
      setSelectedHelp(created);
      onRouteChange?.({ section: 'help', requestId: created.id });
    } catch (error) {
      setGlobalError(getErrorMessage(error, 'No se pudo guardar la solicitud. Tu borrador se conserva.'));
      setHelpSubmitting(false);
      return;
    }

    try {
      await loadHelpList();
    } catch {
      setRefreshWarning('La solicitud se ha guardado, pero el historial no se ha podido actualizar.');
    } finally {
      setHelpSubmitting(false);
    }
  };

  const submitReply = async () => {
    if (!selectedHelp || !reply.trim()) return;
    const requestId = selectedHelp.id;
    const messageBody = reply.trim();
    setReplySubmitting(true);
    setGlobalError(null);
    setRefreshWarning(null);
    let message: contactService.HelpMessage;
    try {
      message = await contactService.replyToHelpRequest(requestId, messageBody);
      setReplyDrafts((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      setSelectedHelp((current) => current?.id === requestId
        ? {
            ...current,
            status: 'IN_PROGRESS',
            resolvedAt: null,
            lastActivityAt: message.createdAt,
            messages: [...current.messages, message],
          }
        : current
      );
      setHelpItems((current) => current.map((item) => item.id === requestId
        ? {
            ...item,
            status: 'IN_PROGRESS',
            resolvedAt: null,
            lastActivityAt: message.createdAt,
          }
        : item
      ));
    } catch (error) {
      setGlobalError(getErrorMessage(error, 'No se pudo enviar la respuesta. Tu borrador se conserva.'));
      setReplySubmitting(false);
      return;
    }

    try {
      await loadHelpList();
    } catch {
      setRefreshWarning('La respuesta se ha enviado, pero el historial no se ha podido actualizar.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const resolveSelectedHelp = async () => {
    if (!selectedHelp) return;
    const requestId = selectedHelp.id;
    setGlobalError(null);
    setRefreshWarning(null);
    let update: contactService.HelpStateUpdate;
    try {
      update = await contactService.resolveHelpRequest(requestId);
      setSelectedHelp((current) => current?.id === requestId
        ? { ...current, status: update.status, resolvedAt: update.resolvedAt }
        : current
      );
      setHelpItems((current) => current.map((item) => item.id === requestId
        ? { ...item, status: update.status, resolvedAt: update.resolvedAt }
        : item
      ));
    } catch (error) {
      setGlobalError(getErrorMessage(error, 'No se pudo marcar como resuelta.'));
      return;
    }

    try {
      await loadHelpList();
    } catch {
      setRefreshWarning('La solicitud se ha resuelto, pero el historial no se ha podido actualizar.');
    }
  };

  const submitFeedback = async () => {
    setFeedbackSuccess(null);
    if (!feedbackCategory || feedbackText.trim().length < 20) {
      setGlobalError('Selecciona una categoría y escribe al menos 20 caracteres.');
      return;
    }

    setFeedbackSubmitting(true);
    setGlobalError(null);
    let created: FeedbackListItem;
    try {
      created = await contactService.createFeedback({
        category: feedbackCategory,
        text: feedbackText.trim(),
        ...contactService.getTechnicalContext('ProfessionalHelp'),
      });
      setFeedbackCategory(null);
      setFeedbackText('');
      setFeedbackSuccess(`Gracias. Hemos recibido tu comentario ${created.reference}.`);
      track('specialist_feedback_created', { category: feedbackCategory });
      loadedSectionsRef.current.feedback = true;
      setFeedbackItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    } catch (error) {
      setGlobalError(getErrorMessage(error, 'No se pudo guardar el comentario. Tu borrador se conserva.'));
      setFeedbackSubmitting(false);
      return;
    }

    try {
      await loadFeedbackList();
    } catch {
      setRefreshWarning('El comentario se ha guardado, pero el historial no se ha podido actualizar.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.primary} />
        <Text style={styles.loadingText}>Cargando ayuda y comentarios…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="help-buoy-outline" size={25} color={theme.primary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>SOPORTE PARA ESPECIALISTAS</Text>
          <Text style={styles.title}>Ayuda y comentarios</Text>
          <Text style={styles.subtitle}>
            Comparte tus ideas y ayúdanos a seguir mejorando HERA contigo. Si algo no funciona, también estamos aquí para ayudarte.
          </Text>
        </View>
      </View>


      <View style={styles.tabs} accessibilityRole="tablist">
        <AnimatedPressable
          style={[styles.tab, section === 'feedback' && styles.tabActive]}
          onPress={() => changeSection('feedback')}
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'feedback' }}
        >
          <Ionicons
            name={section === 'feedback' ? 'sparkles' : 'sparkles-outline'}
            size={18}
            color={section === 'feedback' ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.tabText, section === 'feedback' && styles.tabTextActive]}>
            Compartir comentarios
          </Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.tab, section === 'help' && styles.tabActive]}
          onPress={() => changeSection('help')}
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'help' }}
        >
          <Ionicons
            name={section === 'help' ? 'chatbubbles' : 'chatbubbles-outline'}
            size={18}
            color={section === 'help' ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.tabText, section === 'help' && styles.tabTextActive]}>
            Solicitar ayuda
          </Text>
        </AnimatedPressable>
      </View>

      {globalError ? (
        <View
          style={styles.errorBanner}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
          <Text style={styles.errorText}>{globalError}</Text>
        </View>
      ) : null}

      {refreshWarning ? (
        <View
          style={styles.warningBanner}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="refresh-circle-outline" size={18} color={theme.status.pending.text} />
          <Text style={styles.warningText}>{refreshWarning}</Text>
        </View>
      ) : null}

      {section === 'help' ? (
        <View style={styles.columns}>
          <View style={styles.formCard}>
            <Text style={styles.cardEyebrow}>NUEVA SOLICITUD</Text>
            <Text style={styles.cardTitle}>¿En qué podemos ayudarte?</Text>
            <Text style={styles.cardDescription}>
              Describe un único problema por solicitud para que podamos seguirlo con claridad.
            </Text>
            <View style={styles.helpGuidance}>
              <Ionicons name="shield-checkmark-outline" size={17} color={theme.primary} />
              <Text style={styles.helpGuidanceText}>
                Este canal no es inmediato ni gestiona emergencias clínicas. No incluyas nombres, datos de contacto ni información clínica de pacientes.
              </Text>
            </View>

            <FieldLabel>Categoría</FieldLabel>
            <SimpleDropdown
              options={HELP_CATEGORY_OPTIONS}
              value={helpCategory}
              onSelect={setHelpCategory}
              placeholder="Selecciona una categoría"
              selectionIndicator="radio"
            />
            <View style={styles.fieldGap} />

            <FieldLabel>Impacto</FieldLabel>
            <SimpleDropdown
              options={HELP_IMPACT_OPTIONS}
              value={helpImpact}
              onSelect={setHelpImpact}
              placeholder="¿Cómo afecta a tu trabajo?"
              selectionIndicator="radio"
            />
            <View style={styles.fieldGap} />

            <Input
              label="Asunto"
              value={helpSubject}
              onChangeText={setHelpSubject}
              maxLength={120}
              placeholder="Ej. No puedo modificar una cita"
              helperText={`${helpSubject.trim().length}/120`}
            />
            <Input
              label="Descripción"
              value={helpMessage}
              onChangeText={setHelpMessage}
              maxLength={4000}
              multiline
              textAlignVertical="top"
              style={styles.textArea}
              placeholder="Qué intentabas hacer, qué ocurrió y qué esperabas que sucediera."
              helperText={`${helpMessage.trim().length}/4000 · No incluyas datos de pacientes`}
            />
            {helpSuccess ? (
              <Text style={styles.successText} accessibilityLiveRegion="polite">
                {helpSuccess}
              </Text>
            ) : null}
            <Button fullWidth loading={helpSubmitting} onPress={submitHelp}>
              Enviar solicitud
            </Button>
          </View>

          <View style={styles.historyCard}>
            {loadingDetail ? (
              <View style={styles.detailLoading}><ActivityIndicator color={theme.primary} /></View>
            ) : selectedHelp ? (
              <>
                <View style={styles.detailHeader}>
                  <AnimatedPressable
                    style={styles.backButton}
                    onPress={() => {
                      dismissedInitialRequestIdRef.current = selectedHelp.id;
                      detailRequestRef.current += 1;
                      setSelectedHelp(null);
                      onRouteChange?.({ section: 'help', requestId: undefined });
                    }}
                  >
                    <Ionicons name="arrow-back" size={18} color={theme.primary} />
                    <Text style={styles.backText}>Todas</Text>
                  </AnimatedPressable>
                  <StatusPill
                    status={selectedHelp.status}
                    label={HELP_STATUS_LABELS[selectedHelp.status]}
                  />
                </View>
                <Text style={styles.reference}>{selectedHelp.reference}</Text>
                <Text style={styles.detailTitle}>{selectedHelp.subject}</Text>
                <Text style={styles.detailMeta}>
                  {HELP_CATEGORY_LABELS[selectedHelp.category]} · {HELP_IMPACT_LABELS[selectedHelp.impact]}
                </Text>

                <View style={styles.thread}>
                  {selectedHelp.messages.map((message) => {
                    const isOwn = message.author === 'SPECIALIST';
                    return (
                      <View
                        key={message.id}
                        style={[styles.message, isOwn ? styles.messageOwn : styles.messageAdmin]}
                      >
                        <Text style={styles.messageAuthor}>{isOwn ? 'Tú' : 'Equipo HERA'}</Text>
                        <Text style={styles.messageBody}>{message.body}</Text>
                        <Text style={styles.messageDate}>{formatDate(message.createdAt)}</Text>
                      </View>
                    );
                  })}
                </View>

                <Input
                  label="Tu respuesta"
                  value={reply}
                  onChangeText={setReply}
                  maxLength={4000}
                  multiline
                  textAlignVertical="top"
                  style={styles.replyArea}
                  placeholder="Añade la información que necesite el equipo."
                  helperText={`${reply.trim().length}/4000`}
                />
                <View style={styles.detailActions}>
                  <Button
                    onPress={submitReply}
                    loading={replySubmitting}
                    disabled={!reply.trim()}
                    style={styles.flexButton}
                  >
                    Responder
                  </Button>
                  {selectedHelp.status !== 'RESOLVED' ? (
                    <Button
                      onPress={resolveSelectedHelp}
                      variant="outline"
                      style={styles.flexButton}
                    >
                      Marcar como resuelta
                    </Button>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cardEyebrow}>TU HISTORIAL</Text>
                <Text style={styles.cardTitle}>Solicitudes de ayuda</Text>
                <Text style={styles.cardDescription}>
                  Las respuestas nuevas aparecen destacadas y también en el menú lateral.
                </Text>
                <View style={styles.list}>
                  {helpItems.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="checkmark-circle-outline" size={28} color={theme.secondary} />
                      <Text style={styles.emptyTitle}>No tienes solicitudes</Text>
                      <Text style={styles.emptyText}>Cuando envíes una, aparecerá aquí.</Text>
                    </View>
                  ) : helpItems.map((item) => (
                    <AnimatedPressable
                      key={item.id}
                      style={[styles.listItem, item.unreadAdminMessages > 0 && styles.listItemUnread]}
                      onPress={() => void openHelp(item.id)}
                      hoverLift={isDesktop}
                    >
                      <View style={styles.listItemTop}>
                        <Text style={styles.reference}>{item.reference}</Text>
                        <StatusPill status={item.status} label={HELP_STATUS_LABELS[item.status]} />
                      </View>
                      <Text style={styles.listItemTitle} numberOfLines={2}>{item.subject}</Text>
                      <Text style={styles.listItemMeta}>
                        {HELP_CATEGORY_LABELS[item.category]} · {formatDate(item.lastActivityAt)}
                      </Text>
                      {item.unreadAdminMessages > 0 ? (
                        <Text style={styles.unreadText}>
                          {item.unreadAdminMessages} {item.unreadAdminMessages === 1 ? 'respuesta nueva' : 'respuestas nuevas'}
                        </Text>
                      ) : null}
                    </AnimatedPressable>
                  ))}
                </View>
                  {helpCursor ? (
                    <Button
                      variant="outline"
                      onPress={() => void loadMoreHelp()}
                      loading={helpLoadingMore}
                      disabled={helpLoadingMore}
                    >
                      Cargar más
                    </Button>
                  ) : null}
              </>
            )}
          </View>
        </View>
      ) : (

        <View style={styles.columns}>
          <View style={styles.formCard}>
            <Text style={styles.cardEyebrow}>TU EXPERIENCIA</Text>
            <Text style={styles.cardTitle}>Ayúdanos a mejorar</Text>
            <Text style={styles.cardDescription}>
              Leemos todos los comentarios. No es una conversación ni implica una respuesta individual.
            </Text>
            <FieldLabel>Tipo de comentario</FieldLabel>
            <SimpleDropdown
              options={FEEDBACK_CATEGORY_OPTIONS}
              value={feedbackCategory}
              onSelect={setFeedbackCategory}
              placeholder="Selecciona una opción"
              selectionIndicator="radio"
            />
            <View style={styles.fieldGap} />
            <Input
              label="Comentario"
              value={feedbackText}
              onChangeText={setFeedbackText}
              maxLength={4000}
              multiline
              textAlignVertical="top"
              style={styles.feedbackArea}
              placeholder="Cuéntanos qué cambiarías, qué te resultó confuso o qué te está funcionando bien."
              helperText={`${feedbackText.trim().length}/4000 · No incluyas datos de pacientes`}
            />
            {feedbackSuccess ? (
              <Text style={styles.successText} accessibilityLiveRegion="polite">
                {feedbackSuccess}
              </Text>
            ) : null}
            <Button fullWidth loading={feedbackSubmitting} onPress={submitFeedback}>
              Compartir comentario
            </Button>
          </View>

          <View style={styles.historyCard}>
            <Text style={styles.cardEyebrow}>SEGUIMIENTO</Text>
            <Text style={styles.cardTitle}>Comentarios enviados</Text>
            <Text style={styles.cardDescription}>
              El estado indica cómo avanza la revisión, sin prometer contacto individual.
            </Text>
            <View style={styles.list}>
              {feedbackItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bulb-outline" size={28} color={theme.secondary} />
                  <Text style={styles.emptyTitle}>Aún no has enviado comentarios</Text>
                  <Text style={styles.emptyText}>Tus ideas aparecerán aquí con su estado.</Text>
                </View>
              ) : feedbackItems.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <View style={styles.listItemTop}>
                    <Text style={styles.reference}>{item.reference}</Text>
                    <StatusPill
                      status={item.status}
                      label={FEEDBACK_STATUS_LABELS[item.status]}
                    />
                  </View>
                  <Text style={styles.listItemTitle}>
                    {FEEDBACK_CATEGORY_LABELS[item.category]}
                  </Text>
                  <Text style={styles.listItemMeta}>{formatDate(item.createdAt)}</Text>
                </View>
              ))}
            </View>
              {feedbackCursor ? (
                <Button
                  variant="outline"
                  onPress={() => void loadMoreFeedback()}
                  loading={feedbackLoadingMore}
                  disabled={feedbackLoadingMore}
                >
                  Cargar más
                </Button>
              ) : null}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const stylesStatic = StyleSheet.create({
  statusPill: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});


const createStyles = (theme: Theme, isDark: boolean, isDesktop: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: {
      width: '100%',
      maxWidth: 1180,
      alignSelf: 'center',
      paddingHorizontal: isDesktop ? spacing.xl : spacing.md,
      paddingTop: isDesktop ? spacing.xl : spacing.lg,
      paddingBottom: 80,
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: theme.bg,
    },
    loadingText: { color: theme.textSecondary, fontSize: typography.fontSizes.sm },
    hero: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    heroCopy: { flex: 1 },
    eyebrow: {
      color: theme.primary,
      fontSize: typography.fontSizes.xs,
      fontWeight: typography.fontWeights.bold,
      letterSpacing: 1.2,
      marginBottom: 5,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: isDesktop ? 34 : 28,
      lineHeight: isDesktop ? 40 : 34,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: typography.fontSizes.md,
      lineHeight: 23,
      marginTop: spacing.xs,
      maxWidth: 720,
    },
    helpGuidance: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: theme.primaryAlpha12,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginBottom: spacing.md,
    },
    helpGuidanceText: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: typography.fontSizes.xs,
      lineHeight: 18,
    },
    tabs: {
      flexDirection: 'row',
      gap: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: spacing.lg,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: theme.primary },
    tabText: {
      color: theme.textSecondary,
      fontSize: typography.fontSizes.sm,
      fontWeight: '600',
    },
    tabTextActive: { color: theme.primary },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: theme.errorBg,
      borderWidth: 1,
      borderColor: theme.error,
    },
    errorText: {
      flex: 1,
      color: theme.error,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: theme.status.pending.bg,
      borderWidth: 1,
      borderColor: theme.status.pending.border,
    },
    warningText: {
      flex: 1,
      color: theme.status.pending.text,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    columns: {
      flexDirection: isDesktop ? 'row' : 'column',
      alignItems: 'flex-start',
      gap: spacing.lg,
    },
    formCard: {
      width: isDesktop ? 390 : '100%',
      borderRadius: borderRadius.xl,
      backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      padding: isDesktop ? spacing.xl : spacing.lg,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 3,
    },
    historyCard: {
      flex: isDesktop ? 1 : undefined,
      width: isDesktop ? undefined : '100%',
      minHeight: 360,
      borderRadius: borderRadius.xl,
      backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      padding: isDesktop ? spacing.xl : spacing.lg,
    },
    cardEyebrow: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      marginBottom: 6,
    },
    cardTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 22,
    },
    cardDescription: {
      color: theme.textSecondary,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    fieldGap: { height: spacing.md },
    textArea: { minHeight: 150, paddingTop: spacing.md },
    feedbackArea: { minHeight: 190, paddingTop: spacing.md },
    replyArea: { minHeight: 100, paddingTop: spacing.md },
    successText: {
      color: theme.success,
      backgroundColor: theme.successBg,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      marginBottom: spacing.md,
      fontSize: typography.fontSizes.sm,
    },
    list: { gap: spacing.sm },
    listItem: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      backgroundColor: theme.bg,
    },
    listItemUnread: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
    },
    listItemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    reference: {
      color: theme.primary,
      fontSize: typography.fontSizes.xs,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    listItemTitle: {
      color: theme.textPrimary,
      fontSize: typography.fontSizes.md,
      fontWeight: '600',
      lineHeight: 21,
    },
    listItemMeta: {
      color: theme.textMuted,
      fontSize: typography.fontSizes.xs,
      marginTop: 5,
    },
    unreadText: {
      color: theme.primary,
      fontSize: typography.fontSizes.xs,
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 50,
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontSize: typography.fontSizes.md,
      fontWeight: '600',
      marginTop: spacing.sm,
    },
    emptyText: {
      color: theme.textSecondary,
      fontSize: typography.fontSizes.sm,
      marginTop: 4,
      textAlign: 'center',
    },
    detailLoading: {
      minHeight: 320,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
    },
    backText: { color: theme.primary, fontWeight: '600' },
    detailTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 23,
      marginTop: spacing.xs,
    },
    detailMeta: {
      color: theme.textSecondary,
      fontSize: typography.fontSizes.sm,
      marginTop: 6,
      marginBottom: spacing.lg,
    },
    thread: { gap: spacing.sm, marginBottom: spacing.lg },
    message: {
      maxWidth: isDesktop ? '82%' : '94%',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
    },
    messageOwn: {
      alignSelf: 'flex-end',
      backgroundColor: theme.primaryAlpha12,
      borderColor: theme.primaryAlpha20,
    },
    messageAdmin: {
      alignSelf: 'flex-start',
      backgroundColor: theme.secondaryMuted,
      borderColor: theme.secondaryLight,
    },
    messageAuthor: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 5,
    },
    messageBody: {
      color: theme.textPrimary,
      fontSize: typography.fontSizes.sm,
      lineHeight: 21,
    },
    messageDate: { color: theme.textMuted, fontSize: 10, marginTop: spacing.sm },
    detailActions: {
      flexDirection: isDesktop ? 'row' : 'column',
      gap: spacing.sm,
    },
    flexButton: { flex: isDesktop ? 1 : undefined },
  });

export default ProfessionalContactWorkspace;
