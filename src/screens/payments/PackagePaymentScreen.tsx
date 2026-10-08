import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import { PaymentButton as Button, paymentScreenStyles } from '../../components/payments/PaymentPresentation';
import { PackagePaymentConditions } from '../../components/packages/PackagePaymentConditions';
import { usePaymentPolling } from '../../components/payments/usePaymentPolling';
import { openCheckout, paymentAmount } from '../../services/sessionPaymentService';
import * as payments from '../../services/packagePaymentService';

export function PackagePaymentScreen() {
  const { patientPackageId } = useRoute<AppRouteProp<'PackagePayment'>>().params;
  const navigation = useNavigation<AppNavigationProp>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = paymentScreenStyles(theme, useWindowDimensions().width);
  const [recover, setRecover] = useState(false);
  const guest = !user || recover;
  const professional = !guest && user?.type === 'professional';
  const [payment, setPayment] = useState<payments.PackagePayment>();
  const [acceptance, setAcceptance] = useState<payments.PackagePaymentAcceptance>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [needsAccess, setNeedsAccess] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const accessKey = `${patientPackageId}:${guest}:${user?.id ?? ''}`;
  const current = useRef(accessKey); current.current = accessKey;
  const inFlight = useRef<{ key: string; reconcile: boolean; task: Promise<void> } | null>(null);
  const actionKey = useRef<string | null>(null);
  useEffect(() => { setPayment(undefined); setAcceptance(undefined); setNeedsAccess(false); setError(''); setLoading(true); setChecking(false); setBusy(false); }, [accessKey]);
  useEffect(() => { setSent(false); setCode(''); }, [patientPackageId, user?.id]);
  const refresh = useCallback(async function refreshPayment(reconcile = false): Promise<void> {
    const pending = inFlight.current;
    if (pending?.key === accessKey) {
      if (!reconcile || pending.reconcile) return pending.task;
      await pending.task.catch(() => undefined);
      if (current.current !== accessKey) return;
      return refreshPayment(true);
    }
    const key = accessKey;
    if (reconcile) setChecking(true);
    const task = (async () => {
      // Read first so a provider outage never hides the persisted payment or recovery controls.
      const loaded = await payments.getPackagePayment(patientPackageId, guest);
      if (current.current !== key) return;
      setPayment(loaded); setNeedsAccess(false); setError('');
      if (reconcile) {
        const reconciled = await payments.getPackagePayment(patientPackageId, guest, true);
        if (current.current === key) setPayment(reconciled);
      }
    })();
    inFlight.current = { key, reconcile, task };
    try { await task; } catch (e) { if (current.current === key) throw e; }
    finally { if (inFlight.current?.task === task) inFlight.current = null; if (current.current === key) { setLoading(false); if (reconcile) setChecking(false); } }
  }, [patientPackageId, guest, accessKey]);
  const report = (e: unknown) => {
    if (['PACKAGE_PAYMENT_NOT_FOUND', 'VALIDATION_ERROR', 'UNAUTHORIZED'].includes(getErrorCode(e) ?? '')) setNeedsAccess(true);
    setError(getErrorMessage(e, 'No se pudo comprobar el pago. Puedes actualizar su estado o recuperar el acceso.'));
  };
  usePaymentPolling(Boolean(payment && ['PREPARING', 'CHECKOUT', 'PROCESSING'].includes(payment.status)), refresh, report);
  const run = async (action: () => Promise<unknown>) => {
    const key = accessKey;
    if (actionKey.current === key) return;
    actionKey.current = key;
    setBusy(true); setError('');
    try { await action(); } catch (e) { if (current.current === key) report(e); }
    finally { if (actionKey.current === key) actionKey.current = null; if (current.current === key) setBusy(false); }
  };
  const pay = async () => {
    if (!payment) return;
    const fresh = payment.checkoutUrl ? await payments.getPackagePayment(patientPackageId, guest, true)
      : acceptance ? await payments.startPackagePayment(patientPackageId, guest, acceptance) : payment;
    if (current.current !== accessKey) return;
    setPayment(fresh);
    if (fresh.checkoutUrl && fresh.canPay) { await openCheckout(fresh.checkoutUrl); if (Platform.OS !== 'web') await refresh(true); }
  };
  const text = styles.body;
  return <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.page}>
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button variant="ghost" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate(professional ? 'ProfessionalPayments' : user ? 'Sessions' : 'Landing')}>{professional ? 'Volver a Cobros' : user ? 'Volver a mis citas' : 'Volver al inicio'}</Button>
        <Text style={[text, { alignSelf: 'center', fontSize: 13 }]}>Bono y pago</Text>
      </View>
      <Text accessibilityRole="header" style={styles.heading}>{checking && (!payment || payment.status === 'CHECKOUT') ? 'Comprobando el pago' : payment ? payments.packagePaymentStatus(payment) : 'Pago de tu bono'}</Text>
      {(busy || loading || checking) && <ActivityIndicator accessibilityLabel="Consultando el pago del bono" color={theme.primary} />}
      {!!error && <Text accessibilityRole="alert" style={{ ...text, color: theme.error }}>{error}</Text>}
      {payment && !needsAccess && <View style={styles.columns}><View style={styles.card}>
        <View style={styles.summary}>
          <Text style={[text, { fontSize: 13 }]}>Importe del bono</Text>
          <Text style={styles.amount}>{paymentAmount(payment.totalCents)}</Text>
          <Text style={[text, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{payment.name}</Text>
          <Text style={text}>{payment.sessions} sesiones incluidas</Text>
        </View>
        <Text style={text}>Tu bono y su factura se conservan si interrumpes el pago. La adquisición no reserva ningún horario.</Text>
        {payment.status === 'PAID' && <View style={{ flexDirection: 'row', gap: 12 }}><Feather name="check-circle" size={24} color={theme.success} /><Text style={{ ...text, flex: 1 }}>Cobro confirmado. Las sesiones incluidas no se volverán a cobrar.</Text></View>}
        {payment.issueCode && <Text style={text}>El cobro necesita revisión. Contacta con tu especialista antes de hacer otro pago. Conservamos la información del pago y tu factura.</Text>}
        {['PREPARING', 'PROCESSING'].includes(payment.status) && <Text style={text}>Estamos comprobando el resultado con Stripe. No vuelvas a adquirir el bono. Puedes cerrar esta pantalla y consultar su estado después.</Text>}
        {payment.mode === 'EXTERNAL' && payment.status !== 'PAID' && <Text style={text}>Acuerda el cobro con tu especialista. Puedes seguir utilizando el bono según sus condiciones.</Text>}
        {payment.canPay && !payment.checkoutUrl && <PackagePaymentConditions key={payment.termsVersion} policy={payment} value={acceptance} onChange={setAcceptance} disabled={busy || checking} />}
        {payment.canPay && !checking && <><Text style={text}>Te llevaremos a Stripe para pagar de forma segura. Al terminar, volverás aquí para ver el estado de tu bono.</Text><Button size="medium" icon={<Feather name="credit-card" size={20} color={theme.actionPrimaryText} />} loading={busy} disabled={!payment.checkoutUrl && !acceptance} onPress={() => void run(pay)}>{payment.checkoutUrl ? 'Continuar pago en Stripe' : 'Pagar bono'}</Button></>}
        {payment.required && !payment.canPay && !payment.issueCode && !['PREPARING', 'PROCESSING'].includes(payment.status) && <Text style={text}>{professional ? 'El paciente puede pagar desde el enlace incluido en la factura. También puedes registrar un cobro externo desde su bono.' : 'No se puede iniciar el pago ahora. Actualiza el estado o contacta con tu especialista.'}</Text>}
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="outline" disabled={busy || checking} icon={<Feather name="refresh-cw" size={16} color={theme.primary} />} onPress={() => void run(() => refresh(true))}>Actualizar estado</Button>
          {payment.canReserve && user?.type === 'client' && <Button disabled={busy} onPress={() => navigation.navigate('Booking', { specialistId: payment.specialistId, patientPackageId })}>Reservar con mi bono</Button>}
        </View>
      </View><View style={styles.aside}>
        <Feather name="file-text" size={22} color={theme.primary} />
        <Text style={{ color: theme.textPrimary, fontSize: 20, fontFamily: theme.fontSansBold }}>Documentos</Text>
        <Text style={text}>La factura se emitió al adquirir el bono. Las sesiones incluidas no generan otra factura.</Text>
        <Button variant="outline" disabled={busy} onPress={() => void run(() => payments.downloadPackagePaymentInvoice(patientPackageId, guest))}>Ver factura</Button>
      </View></View>}
      {!loading && (!payment || needsAccess) && <View style={{ gap: 16, paddingTop: 12 }}>
        <Text style={{ ...text, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>Recuperar acceso</Text>
        <Text style={text}>Enviaremos un código al correo del titular del bono. No necesitas crear una cuenta para pagar.</Text>
        <Button disabled={busy} onPress={() => void run(async () => { setRecover(true); await payments.requestPackagePaymentAccess(patientPackageId); setSent(true); })}>{sent ? 'Solicitar otro código' : 'Recibir código por correo'}</Button>
        {sent && <><TextInput accessibilityLabel="Código de acceso al bono" value={code} onChangeText={setCode} maxLength={6} keyboardType="number-pad" style={{ ...text, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12 }} />
          <Button disabled={busy || !/^\d{6}$/.test(code)} onPress={() => void run(async () => { await payments.verifyPackagePaymentAccess(patientPackageId, code); await refresh(true); })}>Verificar acceso</Button></>}
        <Button variant="ghost" disabled={busy} onPress={() => void run(() => refresh(true))}>Reintentar consulta</Button>
      </View>}
    </View>
  </ScrollView>;
}
