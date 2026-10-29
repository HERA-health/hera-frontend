import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { dismissLegalNotice, type LegalNotice } from '../../services/legalService';
import { Button } from '../common/Button';

interface LegalNoticeItemProps {
  notice: LegalNotice;
  onDismissed: (id: string) => void;
  onDocumentOpened: () => void;
}

export function LegalNoticeItem({ notice, onDismissed, onDocumentOpened }: LegalNoticeItemProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const dismissing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const dismiss = async () => {
    if (dismissing.current) return;
    dismissing.current = true;
    setBusy(true);
    setError(false);
    try {
      await dismissLegalNotice(notice.id);
      onDismissed(notice.id);
    } catch {
      setError(true);
    } finally {
      dismissing.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={[styles.notice, { borderTopColor: theme.borderLight }]}>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: theme.primaryAlpha12 }]}>
          <Ionicons name="document-text-outline" size={18} color={theme.textSecondary} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.label, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>Actualización legal</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{notice.title}</Text>
        </View>
      </View>
      <Text numberOfLines={3} style={[styles.summary, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{notice.summary}</Text>
      {notice.appliesAt ? (
        <Text style={[styles.detail, { color: theme.textMuted, fontFamily: theme.fontSans }]}>Fecha prevista: {new Date(notice.appliesAt).toLocaleDateString('es-ES')}.</Text>
      ) : null}
      <Text style={[styles.detail, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
        {notice.requiresExplicitAcceptance
          ? 'Te pediremos la aceptación al terminar el preaviso. Puedes seguir usando HERA.'
          : 'Esta actualización no requiere una nueva aceptación.'}
      </Text>
      {error ? <Text accessibilityRole="alert" style={[styles.detail, { color: theme.error, fontFamily: theme.fontSans }]}>No se pudo cerrar el aviso. Puedes reintentar.</Text> : null}
      <View style={styles.actions}>
        <Button size="small" variant="outline" style={styles.action} textStyle={styles.actionText} onPress={() => {
          navigation.navigate('LegalDocument', { documentKey: notice.documentKey, version: notice.version });
          onDocumentOpened();
        }}>Leer documento</Button>
        <Button size="small" variant="ghost" style={styles.action} textStyle={styles.actionText} loading={busy} onPress={() => void dismiss()}>Cerrar aviso</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { borderTopWidth: 1, marginTop: 6, paddingHorizontal: 10, paddingTop: 14, paddingBottom: 6, gap: 7 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, minWidth: 0, gap: 3 },
  label: { fontSize: 10, lineHeight: 14 },
  title: { fontSize: 12, lineHeight: 18 },
  summary: { fontSize: 12, lineHeight: 18 },
  detail: { fontSize: 11, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  action: { minHeight: 44, paddingHorizontal: 10 },
  actionText: { fontSize: 12 },
});
