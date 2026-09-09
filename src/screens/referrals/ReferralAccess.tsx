import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { acceptDataProcessingAgreement, hasAcceptedCurrentDataProcessingAgreement } from '../../services/clinicalService';
import { WorkflowButton as Button, WorkflowHeading } from './WorkflowUI';
import { PinCodeInput } from '../../components/professional/PinCodeInput';
import { ClinicalPinForm } from '../../components/professional/ClinicalPinForm';
import { ClinicalPinManager } from '../../components/professional/ClinicalPinManager';
import { useClinicalAccessController } from '../../hooks/useClinicalAccessController';
import { getErrorMessage } from '../../constants/errors';
import { ReferralCard, ReferralText } from './ReferralElements';

export function ReferralClinicalAccess({ children }: { children: (token: string) => React.ReactNode }) {
  const [error, setError] = useState(''); const [pin, setPin] = useState('');
  const access = useClinicalAccessController({ onAccessLost: setError });
  const navigation = useNavigation<AppNavigationProp>();
  const [accepting, setAccepting] = useState(false);
  if (access.statusLoading) return <ActivityIndicator accessibilityLabel="Comprobando acceso protegido" />;
  if (access.token) return <>{children(access.token)}</>;
  const unlock = async () => {
    setError('');
    try { await access.unlockClinicalArea(pin); setPin(''); } catch (err) { setError(getErrorMessage(err, 'No se pudo desbloquear el acceso.')); }
  };
  return <ReferralCard style={{ width: "100%", maxWidth: 620, alignSelf: "center" }}><WorkflowHeading icon="lock-closed-outline" title="Propuesta protegida" /><ReferralText>Usa tu PIN clínico para preparar o revisar la información de una derivación.</ReferralText>
    {error ? <ReferralText error>{error}</ReferralText> : null}
    {!access.accessStatus ? <Button onPress={() => void access.loadStatus()}>Reintentar</Button>
      : access.accessStatus.hasPin && !hasAcceptedCurrentDataProcessingAgreement(access.accessStatus) ? <><ReferralText>Revisa el encargo de tratamiento vigente para continuar con el acceso protegido.</ReferralText><Button variant="ghost" onPress={() => navigation.navigate('LegalDocument', { documentKey: 'PROFESSIONAL_DATA_PROCESSING_TERMS' })}>Leer encargo de tratamiento</Button><Button loading={accepting} onPress={() => { if (accepting) return; setAccepting(true); setError(''); void acceptDataProcessingAgreement(access.accessStatus?.currentDataProcessingAgreementVersion).then(() => access.loadStatus()).catch(err => setError(getErrorMessage(err, 'No se pudo registrar la aceptación.'))).finally(() => setAccepting(false)); }}>Aceptar encargo y continuar</Button></>
      : !access.accessStatus.hasPin ? <ClinicalPinForm mode="setup" onForgot={() => setError('Configura tu PIN para continuar.')} onCompleted={() => void access.loadStatus()} />
      : <><PinCodeInput value={pin} onChange={setPin} label="PIN clínico" /><Button loading={access.accessSubmitting} disabled={pin.length !== 6} onPress={() => void unlock()}>Desbloquear</Button><ClinicalPinManager compact /></>}
  </ReferralCard>;
}
