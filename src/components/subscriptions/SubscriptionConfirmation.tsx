import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { SubscriptionCommand, SubscriptionPreview, SubscriptionPlan } from '../../services/subscriptionService';
import { formatMadridInstant } from '../../utils/madridTime';
import { formatPrivatePrice } from '../../utils/privateTariff';
import { Button } from '../common/Button';
import { FocusedActionSheet } from '../finance/FocusedActionSheet';

const planName: Record<SubscriptionPlan, string> = { DIRECTORIO: 'Directorio', CALMA: 'Calma', CRECIMIENTO: 'Crecimiento', HORIZONTE: 'Horizonte' };
const dateLabel = (value: string, withTime = false) => formatMadridInstant(value, {
  day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
});

export function SubscriptionConfirmation({ command, preview, operationLabel, specialistName, busy, error, onConfirm, onClose }: {
  command: SubscriptionCommand; preview: SubscriptionPreview; operationLabel: string; specialistName?: string;
  busy: boolean; error: string; onConfirm: () => void; onClose: () => void;
}) {
  const { theme } = useTheme(); const compact = useWindowDimensions().width < 520;
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 22 };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const changed = preview.after.filter(period => {
    const before = preview.before.find(p => p.id === period.id);
    return !before || before.plan !== period.plan || before.startsAt !== period.startsAt || before.endsAt !== period.endsAt || before.voidedAt !== period.voidedAt;
  });
  const current = preview.before.find(p => !p.voidedAt && p.startsAt <= preview.effectiveAt && p.endsAt > preview.effectiveAt);
  const lastEnd = preview.after.filter(p => !p.voidedAt && p.endsAt > preview.effectiveAt).map(p => p.endsAt).sort().at(-1);
  const caution = command.kind === 'CANCEL' || command.kind === 'CORRECT' && command.void || command.kind === 'DOWNGRADE';
  const accent = caution ? theme.warning : theme.success;
  const dates = (startsAt: string, endsAt: string, withTime = false) => <View style={styles.row}>
    <View style={styles.column}><Text style={[text, styles.caption]}>Desde</Text><Text style={strong}>{dateLabel(startsAt, withTime)}</Text></View>
    <View style={styles.column}><Text style={[text, styles.caption]}>Hasta</Text><Text style={strong}>{dateLabel(endsAt, withTime)}</Text></View>
  </View>;
  return <FocusedActionSheet visible title="Revisa antes de confirmar" description={specialistName} onClose={onClose} dismissible={!busy}
    footer={<View style={{ gap: 12 }}>
      {!!error && <Text accessibilityRole="alert" style={[text, { color: theme.error }]}>{error}</Text>}
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: 10 }}>
      <Button style={{ flex: compact ? undefined : 1 }} onPress={onConfirm} loading={busy}>Confirmar operación</Button>
      <Button variant="outline" disabled={busy} onPress={onClose}>Volver a editar</Button>
      </View>
    </View>}>
    <View style={[styles.summary, { backgroundColor: caution ? theme.warningBg : theme.successLight }]}>
      <View style={[styles.row, { alignItems: 'center' }]}>
        <Ionicons name={preview.payment ? 'receipt-outline' : caution ? 'calendar-outline' : 'checkmark-circle-outline'} size={24} color={accent} accessible={false} />
        <Text style={[strong, { flex: 1, color: accent, fontSize: 15 }]}>{operationLabel}</Text>
      </View>
      {preview.payment ? <View style={{ gap: 4 }}><Text style={[strong, { fontSize: 34, lineHeight: 42 }]}>{formatPrivatePrice(preview.payment.amountCents)}</Text>
        {preview.monthlyPayment && <Text style={text}>Base {formatPrivatePrice(preview.monthlyPayment.baseCents)} + IVA {preview.monthlyPayment.vatPercent} % ({formatPrivatePrice(preview.monthlyPayment.vatCents)})</Text>}
        <Text style={text}>{command.kind === 'REFUND' ? 'Devolución realizada fuera de HERA' : 'Pago recibido fuera de HERA'}{'plan' in command ? ` · ${planName[command.plan]}` : ''}</Text></View>
        : 'plan' in command ? <Text style={[strong, { fontSize: 28 }]}>{current && current.plan !== command.plan ? `${planName[current.plan]} → ` : ''}{planName[command.plan]}</Text> : null}
    </View>

    {command.requestId && <View style={[styles.row, { alignItems: 'center' }]}>
      <Ionicons name="checkmark-done-outline" size={20} color={theme.success} accessible={false} />
      <Text style={[text, { flex: 1 }]}>La solicitud quedará resuelta al confirmar esta operación.</Text>
    </View>}

    {preview.additions.map(period => <View key={period.startsAt} style={[styles.period, { borderLeftColor: theme.success }]}>
      <Text style={[strong, { color: theme.success }]}>{period.kind === 'TRIAL' ? 'Prueba gratuita' : 'Nuevo período'} · {planName[period.plan]}</Text>
      {dates(period.startsAt, period.endsAt)}
    </View>)}
    {changed.map(period => {
      const before = preview.before.find(p => p.id === period.id);
      return <View key={period.id} style={[styles.period, { borderLeftColor: period.voidedAt ? theme.warning : theme.success }]}>
        <Text style={strong}>{period.voidedAt ? 'Se anula este período' : 'Cambio en el período'}</Text>
        {before && <View style={{ gap: 6 }}><Text style={[text, styles.caption]}>Antes · {planName[before.plan]}</Text><Text style={text}>{dateLabel(before.startsAt, true)} → {dateLabel(before.endsAt, true)}</Text></View>}
        {!period.voidedAt && <><Text style={[strong, { color: theme.success }]}>Después · {planName[period.plan]}</Text>{dates(period.startsAt, period.endsAt, true)}</>}
      </View>;
    })}
    {command.kind === 'DOWNGRADE' && current && <View style={styles.detail}><Text style={[text, styles.caption]}>Cambio previsto al vencimiento</Text><Text style={strong}>{dateLabel(current.endsAt)}</Text></View>}
    {command.kind === 'CANCEL' && <View style={styles.detail}><Text style={[text, styles.caption]}>Acceso ya confirmado</Text><Text style={strong}>{lastEnd ? `Se mantiene hasta el ${dateLabel(lastEnd)}` : 'Sin períodos vigentes o futuros'}</Text></View>}
    {preview.payment && <>
      <View style={styles.row}>
        <View style={styles.column}><Text style={[text, styles.caption]}>{command.kind === 'REFUND' ? 'Fecha de devolución' : 'Fecha del pago'}</Text><Text style={strong}>{dateLabel(preview.payment.paidAt)}</Text></View>
        <View style={styles.column}><Text style={[text, styles.caption]}>Medio</Text><Text style={strong}>{preview.payment.method}</Text></View>
      </View>
      <View style={styles.detail}><Text style={[text, styles.caption]}>Referencia</Text><Text style={strong}>{preview.payment.reference}</Text></View>
    </>}
    {preview.nextPlan && command.kind !== 'DOWNGRADE' && <Text style={text}>Próximo plan previsto: {planName[preview.nextPlan]}. Pendiente de confirmar pago.</Text>}
    <View style={[styles.detail, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 14 }]}><Text style={[text, styles.caption]}>Motivo</Text><Text style={text}>{command.reason}</Text></View>
    <View style={[styles.row, { alignItems: 'flex-start' }]}><Ionicons name="information-circle-outline" size={18} color={accent} accessible={false} /><Text style={[text, { flex: 1, fontSize: 12, lineHeight: 19 }]}>{preview.notice} Fechas en horario de Madrid.</Text></View>
  </FocusedActionSheet>;
}

const styles = StyleSheet.create({
  summary: { borderRadius: 12, padding: 18, gap: 12 },
  row: { flexDirection: 'row', gap: 14 }, column: { flex: 1, minWidth: 0, gap: 4 },
  caption: { fontSize: 12, lineHeight: 18 }, detail: { gap: 4 },
  period: { borderLeftWidth: 3, paddingLeft: 14, gap: 12, paddingVertical: 4 },
});
