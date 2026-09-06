import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/common';
import { ClinicalPinForm } from '../../components/professional/ClinicalPinForm';
import { ClinicalPinError, validateClinicalPinReset } from '../../services/clinicalPinService';
import { clearClinicalPinResetIntent, getClinicalPinResetToken, subscribeClinicalPinReset, takeClinicalPinReturnClient } from '../../services/clinicalPinResetIntent';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp } from '../../constants/types';

export function ClinicalPinResetScreen() {
  const { user, isAuthenticated, logout, refreshCurrentUser } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const token = useSyncExternalStore(subscribeClinicalPinReset, getClinicalPinResetToken, () => null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'error'>('loading');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [request, setRequest] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [returnClient] = useState(() => user ? takeClinicalPinReturnClient(user.id) : undefined);
  useEffect(() => { if (token) { setSuccess(''); setRequest(false); setFormKey((key) => key + 1); } }, [token]);
  useEffect(() => {
    if (!isAuthenticated || user?.type !== 'professional') return;
    let active = true;
    setStatus('loading'); setError('');
    if (!token) { setStatus('invalid'); return; }
    void validateClinicalPinReset(token).then(() => { if (active) setStatus('valid'); }).catch((err: unknown) => {
      if (!active) return;
      setStatus(err instanceof ClinicalPinError && err.code === 'CLINICAL_PIN_RESET_INVALID' ? 'invalid' : 'error');
      setError(getErrorMessage(err, 'No se pudo comprobar el enlace.'));
    });
    return () => { active = false; };
  }, [token, isAuthenticated, user?.id, user?.type, refreshKey]);
  const textStyle = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 16, lineHeight: 24 };
  return <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Restablecer PIN clínico</Text>
      {success ? <>
        <Text accessibilityLiveRegion="polite" style={textStyle}>{success}</Text>
        <Button onPress={() => {
          if (returnClient) navigation.navigate('ClientProfile', { clientId: returnClient, initialTab: 'clinical' });
          else navigation.navigate('ProfessionalClients');
        }}>{returnClient ? 'Volver al expediente' : 'Ir a mis pacientes'}</Button>
      </> : !isAuthenticated ? <>
        <Text style={textStyle}>Para crear un nuevo PIN, inicia sesión en la cuenta de HERA que solicitó el cambio. Después volverás a este paso.</Text>
        <Button onPress={() => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}>Iniciar sesión</Button>
      </> : user?.type !== 'professional' ? <>
        <Text style={textStyle}>Este enlace es para una cuenta de especialista. Entra con la cuenta que solicitó el cambio.</Text>
        <Button onPress={() => void logout()}>Entrar con otra cuenta</Button>
      </> : request ? <ClinicalPinForm mode="request" onForgot={() => {}} onCompleted={() => {}} />
        : status === 'loading' ? <ActivityIndicator color={theme.primary} accessibilityLabel="Comprobando enlace" />
        : status === 'valid' && token ? <ClinicalPinForm key={formKey} mode="reset" resetToken={token} onForgot={() => setRequest(true)} onCompleted={(message) => { setSuccess(message); clearClinicalPinResetIntent(); }} />
        : <>
          <Text accessibilityRole="alert" style={textStyle}>{status === 'invalid' ? 'Este enlace ya no es válido. Solicita uno nuevo para restablecer tu PIN.' : error}</Text>
          {status === 'invalid' ? <Text style={textStyle}>Comprueba también que has iniciado sesión en la cuenta que solicitó el cambio.</Text> : null}
          {status === 'error' ? <Button onPress={() => void refreshCurrentUser().then(() => setRefreshKey((key) => key + 1)).catch(() => setError('No se pudo comprobar tu cuenta. Inténtalo de nuevo.'))}>Volver a comprobar</Button> : null}
          <Button onPress={() => setRequest(true)}>Solicitar nuevo enlace</Button>
          <Button variant="ghost" onPress={() => void logout()}>Entrar con otra cuenta</Button>
        </>}
      {!success ? <Button variant="ghost" onPress={() => {
        clearClinicalPinResetIntent();
        if (user?.type === 'professional') navigation.navigate('ProfessionalClients');
        else navigation.navigate('Landing');
      }}>Volver a HERA</Button> : null}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, card: { width: '100%', maxWidth: 540, borderWidth: 1, borderRadius: 20, padding: 24, gap: 24 }, title: { fontSize: 28, lineHeight: 36 } });
