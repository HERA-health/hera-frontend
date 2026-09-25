import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { getErrorMessage, getErrorCode } from '../../constants/errors';
import { getProfessionalClients, type Client } from '../../services/professionalService';
import { acquirePackage, quotePackage, packagePrice, packageModality, type PackageOffer, type PackageQuote, type PatientPackage } from '../../services/packageService';
import { PackageBillingFields, emptyPackageBilling } from './PackageBillingFields';

export function PackageAcquisition({ offer, clientId: presetClientId, specialistId, professional = true, bookingIntentToken, onClose, onAcquired }: {
  offer: PackageOffer; clientId?: string; specialistId?: string; professional?: boolean; bookingIntentToken?: string; onClose: () => void; onAcquired: (row: PatientPackage) => void;
}) {
  const { theme } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(presetClientId);
  const [search, setSearch] = useState('');
  const [quote, setQuote] = useState<PackageQuote>();
  const [billing, setBilling] = useState(emptyPackageBilling);
  const [billingRequired, setBillingRequired] = useState(offer.totalCents > 40000);
  const [paid, setPaid] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const command = useRef(Crypto.randomUUID());
  const submission = useRef<Parameters<typeof acquirePackage>[0] | undefined>(undefined);
  useEffect(() => { if (professional && !presetClientId) void getProfessionalClients('ALL').then(setClients).catch(e => setError(getErrorMessage(e, 'No se pudieron cargar los pacientes.'))); }, [professional, presetClientId]);
  useEffect(() => { setQuote(undefined); submission.current = undefined; command.current = Crypto.randomUUID(); }, [clientId, paid, date, billing]);
  const review = async () => {
    setBusy(true); setError('');
    try { setQuote(await quotePackage(offer.id, professional ? clientId : undefined, specialistId, billingRequired ? billing : undefined)); }
    catch (e) {
      if (getErrorCode(e) === 'PACKAGE_BILLING_REQUIRED') setBillingRequired(true);
      setError(getErrorMessage(e, 'No se pudieron consultar las condiciones.'));
    }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!quote || busy) return;
    setBusy(true); setError('');
    try {
      const paidAt = professional && paid ? new Date(`${date}T00:00:00`).toISOString() : undefined;
      submission.current ??= { packageId: offer.id, quoteReference: quote.quoteReference, commandKey: command.current, specialistId, paidAt, bookingIntentToken, billing: billingRequired ? billing : undefined };
      const acquired = await acquirePackage(submission.current, professional ? clientId : undefined);
      onAcquired(acquired);
    } catch (e) {
      if (getErrorCode(e) === 'PACKAGE_BILLING_REQUIRED') setBillingRequired(true);
      if (['PACKAGE_QUOTE_CHANGED', 'PACKAGE_QUOTE_INVALID', 'PACKAGE_BILLING_REQUIRED'].includes(getErrorCode(e) ?? '')) {
        submission.current = undefined; setQuote(undefined); command.current = Crypto.randomUUID();
      }
      setError(getErrorMessage(e, 'No se pudo confirmar el bono. Pulsa de nuevo para reintentar.'));
    }
    finally { setBusy(false); }
  };
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans };
  const conditions = quote?.snapshot ?? offer;
  const conditionsChanged = quote && (offer.totalCents !== conditions.totalCents || offer.sessions !== conditions.sessions
    || offer.name !== conditions.name || offer.serviceName !== conditions.serviceName
    || JSON.stringify(offer.options.map(o => [o.id, o.modality, o.durationMinutes])) !== JSON.stringify(conditions.options.map(o => [o.id, o.modality, o.durationMinutes])));
  const field = { ...text, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12 };
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <ScrollView accessibilityViewIsModal style={{ width: '100%', maxWidth: 600, maxHeight: '90%', backgroundColor: theme.bgCard, borderRadius: 16 }} contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={{ ...text, fontSize: 24, fontFamily: theme.fontHeading }}>{professional ? 'Asignar bono' : 'Solicitar bono'}</Text>
        <Text style={{ ...text, fontSize: 18 }}>{conditions.name} · {packagePrice(conditions.totalCents)}</Text>
        <Text style={text}>{conditions.serviceName} · {conditions.sessions} sesiones</Text>
        <Text style={text}>{conditions.options.map(o => `${packageModality(o.modality)} · ${o.durationMinutes} min`).join(' / ')}</Text>
        {conditionsChanged && <Text accessibilityRole="alert" style={text}>Las condiciones del bono han cambiado. Revisa estos datos actualizados antes de confirmar.</Text>}
        {professional && !presetClientId && <View style={{ gap: 8 }}>
          <TextInput accessibilityLabel="Buscar paciente" placeholder="Buscar paciente" placeholderTextColor={theme.textMuted} style={field} value={search} onChangeText={setSearch} editable={!busy} />
          {clients.filter(c => (c.displayName ?? c.user?.name ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0, 15).map(c => <Button key={c.id} variant={clientId === c.id ? 'primary' : 'ghost'} disabled={busy || Boolean(submission.current)} onPress={() => setClientId(c.id)}>{c.displayName ?? c.user?.name ?? 'Paciente'}</Button>)}
        </View>}
        <Text style={text}>{professional ? 'Al confirmar, se creará la factura y se enviará al paciente por correo. Podrá usar el bono aunque todavía no haya pagado.' : 'Al confirmar, se creará tu factura y la recibirás por correo. Podrás usar el bono aunque todavía no hayas pagado.'}</Text>
        <Text style={{ ...text, color: theme.textSecondary }}>Cada cita reserva una sesión del bono. La sesión se descuenta al completar la cita.</Text>
        <Text style={{ ...text, color: theme.textSecondary }}>El bono no caduca. Una vez confirmado, no se puede anular el bono ni su factura, ni gestionar devoluciones desde HERA.</Text>
        {professional && conditions.totalCents > 0 && <View style={{ gap: 8 }}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Switch accessibilityLabel="Ya he recibido el pago completo" value={paid} onValueChange={setPaid} disabled={busy || Boolean(submission.current)} /><Text style={{ ...text, flex: 1 }}>Ya he recibido el pago completo</Text></View>{paid && <TextInput accessibilityLabel="Fecha del cobro, año mes día" value={date} onChangeText={setDate} style={field} placeholder="AAAA-MM-DD" editable={!busy && !submission.current} />}</View>}
        {quote?.snapshot.paymentConditions && <Text style={text}>{quote.snapshot.paymentConditions}</Text>}
        {billingRequired && <PackageBillingFields value={billing} onChange={setBilling} disabled={busy || Boolean(submission.current)} />}
        {quote?.fiscal && <Text style={text}>Factura para {quote.fiscal.recipient.fiscalName} · {quote.fiscal.recipientEmail}{quote.fiscal.recipient.fiscalTaxId ? ` · ${quote.fiscal.recipient.fiscalTaxId}` : ''}</Text>}
        {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
        {busy && <ActivityIndicator color={theme.primary} />}
        {quote ? <Button loading={busy} onPress={() => void confirm()}>{professional ? 'Asignar y enviar factura' : 'Solicitar y recibir factura'}</Button> : <Button disabled={professional && !clientId} loading={busy} onPress={() => void review()}>Revisar antes de confirmar</Button>}
        {quote && !!error && !submission.current && <Button variant="ghost" disabled={busy} onPress={() => void review()}>Consultar condiciones actualizadas</Button>}
        <Button variant="ghost" disabled={busy} onPress={onClose}>Cerrar</Button>
      </ScrollView>
    </View>
  </Modal>;
}
