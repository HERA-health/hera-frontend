import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionDate, type SubscriptionSummary } from '../../services/subscriptionService';

const names: Record<string, string> = { DIRECTORIO: 'Directorio', CALMA: 'Calma', CRECIMIENTO: 'Crecimiento', HORIZONTE: 'Horizonte' };
const operations: Record<string, string> = { TRIAL: 'Prueba activada', PAY: 'Pago confirmado', UPGRADE: 'Plan ampliado', DOWNGRADE: 'Cambio programado', CANCEL: 'Finalización registrada', CORRECT: 'Período corregido', REFUND: 'Devolución registrada' };
const requests: Record<string, string> = { TRIAL: 'Prueba gratuita', CHANGE: 'Cambio de plan', RENEW: 'Continuidad', CANCEL: 'Finalización' };

export function SubscriptionHistory({ history, requests: requestHistory }: { history: NonNullable<SubscriptionSummary['history']>; requests: SubscriptionSummary['requests'] }) {
  const { theme } = useTheme();
  const compact = useWindowDimensions().width < 768;
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 22 };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const entries = [
    ...history.map(event => ({ type: 'operation' as const, id: event.id, date: event.createdAt, event })),
    ...requestHistory.map(request => ({ type: 'request' as const, id: request.id, date: request.createdAt, request })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return <View style={{ gap: 14 }}>
    <Text accessibilityRole="header" style={[strong, { fontSize: 20 }]}>Historial</Text>
    {!entries.length && <Text style={text}>Todavía no hay solicitudes ni operaciones.</Text>}
    {entries.map(entry => {
      const event = entry.type === 'operation' ? entry.event : null;
      const request = entry.type === 'request' ? entry.request : null;
      const changed = event?.details.after.filter(period => {
        const before = event.details.before.find(p => p.id === period.id);
        return !before || period.plan !== before.plan || period.startsAt !== before.startsAt
          || period.endsAt !== before.endsAt || period.voidedAt !== before.voidedAt;
      }) ?? [];
      const title = entry.type === 'operation' ? operations[entry.event.kind] ?? 'Operación registrada' : `Solicitud · ${requests[entry.request.kind]}`;
      const status = request?.status === 'PENDING' ? 'Pendiente' : request?.status === 'REJECTED' ? 'No aprobada' : 'Resuelta';
      const statusColor = request?.status === 'PENDING' ? theme.warning : request?.status === 'REJECTED' ? theme.error : theme.success;
      return <View key={`${entry.type}-${entry.id}`} style={{ padding: 20, gap: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 14, backgroundColor: theme.bgCard }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <Ionicons name={event ? 'checkmark-circle-outline' : 'document-text-outline'} size={23} color={theme.primary} accessible={false} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[strong, { fontSize: 16 }]}>{title}</Text>
            <Text style={text}>{subscriptionDate(entry.date)}</Text>
          </View>
          {request && <Text style={[strong, { color: statusColor }]}>{status}</Text>}
          {event?.details.payment && <Text style={[strong, { fontSize: 22 }]}>{(event.details.payment.amountCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</Text>}
        </View>
        {request?.plan && <Text style={strong}>{names[request.plan]}</Text>}
        {request?.resolution && <Text style={text}>{request.resolution}</Text>}
        {event && <>
          <View style={{ flexDirection: compact ? 'column' : 'row', gap: 18, flexWrap: 'wrap' }}>
          {event.details.payment && <View style={{ gap: 4, flex: compact ? undefined : 1, minWidth: 0 }}>
            <Text style={text}>{event.details.payment.method} · {subscriptionDate(event.details.payment.paidAt)}</Text>
            <Text style={text}>Referencia: {event.details.payment.reference}</Text>
          </View>}
          {event.details.additions.map(p => <View key={p.startsAt} style={{ gap: 4, flex: compact ? undefined : 1, minWidth: 0 }}><Text style={strong}>{names[p.plan]}</Text><Text style={text}>{subscriptionDate(p.startsAt)} – {subscriptionDate(p.endsAt)}</Text></View>)}
          {changed.map(p => <View key={p.id} style={{ gap: 4, flex: compact ? undefined : 1, minWidth: 0 }}><Text style={strong}>{names[p.plan]}{p.voidedAt ? ' · Anulado' : ''}</Text><Text style={text}>{subscriptionDate(p.startsAt)} – {subscriptionDate(p.endsAt)}</Text></View>)}
          </View>
          {event.kind === 'DOWNGRADE' && event.details.nextPlan && <Text style={text}>Siguiente plan: {names[event.details.nextPlan]} · pendiente de pago</Text>}
          <Text style={text}>{event.reason}</Text>
          {['CANCEL', 'REFUND'].includes(event.kind) && <Text style={text}>{event.details.notice}</Text>}
        </>}
      </View>;
    })}
  </View>;
}
