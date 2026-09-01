import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, shadows, spacing, typography } from '../../constants/colors';
import { overlayLayers } from '../../constants/overlayLayers';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable, type AnimatedPressableHandle } from '../common/AnimatedPressable';
import { VisibleScrollView } from '../common/VisibleScrollView';

export function FocusedActionSheet({
  visible,
  title,
  description,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const { theme, isDark } = useTheme();
  const closeRef = useRef<AnimatedPressableHandle>(null);
  useEffect(() => {
    if (visible && Platform.OS === 'web') setTimeout(() => closeRef.current?.focus(), 0);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, shadows.xl, { backgroundColor: isDark ? theme.bgElevated : theme.bgCard, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.copy}><Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>{description ? <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text> : null}</View>
            <AnimatedPressable focusRef={closeRef} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar formulario" style={styles.close} hoverLift={false}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>
          <VisibleScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</VisibleScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md, zIndex: overlayLayers.modal },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '88%', borderWidth: 1, borderRadius: borderRadius.xl, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1 },
  copy: { flex: 1 },
  title: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold },
  description: { marginTop: spacing.xs, fontSize: typography.fontSizes.sm, lineHeight: 20 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  content: { gap: spacing.md, padding: spacing.lg },
});
