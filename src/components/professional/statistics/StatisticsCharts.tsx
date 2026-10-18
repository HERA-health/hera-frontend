import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../../contexts/ThemeContext';
import type { StatisticsData } from '../../../services/statisticsService';

export const money = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const integer = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value);

export function integerChartAxis(values: number[]) {
  const low = Math.min(0, ...values), high = Math.max(0, ...values);
  const rawStep = Math.max(1, (high - low) / 3);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = (rawStep / magnitude <= 1 ? 1 : rawStep / magnitude <= 2 ? 2 : rawStep / magnitude <= 5 ? 5 : 10) * magnitude;
  const min = Math.floor(low / step) * step;
  const max = Math.max(step, Math.ceil(high / step) * step);
  return { min, max, ticks: Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => min + index * step) };
}

export function Legend({ items }: { items: Array<{ label: string; color: string; shape?: 'bar' | 'line' }> }) {
  const { theme } = useTheme();
  return <View style={styles.legend}>{items.map(item => <View key={item.label} style={styles.legendItem}>
    {item.shape === 'line' ? <View style={{ width: 18, height: 2, backgroundColor: item.color, justifyContent: 'center', alignItems: 'center' }}><View style={[styles.dot, { backgroundColor: item.color }]} /></View>
      : <View style={[styles.dot, item.shape === 'bar' && { width: 9, height: 12, borderRadius: 2 }, { backgroundColor: item.color }]} />}
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12 }}>{item.label}</Text>
  </View>)}</View>;
}

/** SVG supplies a shared web/native plot; real focusable controls expose every exact value. */
export function StatisticsTimeChart({ data, kind }: { data: StatisticsData; kind: 'income' | 'patients' }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const rows = data.series;
  const income = kind === 'income';
  const height = income ? 210 : 165;
  const left = income ? 56 : 42, right = income ? 38 : 12, top = 16, bottom = height - 27;
  const plotWidth = Math.max(1, width - left - right);
  const step = plotWidth / Math.max(rows.length, 1);
  const firstValues = rows.map(row => income ? row.income : row.newPatients);
  const secondValues = rows.map(row => income ? row.completed : row.recurrentPatients);
  const axis = integerChartAxis([...firstValues, ...(income ? [] : secondValues)]);
  const { min, max } = axis;
  const sessionAxis = integerChartAxis(secondValues);
  const secondMax = income ? sessionAxis.max : max;
  const y = (value: number) => bottom - ((value - min) / (max - min)) * (bottom - top);
  const y2 = (value: number) => income ? bottom - (value / secondMax) * (bottom - top) : y(value);
  const x = (index: number) => left + step * (index + 0.5);
  const line = (values: number[], scale: (v: number) => number) => values.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${scale(v)}`).join(' ');
  const active = rows.find(row => row.key === selected);
  const label = (key: string) => data.period.period === 'year' ? MONTHS[Number(key.slice(5, 7)) - 1].slice(0, 3) : String(Number(key.slice(8, 10)));
  const fullLabel = (key: string) => data.period.period === 'year' ? `${MONTHS[Number(key.slice(5, 7)) - 1]} ${data.period.year}` : `${Number(key.slice(8, 10))} de ${MONTHS[Number(key.slice(5, 7)) - 1].toLowerCase()}`;
  const details = (row: StatisticsData['series'][number]) => income ? `${money(row.income)} cobrados · ${row.completed} sesiones completadas` : `${row.newPatients} nuevos · ${row.recurrentPatients} recurrentes`;
  const allZero = [...firstValues, ...secondValues].every(v => v === 0);
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%' }}>
    <Legend items={income ? [{ label: 'Barras · ingresos cobrados', color: theme.secondary, shape: 'bar' }, { label: 'Línea · sesiones completadas', color: theme.primary, shape: 'line' }]
      : [{ label: 'Nuevos', color: theme.primary }, { label: 'Recurrentes', color: theme.secondaryDark }]} />
    {income && <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: theme.secondaryDark, fontFamily: theme.fontSansMedium, fontSize: 11 }}>Ingresos (€) · izquierda</Text>
      <Text style={{ color: theme.primary, fontFamily: theme.fontSansMedium, fontSize: 11 }}>Sesiones · derecha</Text>
    </View>}
    <View style={{ height }}>
      {width > 0 && <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Svg width={width} height={height}>
        {axis.ticks.map(value => {
          return <React.Fragment key={value}>
            <Line x1={left} y1={y(value)} x2={width - right} y2={y(value)} stroke={theme.borderLight} strokeDasharray="3 4" />
            <SvgText x={left - 8} y={y(value) + 4} textAnchor="end" fontFamily={theme.fontSans} fontSize={10} fill={income ? theme.secondaryDark : theme.textSecondary}>{integer(value)}{income ? ' €' : ''}</SvgText>
          </React.Fragment>;
        })}
        {income && <>
          <Line x1={width - right} y1={top} x2={width - right} y2={bottom} stroke={theme.primary} opacity={.3} />
          {sessionAxis.ticks.map(value => <SvgText key={value} x={width - right + 8} y={y2(value) + 4} fontFamily={theme.fontSansMedium} fontSize={10} fill={theme.primary}>{integer(value)}</SvgText>)}
        </>}
        {income && <Line x1={left} y1={y(0)} x2={width - right} y2={y(0)} stroke={theme.borderStrong} />}
        {income ? rows.map((row, i) => <Rect key={row.key} x={x(i) - Math.min(step * .58, 26) / 2} y={Math.min(y(row.income), y(0))}
          width={Math.min(step * .58, 26)} height={Math.abs(y(row.income) - y(0))} rx={3} fill={theme.secondary} opacity={.8} />)
          : <Path d={line(firstValues, y)} fill="none" stroke={theme.primary} strokeWidth={2} />}
        <Path d={line(secondValues, y2)} fill="none" stroke={income ? theme.primary : theme.secondaryDark} strokeWidth={2} />
        {rows.map((row, i) => <React.Fragment key={row.key}>
          {!income && <Circle cx={x(i)} cy={y(row.newPatients)} r={2.6} fill={theme.primary} />}
          <Circle cx={x(i)} cy={y2(secondValues[i])} r={row.key === selected ? 4.5 : 2.6} fill={income ? theme.primary : theme.secondaryDark} />
          {(i % Math.max(1, Math.ceil(rows.length / (width < 400 ? 7 : 12))) === 0 || i === rows.length - 1) && <SvgText x={x(i)} y={height - 5} textAnchor="middle" fontFamily={theme.fontSans} fontSize={10} fill={theme.textSecondary}>{label(row.key)}</SvgText>}
        </React.Fragment>)}
      </Svg></View>}
      <View style={[StyleSheet.absoluteFill, { left, right, bottom: 22, flexDirection: 'row' }]}>
        {rows.map(row => <Pressable key={row.key} accessibilityRole="button" accessibilityLabel={`${fullLabel(row.key)}: ${details(row)}`}
          onFocus={() => setSelected(row.key)} onPress={() => setSelected(row.key)}
          style={{ flex: 1, borderWidth: row.key === selected ? 1 : 0, borderColor: theme.focus, borderRadius: 4 }} />)}
      </View>
    </View>
    <Text accessibilityLiveRegion="polite" style={{ marginTop: 6, lineHeight: 16, fontSize: 12, color: theme.textSecondary, fontFamily: theme.fontSans }}>
      {active ? `${fullLabel(active.key)} · ${details(active)}` : allZero ? 'Sin actividad registrada en este periodo.' : 'Selecciona un punto para ver el detalle.'}
    </Text>
  </View>;
}

export function OriginChart({ data }: { data: StatisticsData }) {
  const { theme } = useTheme();
  const total = data.current.newPatients;
  const items = [
    { label: 'Directorio HERA', count: data.origins.directory, color: theme.primary },
    { label: 'Pacientes propios', count: data.origins.own, color: theme.secondaryDark },
    { label: 'Derivaciones', count: data.origins.referrals, color: theme.secondary },
    { label: 'Otros / sin determinar', count: data.origins.other, color: theme.warning },
  ];
  const radius = 48, circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <View>
    <View style={{ alignItems: 'center', marginVertical: 6 }}>
      <Svg width={142} height={142} accessibilityLabel={`${total} pacientes nuevos`} accessibilityRole="image">
        <Circle cx={71} cy={71} r={radius} stroke={theme.borderLight} strokeWidth={19} fill="none" />
        {items.map(item => {
          const length = total ? item.count / total * circumference : 0;
          const start = offset; offset += length;
          return length > 0 ? <Circle key={item.label} cx={71} cy={71} r={radius} fill="none" stroke={item.color} strokeWidth={19}
            strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} transform="rotate(-90 71 71)" /> : null;
        })}
        <SvgText x={71} y={66} textAnchor="middle" fontFamily={theme.fontSansBold} fontSize={24} fill={theme.textPrimary}>{total}</SvgText>
        <SvgText x={71} y={82} textAnchor="middle" fontFamily={theme.fontSans} fontSize={10} fill={theme.textSecondary}>pacientes</SvgText>
        <SvgText x={71} y={95} textAnchor="middle" fontFamily={theme.fontSans} fontSize={10} fill={theme.textSecondary}>nuevos</SvgText>
      </Svg>
    </View>
    {items.map(item => <View key={item.label} style={[styles.legendItem, { marginVertical: 5 }]}>
      <View style={[styles.dot, { backgroundColor: item.color }]} /><Text style={{ flex: 1, fontSize: 12, fontFamily: theme.fontSans, color: theme.textSecondary }}>{item.label}</Text>
      <Text style={{ fontSize: 12, fontFamily: theme.fontSans, color: theme.textSecondary }}>{total ? Math.round(item.count / total * 100) : 0}%</Text>
      <Text style={{ minWidth: 22, textAlign: 'right', fontSize: 12, fontFamily: theme.fontSansBold, color: theme.textPrimary }}>{item.count}</Text>
    </View>)}
    {total === 0 && <Text style={{ marginTop: 8, fontSize: 12, color: theme.textSecondary }}>Sin nuevos pacientes en este periodo.</Text>}
  </View>;
}

export function Meter({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const { theme } = useTheme();
  return <View style={{ gap: 7 }} accessibilityLabel={`${label}: ${count}`} accessible>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ fontFamily: theme.fontSans, fontSize: 13, color: theme.textSecondary }}>{label}</Text>
      <Text style={{ fontFamily: theme.fontSansBold, fontSize: 13, color: theme.textPrimary }}>{count}</Text>
    </View>
    <View style={{ height: 8, backgroundColor: theme.borderLight, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${max ? count / max * 100 : 0}%`, backgroundColor: color, borderRadius: 4 }} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
