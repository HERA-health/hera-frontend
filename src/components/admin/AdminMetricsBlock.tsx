import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import type { MetricDefinition, MetricsBlock } from '../../services/adminMetricsTypes';
import { formatMetric, formatMetricsAxis, formatMetricsTime, metricStateLabels } from '../../utils/adminMetricsFormat';

interface Props {
  block: MetricsBlock; definitions: MetricDefinition[]; onInfo: (definitions: MetricDefinition[]) => void;
  group?: 'day' | 'week' | 'month';
}
export function AdminMetricsBlock({ block, definitions, onInfo, group = 'day' }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [width, setWidth] = useState(400);
  const [table, setTable] = useState(block.kind === 'table');
  const columns = block.columns.map(id => definitions.find(d => d.id === id)).filter((d): d is MetricDefinition => Boolean(d));
  const unavailable = ['restricted', 'unavailable', 'notApplicable', 'empty'].includes(block.state);
  const palette = [theme.primary, theme.secondaryDark, theme.warning];
  const numeric = (value: string | null, index: number) => {
    if (value === null) return 0;
    return Number(value) / (columns[index]?.unit === 'eurCents' ? 100 : 1);
  };
  const showLine = block.kind === 'line' && !table;
  const maxBar = Math.max(1, ...block.rows.map(r => Math.abs(numeric(r.values[0], 0))));
  const chartValues = block.rows.flatMap(row => columns.map((_, i) => numeric(row.values[i], i)));
  return <View style={styles.panel} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <View style={styles.heading}>
      <View style={styles.titleWrap}>
        <Text style={styles.title} accessibilityRole="header">{block.title}</Text>
        {block.stale && <Text style={styles.stale}>Dato anterior · {block.computedAt ? formatMetricsTime(block.computedAt) : ''}</Text>}
      </View>
      {block.kind !== 'table' && !unavailable && <Pressable onPress={() => setTable(v => !v)} accessibilityRole="button" accessibilityLabel={`${table ? 'Ver gráfico' : 'Ver tabla'}: ${block.title}`} style={styles.tool}>
        <Ionicons name={table ? 'bar-chart-outline' : 'list-outline'} size={17} color={theme.primary} />
      </Pressable>}
      <Pressable onPress={() => onInfo(columns)} accessibilityRole="button" accessibilityLabel={`Definición: ${block.title}`} style={styles.tool}><Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} /></Pressable>
    </View>
    {unavailable ? <View style={styles.message}><Text style={styles.messageTitle}>{metricStateLabels[block.state]}</Text><Text style={styles.note}>{block.note || (block.state === 'unavailable' ? 'Actualiza para volver a intentarlo.' : 'No hay observaciones para este intervalo.')}</Text></View>
      : <>
        {showLine ? <>
          <View style={styles.legend}>{columns.map((d, i) => <View key={d.id} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: palette[i % palette.length] }]} /><Text style={styles.legendText}>{d.label}{d.unit === 'eurCents' ? ' · €' : ''}</Text></View>)}</View>
          <View accessibilityLabel={`${block.title}. Consulta la tabla para todos los valores.`} style={styles.chart}>
            <LineChart dataSet={columns.map((d, i) => ({
              data: block.rows.map((r, index) => ({ value: numeric(r.values[i], i), labelComponent: () => <Text style={[styles.axis, { width: 52, textAlign: 'center', marginLeft: index === block.rows.length - 1 ? -32 : -16 }]}>{index % Math.max(1, Math.ceil(block.rows.length / 5)) === 0 ? formatMetricsAxis(r.label, group) : ''}</Text> })),
              color: palette[i % palette.length], thickness: 2, hideDataPoints: true,
            }))} width={Math.max(120, width - 88)} height={85} adjustToWidth disableScroll initialSpacing={32} endSpacing={32}
              maxValue={Math.max(3, Math.ceil(Math.max(0, ...chartValues) / 3) * 3)}
              mostNegativeValue={Math.floor(Math.min(0, ...chartValues) / 3) * 3}
              noOfSectionsBelowXAxis={chartValues.some(value => value < 0) ? 1 : 0}
              formatYLabel={value => Number(value).toLocaleString('es-ES', { notation: 'compact', maximumFractionDigits: 1 })}
              noOfSections={3} yAxisThickness={0} xAxisThickness={1} xAxisColor={theme.borderLight} rulesColor={theme.borderLight}
              yAxisTextStyle={styles.axis} xAxisLabelTextStyle={styles.axis} backgroundColor={theme.bgCard}
              isAnimated={false} hideRules={false} />
          </View>
        </> : table ? <View style={styles.table}>
          {block.rows.map((row, index) => <View key={`${row.label}-${index}`} style={styles.tableRow}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <View style={styles.cells}>{columns.map((d, i) => <View key={d.id} style={styles.cell}>
              <Text style={styles.cellLabel}>{d.label}</Text><Text selectable style={styles.cellValue}>{formatMetric(row.values[i] ?? null, d.unit)}</Text>
            </View>)}</View>
          </View>)}
        </View> : <View style={styles.bars}>
          {block.rows.map((row, index) => <View key={`${row.label}-${index}`} style={styles.barRow}>
            <View style={styles.barTop}><Text style={styles.barLabel}>{row.label}</Text><Text selectable style={styles.barValue}>{formatMetric(row.values[0] ?? null, columns[0]?.unit ?? 'count')}</Text></View>
            <View style={styles.barTrack}><View style={[styles.bar, { width: `${Math.min(100, Math.abs(numeric(row.values[0], 0)) / maxBar * 100)}%`, backgroundColor: numeric(row.values[0], 0) < 0 ? theme.warning : theme.primary }]} /></View>
            {columns.length > 1 && <Text style={styles.note}>{columns.slice(1).map((d, i) => `${d.label}: ${formatMetric(row.values[i + 1] ?? null, d.unit)}`).join(' · ')}</Text>}
          </View>)}
        </View>}
        {block.state === 'partial' && <Text style={styles.note}>Información incompleta · — indica que faltan datos, aún no ha pasado el tiempo necesario o el resultado está oculto para proteger grupos pequeños.</Text>}
        {!!block.note && <Text style={styles.note}>{block.note}</Text>}
      </>}
  </View>;
}

const createStyles = (t: Theme) => StyleSheet.create({
  panel: { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.borderLight, borderRadius: 10, padding: 16, minWidth: 0, flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, titleWrap: { flex: 1, minWidth: 0 },
  title: { fontFamily: t.fontSansSemiBold, fontSize: 14, color: t.textPrimary },
  tool: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  stale: { fontSize: 12, color: t.warning, marginTop: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontFamily: t.fontSans, fontSize: 12, color: t.textSecondary }, dot: { width: 7, height: 7, borderRadius: 4 },
  chart: { marginTop: 6, overflow: 'hidden', paddingBottom: 4 }, axis: { fontSize: 11, color: t.textSecondary },
  note: { fontFamily: t.fontSans, fontSize: 12, lineHeight: 18, color: t.textSecondary, marginTop: 8 },
  message: { minHeight: 145, justifyContent: 'center', alignItems: 'flex-start' }, messageTitle: { fontFamily: t.fontSansSemiBold, fontSize: 14, color: t.textSecondary },
  bars: { gap: 8 }, barRow: { gap: 4 }, barTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  barLabel: { flex: 1, color: t.textSecondary, fontFamily: t.fontSans, fontSize: 13 }, barValue: { fontVariant: ['tabular-nums'], fontSize: 13, color: t.textPrimary, fontFamily: t.fontSansSemiBold },
  barTrack: { height: 5, backgroundColor: t.primaryMuted, borderRadius: 3, overflow: 'hidden' }, bar: { height: 5, borderRadius: 3 },
  table: { gap: 2 }, tableRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.borderLight },
  rowLabel: { fontFamily: t.fontSansSemiBold, fontSize: 13, color: t.textPrimary, marginBottom: 6 },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, cell: { flexGrow: 1, flexBasis: 110, minWidth: 0 },
  cellLabel: { fontSize: 12, color: t.textSecondary, fontFamily: t.fontSans }, cellValue: { fontSize: 14, fontFamily: t.fontSansSemiBold, color: t.textPrimary, fontVariant: ['tabular-nums'], marginTop: 3 },
});
