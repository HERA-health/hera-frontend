import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { AnimatedPressable, type AnimatedPressableHandle } from '../../../components/common/AnimatedPressable';
import { borderRadius, spacing } from '../../../constants/colors';
import { legalReaderUrl } from '../../../services/legalReader';
import { choiceKeyboardProps } from '../../../utils/choiceKeyboard';
import {
  getSubscriptionConditions, submitSubscriptionRequest, subscriptionContactSchema, SubscriptionRequestError,
  type SubscriptionConditions, type SubscriptionContact,
} from '../../../services/subscriptionRequestService';
import type { PricingPlan } from '../pricingContent';

export function SubscriptionRequestModal({ plan, onClose }: { plan: PricingPlan; onClose: () => void }) {
  const { theme } = useTheme();
  const compact = useWindowDimensions().width < 720;
  const fieldStyle = compact ? styles.singleField : styles.field;
  const closeButton = useRef<AnimatedPressableHandle>(null);
  const mounted = useRef(true);
  const sending = useRef(false);
  const [contact, setContact] = useState<SubscriptionContact>({ firstName: '', lastName: '', email: '', phone: '', licenseNumber: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof SubscriptionContact, string>>>({});
  const [conditions, setConditions] = useState<SubscriptionConditions | null>(null);
  const [loadingConditions, setLoadingConditions] = useState(true);
  const [conditionsError, setConditionsError] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const body = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };

  async function loadConditions() {
    setLoadingConditions(true);
    setConditionsError(false);
    try {
      const result = await getSubscriptionConditions();
      if (mounted.current) setConditions(result);
    } catch {
      if (mounted.current) setConditionsError(true);
    } finally {
      if (mounted.current) setLoadingConditions(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void loadConditions();
    return () => { mounted.current = false; };
  }, []);

  const close = () => { if (!sending.current) onClose(); };
  const toggleAcceptance = () => { setAccepted(value => !value); setError(''); };
  const change = (field: keyof SubscriptionContact, value: string) => {
    setContact(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setError('');
  };
  async function submit() {
    if (sending.current || sent) return;
    const parsed = subscriptionContactSchema.safeParse(contact);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors({ firstName: fields.firstName?.[0], lastName: fields.lastName?.[0], email: fields.email?.[0], phone: fields.phone?.[0], licenseNumber: fields.licenseNumber?.[0] });
      setError('Revisa los campos indicados.');
      return;
    }
    if (!accepted || !conditions || loadingConditions || conditionsError) {
      setError('Lee y acepta las condiciones y la política de privacidad.');
      return;
    }
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await submitSubscriptionRequest({
        ...parsed.data, planId: plan.id, accepted: true,
        conditionsVersion: conditions.version, conditionsHash: conditions.contentHash,
        privacyVersion: conditions.privacy.version, privacyHash: conditions.privacy.contentHash,
      });
      if (mounted.current) setSent(true);
    } catch (failure: unknown) {
      if (!mounted.current) return;
      setError(failure instanceof SubscriptionRequestError ? failure.message : 'No hemos podido confirmar el envío. Puedes volver a intentarlo.');
      if (failure instanceof SubscriptionRequestError && failure.conditionsChanged) {
        setAccepted(false);
        setConditions(null);
        setShowConditions(true);
        await loadConditions();
      }
    } finally {
      sending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function openPrivacy() {
    if (!conditions) return;
    try { await Linking.openURL(legalReaderUrl('PRIVACY_POLICY', conditions.privacy.version)); }
    catch { setError('No se ha podido abrir la política de privacidad. Vuelve a intentarlo.'); }
  }

  return <Modal visible transparent animationType="none" onRequestClose={close} onShow={() => closeButton.current?.focus()}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.overlay, { backgroundColor: theme.overlay, padding: compact ? 12 : 24 }]}>
      <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <View style={[styles.header, { borderBottomColor: theme.borderLight, paddingLeft: compact ? 20 : 28 }]}>
          <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>HERA / {sent ? 'SOLICITUD RECIBIDA' : 'ACTIVACIÓN MANUAL'}</Text>
          <AnimatedPressable focusRef={closeButton} onPress={close} disabled={busy} accessibilityLabel="Cerrar solicitud" style={styles.close}>
            <Ionicons name="close" size={22} color={theme.textPrimary} accessible={false} />
          </AnimatedPressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { padding: compact ? 20 : 28 }]}>
          {sent ? <View style={styles.success} accessibilityLiveRegion="polite">
            <View style={[styles.successIcon, { backgroundColor: theme.secondaryMuted }]}><Ionicons name="checkmark" size={32} color={theme.primary} accessible={false} /></View>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Solicitud enviada correctamente</Text>
            <Text style={[styles.copy, body]}>Hemos recibido tu solicitud para el plan {plan.name}. HERA contactará contigo por email para confirmar la activación de tu prueba gratuita.</Text>
            <Text style={[styles.small, body]}>Si deseas continuar después, te facilitaremos las instrucciones de transferencia bancaria.</Text>
            <Button onPress={close} fullWidth>Volver a los planes</Button>
          </View> : <>
            <View style={styles.intro}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Solicita tu prueba gratuita</Text>
              <Text style={[styles.copy, body]}>Déjanos tus datos para solicitar la activación. HERA te confirmará por email cuándo empieza tu prueba gratuita.</Text>
            </View>
            <View style={[styles.plan, { backgroundColor: theme.landingProfessional }]}>
              <View style={styles.flex}><Text style={[styles.planName, strong]}>Plan {plan.name}</Text><Text style={[styles.small, body]}>1 mes gratuito desde la activación</Text></View>
              <View><Text style={[styles.planPrice, strong]}>{plan.monthlyPrice} €</Text><Text style={[styles.small, body]}>después / mes + IVA</Text></View>
            </View>
            <View style={[styles.fields, !compact && styles.row]}>
              <Input label="Nombre *" accessibilityLabel="Nombre" value={contact.firstName} onChangeText={value => change('firstName', value)} error={errors.firstName} editable={!busy} maxLength={100} autoComplete="given-name" containerStyle={fieldStyle} />
              <Input label="Apellidos *" accessibilityLabel="Apellidos" value={contact.lastName} onChangeText={value => change('lastName', value)} error={errors.lastName} editable={!busy} maxLength={150} autoComplete="family-name" containerStyle={fieldStyle} />
            </View>
            <Input label="Email *" accessibilityLabel="Email" value={contact.email} onChangeText={value => change('email', value)} error={errors.email} editable={!busy} maxLength={254} autoComplete="email" autoCapitalize="none" keyboardType="email-address" containerStyle={styles.singleField} />
            <View style={[styles.fields, !compact && styles.row]}>
              <Input label="Teléfono (opcional)" accessibilityLabel="Teléfono (opcional)" value={contact.phone} onChangeText={value => change('phone', value)} error={errors.phone} editable={!busy} maxLength={40} autoComplete="tel" keyboardType="phone-pad" containerStyle={fieldStyle} />
              <Input label="Número de colegiado (opcional)" accessibilityLabel="Número de colegiado (opcional)" value={contact.licenseNumber} onChangeText={value => change('licenseNumber', value)} error={errors.licenseNumber} editable={!busy} maxLength={80} containerStyle={fieldStyle} />
            </View>
            {loadingConditions ? <View style={styles.loading}><ActivityIndicator color={theme.primary} /><Text style={[styles.small, body]}>Cargando condiciones…</Text></View>
              : conditionsError ? <View accessibilityLiveRegion="polite"><Text style={[styles.small, { color: theme.error }]}>No se han podido cargar las condiciones.</Text><Button variant="outline" onPress={() => { void loadConditions(); }}>Reintentar carga</Button></View>
              : conditions ? <View>
                <Pressable {...choiceKeyboardProps(toggleAcceptance, busy)} accessibilityRole="checkbox" aria-checked={accepted} aria-disabled={busy} accessibilityLabel="Acepto las condiciones de solicitud y la política de privacidad" accessibilityState={{ checked: accepted, disabled: busy }} disabled={busy} onPress={toggleAcceptance} style={styles.acceptance}>
                  <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={24} color={theme.primary} accessible={false} />
                  <Text style={[styles.small, body, styles.flex]}>Acepto las condiciones de solicitud de suscripción y la política de privacidad de HERA.</Text>
                </Pressable>
                <View style={styles.links}>
                  <Pressable accessibilityRole="button" aria-expanded={showConditions} accessibilityState={{ expanded: showConditions }} onPress={() => setShowConditions(!showConditions)} style={styles.link}><Text style={[styles.small, { color: theme.primary, fontFamily: theme.fontSansSemiBold, textDecorationLine: 'underline' }]}>{showConditions ? 'Ocultar condiciones' : 'Leer condiciones'}</Text></Pressable>
                  <Pressable accessibilityRole="link" onPress={() => { void openPrivacy(); }} style={styles.link}><Text style={[styles.small, { color: theme.primary, fontFamily: theme.fontSansSemiBold, textDecorationLine: 'underline' }]}>Política de privacidad ↗</Text></Pressable>
                </View>
                {showConditions ? <View style={[styles.terms, { borderColor: theme.borderLight }]}>
                  <Text accessibilityRole="header" style={[styles.copy, strong]}>{conditions.title}</Text>
                  <Text style={[styles.small, body]}>Versión {conditions.version}</Text>
                  {conditions.paragraphs.map((paragraph, index) => <Text key={index} style={[styles.small, body]}>{paragraph}</Text>)}
                </View> : null}
              </View> : null}
            {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.small, { color: theme.error, fontFamily: theme.fontSans }]}>{error}</Text> : null}
            <View style={[styles.actions, !compact && styles.row]}>
              <Button variant="outline" onPress={close} disabled={busy} style={compact ? undefined : styles.action}>Volver</Button>
              <Button onPress={() => { void submit(); }} loading={busy} disabled={!accepted || !conditions || loadingConditions || conditionsError} accessibilityLabel={busy ? 'Enviando solicitud' : 'Solicitar prueba gratuita'} style={compact ? undefined : styles.action}>Solicitar prueba gratuita</Button>
            </View>
            <Text style={[styles.small, body]}>Sin pago ahora. El envío de esta solicitud no activa el plan.</Text>
          </>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 640, maxHeight: '100%', borderWidth: 1, borderRadius: borderRadius.xl, overflow: 'hidden' },
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12, paddingVertical: 6, borderBottomWidth: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.2 },
  content: { gap: spacing.md },
  intro: { gap: 8 },
  title: { fontSize: 30, lineHeight: 37 },
  copy: { fontSize: 14, lineHeight: 22 },
  small: { fontSize: 12, lineHeight: 19 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: borderRadius.md },
  planName: { fontSize: 16, lineHeight: 24 },
  planPrice: { fontSize: 24, lineHeight: 30 },
  flex: { flex: 1, minWidth: 0 },
  fields: { gap: 14 },
  row: { flexDirection: 'row' },
  field: { flexGrow: 1, flexBasis: 0, minWidth: 0, marginBottom: 0 },
  singleField: { marginBottom: 0 },
  acceptance: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 },
  link: { minHeight: 44, justifyContent: 'center' },
  terms: { paddingTop: 12, paddingBottom: 8, gap: 10, borderTopWidth: 1 },
  actions: { gap: 12 },
  action: { flexGrow: 1, flexBasis: 0 },
  loading: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 },
  success: { gap: 20, paddingVertical: 8 },
  successIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
