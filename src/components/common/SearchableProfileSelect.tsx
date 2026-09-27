import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ProfileOption, optionLabel, optionSearchKey } from '../../utils/profileOptions';

interface Props { label: string; options: ProfileOption[]; values: string[]; onChange: (values: string[]) => void; multiple?: boolean; max?: number; emptyLabel?: string; disabled?: boolean; renderIcon?: (value: string) => React.ReactNode }
export function SearchableProfileSelect({ label, options, values, onChange, multiple = false, max = 30, emptyLabel = 'Seleccionar', disabled = false, renderIcon }: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const matches = useMemo(() => options.filter(option => optionSearchKey([option.label, option.value, ...option.aliases].join(' ')).includes(optionSearchKey(query))), [options, query]);
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 15 };
  const row = { padding: 12, minHeight: 44, borderWidth: 1, borderColor: theme.border, borderRadius: 10 };
  return <View style={{ gap: 8, minWidth: 200, flexShrink: 1 }}>
    <Text style={[text, { fontWeight: '600' }]}>{label}</Text>
    {multiple && values.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{values.map(value =>
      <Pressable key={value} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Quitar ${optionLabel(options, value)}`} onPress={() => onChange(values.filter(item => item !== value))} style={[row, { backgroundColor: theme.primaryAlpha12, borderColor: theme.primaryAlpha20, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        {renderIcon?.(value)}
        <Text style={text}>{optionLabel(options, value)}{options.length > 0 && !options.some(option => option.value === value) ? ' (heredado)' : ''} ×</Text>
      </Pressable>)}</View> : null}
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled, expanded: open }} onPress={() => { setQuery(''); setOpen(true); }} style={[row, { opacity: disabled ? 0.5 : 1, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
      {!multiple && values[0] ? renderIcon?.(values[0]) : null}
      <Text style={text}>{!multiple && values[0] ? optionLabel(options, values[0]) : emptyLabel} ▾</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, maxHeight: '85%', backgroundColor: theme.bgCard, borderRadius: 16, padding: 20, gap: 12 }}>
          <Text style={[text, { fontSize: 20, fontWeight: '600' }]}>{label}</Text>
          <TextInput autoFocus accessibilityLabel={`Buscar ${label.toLowerCase()}`} placeholder="Buscar…" placeholderTextColor={theme.textMuted} value={query} onChangeText={setQuery} style={[row, text]} />
          {!multiple ? <Pressable accessibilityRole="button" style={row} onPress={() => { onChange([]); setOpen(false); }}><Text style={text}>{emptyLabel}</Text></Pressable> : null}
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
            {matches.map(option => {
              const selected = values.includes(option.value);
              const blocked = multiple && !selected && values.length >= max;
              return <Pressable key={option.value} accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected, disabled: blocked }} disabled={blocked} style={[row, { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, borderColor: selected ? theme.primary : theme.border, opacity: blocked ? 0.5 : 1 }]} onPress={() => {
                onChange(multiple ? selected ? values.filter(value => value !== option.value) : [...values, option.value] : [option.value]);
                if (!multiple) setOpen(false);
              }}>{renderIcon?.(option.value)}<Text style={[text, { flex: 1 }]}>{option.label}</Text>{selected ? <Text style={[text, { color: theme.primary }]}>✓</Text> : null}</Pressable>;
            })}
            {!matches.length ? <Text style={text}>No hay opciones para esta búsqueda.</Text> : null}
          </ScrollView>
          {multiple ? <Text style={text}>{values.length} de {max} seleccionados</Text> : null}
          <Pressable accessibilityRole="button" style={row} onPress={() => setOpen(false)}><Text style={text}>Listo</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}
