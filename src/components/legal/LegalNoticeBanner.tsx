import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { dismissLegalNotice, type LegalNotice } from '../../services/legalService';

export function LegalNoticeBanner({ notices, onDismissed }: { notices: LegalNotice[]; onDismissed: (id: string) => void }) {
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const notice = notices[0];
  if (!notice) return null;
  const dismiss = async () => {
    if (busy) return;
    setBusy(true); setError(false);
    try { await dismissLegalNotice(notice.id); onDismissed(notice.id); }
    catch { setError(true); }
    finally { setBusy(false); }
  };
  return <View style={{ backgroundColor: theme.bgMuted, borderBottomWidth: 1, borderColor: theme.border, padding: 16, gap: 6 }}>
    <Text accessibilityRole="header" style={{ fontFamily: theme.fontSansSemiBold, color: theme.textPrimary }}>Actualización de {notice.title.toLowerCase()}</Text>
    <Text numberOfLines={3} style={{ fontFamily: theme.fontSans, color: theme.textSecondary }}>{notice.summary}</Text>
    <Text style={{ fontFamily: theme.fontSans, color: theme.textSecondary }}>
      {notice.appliesAt && notice.notifiedAt ? `Fecha prevista: ${new Date(notice.appliesAt).toLocaleDateString('es-ES')}. ` : ''}
      {notice.requiresExplicitAcceptance ? 'Te pediremos la aceptación al terminar el preaviso. Mientras tanto, puedes seguir utilizando HERA.' : 'Esta actualización no requiere una nueva aceptación.'}
    </Text>
    {error && <Text accessibilityRole="alert" style={{ color: theme.textPrimary }}>No se pudo cerrar el aviso. Puedes reintentar.</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button size="small" variant="outline" onPress={() => navigation.navigate('LegalDocument', { documentKey: notice.documentKey, version: notice.version })}>Leer documento</Button>
      <Button size="small" variant="ghost" disabled={busy} onPress={() => void dismiss()}>Cerrar aviso</Button>
    </View>
  </View>;
}
