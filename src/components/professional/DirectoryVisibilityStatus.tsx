import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { PublicDirectoryStatus } from '../../services/professionalService';
import { AnimatedPressable, type AnimatedPressableHandle } from '../common/AnimatedPressable';

type Action = 'credentials' | 'privacy' | 'pricing' | 'account';
interface Props {
  status: PublicDirectoryStatus | null;
  hasChanges: boolean;
  inPersonInsurancePending: boolean;
  onAction: (action: Action) => void;
  onRetry: () => void;
}

export const DirectoryVisibilityStatus = ({ status, hasChanges, inPersonInsurancePending, onAction, onRetry }: Props) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const triggerRef = useRef<AnimatedPressableHandle>(null);
  const [anchor, setAnchor] = useState({ x: 16, y: 16, width: 140, height: 44 });
  const { width, height } = useWindowDimensions();
  const close = useCallback(() => {
    setExpanded(false);
    if (Platform.OS === 'web') setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    triggerRef.current?.measureInWindow((x, y, triggerWidth, triggerHeight) => {
      setAnchor({ x, y, width: triggerWidth, height: triggerHeight });
    });
  }, [expanded, width, height]);
  useEffect(() => {
    if (!expanded || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [expanded, close]);
  const panelWidth = Math.min(400, width - 32);
  const below = anchor.y + anchor.height + 8;
  const openAbove = height - below < 360 && anchor.y > height - below;
  const panelPosition = {
    width: panelWidth,
    left: Math.max(16, Math.min(anchor.x + anchor.width - panelWidth, width - panelWidth - 16)),
    ...(openAbove ? { bottom: Math.max(16, height - anchor.y + 8) } : { top: Math.max(16, below) }),
    maxHeight: Math.max(100, (openAbove ? anchor.y - 24 : height - below - 16)),
  };
  const requirements = status?.requirements;
  const rows: { label: string; met: boolean; action: Action; cta: string }[] = requirements ? [
    { label: 'Cuenta activa', met: requirements.accountActive, action: 'account', cta: 'Ver cuenta' },
    { label: requirements.verified ? 'Verificación profesional aprobada' : status?.verificationStatus === 'REJECTED' ? 'Verificación profesional rechazada' : 'Verificación profesional pendiente', met: requirements.verified, action: 'credentials', cta: 'Ver credenciales' },
    { label: 'Visibilidad en el directorio activada', met: requirements.visibilityEnabled, action: 'privacy', cta: 'Revisar visibilidad' },
    { label: 'Precio por sesión mayor que 0 €', met: requirements.priceConfigured, action: 'pricing', cta: 'Configurar precio' },
  ] : [];
  const hidden = requirements && !requirements.visibilityEnabled;
  const title = !status ? 'No se pudo comprobar la visibilidad'
    : status.isListed ? 'Tu perfil aparece en el directorio'
      : hidden ? 'Has ocultado tu perfil del directorio'
        : 'Tu perfil todavía no aparece en el directorio';
  const textStyle = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const linkStyle = { color: theme.primary, fontFamily: theme.fontSansSemiBold };
  const openAction = (action: Action) => {
    setExpanded(false);
    onAction(action);
  };

  return (
    <View>
        <AnimatedPressable focusRef={triggerRef} accessibilityRole="button" accessibilityLabel={status ? 'Requisitos del directorio' : 'Reintentar'} accessibilityHint={title} accessibilityState={{ expanded }} onPress={() => status ? setExpanded(!expanded) : onRetry()} style={[styles.trigger, { backgroundColor: theme.bgCard, borderColor: expanded ? theme.primary : theme.border }]}>
          <Ionicons name={status?.isListed ? 'checkmark-circle-outline' : hidden ? 'eye-off-outline' : 'information-circle-outline'} size={16} color={status?.isListed ? theme.success : hidden ? theme.textSecondary : theme.warningAmber} />
          <Text style={linkStyle}>{!status ? 'Reintentar' : 'Requisitos'}</Text>
          {status ? <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.primary} /> : null}
        </AnimatedPressable>
      {expanded && status ? (
        <Modal transparent visible animationType="fade" onRequestClose={close}>
          <View style={styles.overlay}>
          <Pressable testID="requirements-backdrop" accessibilityRole="button" accessibilityLabel="Cerrar requisitos" onPress={close} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={[styles.panel, panelPosition, { backgroundColor: theme.bgCard, borderColor: theme.border, shadowColor: theme.shadowCard }]}>
          <View style={styles.panelHeader}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Requisitos del directorio</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar panel de requisitos" onPress={close} style={styles.close}><Ionicons name="close" size={20} color={theme.textSecondary} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.details} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{title}</Text>
          {hasChanges ? <Text style={[styles.note, textStyle]}>Tienes cambios sin guardar. Este estado refleja tu perfil guardado.</Text> : null}
          {rows.map((row) => (
            <View key={row.action} style={[styles.row, { backgroundColor: row.met ? theme.successBg : theme.warningBg }]}>
              <Ionicons name={row.met ? 'checkmark-circle' : 'time-outline'} size={19} color={row.met ? theme.success : theme.warningAmber} />
              <View style={styles.copy}>
                <Text accessibilityLabel={`${row.label}: ${row.met ? 'cumplido' : 'pendiente'}`} style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansMedium }]}>{row.label}</Text>
                <Text style={[styles.note, { color: row.met ? theme.success : theme.warningAmber, fontFamily: theme.fontSansSemiBold }]}>{row.met ? 'Cumplido' : 'Pendiente'}</Text>
                {!row.met ? <Pressable accessibilityRole="button" onPress={() => openAction(row.action)} style={styles.action}><Text style={linkStyle}>{row.cta}</Text></Pressable> : null}
              </View>
            </View>
          ))}
          <Text style={[styles.note, textStyle]}>La foto es opcional. No necesitas reseñas ni completar todos los apartados para aparecer.</Text>
          {inPersonInsurancePending ? <Text style={[styles.note, textStyle]}>Para aparecer al filtrar por atención presencial, tu seguro debe estar subido y aprobado.</Text> : null}
          </ScrollView>
          </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  copy: { flex: 1, minWidth: 150 },
  title: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  action: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 },
  trigger: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  overlay: { flex: 1 },
  panel: { position: 'absolute', borderWidth: 1, borderRadius: 14, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 20, elevation: 8, overflow: 'hidden' },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingTop: 4 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  details: { gap: 8, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 8 },
});
