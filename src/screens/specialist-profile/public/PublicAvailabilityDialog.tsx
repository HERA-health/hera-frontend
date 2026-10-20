import React, { useCallback, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import { SimpleDropdown } from '../../../components/common/SimpleDropdown';
import type { PublicPriceOption } from '../../../services/specialistsService';
import { SelectableAvailabilityPreview } from '../components/SelectableAvailabilityPreview';
import type { SelectedProfileSlot, Specialist } from '../types';
import { formatProfileSlotLabel } from '../profilePresentation';
import { publicModalityLabel, publicProfilePrice } from './publicProfilePresentation';

interface Props {
  specialist: Specialist;
  option?: PublicPriceOption;
  selectedSlot: SelectedProfileSlot | null;
  onOptionChange: (id: string) => void;
  onSlotChange: (slot: SelectedProfileSlot | null) => void;
  onClose: () => void;
  onContinue: (slot?: SelectedProfileSlot) => void;
}

/** Mounted on each opening so a previously selected time is checked against fresh availability. */
export function PublicAvailabilityDialog({ specialist, option, selectedSlot, onOptionChange, onSlotChange, onClose, onContinue }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const [validated, setValidated] = useState(false);
  const [notice, setNotice] = useState('');
  const closeRef = useRef<React.ElementRef<typeof Pressable>>(null);
  const invalidated = useCallback(() => setNotice('Ese horario ya no está disponible. Elige otra hora para continuar.'), []);
  const options = specialist.publicOptions ?? [];
  const serviceKey = (item: PublicPriceOption) => item.serviceId ?? item.serviceKey ?? 'base';
  const serviceIds = [...new Set(options.map(serviceKey))];
  const selectedService = option ? serviceKey(option) : serviceIds[0];
  const serviceOptions = options.filter(item => serviceKey(item) === selectedService);
  const body = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const label = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 13 };
  const changeOption = (id: string) => { setValidated(false); setNotice(''); onOptionChange(id); };
  const changeSlot = useCallback((slot: SelectedProfileSlot | null) => {
    if (slot) setNotice('');
    onSlotChange(slot);
  }, [onSlotChange]);
  return <Modal transparent visible animationType="none" onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') closeRef.current?.focus(); }}>
    <View style={[styles.overlay, mobile && styles.overlayMobile, { backgroundColor: theme.overlay }]}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.dialog, mobile && styles.dialogMobile, { backgroundColor: theme.bgCard }]}>
        <View style={[styles.header, { borderColor: theme.borderLight }]}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" aria-level={2} style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 25, lineHeight: 32 }}>Disponibilidad</Text>
            <Text style={[styles.small, body]}>{specialist.name}</Text>
          </View>
          <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Cerrar disponibilidad" onPress={onClose} style={styles.close}><Ionicons name="close" size={23} color={theme.textPrimary} /></Pressable>
        </View>
        <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {serviceIds.length > 1 ? <View style={styles.field}>
            <Text style={label}>Servicio</Text>
            <SimpleDropdown accessibilityLabel="Servicio de la sesión" presentation="portal" portalAnimation="none" keyboardNavigation
              options={serviceIds.map(id => ({ value: id, label: options.find(item => serviceKey(item) === id)?.serviceName ?? 'General' }))}
              value={selectedService ?? null} onSelect={id => { const first = options.find(item => serviceKey(item) === id); if (first) changeOption(first.optionId); }} placeholder="Servicio" />
          </View> : option ? <Text style={label}>{option.serviceName ?? 'General'}{serviceOptions.length === 1 ? ` · ${publicModalityLabel(option.modality)}` : ''}</Text> : null}
          {serviceOptions.length > 1 ? <View style={styles.field}>
            <Text style={label}>Modalidad y duración</Text>
            <SimpleDropdown accessibilityLabel="Modalidad y duración de la sesión" presentation="portal" portalAnimation="none" keyboardNavigation
              options={serviceOptions.map(item => ({ value: item.optionId, label: `${publicModalityLabel(item.modality)} · ${item.durationMinutes} min · ${publicProfilePrice(item.priceCents / 100)}` }))}
              value={option?.optionId ?? null} onSelect={changeOption} placeholder="Modalidad y duración" />
          </View> : option && serviceIds.length > 1 ? <Text style={[styles.copy, body]}>{publicModalityLabel(option.modality)}</Text> : null}
          <Text style={[styles.price, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>{publicProfilePrice(option ? option.priceCents / 100 : specialist.pricePerSession)} <Text style={[styles.small, body]}>{option?.durationMinutes ? `· sesión de ${option.durationMinutes} min` : 'por sesión'}</Text></Text>
          {option?.serviceDescription ? <Text style={[styles.copy, body]}>{option.serviceDescription}</Text> : null}
          {specialist.firstVisitFree ? <Text style={[styles.small, body]}>Primera sesión gratuita si aún no has tenido sesiones con este profesional.</Text> : null}
          {notice ? <Text accessibilityRole="alert" style={[styles.copy, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{notice}</Text> : null}
          <View style={[styles.calendar, { borderColor: theme.borderLight }]}>
            <SelectableAvailabilityPreview key={option?.optionId ?? 'default'} specialistId={specialist.id} optionId={option?.optionId}
              nextAvailable={specialist.nextAvailable} selectedSlot={selectedSlot} onSlotChange={changeSlot}
              onSelectionInvalidated={invalidated} onValidationChange={setValidated} timeZoneLabel="Hora peninsular española" />
          </View>
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={[styles.footer, { borderColor: theme.borderLight }]}>
          {selectedSlot ? <Text accessibilityLiveRegion="polite" style={[styles.small, body]}>{formatProfileSlotLabel(selectedSlot.date, selectedSlot.slot.startTime)}</Text> : null}
          {selectedSlot ? <Button fullWidth disabled={!validated} onPress={() => { if (validated) onContinue(selectedSlot); }}>Continuar</Button> : null}
          {!selectedSlot ? <Pressable accessibilityRole="button" onPress={() => onContinue()} style={styles.fullCalendar}>
            <Text style={[styles.small, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>Abrir calendario completo</Text>
          </Pressable> : null}
        </SafeAreaView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  overlayMobile: { padding: 0, justifyContent: 'flex-end' },
  dialog: { width: '100%', maxWidth: 640, maxHeight: '90%', borderRadius: 22, overflow: 'hidden' },
  dialogMobile: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { paddingLeft: 20, paddingVertical: 14, paddingRight: 8, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 12 },
  field: { gap: 8 },
  small: { fontSize: 12, lineHeight: 19 },
  copy: { fontSize: 14, lineHeight: 22 },
  price: { fontSize: 24, lineHeight: 32 },
  calendar: { paddingTop: 20, borderTopWidth: 1, marginTop: 4 },
  footer: { borderTopWidth: 1, padding: 16, gap: 8 },
  fullCalendar: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
