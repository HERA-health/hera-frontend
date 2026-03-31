import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { heraLanding, colors, spacing, borderRadius, typography, shadows } from '../../constants/colors';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { dashboardService, DashboardData } from '../../services/dashboardService';

// ============================================================================
// CONSTANTS
// ============================================================================

const STRINGS = {
  title: 'Dashboard',
  incomeLabel: 'Cobrado este mes',
  sessionsLabel: 'Sesiones este mes',
  patientsLabel: 'Pacientes activos',
  patientsSubLabel: 'Últimos 90 días',
  upcomingLabel: 'Próximas sesiones',
  upcomingSubLabel: 'Esta semana',
  incomeChartTitle: 'Ingresos mensuales',
  incomeChartSubtitle: 'Últimos 12 meses',
  incomeEmpty: 'Sin datos aún',
  donutTitle: 'Sesiones este mes',
  donutSubtitle: 'Por estado',
  donutEmpty: 'Sin sesiones este mes',
  dayChartTitle: 'Sesiones por día',
  dayChartSubtitle: 'Últimos 90 días · completadas',
  dayChartEmpty: 'Sin sesiones registradas',
  legendCompleted: 'Completadas',
  legendCancelled: 'Canceladas',
  legendPending: 'Pendientes',
  donutCenterLabel: 'Total',
  placeholderSoon: 'Próximamente',
  placeholderDesc: 'Reseñas de pacientes',
  errorDefault: 'No se pudieron cargar los datos',
  errorLoading: 'Error al cargar el dashboard',
  retry: 'Reintentar',
};

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun',
                      'Jul','Ago','Sep','Oct','Nov','Dic'];

// Muted bar color for non-current months — no exact token in palette
const MUTED_BAR_COLOR = heraLanding.primaryMuted;

// Layout constants
const KPI_COLUMN_WIDTH = 280;
const KPI_GAP = 10;
const CARD_GAP = 12;
const CARD_BORDER_WIDTH = 0.5;
const BOTTOM_CARD_MIN_HEIGHT = 220;

// KPI accent line
const KPI_ACCENT_RADIUS = 2;
const KPI_ACCENT_MB = 8;

// Legend dot
const LEGEND_DOT_SIZE = 7;

// Horizontal bar dimensions
const HBAR_LABEL_WIDTH = 28;
const HBAR_COUNT_WIDTH = 18;
const HBAR_HEIGHT = 9;
const HBAR_RADIUS = 5;

// Font sizes not in the typography scale
const FONT_CARD_TITLE = 13;
const FONT_CARD_SUB = 11;
const FONT_AXIS = 8;
const FONT_DONUT_CENTER_LABEL = 8;
const FONT_PLACEHOLDER_TITLE = 11;
const FONT_PLACEHOLDER_DESC = 10;
const FONT_HBAR_LABEL = 11;
const FONT_HBAR_COUNT = 10;

// Spacing values not in the spacing scale
const CARD_HEADER_MB = 14;
const LEGEND_PV = 6;
const PLACEHOLDER_GAP = 6;
const EMPTY_PV = 32;
const PLACEHOLDER_ICON_SIZE = 20;
const DONUT_CENTER_VALUE_SIZE = 16;

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (amount: number): string => {
  return `€${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getCurrentMonthLabel = (): string => {
  const now = new Date();
  return `${MONTH_NAMES_ES[now.getMonth()]} ${now.getFullYear()}`;
};

// ============================================================================
// CHART COLORS
// ============================================================================

const CHART_COLORS = {
  completed: heraLanding.success,
  cancelled: heraLanding.warning,
  pending: heraLanding.secondary,
};

const KPI_ACCENTS = {
  income: heraLanding.primary,
  sessions: heraLanding.secondary,
  patients: heraLanding.info,
  upcoming: heraLanding.warning,
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface KpiCardProps {
  value: string;
  label: string;
  sublabel: string;
  accentColor: string;
  valueColor?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ value, label, sublabel, accentColor, valueColor }) => (
  <>
    <View style={[styles.kpiAccent, { backgroundColor: accentColor }]} />
    <Text style={[styles.kpiValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.kpiSub} numberOfLines={1}>{sublabel}</Text>
  </>
);

interface LegendRowProps {
  color: string;
  label: string;
  count: number;
  isLast: boolean;
}

const LegendRow: React.FC<LegendRowProps> = ({ color, label, count, isLast }) => (
  <>
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendCount}>{count}</Text>
    </View>
    {!isLast && <View style={styles.legendDivider} />}
  </>
);

interface HBarRowProps {
  label: string;
  count: number;
  maxValue: number;
}

const HBarRow: React.FC<HBarRowProps> = ({ label, count, maxValue }) => {
  const fillPercent = maxValue > 0 ? (count / maxValue) * 100 : 0;
  return (
    <View style={styles.legendRow}>
      <Text style={styles.hbarLabel}>{label}</Text>
      <View style={styles.hbarTrack}>
        <View style={[styles.hbarFill, { width: `${fillPercent}%` as unknown as number }]} />
      </View>
      <Text style={styles.hbarCount}>{count}</Text>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [chartWidth, setChartWidth] = useState<number>(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardService.getDashboardData();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : STRINGS.errorLoading);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Earliest year with data — used to clamp backward navigation
  const earliestAvailableYear = useMemo(() => {
    if (!data?.charts.monthlyIncome.length) return new Date().getFullYear();
    return parseInt(data.charts.monthlyIncome[0].month.slice(0, 4), 10);
  }, [data]);

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return <LoadingState fullScreen />;
  }

  // ── Error state ────────────────────────────────────────────────
  if (error || !data) {
    return (
      <EmptyState
        fullScreen
        icon="alert-circle-outline"
        message={error || STRINGS.errorDefault}
        actionLabel={STRINGS.retry}
        onAction={loadData}
      />
    );
  }

  // ── Data ───────────────────────────────────────────────────────
  const { kpis, charts } = data;

  // Monthly income bar chart data — year-based with pagination
  const nowDate = new Date();
  const currentMonthStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;

  const yearData = MONTH_LABELS.map((label, index) => {
    const monthStr = `${chartYear}-${String(index + 1).padStart(2, '0')}`;
    const found = charts.monthlyIncome.find((m) => m.month === monthStr);
    return {
      value: found ? found.total : 0,
      label,
      monthStr,
    };
  });

  const monthlyIncomeBarData = yearData.map((item) => {
    const isCurrent = item.monthStr === currentMonthStr;
    return {
      value: item.value,
      label: item.label,
      frontColor: isCurrent ? heraLanding.primaryDark : MUTED_BAR_COLOR,
      topLabelComponent: item.value > 0
        ? () => (
            <Text style={styles.barTopLabel}>
              {`€${Math.round(item.value)}`}
            </Text>
          )
        : undefined,
    };
  });

  const allIncomeZero = yearData.every((item) => item.value === 0);

  // Session status donut data
  const { completed, cancelled, pending } = charts.sessionStatusBreakdown;
  const totalSessions = completed + cancelled + pending;
  const allSessionsZero = totalSessions === 0;

  const donutData = [
    { value: completed || 0.001, color: CHART_COLORS.completed, text: String(completed) },
    { value: cancelled || 0.001, color: CHART_COLORS.cancelled, text: String(cancelled) },
    { value: pending || 0.001, color: CHART_COLORS.pending, text: String(pending) },
  ];

  // Sessions by day — horizontal bar chart (custom), ensure Saturday is included
  const sessionsByDayWithSat = charts.sessionsByDayOfWeek.find((item) => item.day === 5)
    ? charts.sessionsByDayOfWeek
    : [...charts.sessionsByDayOfWeek, { day: 5, label: 'Sáb', count: 0 }];
  const maxDayCount = Math.max(...sessionsByDayWithSat.map((item) => item.count), 1);


  // ── Render ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header — same pattern as BillingScreen */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{STRINGS.title}</Text>
      </View>

      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

        {/* ── MOBILE: KPI cards above chart ─────────────────────── */}
        {!isDesktop && (
          <View style={styles.mobileKpiGrid}>
            <View style={[styles.kpiCard, styles.mobileKpiCard]}>
              <KpiCard value={formatCurrency(kpis.incomeThisMonth)} label={STRINGS.incomeLabel} sublabel={getCurrentMonthLabel()} accentColor={KPI_ACCENTS.income} valueColor={heraLanding.primary} />
            </View>
            <View style={[styles.kpiCard, styles.mobileKpiCard]}>
              <KpiCard value={String(kpis.sessionsThisMonth.total)} label={STRINGS.sessionsLabel} sublabel={`${kpis.sessionsThisMonth.completed} comp. · ${kpis.sessionsThisMonth.cancelled} canc.`} accentColor={KPI_ACCENTS.sessions} />
            </View>
            <View style={[styles.kpiCard, styles.mobileKpiCard]}>
              <KpiCard value={String(kpis.activePatients)} label={STRINGS.patientsLabel} sublabel={STRINGS.patientsSubLabel} accentColor={KPI_ACCENTS.patients} />
            </View>
            <View style={[styles.kpiCard, styles.mobileKpiCard]}>
              <KpiCard value={String(kpis.upcomingThisWeek)} label={STRINGS.upcomingLabel} sublabel={STRINGS.upcomingSubLabel} accentColor={KPI_ACCENTS.upcoming} />
            </View>
          </View>
        )}

        {/* ── TOP ROW ──────────────────────────────────────────── */}
        <View style={isDesktop ? styles.topRow : undefined}>
          {/* LEFT: Bar chart card */}
          <View style={[styles.card, isDesktop && styles.flex1]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{STRINGS.incomeChartTitle}</Text>
            </View>
            {/* Year pagination */}
            <View style={styles.yearNavRow}>
              <TouchableOpacity
                onPress={() => setChartYear((y) => y - 1)}
                disabled={chartYear <= earliestAvailableYear}
                style={[styles.yearNavButton, chartYear <= earliestAvailableYear && styles.yearNavDisabled]}
              >
                <Text style={styles.yearNavArrow}>{'‹'}</Text>
              </TouchableOpacity>
              <Text style={styles.yearNavLabel}>
                {chartYear}
              </Text>
              <TouchableOpacity
                onPress={() => setChartYear((y) => y + 1)}
                disabled={chartYear >= new Date().getFullYear()}
                style={[styles.yearNavButton, chartYear >= new Date().getFullYear() && styles.yearNavDisabled]}
              >
                <Text style={styles.yearNavArrow}>{'›'}</Text>
              </TouchableOpacity>
            </View>
            {allIncomeZero ? (
              <Text style={styles.emptyText}>{STRINGS.incomeEmpty}</Text>
            ) : (
              <View
                style={styles.chartWrapper}
                onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
              >
                {chartWidth > 0 && (
                  <BarChart
                    data={monthlyIncomeBarData}
                    width={chartWidth}
                    barWidth={Math.floor((chartWidth - 40) / 12) - 6}
                    spacing={6}
                    height={160}
                    extraHeight={28}
                    barBorderTopLeftRadius={borderRadius.sm}
                    barBorderTopRightRadius={borderRadius.sm}
                    xAxisLabelTextStyle={{ fontSize: 9, color: heraLanding.textMuted }}
                    hideYAxisText
                    hideAxes={false}
                    hideRules={false}
                    rulesColor={heraLanding.borderLight}
                    xAxisColor={heraLanding.border}
                    yAxisColor={'transparent'}
                    noOfSections={4}
                    isAnimated
                    animationDuration={600}
                  />
                )}
              </View>
            )}
          </View>

          {/* RIGHT: 2x2 KPI grid (desktop only) */}
          {isDesktop && (
            <View style={styles.desktopKpiColumn}>
              <View style={styles.desktopKpiRow}>
                <View style={[styles.kpiCard, styles.flex1]}>
                  <KpiCard value={formatCurrency(kpis.incomeThisMonth)} label={STRINGS.incomeLabel} sublabel={getCurrentMonthLabel()} accentColor={KPI_ACCENTS.income} valueColor={heraLanding.primary} />
                </View>
                <View style={[styles.kpiCard, styles.flex1]}>
                  <KpiCard value={String(kpis.sessionsThisMonth.total)} label={STRINGS.sessionsLabel} sublabel={`${kpis.sessionsThisMonth.completed} comp. · ${kpis.sessionsThisMonth.cancelled} canc.`} accentColor={KPI_ACCENTS.sessions} />
                </View>
              </View>
              <View style={styles.desktopKpiRow}>
                <View style={[styles.kpiCard, styles.flex1]}>
                  <KpiCard value={String(kpis.activePatients)} label={STRINGS.patientsLabel} sublabel={STRINGS.patientsSubLabel} accentColor={KPI_ACCENTS.patients} />
                </View>
                <View style={[styles.kpiCard, styles.flex1]}>
                  <KpiCard value={String(kpis.upcomingThisWeek)} label={STRINGS.upcomingLabel} sublabel={STRINGS.upcomingSubLabel} accentColor={KPI_ACCENTS.upcoming} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── BOTTOM ROW ───────────────────────────────────────── */}
        <View style={[styles.bottomRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          {/* LEFT: Placeholder (desktop only) */}
          {isDesktop && (
            <View style={[styles.card, styles.placeholder, styles.flex1, styles.bottomCardHeight]}>
              <Text style={styles.placeholderIcon}>★</Text>
              <Text style={styles.placeholderText}>{STRINGS.placeholderSoon}</Text>
              <Text style={styles.placeholderSubText}>{STRINGS.placeholderDesc}</Text>
            </View>
          )}

          {/* MIDDLE: Donut chart */}
          <View style={[styles.card, styles.flex1, styles.bottomCardHeight]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{STRINGS.donutTitle}</Text>
              <Text style={styles.cardSub}>{STRINGS.donutSubtitle}</Text>
            </View>
            {allSessionsZero ? (
              <Text style={styles.emptyText}>{STRINGS.donutEmpty}</Text>
            ) : (
              <View style={styles.donutContainer}>
                <PieChart
                  data={donutData}
                  donut
                  radius={50}
                  innerRadius={35}
                  centerLabelComponent={() => (
                    <View style={styles.donutCenter}>
                      <Text style={styles.donutCenterValue}>{totalSessions}</Text>
                      <Text style={styles.donutCenterLabel}>{STRINGS.donutCenterLabel}</Text>
                    </View>
                  )}
                  isAnimated
                />
                <View style={styles.legendContainer}>
                  <LegendRow color={CHART_COLORS.completed} label={STRINGS.legendCompleted} count={completed} isLast={false} />
                  <LegendRow color={CHART_COLORS.cancelled} label={STRINGS.legendCancelled} count={cancelled} isLast={false} />
                  <LegendRow color={CHART_COLORS.pending} label={STRINGS.legendPending} count={pending} isLast />
                </View>
              </View>
            )}
          </View>

          {/* RIGHT: Sessions by day */}
          <View style={[styles.card, styles.flex1, styles.bottomCardHeight]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{STRINGS.dayChartTitle}</Text>
              <Text style={styles.cardSub}>{STRINGS.dayChartSubtitle}</Text>
            </View>
            <View style={styles.hbarContainer}>
              {sessionsByDayWithSat.map((item) => (
                <HBarRow key={item.day} label={item.label} count={item.count} maxValue={maxDayCount} />
              ))}
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const CONTENT_PH = 24;
const CONTENT_PV = 20;
const CONTENT_GAP = 14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  header: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
    textAlign: 'center',
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: CONTENT_PH,
    paddingVertical: CONTENT_PV,
    gap: CONTENT_GAP,
  },
  flex1: {
    flex: 1,
  },

  // ── TOP ROW ──────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    alignItems: 'stretch',
  },

  // ── Desktop KPI column ───────────────────────────────────────
  desktopKpiColumn: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'column',
    gap: KPI_GAP,
  },
  desktopKpiRow: {
    flexDirection: 'row',
    gap: KPI_GAP,
    flex: 1,
  },

  // ── Mobile KPI grid ──────────────────────────────────────────
  mobileKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: KPI_GAP,
  },
  mobileKpiCard: {
    width: '48.5%' as unknown as number,
    flexGrow: 0,
    flexShrink: 0,
  },

  // ── BOTTOM ROW ───────────────────────────────────────────────
  bottomRow: {
    gap: CARD_GAP,
  },
  bottomCardHeight: {
    minHeight: BOTTOM_CARD_MIN_HEIGHT,
  },

  // ── Card ─────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: heraLanding.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CARD_HEADER_MB,
  },
  cardTitle: {
    fontSize: FONT_CARD_TITLE,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textPrimary,
  },
  cardSub: {
    fontSize: FONT_CARD_SUB,
    color: heraLanding.textMuted,
  },

  // ── KPI card ─────────────────────────────────────────────────
  kpiCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: heraLanding.border,
    padding: 16,
    ...shadows.sm,
  },
  kpiAccent: {
    height: 3,
    borderRadius: KPI_ACCENT_RADIUS,
    width: '100%',
    marginBottom: KPI_ACCENT_MB,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },
  kpiLabel: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginTop: 8,
  },
  kpiSub: {
    fontSize: 11,
    color: heraLanding.textMuted,
    marginTop: 4,
  },

  // ── Year navigation ─────────────────────────────────────────
  yearNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  yearNavButton: {
    padding: spacing.xs,
  },
  yearNavDisabled: {
    opacity: 0.3,
  },
  yearNavArrow: {
    fontSize: 16,
    color: heraLanding.primary,
  },
  yearNavLabel: {
    fontSize: FONT_CARD_TITLE,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textPrimary,
  },

  // ── Bar chart ────────────────────────────────────────────────
  chartWrapper: {
    width: '100%' as unknown as number,
    overflow: 'hidden',
  },
  axisText: {
    fontSize: FONT_AXIS,
    color: heraLanding.textMuted,
  },
  barTopLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },

  // ── Donut ────────────────────────────────────────────────────
  donutContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: DONUT_CENTER_VALUE_SIZE,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textPrimary,
  },
  donutCenterLabel: {
    fontSize: FONT_DONUT_CENTER_LABEL,
    color: heraLanding.textSecondary,
  },

  // ── Legend ───────────────────────────────────────────────────
  legendContainer: {
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LEGEND_PV,
  },
  legendDot: {
    width: LEGEND_DOT_SIZE,
    height: LEGEND_DOT_SIZE,
    borderRadius: LEGEND_DOT_SIZE / 2,
  },
  legendLabel: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textSecondary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  legendCount: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
  },
  legendDivider: {
    height: CARD_BORDER_WIDTH,
    backgroundColor: heraLanding.borderLight,
  },

  // ── Horizontal bar chart ─────────────────────────────────────
  hbarContainer: {
    gap: spacing.sm,
  },
  hbarLabel: {
    width: HBAR_LABEL_WIDTH,
    fontSize: FONT_HBAR_LABEL,
    color: heraLanding.textSecondary,
  },
  hbarTrack: {
    flex: 1,
    height: HBAR_HEIGHT,
    backgroundColor: heraLanding.borderLight,
    borderRadius: HBAR_RADIUS,
    overflow: 'hidden',
  },
  hbarFill: {
    height: '100%' as unknown as number,
    backgroundColor: heraLanding.secondary,
    borderRadius: HBAR_RADIUS,
  },
  hbarCount: {
    width: HBAR_COUNT_WIDTH,
    fontSize: FONT_HBAR_COUNT,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
    textAlign: 'right',
  },

  // ── Placeholder ──────────────────────────────────────────────
  placeholder: {
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: PLACEHOLDER_GAP,
  },
  placeholderIcon: {
    fontSize: PLACEHOLDER_ICON_SIZE,
    color: heraLanding.textMuted,
  },
  placeholderText: {
    fontSize: FONT_PLACEHOLDER_TITLE,
    color: heraLanding.textMuted,
  },
  placeholderSubText: {
    fontSize: FONT_PLACEHOLDER_DESC,
    color: heraLanding.textMuted,
  },

  // ── Empty state ──────────────────────────────────────────────
  emptyText: {
    textAlign: 'center',
    color: heraLanding.textSecondary,
    fontSize: typography.fontSizes.xs,
    paddingVertical: EMPTY_PV,
  },
});

export default DashboardScreen;
