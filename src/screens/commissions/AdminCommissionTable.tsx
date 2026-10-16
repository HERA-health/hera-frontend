import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { adminMonth } from '../../services/heraCommissionService';
import { Button, money } from './CommissionElements';

type Row = Awaited<ReturnType<typeof adminMonth>>['items'][number];

export function AdminCommissionTable({ rows, width, onOpen }: {
  rows: Row[]; width: number; onOpen: (accountId: string) => void;
}) {
  const { theme } = useTheme();
  const wide = width >= 960;
  const copy = { color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21 };
  const muted = { ...copy, color: theme.textSecondary, fontSize: 12, lineHeight: 18 };
  const strong = { ...copy, fontFamily: theme.fontSansSemiBold };
  const columns = ['Profesional', 'Actividad del mes', 'Comisión original', 'Comisión neta', 'Pendiente', ''];
  const metric = (label: string, value: string, detail: string, emphasis = false) => (
    <View style={[styles.metric, !wide && styles.mobileMetric]}>
      {!wide && <Text style={muted}>{label}</Text>}
      <Text style={[strong, styles.number, { textAlign: wide ? 'right' : 'left', color: emphasis ? theme.primary : theme.textPrimary }]}>{value}</Text>
      <Text style={[muted, { textAlign: wide ? 'right' : 'left' }]}>{detail}</Text>
    </View>
  );
  return <View style={{ gap: wide ? 0 : 16 }}>
    {wide && <View style={[styles.line, styles.heading, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
      <View style={styles.identity}><Text style={[muted, { fontFamily: theme.fontSansSemiBold }]}>{columns[0]}</Text></View>
      <View style={styles.figures}>{columns.slice(1, 5).map((label, index) => <View key={label} style={styles.metric}>
        <Text style={[muted, { fontFamily: theme.fontSansSemiBold, textAlign: index > 0 ? 'right' : 'left' }]}>{label}</Text>
      </View>)}</View>
      <View style={styles.action} />
    </View>}
    {rows.map(row => {
      const summary = row.summary;
      const notices = [
        ...(row.verificationStatus && row.verificationStatus !== 'VERIFIED' ? ['Verificación pendiente · Historial disponible'] : []),
        ...(!row.accepted ? ['Condiciones pendientes de aceptación'] : []),
        ...(summary?.unknownSessions ? [`${summary.unknownSessions} sesiones por calcular`] : []),
        ...(summary?.issues.some(issue => issue.status === 'OPEN') ? ['Solicitudes pendientes'] : []),
      ];
      return <View key={row.specialistId} style={[styles.line, styles.body, {
        flexDirection: wide ? 'row' : 'column', borderColor: theme.border,
        ...(!wide ? { borderWidth: 1, borderRadius: 16, backgroundColor: theme.bgCard, padding: 18 } : {}),
      }]}>
        <View style={[styles.identity, !wide && styles.stacked]}>
          <Text accessibilityRole="header" style={[strong, { fontSize: 16, lineHeight: 24 }]}>{row.specialistName}</Text>
          <Text style={[muted, { flexShrink: 1 }]}>{row.contact}</Text>
          {notices.length > 0 && <View style={{ gap: 5, marginTop: 7 }}>{notices.map(notice => <View key={notice} style={styles.notice}>
            <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary} style={{ marginTop: 2 }} />
            <Text style={[muted, { flex: 1 }]}>{notice}</Text>
          </View>)}</View>}
        </View>
        {summary ? <View style={[styles.figures, !wide && styles.stacked, !wide && { flexWrap: 'wrap', borderTopWidth: 1, borderColor: theme.border, paddingTop: 14 }]}>
          <View style={[styles.metric, !wide && styles.mobileMetric]}>
            {!wide && <Text style={muted}>Actividad del mes</Text>}
            <Text style={strong}>{summary.countedSessions} sesiones</Text>
            <Text style={muted}>{summary.patientCount} pacientes</Text>
            {summary.tiers.filter(tier => tier.count > 0).map(tier => <Text key={tier.rateBps} style={muted}>{tier.count} al {tier.rateBps / 100}%</Text>)}
          </View>
          {metric('Comisión original', money(summary.originalCents), `Ajustes ${money(summary.adjustmentCents - summary.cancellationCents)}`)}
          {metric('Comisión neta', money(summary.netCents), `Recibido ${summary.appliedCents === null ? 'por revisar' : money(summary.appliedCents)}`)}
          {metric('Pendiente', summary.pendingCents === null ? 'Por calcular' : money(summary.pendingCents), summary.period?.status === 'CLOSED' ? 'Mes cerrado' : summary.period?.status === 'PREPARED' ? 'Mes preparado' : 'Mes abierto', true)}
        </View> : <View style={{ flex: wide ? 4 : undefined, justifyContent: 'center' }}><Text style={muted}>Sin cuenta de comisiones para esta selección.</Text></View>}
        {(wide || row.accountId) && <View style={[styles.action, !wide && { width: '100%', alignItems: 'flex-end' }]}>
          {row.accountId && <Button size="small" variant="outline" accessibilityLabel={`Ver comisiones de ${row.specialistName}`} onPress={() => { if (row.accountId) onOpen(row.accountId); }}>Ver detalle</Button>}
        </View>}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: 24, paddingHorizontal: 16 },
  heading: { paddingVertical: 14, borderBottomWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  body: { paddingVertical: 24, borderBottomWidth: 1, alignItems: 'stretch' },
  identity: { flex: 2, minWidth: 0, gap: 3 },
  figures: { flex: 4, flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  metric: { flex: 1, minWidth: 0, gap: 5 },
  mobileMetric: { flexBasis: '40%', flexGrow: 1 },
  stacked: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  action: { width: 112, justifyContent: 'center' },
  number: { fontSize: 16, lineHeight: 24, fontVariant: ['tabular-nums'] },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
});
