import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { SimpleDropdown } from '../common/SimpleDropdown';
import { getErrorMessage } from '../../constants/errors';
import { requestResourceFile, type HeraResource, type ResourceFormat } from '../../services/resourceService';
import { openPrivateDocument } from '../../utils/openPrivateDocument';
import { ResourcePdf } from './ResourcePdf';

export function ResourceActions({ resource, admin = false, enabled = true }: { resource: HeraResource; admin?: boolean; enabled?: boolean }) {
  const { theme } = useTheme();
  const focused = useIsFocused();
  const pending = useRef(false);
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  useEffect(() => {
    pending.current = false; setBusy(false); setPreview(''); setError('');
    return () => {
      requestSequence.current += 1;
      activeRequest.current?.abort();
    };
  }, [resource.id, focused, enabled]);
  function closePreview() {
    requestSequence.current += 1;
    activeRequest.current?.abort();
    pending.current = false; setBusy(false); setPreview('');
  }
  async function open(format: ResourceFormat, mode: 'preview' | 'download') {
    if (pending.current || !focused || !enabled) return;
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    pending.current = true; setBusy(true); setError('');
    try {
      const access = await requestResourceFile(resource.id, format, mode, admin, controller.signal);
      if (sequence !== requestSequence.current) return;
      if (Platform.OS === 'web' && mode === 'preview') {
        setPreview(access.url);
      } else {
        const response = await fetch(access.url, { signal: controller.signal });
        if (!response.ok) throw new Error('No se pudo descargar el archivo. Inténtalo de nuevo.');
        const bytes = await response.arrayBuffer();
        if (sequence !== requestSequence.current) return;
        await openPrivateDocument(bytes, resource.id, access.fileName, access.mimeType);
      }
    } catch (failure) { if (sequence === requestSequence.current) setError(getErrorMessage(failure)); }
    finally {
      if (sequence === requestSequence.current) { pending.current = false; activeRequest.current = null; setBusy(false); }
    }
  }
  const buttonStyle = { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.bgMuted };
  const labelStyle = { color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 13 };
  return <View style={{ gap: 6 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', opacity: busy || !enabled ? 0.55 : 1 }}>
      {resource.files.some(file => file.format === 'PDF') && <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Ver PDF de ${resource.title}`} disabled={busy || !enabled} onPress={() => void open('PDF', 'preview')} style={buttonStyle}><Text style={labelStyle}>Ver PDF</Text></AnimatedPressable>}
      {resource.files.length === 1 && <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Descargar ${resource.files[0].format} de ${resource.title}`} disabled={busy || !enabled} onPress={() => void open(resource.files[0].format, 'download')} style={buttonStyle}><Text style={labelStyle}>Descargar</Text></AnimatedPressable>}
      {resource.files.length > 1 && <SimpleDropdown<ResourceFormat> value={null} placeholder="Descargar" accessibilityLabel={`Descargar ${resource.title}`} disabled={busy || !enabled}
        options={resource.files.map(file => ({ value: file.format, label: `Descargar ${file.format}` }))} onSelect={format => void open(format, 'download')} presentation="portal" compact />}
      {busy && <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12 }}>Abriendo…</Text>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.error, fontFamily: theme.fontSans, fontSize: 13, maxWidth: 340 }}>{error}</Text>}
    <Modal visible={!!preview} transparent animationType="fade" onRequestClose={closePreview}>
      <View style={{ flex: 1, backgroundColor: theme.overlay, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 1000, height: '90%', backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <Text accessibilityRole="header" style={{ flexGrow: 1, flexShrink: 1, flexBasis: 220, fontFamily: theme.fontSansSemiBold, color: theme.textPrimary, fontSize: 17 }}>{resource.title}</Text>
            <AnimatedPressable accessibilityRole="button" disabled={busy} onPress={() => void open('PDF', 'preview')} style={buttonStyle}><Text style={labelStyle}>Recargar PDF</Text></AnimatedPressable>
            <AnimatedPressable accessibilityRole="button" accessibilityLabel="Cerrar vista previa" onPress={closePreview} style={buttonStyle}><Text style={labelStyle}>Cerrar</Text></AnimatedPressable>
          </View>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12 }}>Si el visor no carga o el enlace ha caducado, pulsa «Recargar PDF».</Text>
          <View style={{ flex: 1 }}>{!!preview && <ResourcePdf url={preview} title={resource.title} />}</View>
          {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
        </View>
      </View>
    </Modal>
  </View>;
}
