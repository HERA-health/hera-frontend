import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

export function ProfileEditorSheet({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const insets = React.useContext(SafeAreaInsetsContext);
  const compact = width < 768;
  const panelRef = React.useRef<View>(null);
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const modals = document.querySelectorAll('[aria-modal="true"]');
      const top = modals.item(modals.length - 1);
      if (top && panelRef.current instanceof HTMLElement && !top.contains(panelRef.current) && !panelRef.current.contains(top)) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', closeOnEscape, true);
    return () => document.removeEventListener('keydown', closeOnEscape, true);
  }, [onClose]);
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: theme.overlay, justifyContent: compact ? 'flex-end' : 'center', padding: compact ? 0 : 24 }]}>
        <Pressable accessible={false} tabIndex={-1} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View ref={panelRef} accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.bgCard, borderColor: theme.navigationBorder,
          borderBottomLeftRadius: compact ? 0 : 18, borderBottomRightRadius: compact ? 0 : 18,
          paddingBottom: compact ? Math.max(16, insets?.bottom ?? 0) : 20 }]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={'Cerrar ' + title} onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ProfileEditorItem({ label, icon, selected, onPress, nested = false, pendingHint }: {
  label: string; icon?: keyof typeof Ionicons.glyphMap; selected?: boolean;
  nested?: boolean; pendingHint?: string; onPress: () => void;
}) {
  const { theme } = useTheme();
  const pendingId = React.useId();
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    aria-describedby={pendingHint ? pendingId : undefined}
    aria-pressed={selected} accessibilityState={{ selected }}
    accessibilityHint={pendingHint} onPress={onPress}
    style={({ pressed }) => [styles.item, nested && styles.nested, {
      borderLeftColor: selected ? theme.actionPrimary : theme.navigationBorder,
      backgroundColor: pressed || (selected && !nested) ? theme.navigationActive : 'transparent',
    }]}>
    {icon && <Ionicons name={icon} size={18} color={theme.textPrimary} />}
    <Text style={{ flex: 1, fontFamily: selected ? theme.fontSansBold : theme.fontSans, fontSize: nested ? 14 : 15, color: theme.textPrimary }}>{label}</Text>
    {pendingHint && <Ionicons nativeID={pendingId} accessibilityLabel={pendingHint} name="information-circle-outline" size={17} color={theme.warningAmber} />}
    {selected && !nested && <Ionicons name="checkmark" size={15} color={theme.textPrimary} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '93%', borderWidth: 1, borderRadius: 18, paddingHorizontal: 18, paddingTop: 12, flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, fontSize: 22, lineHeight: 28 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 6 },
  item: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 6 },
  nested: { marginLeft: 18, minHeight: 44, borderLeftWidth: 2, borderRadius: 0, paddingLeft: 15 },
});
