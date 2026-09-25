import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { PackageAcquisition } from './PackageAcquisition';
import { loadPublicPackages, packagePrice, packageModality, requestPublicPackage, quotePublicPackage, acquirePublicPackage, type PackageOffer, type PackageQuote, type PatientPackage, type PublicPackageRequest } from '../../services/packageService';
import { getErrorMessage, getErrorCode } from '../../constants/errors';
import { LEGAL_DOCUMENT_VERSION } from '../../constants/legal';
import { PackageBillingFields, emptyPackageBilling } from './PackageBillingFields';

export function PublicPackageOffers({ specialistId, anonymous, intentToken, onPrivacy, onAcquired }: { specialistId: string; anonymous: boolean; intentToken?: string; onPrivacy: () => void; onAcquired?: (row: PatientPackage) => void }) {
  const { theme } = useTheme(); const [offers, setOffers] = useState<PackageOffer[]>([]); const [selected, setSelected] = useState<PackageOffer>();
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [consumedIntent, setConsumedIntent] = useState<string>();
  const effectiveIntent = consumedIntent === intentToken ? undefined : intentToken;
  const acquired = (row: PatientPackage) => {
    setSelected(undefined);
    setConsumedIntent(intentToken);
    setMessage('Bono adquirido. Recibirás la factura por correo. La adquisición no reserva un horario.');
    onAcquired?.(row);
  };
  useEffect(() => { let current = true; loadPublicPackages(specialistId).then(rows => { if (current) setOffers(rows); }).catch(e => { if (current) setError(getErrorMessage(e, 'No se pudieron cargar los bonos disponibles.')); }); return () => { current = false; }; }, [specialistId]);
  if (!offers.length && !error) return null;
  return <View style={{ gap: 12, paddingVertical: 16 }}>
    <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 18 }}>Bonos de sesiones</Text>
    <Text style={{ color: theme.textSecondary }}>Adquiere un bono y reserva sus sesiones cuando las necesites.</Text>
    {offers.map(offer => <View key={offer.id} style={{ gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.border }}><Text style={{ color: theme.textPrimary }}>{offer.name} · {offer.sessions} sesiones · {packagePrice(offer.totalCents)}</Text><Button variant="secondary" onPress={() => { setSelected(offer); setMessage(''); }}>Solicitar bono</Button></View>)}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: theme.success }}>{message}</Text>}
    {selected && (anonymous ? <GuestPackageAcquisition offer={selected} specialistId={specialistId} intentToken={effectiveIntent} onPrivacy={onPrivacy} onClose={() => setSelected(undefined)} onDone={acquired} /> : <PackageAcquisition professional={false} offer={selected} specialistId={specialistId} bookingIntentToken={effectiveIntent} onClose={() => setSelected(undefined)} onAcquired={acquired} />)}
  </View>;
}

function GuestPackageAcquisition({ offer, specialistId, intentToken, onPrivacy, onClose, onDone }: { offer: PackageOffer; specialistId: string; intentToken?: string; onPrivacy: () => void; onClose: () => void; onDone: (row: PatientPackage) => void }) {
  const { theme } = useTheme(); const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState(''); const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false); const [requestId, setRequestId] = useState<string>(); const [code, setCode] = useState(''); const [quote, setQuote] = useState<PackageQuote>();
  const [billing, setBilling] = useState(emptyPackageBilling);
  const [billingRequired, setBillingRequired] = useState(offer.totalCents > 40000);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const commandKey = useRef(Crypto.randomUUID());
  const requestSubmission = useRef<PublicPackageRequest | undefined>(undefined);
  useEffect(() => {
    requestSubmission.current = undefined;
    commandKey.current = Crypto.randomUUID();
  }, [firstName, lastName, email, accepted, billing]);
  const restartVerification = () => {
    setRequestId(undefined); setCode(''); setQuote(undefined);
    requestSubmission.current = undefined;
    commandKey.current = Crypto.randomUUID();
  };
  const run = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (!requestId) {
        requestSubmission.current ??= { packageId: offer.id, specialistId, patient: { firstName, lastName, email }, privacyAccepted: accepted, privacyVersion: LEGAL_DOCUMENT_VERSION, intentToken, commandKey: commandKey.current, billing: billingRequired ? billing : undefined };
        const response = await requestPublicPackage(requestSubmission.current);
        setRequestId(response.requestId);
      } else if (!quote) {
        setQuote(await quotePublicPackage(requestId, code));
      } else {
        onDone(await acquirePublicPackage(requestId, code, quote.quoteReference));
      }
    } catch (e) {
      const errorCode = getErrorCode(e);
      if (errorCode === 'PACKAGE_BILLING_REQUIRED') setBillingRequired(true);
      if (['PACKAGE_QUOTE_CHANGED', 'PACKAGE_QUOTE_INVALID', 'PACKAGE_PROOF_EXPIRED', 'PACKAGE_BILLING_REQUIRED', 'PACKAGE_COMMAND_CHANGED'].includes(errorCode ?? '')
        || (quote && errorCode === 'PACKAGE_PROOF_INVALID')) {
        restartVerification();
      } else if (!requestId && errorCode) {
        // No acquisition is possible before identity verification; allow correcting rejected input.
        requestSubmission.current = undefined;
      }
      setError(getErrorMessage(e, 'No se pudo completar la adquisición. Tu formulario se conserva.'));
    } finally { setBusy(false); }
  };
  const conditions = quote?.snapshot ?? offer;
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans }; const field = { ...text, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 8 };
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}><View style={{ flex: 1, backgroundColor: '#0006', alignItems: 'center', justifyContent: 'center', padding: 16 }}><ScrollView accessibilityViewIsModal style={{ maxWidth: 600, width: '100%', maxHeight: '90%', backgroundColor: theme.bgCard, borderRadius: 16 }} contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={{ ...text, fontSize: 24, fontFamily: theme.fontHeading }}>{conditions.name}</Text><Text style={text}>{conditions.sessions} sesiones · {packagePrice(conditions.totalCents)}</Text>
    <Text style={text}>{conditions.serviceName} · {conditions.options.map(option => `${packageModality(option.modality)} · ${option.durationMinutes} min`).join(' / ')}</Text>
    {!requestId ? <><TextInput style={field} editable={!busy} accessibilityLabel="Nombre" placeholder="Nombre" placeholderTextColor={theme.textMuted} value={firstName} onChangeText={setFirstName} /><TextInput style={field} editable={!busy} accessibilityLabel="Apellidos" placeholder="Apellidos" placeholderTextColor={theme.textMuted} value={lastName} onChangeText={setLastName} /><TextInput style={field} editable={!busy} accessibilityLabel="Correo electrónico" placeholder="Correo electrónico" placeholderTextColor={theme.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} /><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Switch disabled={busy} accessibilityLabel="Aceptar política de privacidad" value={accepted} onValueChange={setAccepted} /><Button variant="ghost" onPress={onPrivacy}>Política de privacidad</Button></View></> : !quote && <><Text style={text}>Introduce el código que hemos enviado a tu correo.</Text><TextInput accessibilityLabel="Código de verificación" keyboardType="number-pad" maxLength={6} style={field} value={code} onChangeText={setCode} /></>}
    <Text style={text}>Recibirás una factura al confirmar. Podrás usar el bono desde su adquisición. Sin caducidad ni pagos parciales. No se admiten anulaciones ni devoluciones automatizadas en esta versión.</Text>
    {quote?.snapshot.paymentConditions && <Text style={text}>{quote.snapshot.paymentConditions}</Text>}
    {billingRequired && <PackageBillingFields value={billing} onChange={setBilling} disabled={busy || Boolean(requestId)} />}
    {quote?.fiscal && <Text style={text}>Factura para {quote.fiscal.recipient.fiscalName} · {quote.fiscal.recipientEmail}</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
    <Button loading={busy} disabled={!requestId && !accepted} onPress={() => void run()}>{quote ? 'Solicitar y recibir factura' : requestId ? 'Verificar y revisar condiciones' : 'Verificar mi correo'}</Button>
    {requestId && !quote && <Button variant="ghost" disabled={busy} onPress={restartVerification}>Solicitar un código nuevo</Button>}
    <Button variant="ghost" disabled={busy} onPress={onClose}>Cerrar</Button>
  </ScrollView></View></Modal>;
}
