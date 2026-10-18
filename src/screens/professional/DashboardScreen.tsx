import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { useAppAlertState } from '../../components/common/alert';
import { TourTarget } from '../../components/onboarding/TourTarget';
import { useProfessionalTourAutoStart, useProfessionalTourStepPreparation } from '../../components/onboarding/professionalTourContext';
import { useProfessionalTourScrollPreparation } from '../../components/onboarding/useProfessionalTourScrollPreparation';
import { useFocusedRateLimitRecovery } from '../../hooks/useGeneralRateLimit';
import { useBillingRefresh } from '../../hooks/useBillingRefresh';
import { subscribeProfessionalHomeChanges } from '../../services/dashboardService';
import { getStatistics, StatisticsData, StatisticsPeriod } from '../../services/statisticsService';
import { billingMetricComparison } from './utils/billingMetricComparison';
import { Meter, MONTHS, money, OriginChart, StatisticsTimeChart } from '../../components/professional/statistics/StatisticsCharts';

export function currentStatisticsMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  return { year: Number(parts.find(p => p.type === 'year')?.value), month: Number(parts.find(p => p.type === 'month')?.value) };
}

function Control({ label, children, onPress, disabled = false, selected = false }: {
  label: string; children: React.ReactNode; onPress: () => void; disabled?: boolean; selected?: boolean;
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={{ minWidth: 40, minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 7,
      backgroundColor: selected ? theme.actionPrimary : 'transparent', borderWidth: 2, borderColor: focused ? theme.focus : 'transparent', opacity: disabled ? .35 : 1 }}>
    {typeof children === 'string' ? <Text style={{ fontSize: 13, color: selected ? theme.actionPrimaryText : theme.textPrimary, fontFamily: theme.fontSansMedium }}>{children}</Text> : children}
  </Pressable>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.panel}>
    <View style={styles.panelHeader}><Text accessibilityRole="header" style={styles.panelTitle}>{title}</Text>{subtitle && <Text style={styles.caption}>{subtitle}</Text>}</View>
    {children}
  </View>;
}

export function DashboardScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [availableWidth, setAvailableWidth] = useState(0);
  const today = currentStatisticsMonth();
  const [period, setPeriod] = useState<StatisticsPeriod>({ period: 'month', ...today });
  const [selectedMonth, setSelectedMonth] = useState(today.month);
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const scroll = useProfessionalTourScrollPreparation();
  const { isVisible: isAlertVisible } = useAppAlertState();
  const wide = availableWidth >= 1080;
  const medium = availableWidth >= 680;
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError(null);
    try {
      const result = await getStatistics(period);
      if (id === request.current) setData(result);
    } catch (failure: unknown) {
      if (id === request.current) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar las estadísticas');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [period]);
  useFocusEffect(useCallback(() => {
    void load();
    const unsubscribe = subscribeProfessionalHomeChanges(() => { void load(); });
    return () => { request.current++; unsubscribe(); };
  }, [load]));
  useBillingRefresh(load, false);
  useFocusedRateLimitRecovery(() => { void load(); });
  useProfessionalTourAutoStart('professional_dashboard_v1', !loading && !error && data !== null && !isAlertVisible);
  const prepareIncome = useCallback(() => scroll.prepareTarget('professional.dashboard.income-chart'), [scroll]);
  const prepareKpis = useCallback(() => scroll.prepareTarget('professional.dashboard.kpis'), [scroll]);
  const prepareDetails = useCallback(() => scroll.prepareTarget('professional.dashboard.detail-charts'), [scroll]);
  useProfessionalTourStepPreparation('professional.dashboard.income-chart', prepareIncome);
  useProfessionalTourStepPreparation('professional.dashboard.kpis', prepareKpis);
  useProfessionalTourStepPreparation('professional.dashboard.detail-charts', prepareDetails);

  const changePeriod = (next: StatisticsPeriod) => {
    request.current++;
    setData(null); setLoading(true); setError(null); setPeriod(next);
    if (next.period === 'month') setSelectedMonth(next.month);
  };
  const changeYear = (year: number) => changePeriod(period.period === 'month'
    ? { period: 'month', year, month: Math.min(period.month, year === today.year ? today.month : 12) } : { period: 'year', year });
  const periodLabel = period.period === 'month' ? `${MONTHS[period.month - 1]} ${period.year}` : String(period.year);
  const kpiItems: Array<{ key: keyof StatisticsData['current']; label: string; helper: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
    { key: 'income', label: 'Ingresos cobrados', helper: 'Cobros menos devoluciones', icon: 'wallet-outline' },
    { key: 'completed', label: 'Sesiones completadas', helper: 'Sesiones atendidas', icon: 'calendar-outline' },
    { key: 'newPatients', label: 'Pacientes nuevos', helper: 'Primera sesión completada', icon: 'person-add-outline' },
    { key: 'activePatients', label: 'Pacientes activos', helper: 'Atendidos en el periodo', icon: 'people-outline' },
  ];
  const visible = !loading && !error ? data : null;
  return <View style={styles.screen} onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}>
    <ScrollView ref={scroll.scrollRef} {...scroll.scrollProps} contentContainerStyle={[styles.content, !medium && { padding: 16 }]}>
      <View style={styles.header}>
        <View style={{ gap: 4 }}><Text accessibilityRole="header" style={styles.title}>Estadísticas</Text><Text style={styles.subtitle}>Resumen de tu actividad profesional</Text></View>
        <View style={[styles.filters, !medium && { width: '100%', justifyContent: 'space-between' }]}>
          <View style={styles.controlGroup}>
            <Control label="Año anterior" disabled={period.year <= 1900} onPress={() => changeYear(period.year - 1)}><Ionicons name="chevron-back" size={16} color={theme.textPrimary} /></Control>
            <Text style={styles.year}>{period.year}</Text>
            <Control label="Año siguiente" disabled={period.year >= today.year} onPress={() => changeYear(period.year + 1)}><Ionicons name="chevron-forward" size={16} color={theme.textPrimary} /></Control>
          </View>
          <View style={[styles.controlGroup, styles.segment]}>
            <Control label="Vista mensual" selected={period.period === 'month'} onPress={() => changePeriod({ period: 'month', year: period.year, month: Math.min(selectedMonth, period.year === today.year ? today.month : 12) })}>Mes</Control>
            <Control label="Vista anual" selected={period.period === 'year'} onPress={() => changePeriod({ period: 'year', year: period.year })}>Año</Control>
          </View>
          {period.period === 'month' && <View style={{ minWidth: 134, ...(!medium && { width: '100%' as const }) }}><SimpleDropdown key={availableWidth} compact presentation="portal" keyboardNavigation accessibilityLabel="Mes de las estadísticas"
            optionsMinWidth={220} optionsAlign="right" maxHeight={300}
            options={MONTHS.map((label, i) => ({ label, value: i + 1 })).filter(option => period.year < today.year || option.value <= today.month)}
            value={period.month} onSelect={month => changePeriod({ period: 'month', year: period.year, month })} /></View>}
        </View>
      </View>
      <View style={styles.periodLine}>
        <Text style={styles.periodLabel}>{periodLabel}{visible?.period.inProgress ? ' · En curso' : ''}</Text>
        <Text style={styles.caption}>Comparación con el {period.period === 'month' ? 'mes' : 'año'} anterior completo</Text>
      </View>
      {loading && <View accessibilityRole="progressbar" accessibilityLabel="Cargando estadísticas" style={styles.message}><ActivityIndicator color={theme.primary} /><Text style={styles.subtitle}>Preparando tu resumen…</Text></View>}
      {error && <View style={styles.message}><Ionicons name="alert-circle-outline" size={28} color={theme.error} /><Text accessibilityRole="alert" style={styles.subtitle}>{error}</Text><Control label="Reintentar estadísticas" selected onPress={() => { void load(); }}>Reintentar</Control></View>}
      {visible && <>
        <TourTarget id="professional.dashboard.kpis" fill style={{ width: '100%' }}>
          <View style={styles.kpis}>{kpiItems.map(item => {
            const comparison = billingMetricComparison(visible.current[item.key], visible.previous[item.key]);
            const up = comparison.startsWith('+'), down = comparison.startsWith('−');
            return <View key={item.key} style={[styles.kpi, { width: medium ? '23%' : '47%' }]}>
              <View style={styles.kpiHeading}><View style={styles.iconBox}><Ionicons name={item.icon} size={18} color={theme.secondaryDark} /></View><Text style={styles.kpiLabel}>{item.label}</Text></View>
              <View style={styles.kpiNumbers}>
              <Text style={styles.kpiValue} adjustsFontSizeToFit numberOfLines={1}>{item.key === 'income' ? money(visible.current.income) : visible.current[item.key].toLocaleString('es-ES')}</Text>
              <View style={[styles.comparison, { backgroundColor: up ? theme.successBg : down ? theme.errorBg : theme.surfaceMuted }]}>
                <Text style={{ fontFamily: theme.fontSansMedium, fontSize: 11, color: up ? theme.success : down ? theme.error : theme.textSecondary }}>{up ? '↗ ' : down ? '↘ ' : ''}{comparison}</Text>
              </View>
              </View>
              <Text style={styles.caption}>{item.helper}</Text>
            </View>;
          })}</View>
        </TourTarget>
        <View style={styles.mainRow}>
          <View style={{ width: wide ? '45%' : '100%', flexGrow: 1 }}>
            <TourTarget id="professional.dashboard.income-chart" fill style={{ width: '100%', flex: 1 }}><View style={{ flex: 1 }}><Panel title="Ingresos y sesiones" subtitle={period.period === 'month' ? 'Evolución diaria' : 'Evolución mensual'}><StatisticsTimeChart key={`${periodLabel}-income`} data={visible} kind="income" /></Panel></View></TourTarget>
          </View>
          <View style={{ width: wide ? '25%' : medium ? '47%' : '100%', flexGrow: 1 }}><Panel title="Origen de tus pacientes" subtitle="Nuevos en el periodo"><OriginChart data={visible} /></Panel></View>
          <View style={{ width: wide ? '25%' : medium ? '47%' : '100%', flexGrow: 1 }}><Panel title="Actividad de sesiones" subtitle={periodLabel}>
            <View style={{ gap: 20, marginTop: 8 }}>
              <Meter label="Completadas" count={visible.activity.completed} max={Math.max(...Object.values(visible.activity), 1)} color={theme.primary} />
              <Meter label="Pendientes" count={visible.activity.pending} max={Math.max(...Object.values(visible.activity), 1)} color={theme.secondary} />
              <Meter label="Canceladas" count={visible.activity.cancelled} max={Math.max(...Object.values(visible.activity), 1)} color={theme.warning} />
              <Meter label="No asistidas" count={visible.activity.noShow} max={Math.max(...Object.values(visible.activity), 1)} color={theme.error} />
            </View>
            <Text style={[styles.caption, { marginTop: 16 }]}>Las ausencias solo incluyen las registradas expresamente.</Text>
          </Panel></View>
        </View>
        <TourTarget id="professional.dashboard.detail-charts" fill style={{ width: '100%' }}><View><Panel title="Evolución de pacientes" subtitle="Pacientes únicos en cada intervalo"><StatisticsTimeChart key={`${periodLabel}-patients`} data={visible} kind="patients" /></Panel></View></TourTarget>
        <View style={styles.secondaryHeader}><Text accessibilityRole="header" style={styles.panelTitle}>Más sobre tu consulta</Text><Text style={styles.caption}>Valoraciones y ritmo de actividad · {periodLabel}</Text></View>
        <View style={styles.mainRow}>
          <View style={{ width: medium ? '47%' : '100%', flexGrow: 1 }}><Panel title="Valoraciones" subtitle="Reseñas recibidas en el periodo">
            {visible.reviews.total === 0 ? <Text style={[styles.subtitle, { paddingVertical: 28 }]}>Sin reseñas en este periodo.</Text> : <View style={styles.reviewContent}>
              <View style={{ gap: 8, alignItems: 'center' }}><Text style={styles.rating}>{visible.reviews.average.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text><Text accessibilityLabel="Sobre cinco estrellas" style={{ color: theme.warningAmber }}>★★★★★</Text><Text style={styles.caption}>{visible.reviews.total} {visible.reviews.total === 1 ? 'reseña' : 'reseñas'}</Text></View>
              <View style={{ flex: 1, gap: 10 }}>{visible.reviews.breakdown.map(row => <Meter key={row.stars} label={`${row.stars} estrellas`} count={row.count} max={Math.max(...visible.reviews.breakdown.map(r => r.count), 1)} color={theme.secondary} />)}</View>
            </View>}
          </Panel></View>
          <View style={{ width: medium ? '47%' : '100%', flexGrow: 1 }}><Panel title="Sesiones por día" subtitle="Completadas · lunes a domingo">
            <View style={{ gap: 10 }}>{visible.weekdays.map(row => <Meter key={row.day} label={['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][row.day - 1]} count={row.count} max={Math.max(...visible.weekdays.map(d => d.count), 1)} color={theme.secondary} />)}</View>
          </Panel></View>
        </View>
      </>}
    </ScrollView>
  </View>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg }, content: { padding: 24, gap: 16, paddingBottom: 32 },
    header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
    title: { fontFamily: theme.fontSansBold, fontSize: 27, letterSpacing: -.6, color: theme.textPrimary },
    subtitle: { fontFamily: theme.fontSans, fontSize: 13, color: theme.textSecondary, lineHeight: 20 },
    filters: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, maxWidth: '100%' }, controlGroup: { flexDirection: 'row', alignItems: 'center' },
    segment: { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 9, padding: 2 },
    year: { fontSize: 13, fontFamily: theme.fontSansMedium, color: theme.textPrimary, minWidth: 42, textAlign: 'center' },
    periodLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' },
    periodLabel: { fontFamily: theme.fontSansMedium, fontSize: 12, color: theme.textSecondary },
    caption: { fontFamily: theme.fontSans, fontSize: 11, color: theme.textSecondary, lineHeight: 16 },
    kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    kpi: { flexGrow: 1, backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight, paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
    kpiNumbers: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, rowGap: 4 },
    kpiHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    iconBox: { width: 28, height: 28, borderRadius: 7, backgroundColor: theme.secondaryMuted, alignItems: 'center', justifyContent: 'center' },
    kpiLabel: { flex: 1, fontFamily: theme.fontSansMedium, color: theme.textPrimary, fontSize: 12 },
    kpiValue: { fontFamily: theme.fontSansBold, color: theme.textPrimary, fontSize: 27, letterSpacing: -.6 },
    comparison: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, flexShrink: 1 },
    mainRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 14 },
    panel: { flex: 1, backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14,
      shadowColor: theme.shadowCard, shadowOpacity: .3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
    panelHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 16 },
    panelTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 14 }, secondaryHeader: { gap: 4, marginTop: 8 },
    reviewContent: { flexDirection: 'row', alignItems: 'center', gap: 28, paddingVertical: 10 },
    rating: { fontSize: 40, fontFamily: theme.fontSansBold, color: theme.textPrimary },
    message: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 14 },
  });
}
export default DashboardScreen;
