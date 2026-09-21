import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { AdminMetricsBlock } from '../../components/admin/AdminMetricsBlock';
import { SchedulerDateRangeSelector, type SchedulerDateRangeOpenField } from '../../components/scheduling/SchedulerDateRangeSelector';
import { getMadridDateKey } from '../../utils/madridTime';
import { getAdminMetrics } from '../../services/adminMetricsService';
import type { MetricDefinition, MetricsBlock, MetricsFilters, MetricsResponse, MetricsSection } from '../../services/adminMetricsTypes';
import { formatMetric, formatMetricsDate, formatMetricsTime, metricComparison, metricStateLabels } from '../../utils/adminMetricsFormat';
import { downloadMetrics, metricsDownloadSupported } from '../../utils/adminMetricsDownload';
import { dashboardMaxRangeDays, validateDashboardFilters } from '../../utils/adminMetricsFilters';
export { dashboardDefaultFilters } from '../../utils/adminMetricsFilters';

const sections: { value: MetricsSection; label: string }[] = [
  { value: 'overview', label: 'Resumen' }, { value: 'growth', label: 'Crecimiento' }, { value: 'demand', label: 'Demanda' },
  { value: 'agenda', label: 'Agenda' }, { value: 'economy', label: 'Economía' }, { value: 'operations', label: 'Operación' },
];
const presets: { value: MetricsFilters['preset']; label: string }[] = [
  { value: '7d', label: 'Últimos 7 días' }, { value: '30d', label: 'Últimos 30 días' }, { value: 'month', label: 'Mes actual' },
  { value: '12m', label: 'Últimos 12 meses' }, { value: 'custom', label: 'Personalizado' },
];
interface Props {
  section: MetricsSection; filters: MetricsFilters;
  onChange: (section: MetricsSection, filters: MetricsFilters) => void;
  onNavigate: (destination: NonNullable<MetricsBlock['rows'][number]['destination']>) => void;
}
export function AdminDashboardScreen({ section, filters, onChange, onNavigate }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [width, setWidth] = useState(1000);
  const [measuredContentWidth, setMeasuredContentWidth] = useState<number | null>(null);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState(false);
  const [reload, setReload] = useState(0);
  const [information, setInformation] = useState<MetricDefinition[] | null>(null);
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState(filters.from ?? '');
  const [to, setTo] = useState(filters.to ?? '');
  const [dateError, setDateError] = useState('');
  const [dateField, setDateField] = useState<SchedulerDateRangeOpenField>(null);
  const generation = useRef(0);
  const requestKey = JSON.stringify({ section, filters });
  const lastLoadedKey = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || (!information && !custom) || typeof document === 'undefined') return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setInformation(null); setCustom(false); }
    };
    document.addEventListener('keydown', closeOnEscape, true);
    return () => document.removeEventListener('keydown', closeOnEscape, true);
  }, [information, custom]);
  useEffect(() => {
    const controller = new AbortController();
    const id = ++generation.current;
    setLoading(true); setError(''); setFilterError(false);
    if (lastLoadedKey.current !== requestKey) setData(null);
    const validation = validateDashboardFilters(filters);
    if (validation) {
      setError(validation); setFilterError(true); setLoading(false);
      return () => controller.abort();
    }
    void getAdminMetrics(section, filters, controller.signal).then(response => {
      if (generation.current === id && !controller.signal.aborted) { setData(response); lastLoadedKey.current = requestKey; }
    }).catch((failure: unknown) => {
      if (generation.current !== id || controller.signal.aborted) return;
      if (axios.isAxiosError<{ code?: unknown; message?: unknown }>(failure)
        && failure.response?.status === 400 && failure.response.data.code === 'VALIDATION_ERROR') {
        setFilterError(true);
        setError(typeof failure.response.data.message === 'string' ? failure.response.data.message : 'Revisa los filtros del dashboard.');
      } else setError('No se pudieron actualizar los datos. Revisa la conexión y vuelve a intentarlo.');
    }).finally(() => { if (generation.current === id && !controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestKey, reload]); // Primitive key deliberately represents the complete request.
  const visibleData = lastLoadedKey.current === requestKey ? data : null;
  const compact = width < 768;
  const kpiColumns = width >= 1200 ? 6 : compact ? 2 : 3;
  const contentWidth = measuredContentWidth ?? Math.max(250, width - (compact ? 32 : 40));
  const cards = visibleData?.blocks.filter(b => b.kind !== 'attention' && !(section === 'overview' && b.id === 'overdue')) ?? [];
  const attention = visibleData?.blocks.filter(b => b.kind === 'attention') ?? [];
  const overdue = visibleData?.blocks.find(b => b.id === 'overdue')?.rows[0]?.values[0] ?? null;
  const computed = [...(visibleData?.kpis.map(k => k.computedAt) ?? []), ...(visibleData?.blocks.map(b => b.computedAt) ?? [])].filter((d): d is string => Boolean(d)).sort();
  const stale = visibleData?.kpis.some(k => k.stale) || visibleData?.blocks.some(b => b.stale);
  const allowsDaily = filters.preset !== '12m' && (filters.preset !== 'custom' || !filters.from || !filters.to || (Date.parse(filters.to) - Date.parse(filters.from)) / 86400000 < 90);
  const chartGroup = visibleData?.range.group ?? (allowsDaily ? filters.group ?? 'day' : filters.group === 'week' ? 'week' : 'month');
  const patchFilters = (next: Partial<MetricsFilters>) => onChange(section, { ...filters, ...next });
  const selectPreset = (preset: MetricsFilters['preset']) => {
    if (preset === 'custom') { setFrom(filters.from ?? visibleData?.range.from ?? getMadridDateKey()); setTo(filters.to ?? visibleData?.range.to ?? getMadridDateKey()); setDateError(''); setDateField(null); setCustom(true); }
    else patchFilters({ preset, from: undefined, to: undefined, group: preset === '12m' ? 'month' : 'day' });
  };
  const applyCustom = () => {
    const next: MetricsFilters = { ...filters, preset: 'custom', from, to, group: (Date.parse(to) - Date.parse(from)) / 86400000 < 90 ? 'day' : 'month' };
    const validation = validateDashboardFilters(next);
    if (validation) { setDateError(validation); return; }
    onChange(section, next);
    setCustom(false);
  };
  const exportCsv = () => {
    if (!visibleData) return;
    try { downloadMetrics(visibleData); } catch { setFilterError(false); setError('No se pudo descargar el CSV. Vuelve a intentarlo.'); }
  };
  const timeLabel = (d: MetricDefinition) => d.timeBasis === 'now' ? 'Situación actual' : d.timeBasis === 'cohort' ? 'Según el tiempo de seguimiento indicado' : 'En el período seleccionado';
  return <View style={styles.root} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={styles.top}>
        <View style={styles.titleGroup}><Text style={styles.eyebrow}>HERA / CONTROL DE NEGOCIO</Text><Text style={styles.title} accessibilityRole="header">Dashboard</Text></View>
        <View style={[styles.filters, compact && styles.filtersCompact]}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Período</Text>
            <SimpleDropdown compact presentation="portal" options={presets} value={filters.preset} onSelect={selectPreset} accessibilityLabel="Período del dashboard" optionsMinWidth={240} maxHeight={300} />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Agrupar gráficos</Text>
            <View style={styles.segments} accessibilityRole="radiogroup" accessibilityLabel="Agrupación de los gráficos">
              {([{ value: 'day', label: 'Día' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }] as const).map(option => {
                const disabled = option.value === 'day' && !allowsDaily;
                return <Pressable key={option.value} style={[styles.segment, chartGroup === option.value && styles.segmentSelected, disabled && styles.segmentDisabled]}
                  accessibilityRole="radio" accessibilityLabel={`Agrupar por ${option.label.toLowerCase()}`} accessibilityState={{ checked: chartGroup === option.value, disabled }}
                  accessibilityHint={disabled ? 'Disponible en períodos de hasta 90 días' : 'Cambia la evolución de los gráficos; conserva el período y sus totales'}
                  disabled={disabled} onPress={() => patchFilters({ group: option.value })}>
                  <Text style={[styles.segmentText, chartGroup === option.value && styles.segmentTextSelected]}>{option.label}</Text>
                </Pressable>;
              })}
            </View>
          </View>
          <View style={styles.filterActions}>
          <Pressable style={[styles.button, filters.compare === 'true' && styles.selectedButton]} accessibilityRole="checkbox" accessibilityState={{ checked: filters.compare === 'true' }} accessibilityLabel="Comparar con el período anterior" onPress={() => patchFilters({ compare: filters.compare === 'true' ? 'false' : 'true' })}>
            <Ionicons name="git-compare-outline" size={16} color={theme.primary} /><Text style={styles.buttonText}>Comparar</Text>
          </Pressable>
          <Pressable style={styles.button} accessibilityRole="button" accessibilityLabel="Actualizar dashboard" disabled={loading} onPress={() => setReload(v => v + 1)}>
            {loading ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="refresh-outline" size={17} color={theme.primary} />}
          </Pressable>
          {metricsDownloadSupported && <Pressable style={styles.button} accessibilityRole="button" accessibilityLabel="Exportar CSV agregado" disabled={!visibleData?.enabled || loading} onPress={exportCsv}><Ionicons name="download-outline" size={16} color={theme.primary} /><Text style={styles.buttonText}>CSV</Text></Pressable>}
          </View>
        </View>
      </View>
      <Text style={styles.filterHint}>{allowsDaily ? 'El período fija los totales; la agrupación cambia la evolución de los gráficos.' : 'El período fija los totales. Para más de 90 días, agrupa los gráficos por semana o mes.'}</Text>
      <View style={styles.nav} accessibilityRole="tablist">{sections.map(item => <Pressable key={item.value} style={[styles.navItem, section === item.value && styles.navSelected]} accessibilityRole="tab" accessibilityState={{ selected: section === item.value }} onPress={() => { onChange(item.value, filters); scrollRef.current?.scrollTo({ y: 0, animated: false }); }}><Text style={[styles.navText, section === item.value && styles.navTextSelected]}>{item.label}</Text></Pressable>)}</View>
      <View style={styles.metaRow}>
        {visibleData ? <View style={styles.periods}>
          <View style={styles.periodGroup}><Text style={styles.periodLabel}>Período{visibleData.range.partial ? ' · en curso' : ''}</Text><Text style={styles.periodValue}>{formatMetricsDate(visibleData.range.from)} — {formatMetricsDate(visibleData.range.to)}</Text></View>
          {visibleData.range.compare && <View style={styles.periodGroup}><Text style={styles.periodLabel}>Comparado con</Text><Text style={styles.periodValue}>{formatMetricsDate(visibleData.range.previousStart)} — {formatMetricsDate(new Date(Date.parse(visibleData.range.previousEnd) - 1).toISOString())}</Text></View>}
        </View> : <Text style={styles.meta}>Agenda individual · datos agregados</Text>}
        <View style={styles.periodGroup}>{!!computed.length && <Text style={[styles.periodValue, stale && styles.stale]}>{stale ? 'Datos anteriores' : 'Calculado'}: {formatMetricsTime(computed[0])}</Text>}<Text style={styles.periodLabel}>Horario de Madrid</Text></View>
      </View>
      {section === 'economy' && visibleData && <View style={styles.economyFilters}><SimpleDropdown compact presentation="portal" accessibilityLabel="Operador económico" options={[{ value: '', label: 'Todos los operadores' }, ...visibleData.operators.map(o => ({ value: o.key, label: o.label }))]} value={filters.operatorKey ?? ''} onSelect={operatorKey => patchFilters({ operatorKey: operatorKey || undefined })} /><Text style={styles.meta}>Solo operaciones reales · comisiones: {visibleData.mode === 'LIVE' ? 'en funcionamiento' : visibleData.mode === 'SIMULATION' ? 'en simulación' : 'desactivadas'}</Text></View>}
      {!!error && <View style={styles.error} accessibilityRole="alert"><Text style={styles.errorText}>{error}{visibleData ? ' Se conservan los datos anteriores con su fecha original.' : ''}</Text><Pressable onPress={() => filterError ? selectPreset('custom') : setReload(v => v + 1)} accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>{filterError ? 'Corregir intervalo' : 'Reintentar'}</Text></Pressable></View>}
      {loading && !visibleData && <View style={styles.loading} accessibilityLabel="Cargando indicadores"><ActivityIndicator color={theme.primary} /><Text style={styles.meta}>Preparando los indicadores…</Text></View>}
      {visibleData && !visibleData.enabled && <View style={styles.disabled}><Ionicons name="analytics-outline" size={30} color={theme.primary} /><Text style={styles.disabledTitle}>Dashboard pendiente de activación</Text><Text style={styles.meta}>Las herramientas de gestión siguen disponibles en el panel.</Text></View>}
      {visibleData?.enabled && <>
        <View style={styles.kpis} onLayout={e => setMeasuredContentWidth(e.nativeEvent.layout.width)}>{visibleData.kpis.map(kpi => {
          const definition = visibleData.definitions.find(d => d.id === kpi.definitionId);
          if (!definition) return null;
          const showComparison = kpi.state === 'available' && definition.timeBasis === 'period' && visibleData.range.compare;
          return <View key={kpi.definitionId} style={[styles.kpi, { width: (contentWidth - 12 * (kpiColumns - 1)) / kpiColumns }]}>
            <View style={styles.kpiHeading}><Text style={styles.kpiLabel}>{definition.label}</Text><Pressable onPress={() => setInformation([definition])} accessibilityLabel={`Definición: ${definition.label}`} accessibilityRole="button" style={styles.info}><Ionicons name="information-circle-outline" size={17} color={theme.textSecondary} /></Pressable></View>
            <Text style={[styles.kpiValue, definition.unit === 'eurCents' && styles.moneyValue, compact && definition.unit === 'eurCents' && styles.compactMoneyValue]} selectable>{formatMetric(kpi.value, definition.unit)}</Text>
            <Text style={[styles.kpiCaption, showComparison && styles.comparisonValue]}>{kpi.state !== 'available' ? metricStateLabels[kpi.state] : showComparison ? metricComparison(kpi.value, kpi.previous, definition.unit) : timeLabel(definition)}</Text>
            {showComparison && kpi.previous !== null && <Text style={styles.kpiCaption}>Anterior: {formatMetric(kpi.previous, definition.unit)}</Text>}
            {kpi.definitionId === 'pending' && section === 'overview' && <Text style={styles.kpiCaption}>Vencido: {formatMetric(overdue, 'eurCents')}</Text>}
            {kpi.stale && <Text style={styles.stale}>Dato anterior</Text>}
          </View>;
        })}</View>
        <View style={styles.grid}>{cards.map((block, index) => {
          const columns = compact ? 1 : section === 'overview' && index >= 2 && width >= 1100 ? 3 : 2;
          const cardWidth = (contentWidth - 12 * (columns - 1)) / columns;
          return <View key={block.id} style={{ width: cardWidth, minWidth: 0 }}><AdminMetricsBlock block={block} definitions={visibleData.definitions} onInfo={setInformation} group={visibleData.range.group} /></View>;
        })}
          {!!attention.length && <View style={[styles.attention, { width: compact ? contentWidth : (contentWidth - 12 * (width >= 1100 ? 2 : 1)) / (width >= 1100 ? 3 : 2) }]}>
            <View style={styles.attentionHeading}><View style={styles.attentionDot} /><Text style={styles.panelTitle}>Necesita atención</Text></View>
            {attention.map(block => { const row = block.rows[0]; return <View key={block.id} style={styles.attentionRow}><Pressable accessibilityRole={row.destination ? 'button' : undefined} accessibilityLabel={`${row.label}: ${row.values[0] ?? metricStateLabels[block.state]}`} disabled={!row.destination} onPress={() => row.destination && onNavigate(row.destination)} style={styles.attentionAction}>
              <Text style={styles.attentionLabel}>{row.label}</Text><Text style={styles.attentionValue}>{block.state === 'available' ? formatMetric(row.values[0], 'count') : '—'}</Text>{row.destination && <Ionicons name="chevron-forward" size={14} color={theme.primary} />}
            </Pressable><Pressable style={styles.info} accessibilityRole="button" accessibilityLabel={`Definición: ${block.title}`} onPress={() => setInformation(visibleData.definitions.filter(d => block.columns.includes(d.id)))}><Ionicons name="information-circle-outline" size={17} color={theme.textSecondary} /></Pressable></View>; })}
            <Text style={styles.meta}>Estado actual · sin acceso a expedientes</Text>
          </View>}
        </View>
        <Text style={styles.footer}>{visibleData.scope}. Se utiliza la información que sigue guardada en HERA. Los registros eliminados o incompletos pueden afectar a las cifras. Los datos de prueba sin identificar también pueden estar incluidos.</Text>
        {!metricsDownloadSupported && <Text style={styles.footer}>La exportación CSV está disponible en la versión web.</Text>}
      </>}
    </ScrollView>
    <Modal visible={information !== null || custom} transparent animationType="fade" onRequestClose={() => { setInformation(null); setCustom(false); }}>
      <View style={styles.overlay}><View style={[styles.modal, custom && styles.dateModal]} accessibilityViewIsModal>
        <View style={styles.modalHeading}><Text style={styles.panelTitle}>{custom ? 'Intervalo personalizado' : 'Cómo se calcula'}</Text><Pressable style={styles.info} onPress={() => { setInformation(null); setCustom(false); }} accessibilityLabel="Cerrar información" accessibilityRole="button"><Ionicons name="close" size={22} color={theme.textPrimary} /></Pressable></View>
        {custom ? <ScrollView contentContainerStyle={styles.dateFields}>
          <Text style={styles.meta}>Fechas de Madrid · ambos días incluidos · máximo 12 meses</Text>
          <SchedulerDateRangeSelector
            value={{ startDate: from, endDate: to }} openField={dateField}
            onOpenFieldChange={setDateField} presentation="inline" maxRangeDays={dashboardMaxRangeDays(from)}
            maxDate={getMadridDateKey()} testIDPrefix="metrics-range"
            onChange={range => { setFrom(range.startDate); setTo(range.endDate); setDateError(''); }}
          />
          {!!dateError && <Text style={styles.errorText} accessibilityRole="alert">{dateError}</Text>}
        </ScrollView> : <ScrollView>{information?.map(definition => <View key={definition.id} style={styles.definition}><Text style={styles.definitionTitle}>{definition.label}</Text><Text style={styles.definitionText}>{definition.formula}</Text><Text style={styles.meta}>{timeLabel(definition)} · Información de: {definition.source}</Text><Text style={styles.definitionCaption}>Qué debes tener en cuenta</Text><Text style={styles.definitionText}>{definition.limitation}</Text></View>)}</ScrollView>}
        {custom && <Pressable onPress={applyCustom} accessibilityRole="button" style={[styles.button, styles.selectedButton, styles.dateApply]}><Text style={styles.buttonText}>Aplicar intervalo</Text></Pressable>}
      </View></View>
    </Modal>
  </View>;
}

const createStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: t.bg }, content: { padding: 20, paddingTop: 16, paddingBottom: 36 }, contentCompact: { paddingHorizontal: 16 },
  top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }, titleGroup: { gap: 3 },
  eyebrow: { color: t.primary, fontSize: 10, letterSpacing: 1.2, fontFamily: t.fontSansSemiBold }, title: { fontSize: 26, lineHeight: 30, color: t.textPrimary, fontFamily: t.fontDisplay },
  filterField: { gap: 5 }, filterLabel: { fontFamily: t.fontSansSemiBold, fontSize: 12, color: t.textSecondary },
  filterActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterHint: { fontFamily: t.fontSans, fontSize: 12, lineHeight: 18, color: t.textSecondary, marginBottom: 6 },
  segments: { flexDirection: 'row', borderWidth: 1, borderColor: t.border, borderRadius: 7, padding: 3, gap: 2 },
  segment: { minHeight: 34, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 4 },
  segmentSelected: { backgroundColor: t.primaryMuted }, segmentDisabled: { opacity: 0.4 },
  segmentText: { fontFamily: t.fontSans, fontSize: 13, color: t.textSecondary }, segmentTextSelected: { color: t.primary, fontFamily: t.fontSansSemiBold },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, minWidth: 0, maxWidth: '100%' }, filtersCompact: { width: '100%' },
  button: { minHeight: 40, minWidth: 40, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: t.border, borderRadius: 6 },
  selectedButton: { backgroundColor: t.primaryMuted, borderColor: t.primaryAlpha20 }, buttonText: { color: t.primary, fontFamily: t.fontSansSemiBold, fontSize: 13 },
  nav: { flexDirection: 'row', flexWrap: 'wrap', borderBottomColor: t.border, borderBottomWidth: 1, gap: 4 }, navItem: { paddingHorizontal: 12, minHeight: 38, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  navSelected: { borderBottomColor: t.primary }, navText: { fontFamily: t.fontSans, fontSize: 13, color: t.textSecondary }, navTextSelected: { fontFamily: t.fontSansSemiBold, color: t.primary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 }, meta: { fontFamily: t.fontSans, fontSize: 13, lineHeight: 19, color: t.textSecondary },
  periods: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, rowGap: 8, flexShrink: 1 }, periodGroup: { gap: 2, minWidth: 0 },
  periodLabel: { fontFamily: t.fontSans, fontSize: 13, lineHeight: 18, color: t.textSecondary }, periodValue: { fontFamily: t.fontSansSemiBold, fontSize: 14, lineHeight: 20, color: t.textPrimary },
  economyFilters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 12 }, kpi: { minWidth: 0, paddingVertical: 6, paddingHorizontal: 10, borderLeftWidth: 2, borderLeftColor: t.primaryAlpha20 },
  kpiHeading: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 24 }, kpiLabel: { flex: 1, color: t.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: t.fontSans },
  info: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -5 },
  kpiValue: { color: t.textPrimary, fontFamily: t.fontSansSemiBold, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'], marginBottom: 3 }, moneyValue: { fontSize: 24 },
  compactMoneyValue: { fontSize: 18, lineHeight: 26 },
  kpiCaption: { fontFamily: t.fontSans, color: t.textSecondary, fontSize: 13, lineHeight: 19 }, comparisonValue: { fontFamily: t.fontSansSemiBold, color: t.textPrimary }, stale: { color: t.warning, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  attention: { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.borderLight, borderRadius: 10, padding: 16 }, attentionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  attentionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.warning }, panelTitle: { flex: 1, fontSize: 14, color: t.textPrimary, fontFamily: t.fontSansSemiBold },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderBottomWidth: 1, borderBottomColor: t.borderLight }, attentionLabel: { flex: 1, fontSize: 13, fontFamily: t.fontSans, color: t.textSecondary },
  attentionAction: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  attentionValue: { fontSize: 18, fontVariant: ['tabular-nums'], fontFamily: t.fontSansSemiBold, color: t.textPrimary }, footer: { marginTop: 16, fontSize: 12, lineHeight: 18, fontFamily: t.fontSans, color: t.textSecondary },
  error: { backgroundColor: t.errorBg, padding: 12, borderRadius: 8, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }, errorText: { color: t.error, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  loading: { minHeight: 230, alignItems: 'center', justifyContent: 'center', gap: 14 }, disabled: { minHeight: 250, alignItems: 'center', justifyContent: 'center', gap: 12 }, disabledTitle: { fontSize: 18, color: t.textPrimary, fontFamily: t.fontSansSemiBold },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 560, maxHeight: '85%', backgroundColor: t.bgCard, borderRadius: 14, padding: 20 },
  modalHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 }, definition: { gap: 10, paddingBottom: 18, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: t.borderLight },
  definitionTitle: { fontSize: 16, color: t.textPrimary, fontFamily: t.fontSansSemiBold }, definitionCaption: { fontSize: 13, color: t.textPrimary, fontFamily: t.fontSansSemiBold, marginTop: 4 }, definitionText: { fontSize: 14, lineHeight: 22, color: t.textPrimary, fontFamily: t.fontSans },
  dateModal: { maxHeight: '94%' }, dateFields: { gap: 10 }, dateApply: { marginTop: 12, flexShrink: 0 },
});
