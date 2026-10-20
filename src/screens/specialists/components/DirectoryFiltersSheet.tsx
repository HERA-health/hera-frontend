import React, { useRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';

export function DirectoryFiltersSheet({ visible, onClose, onClear, hasFilters, children }: {
  visible: boolean;
  onClose: () => void;
  onClear: () => void;
  hasFilters: boolean;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 720;
  const closeRef = useRef<React.ElementRef<typeof Pressable>>(null);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}
      onShow={() => { if (Platform.OS === 'web') closeRef.current?.focus(); }}>
      <View style={[styles.overlay, mobile && styles.mobileOverlay, { backgroundColor: theme.overlay }]}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View accessibilityViewIsModal style={[styles.sheet, mobile && styles.mobileSheet, { backgroundColor: theme.bgCard }]}>
          <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Filtros</Text>
            {hasFilters ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar filtros" onPress={onClear} style={styles.clear}>
              <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold }}>Limpiar</Text>
            </Pressable> : null}
            <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Cerrar filtros" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
            {children}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: theme.borderLight }]}>
            <Button fullWidth variant="primary" onPress={onClose}>Ver especialistas</Button>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  mobileOverlay: { padding: 0, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '90%', borderRadius: 20, overflow: 'hidden' },
  mobileSheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20, paddingRight: 8, paddingVertical: 8, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 26, lineHeight: 34 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  clear: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  scroll: { flexShrink: 1 },
  footer: { padding: 16, borderTopWidth: 1 },
});
