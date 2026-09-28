import React, { useContext, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrivacyControlsContext, PrivacyControlsVisibleContext } from '../../components/common/PrivacyPreferences';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { disconnectGoogleCalendar } from '../../services/googleCalendarService';
import { withdrawReligion } from '../../services/profileDiscoveryService';
import { acceptLegalDocuments, type LegalDocumentStatus, type LegalAcceptanceStatus } from '../../services/legalService';
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from '../../constants/legal';
import type { AppNavigationProp } from '../../constants/types';
import { getErrorMessage } from '../../constants/errors';
import { LegalGateLayout } from './LegalGateLayout';

interface RequiredLegalAcceptanceScreenProps {
  requiredDocumentKeys: LegalDocumentKey[];
  documents?: LegalDocumentStatus[];
  onAccepted: (status: LegalAcceptanceStatus) => void;
}

export function RequiredLegalAcceptanceScreen({ requiredDocumentKeys, documents, onAccepted }: RequiredLegalAcceptanceScreenProps) {
  const { logout, user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const focused = useIsFocused();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const openPrivacy = useContext(PrivacyControlsContext);
  const privacyVisible = useContext(PrivacyControlsVisibleContext);
  const [accepted, setAccepted] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [pending, setPending] = useState<'accept' | 'religion' | 'calendar' | 'logout' | null>(null);
  const busy = useRef(false);
  const bodyRef = useRef<ScrollView>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const compact = width < 600;
  const textStyle = { color: theme.textSecondary, fontFamily: theme.fontSans };

  const runAction = async (action: NonNullable<typeof pending>, work: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(action);
    setError('');
    setMessage('');
    try { await work(); }
    catch (err: unknown) { setError(getErrorMessage(err, 'No hemos podido guardar el cambio. Inténtalo de nuevo.')); }
    finally { busy.current = false; setPending(null); }
  };

  const submit = () => {
    if (!accepted) return;
    void runAction('accept', async () => {
      const status = await acceptLegalDocuments(requiredDocumentKeys, 'required-gate', documents);
      onAccepted(status);
    });
  };

  return <LegalGateLayout>
    <View style={styles.backgroundCopy}>
      <Text style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 30 }}>Tu espacio en HERA</Text>
    </View>
    <Modal visible={focused && !privacyVisible} transparent animationType="none"
      onRequestClose={() => setError('Para continuar, acepta las condiciones. También puedes cerrar sesión.')}>
      <View style={[styles.overlay, { paddingHorizontal: compact ? 16 : 32, paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <ScrollView ref={bodyRef} style={styles.body} contentContainerStyle={[styles.bodyContent, { padding: compact ? 20 : 28 }]}
            onContentSizeChange={() => { if (optionsOpen) bodyRef.current?.scrollToEnd({ animated: false }); }}>
            <View style={styles.heading}>
              <View style={[styles.icon, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="shield-checkmark-outline" size={23} color={theme.primary} />
              </View>
              <View style={styles.headingCopy}>
                <Text style={[styles.eyebrow, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>PRIVACIDAD EN HERA</Text>
                <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Condiciones actualizadas</Text>
              </View>
            </View>
            <Text style={[styles.description, textStyle]}>Revisa los documentos actualizados y confirma tu aceptación para seguir usando HERA.</Text>
            <View style={[styles.documents, { borderColor: theme.border }]}>
              {requiredDocumentKeys.map((key, index) => {
                const document = documents?.find(doc => doc.key === key) ?? LEGAL_DOCUMENTS[key];
                return <AnimatedPressable key={key} disabled={pending !== null} accessibilityRole="button"
                  accessibilityLabel={`Leer ${document.title}, versión ${document.version}`}
                  onPress={() => navigation.navigate('LegalDocument', { documentKey: key, version: document.version })}
                  hoverLift={false} pressScale={1}
                  style={[styles.documentRow, {
                    borderTopWidth: index ? 1 : 0,
                    borderColor: theme.border,
                    borderTopLeftRadius: index === 0 ? 11 : 0,
                    borderTopRightRadius: index === 0 ? 11 : 0,
                    borderBottomLeftRadius: index === requiredDocumentKeys.length - 1 ? 11 : 0,
                    borderBottomRightRadius: index === requiredDocumentKeys.length - 1 ? 11 : 0,
                    ...(Platform.OS === 'web' ? { outlineColor: theme.primary, outlineOffset: -2 } : {}),
                  }]}>
                  <Ionicons name="document-text-outline" size={21} color={theme.primary} />
                  <View style={styles.documentCopy}>
                    <Text style={[styles.documentTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{document.title}</Text>
                    <Text style={[styles.documentMeta, { color: theme.textMuted, fontFamily: theme.fontSans }]}>Versión {document.version}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
                </AnimatedPressable>;
              })}
            </View>
            <AnimatedPressable disabled={pending !== null} onPress={() => setAccepted(value => !value)} accessibilityRole="checkbox"
              accessibilityLabel="Acepto las condiciones contractuales y confirmo haber recibido la información de privacidad"
              accessibilityState={{ checked: accepted, disabled: pending !== null }} hoverLift={false} pressScale={1} style={styles.acceptRow}>
              <View style={[styles.checkbox, { backgroundColor: accepted ? theme.primary : theme.bgCard, borderColor: accepted ? theme.primary : theme.border }]}>
                {accepted ? <Ionicons name="checkmark" size={16} color={theme.textOnPrimary} /> : null}
              </View>
              <Text style={[styles.acceptText, textStyle]}>Acepto las condiciones contractuales indicadas y confirmo haber recibido la información de privacidad.</Text>
            </AnimatedPressable>
            <Text style={[styles.note, { color: theme.textMuted, fontFamily: theme.fontSans }]}>Esta aceptación no activa las estadísticas de uso, Google Calendar ni Google Meet.</Text>
            {optionsOpen ? <View style={[styles.options, { borderTopColor: theme.border }]}>
              <Text style={[styles.optionsTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Tus opciones de privacidad</Text>
              <Text style={[styles.optionNote, textStyle]}>Puedes gestionarlas sin aceptar las nuevas condiciones.</Text>
              {openPrivacy ? <Button variant="outline" size="small" fullWidth disabled={pending !== null} onPress={openPrivacy}>Preferencias de privacidad</Button> : null}
              {user?.type === 'professional' ? <>
                <Button variant="outline" size="small" fullWidth loading={pending === 'religion'} disabled={pending !== null}
                  accessibilityLabel="Retirar mi religión o creencias"
                  onPress={() => void runAction('religion', async () => {
                    await withdrawReligion();
                    setMessage('Tu declaración de religión o creencias se ha eliminado.');
                  })}>Retirar mi religión o creencias</Button>
                <Button variant="outline" size="small" fullWidth loading={pending === 'calendar'} disabled={pending !== null}
                  accessibilityLabel="Desconectar Google Calendar"
                  onPress={() => void runAction('calendar', async () => {
                    await disconnectGoogleCalendar();
                    setMessage('Desconexión solicitada. Las copias existentes permanecen en Google.');
                  })}>Desconectar Google Calendar</Button>
              </> : null}
            </View> : null}
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: theme.border, paddingHorizontal: compact ? 20 : 28 }]}>
            {error ? <Text accessibilityRole="alert" style={[styles.feedback, { color: theme.error, fontFamily: theme.fontSans }]}>{error}</Text> : null}
            {message ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{message}</Text> : null}
            <Button onPress={submit} fullWidth loading={pending === 'accept'} disabled={!accepted || pending !== null} accessibilityLabel="Aceptar y continuar">Aceptar y continuar</Button>
            <View style={styles.secondaryActions}>
              <Button variant="ghost" size="small" disabled={pending !== null} style={styles.secondaryButton}
                accessibilityLabel="Opciones de privacidad"
                accessibilityState={{ expanded: optionsOpen }} onPress={() => setOptionsOpen(value => !value)}
                icon={<Ionicons name={optionsOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.primary} />} iconPosition="right">Opciones de privacidad</Button>
              <Button variant="ghost" size="small" disabled={pending !== null} loading={pending === 'logout'} style={styles.secondaryButton}
                accessibilityLabel="Cerrar sesión" onPress={() => void runAction('logout', logout)}>Cerrar sesión</Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  </LegalGateLayout>;
}

const styles = StyleSheet.create({
  backgroundCopy: { padding: 32 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(18, 37, 34, 0.42)' },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '100%', borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  body: { flexShrink: 1 },
  bodyContent: { gap: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headingCopy: { flex: 1 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.1, marginBottom: 5 },
  title: { fontSize: 27, lineHeight: 31 },
  description: { fontSize: 14, lineHeight: 22 },
  documents: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  documentRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, minHeight: 74 },
  documentCopy: { flex: 1 },
  documentTitle: { fontSize: 14, lineHeight: 20 },
  documentMeta: { fontSize: 12, marginTop: 3 },
  acceptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  acceptText: { flex: 1, fontSize: 13, lineHeight: 21 },
  note: { fontSize: 12, lineHeight: 18, marginTop: -8 },
  options: { borderTopWidth: 1, paddingTop: 20, gap: 10 },
  optionsTitle: { fontSize: 14 },
  optionNote: { fontSize: 12, lineHeight: 18, marginBottom: 2 },
  footer: { borderTopWidth: 1, paddingTop: 18, paddingBottom: 10, gap: 8 },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  secondaryButton: { minHeight: 44, paddingHorizontal: 0 },
  feedback: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
});
