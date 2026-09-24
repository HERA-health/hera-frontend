import React, { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { PrivateServiceOption } from '../../services/privateCatalogService';
import { formatPrivatePrice } from '../../utils/privateTariff';

export function ServiceOptionDetails({ options, title, restricted }: { options: PrivateServiceOption[]; title: string; restricted: boolean }) {
  const { theme: t } = useTheme();
  const [hovered, setHovered] = useState(false);
  const viewport = useWindowDimensions();
  const trigger = useRef<View>(null);
  const returnTarget = useRef<HTMLElement | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const width = Math.min(340, viewport.width - 24);
  const height = Math.min(360, viewport.height - 48);
  const close = () => setAnchor(null);
  return <>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`Ver duraciones de ${title}`} accessibilityState={{ expanded: !!anchor }} onPress={() => {
      if (Platform.OS === 'web' && document.activeElement instanceof HTMLElement) returnTarget.current = document.activeElement;
      trigger.current?.measureInWindow((x, y, _w, h) => setAnchor({ x, y: y + h + 4 }));
    }} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 8, borderRadius: 6, backgroundColor: hovered || pressed ? t.surface : 'transparent' })}>
      <Text style={{ fontFamily: t.fontSansSemiBold, fontSize: 12, color: t.primary }}>{options.length} duraciones</Text><Ionicons name="chevron-down" size={14} color={t.primary} />
    </Pressable>
    <Modal visible={!!anchor} transparent animationType="none" onRequestClose={close} onDismiss={() => { if (Platform.OS === 'web') requestAnimationFrame(() => returnTarget.current?.focus()); }}>
      <Pressable accessibilityLabel="Cerrar detalle" onPress={close} style={{ flex: 1 }}>
        <Pressable onPress={event => event.stopPropagation()} style={{ position: 'absolute', left: Math.max(12, Math.min(anchor?.x ?? 12, viewport.width - width - 12)), top: Math.max(12, Math.min(anchor?.y ?? 12, viewport.height - height - 12)), width, maxHeight: height, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><Text style={{ flex: 1, fontFamily: t.fontSansSemiBold, fontSize: 14, color: t.textPrimary }}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar duraciones" onPress={close} style={{ padding: 8 }}><Ionicons name="close" size={18} color={t.textSecondary} /></Pressable></View>
          <ScrollView>{options.slice().sort((a,b) => a.durationMinutes-b.durationMinutes).map(o => <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.borderLight }}>
            <Text style={{ width: 52, color: t.textPrimary, fontFamily: t.fontSansSemiBold, fontSize: 13 }}>{o.durationMinutes} min</Text>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: t.textSecondary, fontFamily: t.fontSans }}>{o.isPublic && !restricted ? 'Agenda + online' : 'Solo agenda'}{o.isPreferred ? ' · Principal' : ''}</Text></View>
            <Text style={{ color: t.textPrimary, fontFamily: t.fontSansSemiBold, fontSize: 13 }}>{formatPrivatePrice(o.priceCents)}</Text>
          </View>)}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}
