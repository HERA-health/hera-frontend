import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { getErrorMessage } from '../../constants/errors';
import { billingService } from '../../services/billingService';
import { loadPatientPackages, loadPatientPackage, loadPackageCatalog, downloadPackageInvoice, packagePrice, packageModality, type PatientPackage, type PackageOffer } from '../../services/packageService';
import { PackageAcquisition } from './PackageAcquisition';

export function PatientPackages({ clientId, onReserve, compact = false }: { clientId?: string; onReserve: (row: PatientPackage) => void; compact?: boolean }) {
  const { theme } = useTheme(); const [rows, setRows] = useState<PatientPackage[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [history, setHistory] = useState<PatientPackage>();
  const [offers, setOffers] = useState<PackageOffer[]>(); const [assigning, setAssigning] = useState<PackageOffer>();
  const load = useCallback(async () => { setLoading(true); setError(''); try { setRows(await loadPatientPackages(clientId)); } catch (e) { setError(getErrorMessage(e, 'No se pudieron cargar los bonos.')); } finally { setLoading(false); } }, [clientId]);
  useEffect(() => { void load(); }, [load]);
  const action = async (run: () => Promise<unknown>) => { setBusy(true); setError(''); try { await run(); await load(); } catch (e) { setError(getErrorMessage(e, 'No se pudo completar la acción.')); } finally { setBusy(false); } };
  if (compact && !loading && !error && !rows.length) return null;
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans };
  return <View style={{ gap: 16, paddingVertical: 16 }}>
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}><Text accessibilityRole="header" style={{ ...text, fontFamily: theme.fontHeading, fontSize: 24 }}>{clientId ? 'Bonos' : 'Mis bonos'}</Text>{clientId && !compact && <Button size="small" onPress={() => void action(async () => { const catalog = await loadPackageCatalog(); if (!catalog.acquisitionsEnabled) throw new Error('Por ahora no se pueden asignar nuevos bonos. Los pacientes pueden seguir usando los que ya tienen.'); setOffers(catalog.data.filter(o => !o.archivedAt)); })}>Asignar bono</Button>}</View>
    {loading && <ActivityIndicator color={theme.primary} />}
    {!!error && <View><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><Button variant="ghost" onPress={() => void load()}>Reintentar</Button></View>}
    {!loading && !rows.length && <Text style={{ ...text, color: theme.textSecondary }}>{clientId ? 'Este paciente todavía no tiene bonos.' : 'Todavía no tienes bonos.'}</Text>}
    {(compact ? rows.filter(r => r.balance.available > 0).slice(0, 2) : rows).map(row => <View key={row.id} style={{ padding: 20, gap: 12, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, borderRadius: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}><Text style={{ ...text, fontFamily: theme.fontSansSemiBold, fontSize: 18 }}>{row.snapshot.name} · {row.snapshot.serviceName}</Text><Text style={text}>{packagePrice(row.snapshot.totalCents)} · {row.snapshot.totalCents === 0 ? 'Sin importe a cobrar' : row.invoice?.paidAt ? 'Pagado' : 'Pendiente de pago'}</Text></View>
      <Text style={{ ...text, fontSize: 16 }}>{row.balance.consumed} de {row.balance.total} realizadas · {row.balance.reserved} reservadas · {row.balance.available} disponibles</Text>
      <Text style={{ ...text, color: theme.textSecondary }}>Adquirido el {new Date(row.createdAt).toLocaleDateString('es-ES')}{row.balance.consumed === row.balance.total ? ' · Agotado' : row.balance.available === 0 ? ' · Sin sesiones disponibles' : ''}</Text>
      {!row.invoice?.sentAt && <Text style={{ ...text, color: theme.textSecondary }}>Factura pendiente de envío{row.notifications.some(n => n.event === 'PACKAGE_INVOICE' && n.retryExhausted) ? ' · Requiere reintento manual del especialista' : row.notifications.some(n => n.event === 'PACKAGE_INVOICE' && n.status === 'FAILED' && n.retryExhausted === false) ? ' · Se reintentará la entrega' : ''}</Text>}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button size="small" disabled={row.balance.available === 0 || busy} onPress={() => onReserve(row)}>Reservar sesión</Button>
        <Button size="small" variant="secondary" disabled={busy} onPress={() => void action(() => downloadPackageInvoice(row.id))}>Ver factura</Button>
        {!compact && <Button size="small" variant="ghost" disabled={busy} onPress={() => void action(async () => setHistory(history?.id === row.id ? undefined : await loadPatientPackage(row.id)))}>Ver historial</Button>}
        {clientId && !compact && row.invoice && !row.invoice.paidAt && row.snapshot.totalCents > 0 && <Button size="small" variant="secondary" disabled={busy} onPress={() => void action(() => billingService.markInvoiceAsPaid(row.invoice!.id))}>Marcar como pagada</Button>}
        {clientId && !compact && row.invoice && !row.invoice.sentAt && <Button size="small" variant="ghost" disabled={busy} onPress={() => void action(() => billingService.sendInvoice(row.invoice!.id))}>Reintentar envío</Button>}
      </View>
      {history?.id === row.id && <View style={{ gap: 10 }}>{history.uses.length === 0 && <Text style={text}>Aún no hay citas vinculadas.</Text>}{history.uses.map(use => <Text key={use.id} style={text}>{new Date(use.session.date).toLocaleString('es-ES')} · {packageModality(use.session.type)} · {use.status === 'CONSUMED' ? 'Realizada' : use.status === 'RESERVED' ? 'Reservada' : 'Sesión devuelta al bono'}</Text>)}{history.events?.map((event, index) => <Text key={index} style={{ ...text, color: theme.textSecondary }}>{new Date(event.createdAt).toLocaleString('es-ES')} · {event.kind === 'ACQUIRED' ? 'Bono contratado' : event.kind === 'PAID' ? 'Cobro registrado' : event.kind === 'CONSUMED' ? `Sesión descontada ${event.details.origin === 'AUTOMATIC' ? 'automáticamente' : 'al completar la cita'}` : event.kind === 'RESERVED' ? 'Reserva' : 'Sesión disponible de nuevo'}</Text>)}</View>}
    </View>)}
    {!compact && rows.length > 0 && <Text style={{ ...text, color: theme.textSecondary }}>No se pueden anular bonos ni gestionar devoluciones desde HERA. Si cancelas una cita según las condiciones de cancelación, su sesión vuelve a estar disponible en el bono.</Text>}
    {offers && <View style={{ gap: 8 }}><Text style={text}>Selecciona el bono que deseas asignar</Text>{!offers.length && <Text style={text}>Crea un bono en Servicios y bonos.</Text>}{offers.map(offer => <Button key={offer.id} variant="secondary" onPress={() => setAssigning(offer)}>{offer.name} · {packagePrice(offer.totalCents)}</Button>)}<Button variant="ghost" onPress={() => setOffers(undefined)}>Cerrar selección</Button></View>}
    {assigning && <PackageAcquisition offer={assigning} clientId={clientId} onClose={() => setAssigning(undefined)} onAcquired={() => { setAssigning(undefined); setOffers(undefined); void load(); }} />}
  </View>;
}
