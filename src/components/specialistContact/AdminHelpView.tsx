import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button, Input, SimpleDropdown } from '../common';
import { spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import {
  HELP_CATEGORY_LABELS,
  HELP_CATEGORY_OPTIONS,
  HELP_IMPACT_LABELS,
  HELP_IMPACT_OPTIONS,
  HELP_STATUS_LABELS,
} from '../../constants/specialistContact';
import * as contactService from '../../services/specialistContactService';
import type {
  AdminHelpDetail,
  AdminHelpListItem,
  SpecialistHelpCategory,
  SpecialistHelpImpact,
  SpecialistHelpStatus,
} from '../../services/specialistContactService';
import { ContactStatusPill } from './ContactStatusPill';
import { createAdminContactStyles } from './adminContactStyles';

const STATUS_OPTIONS = (Object.keys(HELP_STATUS_LABELS) as SpecialistHelpStatus[])
  .map((value) => ({ value, label: HELP_STATUS_LABELS[value] }));

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

export function AdminHelpView({
  initialRequestId,
  onSummaryChanged,
  onRequestChange,
}: {
  initialRequestId?: string;
  onSummaryChanged?: () => Promise<void> | void;
  onRequestChange?: (requestId?: string) => void;
}) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const styles = useMemo(
    () => createAdminContactStyles(theme, isDark, isDesktop),
    [theme, isDark, isDesktop]
  );

  const [items, setItems] = useState<AdminHelpListItem[]>([]);
  const [selected, setSelected] = useState<AdminHelpDetail | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SpecialistHelpStatus | null>(null);
  const [category, setCategory] = useState<SpecialistHelpCategory | null>(null);
  const [impact, setImpact] = useState<SpecialistHelpImpact | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const dismissedInitialRequestIdRef = useRef<string | null>(null);
  const reply = selected ? replyDrafts[selected.id] ?? '' : '';
  const setReply = useCallback((value: string) => {
    if (!selected) return;
    setReplyDrafts((current) => ({ ...current, [selected.id]: value }));
  }, [selected]);

  const loadPage = useCallback(async (
    nextCursor?: string,
    append = false
  ): Promise<void> => {
    if (append && loadingMoreRef.current) return;
    const requestVersion = append ? listRequestRef.current : ++listRequestRef.current;
    if (append) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    setError(null);
    try {
      const page = await contactService.listAdminHelpRequests({
        cursor: nextCursor,
        status: status ?? undefined,
        category: category ?? undefined,
        impact: impact ?? undefined,
        unread: unreadOnly || undefined,
        search: search || undefined,
      });
      if (requestVersion !== listRequestRef.current) return;
      setItems((current) => append ? mergeUniqueById(current, page.items) : page.items);
      setCursor(page.nextCursor);
    } catch (loadError) {
      if (requestVersion === listRequestRef.current) {
        setError(getErrorMessage(loadError, 'No se pudieron cargar las solicitudes.'));
      }
    } finally {
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
      if (requestVersion === listRequestRef.current) setLoading(false);
    }
  }, [category, impact, search, status, unreadOnly]);

  const openRequest = useCallback(async (id: string) => {
    dismissedInitialRequestIdRef.current = null;
    const requestVersion = ++detailRequestRef.current;
    setLoadingDetail(true);
    setError(null);
    setRefreshWarning(null);
    try {
      const detail = await contactService.getAdminHelpRequest(id);
      if (requestVersion !== detailRequestRef.current) return;
      setSelected(detail);
      onRequestChange?.(id);
      const lastSpecialistMessage = detail.messages
        .filter((message) => message.author === 'SPECIALIST')
        .at(-1);
      if (lastSpecialistMessage) {
        try {
          await contactService.markAdminHelpRequestRead(id, lastSpecialistMessage.id);
          if (requestVersion !== detailRequestRef.current) return;
          setItems((current) => current.map((item) =>
            item.id === id ? { ...item, unreadSpecialistMessages: 0 } : item
          ));
          try {
            await onSummaryChanged?.();
          } catch {
            setRefreshWarning('El mensaje se ha marcado como leído, pero el contador no se ha podido actualizar.');
          }
        } catch {
          if (requestVersion === detailRequestRef.current) {
            setRefreshWarning('El hilo está abierto, pero no se pudo actualizar su indicador de lectura.');
          }
        }
      }
    } catch (loadError) {
      if (requestVersion === detailRequestRef.current) {
        setError(getErrorMessage(loadError, 'No se pudo abrir la solicitud.'));
      }
    } finally {
      if (requestVersion === detailRequestRef.current) setLoadingDetail(false);
    }
  }, [onRequestChange, onSummaryChanged]);

  useEffect(() => {
    setLoading(true);
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!initialRequestId) {
      dismissedInitialRequestIdRef.current = null;
      return;
    }
    if (
      initialRequestId !== dismissedInitialRequestIdRef.current
      && selected?.id !== initialRequestId
    ) {
      void openRequest(initialRequestId);
    }
  }, [initialRequestId, openRequest, selected?.id]);

  const submitReply = async () => {
    if (!selected || !reply.trim()) return;
    const requestId = selected.id;
    const messageBody = reply.trim();
    setSubmitting(true);
    setError(null);
    setRefreshWarning(null);
    let message: contactService.HelpMessage;
    try {
      message = await contactService.replyToHelpRequestAsAdmin(requestId, messageBody);
      setReplyDrafts((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      setSelected((current) => current?.id === requestId
        ? {
            ...current,
            status: 'WAITING_FOR_SPECIALIST',
            resolvedAt: null,
            lastActivityAt: message.createdAt,
            messages: [...current.messages, message],
          }
        : current
      );
      setItems((current) => current.map((item) => item.id === requestId
        ? { ...item, status: 'WAITING_FOR_SPECIALIST', lastActivityAt: message.createdAt }
        : item
      ));
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'No se pudo responder. El borrador se conserva.'));
      setSubmitting(false);
      return;
    }

    try {
      const detail = await contactService.getAdminHelpRequest(requestId);
      setSelected((current) => current?.id === requestId ? detail : current);
    } catch {
      setRefreshWarning('La respuesta se ha enviado, pero la vista no se ha podido actualizar por completo.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (nextStatus: SpecialistHelpStatus) => {
    if (!selected) return;
    const requestId = selected.id;
    setError(null);
    setRefreshWarning(null);
    let update: contactService.HelpStateUpdate;
    try {
      update = await contactService.updateAdminHelpStatus(requestId, nextStatus);
      setSelected((current) => current?.id === requestId
        ? {
            ...current,
            status: update.status,
            resolvedAt: update.resolvedAt,
            lastActivityAt: update.lastActivityAt ?? current.lastActivityAt,
          }
        : current
      );
      setItems((current) => current.map((item) => item.id === requestId
        ? {
            ...item,
            status: update.status,
            lastActivityAt: update.lastActivityAt ?? item.lastActivityAt,
          }
        : item
      ));
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'No se pudo actualizar el estado.'));
      return;
    }

  };

  const retryNotification = async (notificationId: string) => {
    setError(null);
    setRefreshWarning(null);
    try {
      await contactService.retryContactNotification(notificationId);
      setSelected((current) => current ? {
        ...current,
        notifications: current.notifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: 'PENDING',
                attemptCount: 0,
                failedAt: null,
                lastError: null,
              }
            : notification
        ),
      } : current);
      setRefreshWarning('El reintento se ha encolado. Su estado se actualizará en el siguiente procesamiento.');
    } catch (retryError) {
      setError(getErrorMessage(retryError, 'No se pudo reintentar la notificación.'));
    }
  };

  const showList = isDesktop || !selected;
  const showDetail = isDesktop || Boolean(selected) || loadingDetail;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Input
          value={searchDraft}
          onChangeText={setSearchDraft}
          placeholder="Referencia o especialista"
          containerStyle={styles.search}
          returnKeyType="search"
          onSubmitEditing={() => setSearch(searchDraft.trim())}
        />
        <Button variant="outline" onPress={() => setSearch(searchDraft.trim())}>Buscar</Button>
        <View style={styles.filter}>
          <SimpleDropdown
            options={STATUS_OPTIONS}
            value={status}
            onSelect={setStatus}
            onClear={() => setStatus(null)}
            placeholder="Todos los estados"
            compact
          />
        </View>
        <View style={styles.filter}>
          <SimpleDropdown
            options={HELP_CATEGORY_OPTIONS}
            value={category}
            onSelect={setCategory}
            onClear={() => setCategory(null)}
            placeholder="Todas las categorías"
            compact
          />
        </View>
        <View style={styles.filter}>
          <SimpleDropdown
            options={HELP_IMPACT_OPTIONS}
            value={impact}
            onSelect={setImpact}
            onClear={() => setImpact(null)}
            placeholder="Todos los impactos"
            compact
          />
        </View>
        <Button
          variant={unreadOnly ? 'secondary' : 'ghost'}
          onPress={() => setUnreadOnly((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: unreadOnly }}
        >
          Solo no leídas
        </Button>
      </View>

      {error ? (
        <Text
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {error}
        </Text>
      ) : null}
      {refreshWarning ? (
        <Text
          style={styles.warning}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {refreshWarning}
        </Text>
      ) : null}

      <View style={styles.split}>
        {showList ? (
          <View style={[styles.panel, styles.listPanel]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Solicitudes de ayuda</Text>
              <Text style={styles.panelSubtitle}>{items.length} conversaciones cargadas</Text>
            </View>
            {loading ? (
              <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>
            ) : (
              <ScrollView
                style={styles.panelScroll}
                contentContainerStyle={styles.scrollContent}
                nestedScrollEnabled
              >
                {items.length === 0 ? (
                  <View style={styles.center}>
                    <Ionicons name="chatbubbles-outline" size={28} color={theme.textMuted} />
                    <Text style={styles.emptyTitle}>No hay solicitudes</Text>
                    <Text style={styles.emptyText}>Prueba a cambiar los filtros.</Text>
                  </View>
                ) : items.map((item) => (
                  <AnimatedPressable
                    key={item.id}
                    onPress={() => void openRequest(item.id)}
                    style={[
                      styles.listItem,
                      selected?.id === item.id && styles.listItemSelected,
                      item.unreadSpecialistMessages > 0 && styles.listItemUnread,
                    ]}
                  >
                    <View style={styles.listTop}>
                      <Text style={styles.reference}>{item.reference}</Text>
                      <ContactStatusPill status={item.status} label={HELP_STATUS_LABELS[item.status]} />
                    </View>
                    <Text style={styles.specialist}>{item.specialist.name}</Text>
                    <Text style={styles.meta}>
                      {HELP_CATEGORY_LABELS[item.category]} · {HELP_IMPACT_LABELS[item.impact]} · {formatDate(item.lastActivityAt)}
                    </Text>
                    {item.unreadSpecialistMessages > 0 ? (
                      <Text style={styles.unread}>
                        {item.unreadSpecialistMessages} mensajes sin leer
                      </Text>
                    ) : null}
                  </AnimatedPressable>
                ))}
                {cursor ? (
                  <Button
                    variant="outline"
                    onPress={() => void loadPage(cursor, true)}
                    style={styles.loadMore}
                    loading={loadingMore}
                    disabled={loadingMore}
                  >
                    Cargar más
                  </Button>
                ) : null}
              </ScrollView>
            )}
          </View>
        ) : null}

        {showDetail ? (
          <View style={[styles.panel, styles.detailPanel]}>
            {loadingDetail ? (
              <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>
            ) : selected ? (
              <ScrollView
                style={styles.panelScroll}
                contentContainerStyle={styles.detailContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {!isDesktop ? (
                  <AnimatedPressable
                    style={styles.back}
                    onPress={() => {
                      dismissedInitialRequestIdRef.current = selected.id;
                      detailRequestRef.current += 1;
                      setSelected(null);
                      onRequestChange?.(undefined);
                    }}
                  >
                    <Ionicons name="arrow-back" size={18} color={theme.primary} />
                    <Text style={styles.backText}>Volver</Text>
                  </AnimatedPressable>
                ) : null}
                <View style={styles.listTop}>
                  <Text style={styles.reference}>{selected.reference}</Text>
                  <ContactStatusPill status={selected.status} label={HELP_STATUS_LABELS[selected.status]} />
                </View>
                <Text style={styles.detailHeading}>{selected.subject}</Text>
                <Text style={styles.detailMeta}>
                  {selected.specialist.name} · {HELP_CATEGORY_LABELS[selected.category]} · {HELP_IMPACT_LABELS[selected.impact]}
                </Text>

                <View style={styles.actions}>
                  <View style={styles.actionGrow}>
                    <SimpleDropdown
                      options={STATUS_OPTIONS}
                      value={selected.status}
                      onSelect={(value) => void changeStatus(value)}
                      placeholder="Estado"
                      compact
                    />
                  </View>
                </View>

                <View style={styles.thread}>
                  {selected.messages.map((message) => {
                    const admin = message.author === 'ADMIN';
                    return (
                      <View
                        key={message.id}
                        style={[
                          styles.message,
                          admin ? styles.messageAdmin : styles.messageSpecialist,
                        ]}
                      >
                        <Text style={styles.messageAuthor}>{admin ? 'Administración' : selected.specialist.name}</Text>
                        <Text style={styles.messageBody}>{message.body}</Text>
                        <Text style={styles.messageDate}>{formatDate(message.createdAt)}</Text>
                      </View>
                    );
                  })}
                </View>

                <Input
                  label="Respuesta"
                  value={reply}
                  onChangeText={setReply}
                  editable={selected.specialist.id !== null}
                  maxLength={4000}
                  multiline
                  textAlignVertical="top"
                  style={styles.textarea}
                  helperText={`${reply.trim().length}/4000 · No copies la respuesta al email`}
                />
                {selected.specialist.id === null ? (
                  <Text style={styles.panelSubtitle}>
                    La cuenta fue eliminada y ya no puede recibir respuestas.
                  </Text>
                ) : null}
                <Button
                  onPress={submitReply}
                  loading={submitting}
                  disabled={!reply.trim() || selected.specialist.id === null}
                >
                  Responder al especialista
                </Button>

                <Text style={[styles.panelTitle, { marginTop: spacing.md }]}>Entrega de avisos</Text>
                {selected.notifications.length === 0 ? (
                  <Text style={styles.panelSubtitle}>No hay avisos asociados.</Text>
                ) : selected.notifications.map((notification) => (
                  <View key={notification.id} style={styles.notificationCard}>
                    <View style={styles.notificationRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notificationTitle}>
                          {notification.channel === 'DISCORD' ? 'Discord' : 'Email'} · {notification.status}
                        </Text>
                        <Text style={styles.notificationMeta}>
                          Intentos: {notification.attemptCount}
                          {notification.lastError ? ` · ${notification.lastError}` : ''}
                        </Text>
                      </View>
                      {notification.status === 'FAILED' ? (
                        <Button
                          size="small"
                          variant="outline"
                          onPress={() => void retryNotification(notification.id)}
                        >
                          Reintentar
                        </Button>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.center}>
                <Ionicons name="arrow-back-circle-outline" size={30} color={theme.textMuted} />
                <Text style={styles.emptyTitle}>Selecciona una solicitud</Text>
                <Text style={styles.emptyText}>Aquí aparecerá la conversación completa.</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default AdminHelpView;
