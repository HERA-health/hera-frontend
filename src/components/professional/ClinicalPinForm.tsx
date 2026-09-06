import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../common';
import { PinCodeInput } from './PinCodeInput';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp } from '../../constants/types';
import { LEGAL_DOCUMENT_VERSION } from '../../constants/legal';
import { acceptLegalDocuments, getLegalStatus } from '../../services/legalService';
import * as clinical from '../../services/clinicalService';
import * as pinService from '../../services/clinicalPinService';

export type ClinicalPinMode = 'setup' | 'change' | 'request' | 'reset';
export const clinicalPinTitles: Record<ClinicalPinMode, string> = {
  setup: 'Configurar PIN clínico', change: 'Cambiar PIN clínico', request: 'Restablecer PIN clínico', reset: 'Crear nuevo PIN clínico',
};
interface Props {
  mode: ClinicalPinMode;
  resetToken?: string;
  onForgot: () => void;
  onCompleted: (message: string) => void;
}

export function ClinicalPinForm({ mode, resetToken, onForgot, onCompleted }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(mode !== 'request');
  const [ready, setReady] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dpaAccepted, setDpaAccepted] = useState(false);
  const [sent, setSent] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = async () => {
    setLoading(true); setError(''); setReady(false);
    try {
      const [status, legal] = await Promise.all([clinical.getClinicalAccessStatus(), getLegalStatus()]);
      if (!mounted.current) return;
      setTermsAccepted(legal.acceptedDocuments.some((doc) => doc.documentKey === 'CLINICAL_MODULE_TERMS' && doc.version === LEGAL_DOCUMENT_VERSION));
      setDpaAccepted(clinical.hasAcceptedCurrentDataProcessingAgreement(status));
      setReady(true);
    } catch (err: unknown) { if (mounted.current) setError(getErrorMessage(err, 'No se pudo comprobar el acceso clínico.')); }
    finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => { if (mode !== 'request') void load(); }, [mode]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  const run = async (operation: () => Promise<void>) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { await operation(); }
    catch (err: unknown) {
      if (mounted.current) {
        if (['CLINICAL_DPA_REQUIRED', 'LEGAL_ACCEPTANCE_REQUIRED'].includes(getErrorCode(err) || '')) await load();
        setError(getErrorMessage(err, 'No se pudo completar la operación. Inténtalo de nuevo.'));
      }
    }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  };
  const save = () => run(async () => {
    if (!/^\d{6}$/.test(next) || (mode === 'change' && !/^\d{6}$/.test(current))) throw new Error('El PIN clínico debe tener exactamente 6 dígitos.');
    if (next !== confirm) throw new Error('Los dos PIN no coinciden. Revísalos antes de guardar.');
    if (mode === 'change' && current === next) throw new Error('El nuevo PIN debe ser distinto del actual.');
    if (mode === 'setup') await clinical.setupClinicalPin(next);
    else if (mode === 'change') await clinical.rotateClinicalPin(current, next);
    else if (resetToken) await pinService.confirmClinicalPinReset(resetToken, next);
    else throw new Error('Este enlace ya no es válido. Solicita uno nuevo para restablecer tu PIN.');
    if (mode !== 'reset') await pinService.notifyClinicalPinChange();
    setCurrent(''); setNext(''); setConfirm('');
    onCompleted(mode === 'setup' ? 'Tu PIN clínico se ha configurado. Ya puedes usarlo para abrir el área clínica.'
      : mode === 'change' ? 'Tu PIN se ha cambiado. Usa el nuevo PIN para volver a abrir el área clínica.'
      : 'Tu PIN se ha restablecido. Ya puedes usarlo para abrir el área clínica. Tus expedientes se han conservado.');
  });
  const textStyle = { color: theme.textSecondary, fontFamily: theme.fontSans, lineHeight: 23, fontSize: 15 };
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const request = mode === 'request';
  return <View style={styles.form}>
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[textStyle, { color: theme.error }]}>{error}</Text> : null}
    {request ? <>
      <Text style={textStyle}>{sent
        ? `Hemos enviado un enlace a ${pinService.maskClinicalEmail(user?.email || '')}. Caduca en 15 minutos. Si no lo encuentras, revisa la carpeta de spam.`
        : `Te enviaremos un enlace a ${pinService.maskClinicalEmail(user?.email || '')} para que puedas crear un nuevo PIN. Tus expedientes se conservarán.`}</Text>
      <Text style={textStyle}>Solo funcionará el enlace más reciente. Al abrirlo, inicia sesión con esta misma cuenta.</Text>
      <Button loading={busy} disabled={seconds > 0} onPress={() => void run(async () => {
        // Keep a cooldown even after an ambiguous network result.
        setRetryAt(Date.now() + 60_000); setNow(Date.now());
        await pinService.requestClinicalPinReset(); setSent(true);
      })}>{seconds > 0 ? `Podrás reenviar en ${seconds} s` : sent ? 'Reenviar enlace' : 'Enviar enlace'}</Button>
    </> : loading ? <ActivityIndicator accessibilityLabel="Comprobando acceso clínico" color={theme.primary} />
      : !ready ? <Button onPress={() => void load()}>Volver a comprobar</Button>
      : !termsAccepted ? <>
        <Text style={textStyle}>Antes de continuar, revisa y acepta las condiciones vigentes del módulo clínico.</Text>
        <Button variant="ghost" onPress={() => navigation.navigate('LegalDocument', { documentKey: 'CLINICAL_MODULE_TERMS' })}>Leer condiciones clínicas</Button>
        <Button loading={busy} onPress={() => void run(async () => { await acceptLegalDocuments(['CLINICAL_MODULE_TERMS'], 'clinical-pin'); await load(); })}>Aceptar condiciones clínicas</Button>
      </> : !dpaAccepted ? <>
        <Text style={textStyle}>Para proteger la información de tus pacientes, revisa y acepta el encargo de tratamiento vigente.</Text>
        <Button variant="ghost" onPress={() => navigation.navigate('LegalDocument', { documentKey: 'PROFESSIONAL_DATA_PROCESSING_TERMS' })}>Leer encargo de tratamiento</Button>
        <Button loading={busy} onPress={() => void run(async () => { await clinical.acceptDataProcessingAgreement(); await load(); })}>Aceptar y continuar</Button>
      </> : <>
        <Text style={textStyle}>{mode === 'setup' ? 'Elige un PIN de 6 dígitos. Es el mismo para todos tus expedientes y es distinto de la contraseña de tu cuenta.' : 'Al cambiar el PIN, tendrás que volver a desbloquear el área clínica en tus dispositivos. Tus expedientes se conservarán.'}</Text>
        {mode === 'change' ? <PinCodeInput label="PIN actual" value={current} onChange={setCurrent} masked={!visible} /> : null}
        <PinCodeInput label={mode === 'setup' ? 'Crea tu PIN' : 'Nuevo PIN'} value={next} onChange={setNext} masked={!visible} />
        <PinCodeInput label="Repite el nuevo PIN" value={confirm} onChange={setConfirm} masked={!visible} error={confirm.length === 6 && next !== confirm} />
        <Button variant="ghost" size="small" style={styles.visibilityButton} onPress={() => setVisible(!visible)}>{visible ? 'Ocultar PIN' : 'Mostrar PIN'}</Button>
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          {mode === 'change' ? <Button variant="ghost" size="small" onPress={onForgot}>He olvidado mi PIN</Button> : null}
          {mode === 'reset' && error ? <Button variant="ghost" size="small" onPress={onForgot}>Solicitar nuevo enlace</Button> : null}
          <Button size="small" loading={busy} onPress={() => void save()}>{mode === 'setup' ? 'Guardar PIN' : 'Guardar nuevo PIN'}</Button>
        </View>
      </>}
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 16, width: '100%' },
  visibilityButton: { alignSelf: 'flex-end' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTopWidth: 1 },
});
