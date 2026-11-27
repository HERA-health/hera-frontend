import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SimpleDropdown } from '../../../components/common/SimpleDropdown';
import { AnimatedPressable, type AnimatedPressableHandle } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import { useTheme } from '../../../contexts/ThemeContext';
import { parsePrivateDuration } from '../../../utils/privateServiceDraft';

const durationOptions = [
  { value: 'service', label: 'Duración del servicio', icon: 'time-outline' },
  ...[15, 30, 45, 60].map(minutes => ({ value: String(minutes), label: `${minutes} min`, tile: true })),
  { value: 'custom', label: 'Personalizada', icon: 'pencil-outline' },
] as const;

interface Props {
  enabled: boolean;
  minutes: number | null;
  saving: boolean;
  error: boolean;
  disabled: boolean;
  compact: boolean;
  onChange: (enabled: boolean, minutes: number | null) => void;
}

export function FirstVisitPolicy({ enabled, minutes, saving, error, disabled, compact, onChange }: Props) {
  const { theme } = useTheme();
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const triggerRef = useRef<AnimatedPressableHandle>(null);
  const restoreTriggerFocus = useRef(false);
  const [inputFocused, setInputFocused] = useState(false);
  const selectedValue = minutes === null ? 'service' : String(minutes);
  const hasPreset = durationOptions.some(option => option.value === selectedValue);
  const label = { fontFamily: theme.fontSansSemiBold, color: theme.textPrimary };
  const parsed = parsePrivateDuration(draft);

  useEffect(() => {
    if (custom && enabled) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    if (enabled && !disabled && restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false;
      if (Platform.OS === 'web') triggerRef.current?.focus();
    }
  }, [custom, enabled, disabled]);

  const closeEditor = () => {
    restoreTriggerFocus.current = true;
    setCustom(false);
    setInputFocused(false);
  };
  const saveDuration = () => {
    if (disabled || parsed === null) return;
    closeEditor();
    onChange(true, parsed);
  };

  return <View style={[styles.panel, { backgroundColor: theme.successBg, borderColor: theme.status.confirmed.border }]}>
    <View style={[styles.row, compact && styles.stack]}>
      <View style={styles.identity}>
        {!compact && <View style={[styles.symbol, { backgroundColor: theme.success }]}>
          <Ionicons name="leaf-outline" size={25} color={theme.textOnPrimary} />
        </View>}
        <View style={styles.copy}>
          <Text style={[label, styles.title]}>Primera sesión gratuita</Text>
          <Text style={{ fontFamily: theme.fontSans, color: theme.textPrimary, fontSize: 14 }}>Una por paciente, en cualquiera de tus servicios.</Text>
        </View>
      </View>
      <View style={[styles.controls, compact && styles.stack]}>
        <View style={styles.toggle}>
          <Switch accessibilityLabel="Ofrecer primera sesión gratuita" value={enabled}
            accessibilityState={{ busy: saving }} disabled={disabled}
            onValueChange={value => { setCustom(false); onChange(value, minutes); }}
            trackColor={{ false: theme.textMuted, true: theme.success }} thumbColor={theme.textOnPrimary} />
          <Text accessibilityLiveRegion="polite" style={[label, styles.caption]}>
            {saving ? 'Guardando…' : error ? 'Sin verificar' : enabled ? 'Activada' : 'Desactivada'}
          </Text>
        </View>
        {enabled && <View style={[styles.duration, !compact && styles.desktopDuration]}>
          <Text style={[label, styles.caption]}>{custom ? 'Duración personalizada' : 'Duración de la primera visita'}</Text>
          {custom ? <>
            <View style={styles.editor}>
              <View style={[styles.field, { backgroundColor: theme.bgElevated, borderColor: inputFocused ? theme.focus : theme.borderStrong }]}>
                <TextInput ref={inputRef} accessibilityLabel="Minutos de la primera visita" keyboardType="number-pad"
                  maxLength={3} placeholder="5–240" placeholderTextColor={theme.textMuted} selectTextOnFocus
                  returnKeyType="done" value={draft} onChangeText={setDraft} editable={!disabled}
                  onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                  onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Escape') closeEditor(); }} onSubmitEditing={saveDuration}
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'solid', outlineWidth: 0 }, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]} />
                <Text style={[styles.caption, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>min</Text>
              </View>
              <Button size="small" disabled={disabled || parsed === null} onPress={saveDuration} style={styles.save}>Guardar</Button>
              <AnimatedPressable accessibilityLabel="Cancelar" onPress={closeEditor} hoverLift={false} style={styles.cancel}>
                <Ionicons name="close-outline" size={21} color={theme.textSecondary} />
              </AnimatedPressable>
            </View>
            <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: draft && parsed === null ? theme.error : theme.textSecondary, fontFamily: theme.fontSans }]}>Entre 5 y 240 minutos</Text>
          </> : <SimpleDropdown<string> compact presentation="portal" portalAnimation="none" focusOptionOnShow keyboardNavigation disabled={disabled}
            accessibilityLabel="Duración de la primera visita" triggerIcon="time-outline" highlightSelection={false}
            triggerFocusRef={triggerRef} optionsMinWidth={230} maxHeight={280} options={durationOptions}
            value={hasPreset ? selectedValue : 'custom'} triggerLabel={minutes == null ? 'Duración del servicio' : `${minutes} min`}
            onSelect={value => {
              if (value === 'custom') {
                setDraft(minutes == null ? '' : String(minutes));
                setCustom(true);
              } else onChange(true, value === 'service' ? null : Number(value));
            }} />}
        </View>}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderLeftWidth: 4, borderRadius: 14, padding: 18, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 },
  identity: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 14 },
  symbol: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 4, flexShrink: 1 },
  title: { fontSize: 21, lineHeight: 27 },
  controls: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20 },
  stack: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  duration: { gap: 6 },
  desktopDuration: { width: 234 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  caption: { fontSize: 13, lineHeight: 18 },
  editor: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  field: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderRadius: 10, paddingHorizontal: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 40, padding: 0, fontSize: 15 },
  save: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10 },
  cancel: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, lineHeight: 16 },
});
