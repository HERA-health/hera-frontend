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
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_CATEGORY_OPTIONS,
  FEEDBACK_STATUS_LABELS,
} from '../../constants/specialistContact';
import * as contactService from '../../services/specialistContactService';
import type {
  AdminFeedbackDetail,
  AdminFeedbackListItem,
  SpecialistFeedbackCategory,
  SpecialistFeedbackStatus,
} from '../../services/specialistContactService';
import { ContactStatusPill } from './ContactStatusPill';
import { createAdminContactStyles } from './adminContactStyles';

const STATUS_OPTIONS = (
  Object.keys(FEEDBACK_STATUS_LABELS) as SpecialistFeedbackStatus[]
).map((value) => ({ value, label: FEEDBACK_STATUS_LABELS[value] }));

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

export function AdminFeedbackView({
  onSummaryChanged,
}: {
  onSummaryChanged?: () => Promise<void> | void;
}) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const styles = useMemo(
    () => createAdminContactStyles(theme, isDark, isDesktop),
    [theme, isDark, isDesktop]
  );

  const [items, setItems] = useState<AdminFeedbackListItem[]>([]);
  const [selected, setSelected] = useState<AdminFeedbackDetail | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SpecialistFeedbackStatus | null>(null);
  const [category, setCategory] = useState<SpecialistFeedbackCategory | null>(null);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const loadingMoreRef = useRef(false);

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
      const page = await contactService.listAdminFeedback({
        cursor: nextCursor,
        status: status ?? undefined,
        category: category ?? undefined,
        search: search || undefined,
      });
      if (requestVersion !== listRequestRef.current) return;
      setItems((current) => append ? mergeUniqueById(current, page.items) : page.items);
      setCursor(page.nextCursor);
    } catch (loadError) {
      if (requestVersion === listRequestRef.current) {
        setError(getErrorMessage(loadError, 'No se pudieron cargar los comentarios.'));
      }
    } finally {
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
      if (requestVersion === listRequestRef.current) setLoading(false);
    }
  }, [category, search, status]);

  const openFeedback = async (id: string) => {
    const requestVersion = ++detailRequestRef.current;
    setLoadingDetail(true);
    setError(null);
    setRefreshWarning(null);
    try {
      const detail = await contactService.getAdminFeedback(id);
      if (requestVersion === detailRequestRef.current) setSelected(detail);
    } catch (loadError) {
      if (requestVersion === detailRequestRef.current) {
        setError(getErrorMessage(loadError, 'No se pudo abrir el comentario.'));
      }
    } finally {
      if (requestVersion === detailRequestRef.current) setLoadingDetail(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void loadPage();
  }, [loadPage]);

  const changeStatus = async (nextStatus: SpecialistFeedbackStatus) => {
    if (!selected) return;
    const feedbackId = selected.id;
    setError(null);
    setRefreshWarning(null);
    let update: contactService.FeedbackStateUpdate;
    try {
      update = await contactService.updateAdminFeedbackStatus(feedbackId, nextStatus);
      setSelected((current) => current?.id === feedbackId
        ? {
            ...current,
            status: update.status,
            closedAt: update.closedAt,
            updatedAt: update.updatedAt,
          }
        : current
      );
      setItems((current) => current.map((item) => item.id === feedbackId
        ? { ...item, status: update.status, updatedAt: update.updatedAt }
        : item
      ));
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'No se pudo actualizar el estado.'));
      return;
    }

    try {
      await onSummaryChanged?.();
    } catch {
      setRefreshWarning('El estado se ha guardado, pero los contadores no se han podido actualizar.');
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
            options={FEEDBACK_CATEGORY_OPTIONS}
            value={category}
            onSelect={setCategory}
            onClear={() => setCategory(null)}
            placeholder="Todas las categorías"
            compact
          />
        </View>
      </View>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          {error}
        </Text>
      ) : null}
      {refreshWarning ? (
        <Text style={styles.warning} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {refreshWarning}
        </Text>
      ) : null}

      <View style={styles.split}>
        {showList ? (
          <View style={[styles.panel, styles.listPanel]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Comentarios</Text>
              <Text style={styles.panelSubtitle}>{items.length} comentarios cargados</Text>
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
                    <Ionicons name="sparkles-outline" size={28} color={theme.textMuted} />
                    <Text style={styles.emptyTitle}>No hay comentarios</Text>
                    <Text style={styles.emptyText}>Prueba a cambiar los filtros.</Text>
                  </View>
                ) : items.map((item) => (
                  <AnimatedPressable
                    key={item.id}
                    onPress={() => void openFeedback(item.id)}
                    style={[
                      styles.listItem,
                      selected?.id === item.id && styles.listItemSelected,
                    ]}
                  >
                    <View style={styles.listTop}>
                      <Text style={styles.reference}>{item.reference}</Text>
                      <ContactStatusPill
                        status={item.status}
                        label={FEEDBACK_STATUS_LABELS[item.status]}
                      />
                    </View>
                    <Text style={styles.specialist}>{item.specialist.name}</Text>
                    <Text style={styles.meta}>
                      {FEEDBACK_CATEGORY_LABELS[item.category]} · {formatDate(item.createdAt)}
                    </Text>
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
                nestedScrollEnabled
              >
                {!isDesktop ? (
                  <AnimatedPressable
                    style={styles.back}
                    onPress={() => {
                      detailRequestRef.current += 1;
                      setSelected(null);
                    }}
                  >
                    <Ionicons name="arrow-back" size={18} color={theme.primary} />
                    <Text style={styles.backText}>Volver</Text>
                  </AnimatedPressable>
                ) : null}
                <View style={styles.listTop}>
                  <Text style={styles.reference}>{selected.reference}</Text>
                  <ContactStatusPill
                    status={selected.status}
                    label={FEEDBACK_STATUS_LABELS[selected.status]}
                  />
                </View>
                <Text style={styles.detailHeading}>
                  {FEEDBACK_CATEGORY_LABELS[selected.category]}
                </Text>
                <Text style={styles.detailMeta}>
                  {selected.specialist.name} · {formatDate(selected.createdAt)}
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
                <Text style={styles.bodyCard}>{selected.body}</Text>
                <View style={styles.contextCard}>
                  <Text style={styles.contextText}>
                    Contexto técnico: {selected.platform ?? 'sin plataforma'} · versión {selected.appVersion ?? 'no disponible'} · pantalla {selected.screenName ?? 'no indicada'}
                  </Text>
                </View>
                <Text style={styles.panelSubtitle}>
                  Este flujo no permite respuestas ni genera avisos por Discord.
                </Text>
              </ScrollView>
            ) : (
              <View style={styles.center}>
                <Ionicons name="arrow-back-circle-outline" size={30} color={theme.textMuted} />
                <Text style={styles.emptyTitle}>Selecciona un comentario</Text>
                <Text style={styles.emptyText}>Aquí aparecerá el texto completo.</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default AdminFeedbackView;
