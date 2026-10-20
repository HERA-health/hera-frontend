import React, { useRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

export function PackageCatalogDialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const closeRef = useRef<React.ElementRef<typeof Pressable>>(null);
  return <Modal visible transparent animationType="none" onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') closeRef.current?.focus(); }}>
    <View style={[styles.overlay, mobile && styles.mobileOverlay, { backgroundColor: theme.overlay }]}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <SafeAreaView edges={['bottom']} accessibilityViewIsModal style={[styles.dialog, mobile && styles.mobileDialog, { backgroundColor: theme.bgCard }]}>
        <View style={[styles.header, { borderColor: theme.borderLight }]}>
          <Text accessibilityRole="header" aria-level={2}
            style={{ flex: 1, color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 25, lineHeight: 32 }}>Bonos de sesiones</Text>
          <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Cerrar bonos de sesiones" onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={23} color={theme.textPrimary} />
          </Pressable>
        </View>
        <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 22 }}>
            Un bono reúne varias sesiones con este especialista. Consulta qué incluye cada opción y su precio total. La adquisición del bono no reserva un horario: podrás elegir después cuándo realizar cada sesión.
          </Text>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  mobileOverlay: { padding: 0, justifyContent: 'flex-end' },
  dialog: { width: '100%', maxWidth: 640, maxHeight: '90%', borderRadius: 22, overflow: 'hidden' },
  mobileDialog: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { paddingLeft: 20, paddingRight: 8, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 20 },
});
