import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useIsFocused } from '@react-navigation/native';
import { getClinicalAccessStatus } from '../../services/clinicalService';
import { getErrorMessage } from '../../constants/errors';
import { setClinicalPinReturnContext } from '../../services/clinicalPinResetIntent';
import { ClinicalPinForm, clinicalPinTitles, type ClinicalPinMode } from './ClinicalPinForm';
import { AccountSettingsCard } from './AccountSettingsCard';
import { Ionicons } from '@expo/vector-icons';

export function ClinicalPinManager({ compact = false, clientId }: { compact?: boolean; clientId?: string }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const focused = useIsFocused();
  const [mode, setMode] = useState<ClinicalPinMode | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = async () => {
    setError('');
    try { setHasPin((await getClinicalAccessStatus()).hasPin); }
    catch (err: unknown) { setError(getErrorMessage(err, 'No se pudo comprobar tu PIN clínico.')); }
  };
  useEffect(() => { if (!compact) void load(); }, [compact]);
  const open = (nextMode: ClinicalPinMode) => {
    setSuccess(''); setMode(nextMode);
    if (clientId && user) setClinicalPinReturnContext(user.id, clientId);
  };
  const textStyle = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 15, lineHeight: 23 };
  const content = <>
      {error ? <><Text accessibilityRole="alert" style={[textStyle, { color: theme.error }]}>{error}</Text><Button variant="ghost" onPress={() => void load()}>Volver a comprobar</Button></> : null}
      <View style={styles.actions}>
        {!compact && hasPin !== null ? <Button size="small" onPress={() => open(hasPin ? 'change' : 'setup')}>{hasPin ? 'Cambiar PIN' : 'Configurar PIN'}</Button> : null}
        {compact || hasPin ? <Button variant="ghost" size="small" onPress={() => open('request')}>He olvidado mi PIN</Button> : null}
      </View>
    {success ? <Text accessibilityLiveRegion="polite" style={[textStyle, { color: theme.success }]}>{success}</Text> : null}
  </>;
  return <>
    {compact ? <View>{content}</View> : <AccountSettingsCard title="PIN clínico" description="Tu PIN de 6 dígitos protege el acceso al área clínica de tus pacientes. Es el mismo para todos tus expedientes y es distinto de la contraseña de tu cuenta.">{content}</AccountSettingsCard>}
    <Modal visible={mode !== null && focused} transparent animationType="fade" onRequestClose={() => setMode(null)}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: theme.bgCard }]}>
            {mode ? <>
              <View style={styles.dialogHeader}>
                <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{clinicalPinTitles[mode]}</Text>
                <Button variant="ghost" size="small" accessibilityLabel="Cerrar" onPress={() => setMode(null)}><Ionicons name="close-outline" size={22} color={theme.textSecondary} /></Button>
              </View>
              <ClinicalPinForm key={mode} mode={mode} onForgot={() => setMode('request')} onCompleted={(message) => {
                setMode(null); setSuccess(message); if (!compact) void load();
              }} />
            </> : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { flex: 1, fontSize: 22, lineHeight: 29 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 480, borderRadius: 20, padding: 24, gap: 16 },
});
