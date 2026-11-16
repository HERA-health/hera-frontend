import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { subscriptionDate, storageLabel, type SubscriptionSummary } from '../../services/subscriptionService';
import { Button } from '../common/Button';
import type { AnimatedPressableHandle } from '../common/AnimatedPressable';
import { FocusedActionSheet } from '../finance/FocusedActionSheet';

export function SubscriptionOverview({ data, action, management }: { data: SubscriptionSummary; action?: React.ReactNode; management?: React.ReactNode }) {
  const { theme } = useTheme(); const { width } = useWindowDimensions(); const compact = width < 768;
  const stackedHero = width < 1024;
  const [usageDetails, setUsageDetails] = useState(false);
  const usageButton = useRef<AnimatedPressableHandle>(null);
  const closeUsageDetails = () => { setUsageDetails(false); requestAnimationFrame(() => usageButton.current?.focus()); };
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const patients = data.usage.patients; const storage = data.usage.storage;
  const directory = data.plan === 'DIRECTORIO';
  const directoryBenefits = data.features.filter(feature => feature !== 'Cartera anterior protegida' || patients.protectedCount > 0)
    .map(feature => feature === 'Pacientes del directorio' ? 'Pacientes del directorio sin límite' : feature);
  const storageRatio = Number(storage.usedBytes) / Number(data.limits.storageBytes);
  const patientRatio = data.limits.ownPatients ? patients.total / data.limits.ownPatients : 0;
  const remaining = data.period ? new Date(data.period.endsAt).getTime() - Date.now() : null;
  const previous = data.periods.find(p => !p.voidedAt && new Date(p.endsAt).getTime() <= Date.now());
  const future = data.periods.filter(p => !p.voidedAt && new Date(p.startsAt).getTime() > Date.now()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const renewalConfirmed = future.some(p => p.startsAt === data.period?.endsAt);
  const meter = (ratio: number, label: string) => <View accessible accessibilityRole="progressbar" accessibilityLabel={label}
    accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.round(ratio * 100)) }} style={[styles.track, { backgroundColor: theme.border }]}>
    <View style={{ height: 6, width: `${Math.max(0, Math.min(100, ratio * 100))}%`, backgroundColor: data.enforced && ratio >= 1 ? theme.error : theme.primary, borderRadius: 6 }} />
  </View>;
  return <View style={{ gap: 24 }}>
    <View style={[styles.hero, { backgroundColor: theme.successLight, borderColor: theme.border, flexDirection: stackedHero ? 'column' : 'row', gap: 24, padding: compact ? 20 : 26 }]}>
      <View style={{ gap: 10, flex: stackedHero ? undefined : 1, minWidth: 0 }}>
        <Text style={[strong, styles.eyebrow]}>TU PLAN ACTUAL</Text>
        <Text accessibilityRole="header" style={[strong, { fontSize: compact ? 30 : 36, lineHeight: 44 }]}>{data.name}</Text>
        <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
          <Ionicons name={data.period ? 'checkmark-circle' : 'leaf-outline'} size={18} color={theme.success} accessible={false} />
          <Text style={[strong, { fontSize: 15, color: theme.success }]}>{data.period?.kind === 'TRIAL' ? 'Prueba gratuita' : data.period ? 'Suscripción activa' : 'Sin cuota fija'}</Text>
        </View>
        {directory && <Text style={[text, styles.body]}>Solo pagas comisiones por pacientes del directorio.</Text>}
        {data.period && <Text style={[text, styles.body]}>{`${data.enforced ? 'Disponible' : 'Período confirmado'} hasta el ${subscriptionDate(data.period.endsAt)}.`}</Text>}
        {data.cancelAtEnd && <Text style={[text, styles.body]}>{data.enforced ? 'Finalización registrada. Mantienes el acceso durante los períodos ya confirmados.' : 'Finalización registrada para el período contratado.'}</Text>}
        {action && <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>{action}</View>}
      </View>
      {directory ? <View style={{ flex: stackedHero ? undefined : 1, minWidth: 0, gap: 16, borderColor: theme.border, borderLeftWidth: stackedHero ? 0 : 1, borderTopWidth: stackedHero ? 1 : 0, paddingLeft: stackedHero ? 0 : 24, paddingTop: stackedHero ? 20 : 0 }}>
        <Text accessibilityRole="header" style={[strong, styles.title]}>Incluido en Directorio</Text>
        {directoryBenefits.map(feature => <View key={feature} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={19} color={theme.success} accessible={false} />
          <Text style={[text, styles.body, { flex: 1 }]}>{feature}</Text>
        </View>)}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Ionicons name="cloud-outline" size={19} color={theme.success} accessible={false} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}><Text style={[text, styles.body]}>{storageLabel(data.limits.storageBytes)} de almacenamiento{!data.enforced ? ' previstos' : ''}</Text>
          </View>
        </View>
      </View> : management && <View style={{ flex: stackedHero ? undefined : 1, minWidth: 0, borderColor: theme.border, borderLeftWidth: stackedHero ? 0 : 1, borderTopWidth: stackedHero ? 1 : 0, paddingLeft: stackedHero ? 0 : 24, paddingTop: stackedHero ? 20 : 0 }}>{management}</View>}
    </View>
    {data.enforced && remaining !== null && remaining <= 7 * 86400000 && !renewalConfirmed && <Text accessibilityRole="alert" style={[strong, styles.notice, { backgroundColor: theme.warningBg, color: theme.warning }]}>
      {remaining > 0 ? 'Tu período termina en los próximos siete días. Solicita continuidad si quieres mantener el plan.' : 'El período ha terminado. Actualiza la información para consultar tu modalidad vigente.'}
    </Text>}
    {!data.period && previous && (data.enforced
      ? <Text accessibilityRole="alert" style={[text, styles.notice, { backgroundColor: theme.warningBg, color: theme.warning }]}>Tu último período terminó el {subscriptionDate(previous.endsAt)}. Conservas el historial, los documentos, las citas existentes y las sesiones de bonos ya comprometidas. Para asumir nueva atención propia, solicita continuidad.</Text>
      : <Text style={[text, styles.body]}>Tu último período terminó el {subscriptionDate(previous.endsAt)}. Puedes solicitar continuidad cuando lo necesites.</Text>)}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text accessibilityRole="header" style={[strong, styles.title]}>El uso de tu consulta</Text>
      {!data.enforced && <Text style={[text, styles.body]}>Límites aún no activos</Text>}
    </View>
    <View style={[styles.consumption, stackedHero && { flexDirection: 'column' }]}>
      <View style={[styles.metric, { borderColor: theme.border, flex: stackedHero ? undefined : 1 }]}>
        <Text accessibilityRole="header" style={[strong, styles.title]}>Pacientes del directorio</Text>
        <Text accessibilityLabel={patients.directoryCount === undefined ? 'Recuento no disponible' : `${patients.directoryCount} pacientes del directorio`} style={[strong, patients.directoryCount === undefined ? styles.body : styles.number]}>{patients.directoryCount ?? 'Recuento no disponible'}</Text>
        <Text style={[text, styles.body]}>Sin límite</Text>
      </View>
      <View style={[styles.metric, { borderColor: theme.border, flex: compact ? undefined : 1 }]}>
        <Text accessibilityRole="header" style={[strong, styles.title]}>Pacientes propios</Text>
        <Text accessibilityLabel={`${patients.total} pacientes propios con actividad o compromisos`} style={[strong, styles.number]}>{patients.total}{data.enforced && !directory && data.limits.ownPatients !== null && <Text style={[text, styles.body]}> / {data.limits.ownPatients}</Text>}</Text>
        <Text style={[text, styles.body]}>Con actividad o compromisos</Text>
        {data.enforced && data.plan !== 'DIRECTORIO' && data.limits.ownPatients !== null && meter(patientRatio, 'Cupo de pacientes propios')}
        {data.enforced && data.plan === 'DIRECTORIO' && <Text style={[text, styles.body]}>Nuevos pacientes propios: requiere suscripción.</Text>}
        {data.enforced && data.limits.ownPatients !== null && patients.total > data.limits.ownPatients && <Text style={[strong, styles.body, { color: theme.warning }]}>El consumo supera tu límite. Se mantiene la atención permitida de los pacientes actuales; no puedes incorporar nueva atención propia.</Text>}
        {!!patients.unresolvedCount && <Text style={[text, styles.body]}>Hay relaciones con procedencia pendiente de revisión por HERA.</Text>}
      </View>
      <View style={[styles.metric, { borderColor: theme.border, flex: compact ? undefined : 1 }]}>
        <Text accessibilityRole="header" style={[strong, styles.title]}>Almacenamiento</Text>
        <Text style={[strong, styles.number]}>{storageLabel(storage.usedBytes)}<Text style={[text, styles.body]}> / {storageLabel(data.limits.storageBytes)}</Text></Text>
        {meter(storageRatio, 'Almacenamiento utilizado')}
        <Text style={[text, styles.body]}>{data.enforced ? 'Espacio utilizado' : 'Capacidad prevista'}</Text>
        {storage.unknownFiles > 0 && <Text accessibilityRole={data.enforced ? 'alert' : undefined} style={[data.enforced ? strong : text, styles.body]}>Consumo pendiente de completar: HERA debe revisar el tamaño de {storage.unknownFiles} archivos históricos.</Text>}
        {data.enforced && storageRatio >= .8 && <Text accessibilityRole="alert" style={[strong, styles.body, { color: storageRatio >= 1 ? theme.error : theme.warning }]}>{storageRatio >= 1 ? 'Has alcanzado el límite. Conservas el acceso y las descargas; las nuevas cargas computables están bloqueadas.' : 'Has utilizado al menos el 80 % de tu espacio.'}</Text>}
      </View>
    </View>
    <View style={{ alignSelf: 'flex-start' }}>
      <Button focusRef={usageButton} variant="outline" size="small" onPress={() => setUsageDetails(true)} icon={<Ionicons name="information-circle-outline" size={18} color={theme.primary} accessible={false} />}>Cómo se calcula el uso</Button>
    </View>
    {usageDetails && <FocusedActionSheet visible title="Cómo se calcula el uso" closeLabel="Cerrar detalle de uso" onClose={closeUsageDetails}>
      <View style={{ gap: 16 }}>
        <Text style={[text, styles.body]}><Text style={strong}>Directorio. </Text>Pacientes con procedencia HERA confirmada, incluidos los archivados. Cada persona cuenta una sola vez y no consume plazas de pacientes propios.</Text>
        <View style={{ gap: 6 }}>
          <View style={styles.row}><Text style={[text, styles.body, { flex: 1 }]}>Activos · últimos {patients.activityDays} días</Text><Text style={strong}>{patients.active}</Text></View>
          <View style={styles.row}><Text style={[text, styles.body, { flex: 1 }]}>{data.enforced ? 'Adicionales con plaza comprometida' : 'Adicionales con citas o bonos pendientes'}</Text><Text style={strong}>{patients.additionalCommitted}</Text></View>
          <Text style={[text, styles.body]}>Cada paciente propio cuenta una sola vez. Se incluyen las citas futuras y los bonos utilizables pendientes.</Text>
        </View>
        <Text style={[text, styles.body]}><Text style={strong}>Almacenamiento. </Text>Compartido entre tus pacientes propios y los del directorio. Incluye informes, ejercicios y adjuntos, también archivados. Archivar no libera espacio. La biblioteca HERA y las evidencias obligatorias de consentimiento no se descuentan.</Text>
      </View>
    </FocusedActionSheet>}
    {patients.protectedCount > 0 && <View style={{ gap: 8 }}><Text accessibilityRole="header" style={[strong, styles.title]}>Tu cartera anterior sigue contigo</Text>
      <Text style={[text, styles.body]}>{patients.protectedCount} {patients.protectedCount === 1 ? 'paciente tiene' : 'pacientes tienen'} protección anterior al lanzamiento. Puedes seguir gestionando su atención aunque cambies o finalices el plan. Cuando estén activos o tengan compromisos, cuentan en el consumo mostrado.</Text>
    </View>}
    {(data.nextPlan || future.length > 0) && <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={[strong, styles.title]}>Próximos períodos</Text>
      {data.nextPlan && <Text style={[text, styles.body]}>Bajada prevista a {data.nextPlan.toLocaleLowerCase('es-ES')}, al finalizar el período vigente. El siguiente período requiere confirmar su pago.</Text>}
      {future.map(p => <Text key={p.id} style={[text, styles.body]}>{p.plan} · Confirmado del {subscriptionDate(p.startsAt)} al {subscriptionDate(p.endsAt)}.</Text>)}
    </View>}
    {!directory && <View style={{ gap: 12 }}><Text accessibilityRole="header" style={[strong, styles.title]}>{data.enforced ? 'Incluido en tu modalidad' : 'Prestaciones previstas del plan'}</Text>
      {!data.enforced && <Text style={[text, styles.small]}>Estas son las prestaciones previstas del plan. Los cupos, el acceso por nivel a recursos y el destacado Horizonte todavía no están activos.</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 28, rowGap: 14 }}>
        {data.features.map(feature => <View key={feature} style={{ flexDirection: 'row', gap: 10, width: compact ? '100%' : '46%', alignItems: 'flex-start' }}>
          <Ionicons name="checkmark-circle" size={19} color={theme.success} accessible={false} style={{ marginTop: 2 }} />
          <Text style={[text, styles.body, { flex: 1 }]}>{feature}</Text>
        </View>)}
      </View>
      <Text style={[text, styles.small]}>Las publicaciones, la supervisión y el soporte se coordinan directamente con HERA, según el plan. Los espacios de clínica mantienen sus propios permisos.</Text>
    </View>}
    {directory && management && <View style={{ maxWidth: 720, gap: 12, paddingTop: 8 }}>{management}</View>}
    <Text style={[text, styles.small, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 18 }]}>Las comisiones por pacientes del directorio son independientes de la suscripción y se mantienen en todos los planes. No hay cobros ni renovaciones automáticas.</Text>
  </View>;
}
const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: 16, padding: 26, flexDirection: 'row' },
  eyebrow: { fontSize: 11, letterSpacing: 1.5 }, body: { fontSize: 14, lineHeight: 23 }, small: { fontSize: 12, lineHeight: 20 },
  consumption: { flexDirection: 'row', gap: 28 }, metric: { minWidth: 0, paddingBottom: 8, gap: 10 },
  title: { fontSize: 17, lineHeight: 24 }, number: { fontSize: 34, lineHeight: 44 }, track: { height: 6, borderRadius: 6, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 }, notice: { padding: 18, borderRadius: 10, fontSize: 14, lineHeight: 23 },
});
