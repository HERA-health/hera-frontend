import { choiceKeyboardProps } from '../../utils/choiceKeyboard';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './Button';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ProfileOption,
  optionLabel,
  optionSearchKey,
} from '../../utils/profileOptions';

interface Props {
  label: string;
  optional?: boolean;
  options: ProfileOption[];
  values: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  max?: number;
  emptyLabel?: string;
  disabled?: boolean;
  compact?: boolean;
  renderIcon?: (value: string) => React.ReactNode;
}
export function SearchableProfileSelect({
  label,
  optional = false,
  options,
  values,
  onChange,
  multiple = false,
  max = 30,
  emptyLabel = 'Seleccionar',
  disabled = false,
  compact = false,
  renderIcon,
}: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { width, height } = useWindowDimensions();
  const columns = Boolean(renderIcon) && width >= 600;
  const triggerRef = useRef<React.ElementRef<typeof Pressable>>(null);
  const close = useCallback(() => {
    setOpen(false);
    if (Platform.OS === 'web') setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);
  const matches = useMemo(
    () =>
      options.filter((option) =>
        optionSearchKey(
          [option.label, option.value, ...option.aliases].join(' '),
        ).includes(optionSearchKey(query)),
      ),
    [options, query],
  );
  const text = {
    color: theme.textPrimary,
    fontFamily: theme.fontSans,
    fontSize: 15,
  };
  const row = {
    padding: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
  };
  return (
    <View style={{ gap: 8, minWidth: 200, flexShrink: 1 }}>
      <Text
        style={[
          text,
          { fontFamily: theme.fontSansSemiBold, fontSize: compact ? 18 : 15 },
        ]}
      >
        {label}
        {optional ? <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14 }}> (opcional)</Text> : null}
      </Text>
      {multiple && values.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {values.map((value) => (
            <Pressable
              key={value}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${optionLabel(options, value)}`}
              onPress={() => onChange(values.filter((item) => item !== value))}
              style={[
                row,
                {
                  maxWidth: '100%',
                  backgroundColor: theme.primaryAlpha12,
                  borderColor: theme.primaryAlpha20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                },
              ]}
            >
              {renderIcon?.(value)}
              <Text style={[text, { flexShrink: 1 }]}>
                {optionLabel(options, value)}
                {options.length > 0 &&
                !options.some((option) => option.value === value)
                  ? ' (heredado)'
                  : ''}
              </Text>
              <Ionicons
                aria-hidden
                name="close"
                size={16}
                color={theme.primary}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        ref={triggerRef}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}${optional ? ' (opcional)' : ''}: ${values[0] ? optionLabel(options, values[0]) : emptyLabel}`}
        accessibilityState={{ disabled, expanded: open }}
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        style={[
          row,
          {
            alignSelf: compact ? 'flex-start' : 'stretch',
            backgroundColor: theme.bgCard,
            opacity: disabled ? 0.5 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          },
        ]}
      >
        {!multiple && values[0] ? renderIcon?.(values[0]) : null}
        <Text style={[text, { flexShrink: 1, flexGrow: compact ? 0 : 1 }]}>
          {!multiple && values[0]
            ? optionLabel(options, values[0])
            : emptyLabel}
        </Text>
        <Ionicons
          aria-hidden
          name="chevron-down"
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: 600,
              maxHeight: '90%',
              backgroundColor: theme.bgCard,
              borderRadius: 24,
              padding: width < 600 ? 20 : 24,
              gap: 16,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  accessibilityRole="header"
                  style={[
                    text,
                    { fontSize: 22, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  {label}
                </Text>
                {multiple ? (
                  <Text
                    style={[text, { fontSize: 14, color: theme.textSecondary }]}
                  >
                    Puedes elegir varias opciones.
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Cerrar ${label.toLowerCase()}`}
                onPress={close}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.bgMuted,
                }}
              >
                <Ionicons
                  aria-hidden
                  name="close"
                  size={22}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
            <View
              style={[
                row,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: theme.bgMuted,
                  borderColor: searchFocused ? theme.primary : theme.border,
                },
              ]}
            >
              <Ionicons
                aria-hidden
                name="search-outline"
                size={20}
                color={theme.textSecondary}
              />
              <TextInput
                autoFocus
                accessibilityLabel={`Buscar ${label.toLowerCase()}`}
                placeholder="Buscar…"
                placeholderTextColor={theme.textMuted}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={[
                  text,
                  { flex: 1, minWidth: 0, padding: 0 },
                  Platform.OS === 'web' ? { outlineStyle: 'solid', outlineWidth: 0 } : {},
                ]}
              />
            </View>
            {!multiple ? (
              <Pressable
                accessibilityRole="button"
                style={row}
                onPress={() => {
                  onChange([]);
                  close();
                }}
              >
                <Text style={text}>{emptyLabel}</Text>
              </Pressable>
            ) : null}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1, maxHeight: Math.min(380, height * 0.45) }}
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {matches.map((option) => {
                const selected = values.includes(option.value);
                const blocked = multiple && !selected && values.length >= max;
                const toggle = () => {
                  onChange(
                    multiple
                      ? selected
                        ? values.filter((value) => value !== option.value)
                        : [...values, option.value]
                      : [option.value],
                  );
                  if (!multiple) close();
                };
                return (
                  <Pressable
                    {...choiceKeyboardProps(toggle, blocked)}
                    key={option.value}
                    accessibilityRole={multiple ? 'checkbox' : 'radio'}
                    accessibilityLabel={option.label}
                    aria-checked={selected}
                    aria-disabled={blocked}
                    accessibilityState={{
                      checked: selected,
                      disabled: blocked,
                    }}
                    disabled={blocked}
                    style={[
                      row,
                      {
                        width: columns ? '48%' : '100%',
                        flexGrow: columns ? 1 : 0,
                        minHeight: 52,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected
                          ? theme.primaryAlpha12
                          : theme.bgCard,
                        opacity: blocked ? 0.5 : 1,
                      },
                    ]}
                    onPress={toggle}
                  >
                    {renderIcon?.(option.value)}
                    <Text style={[text, { flex: 1 }]}>{option.label}</Text>
                    <Ionicons
                      aria-hidden
                      name={
                        multiple
                          ? selected
                            ? 'checkbox'
                            : 'square-outline'
                          : selected
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                      }
                      size={20}
                      color={selected ? theme.primary : theme.textMuted}
                    />
                  </Pressable>
                );
              })}
              {!matches.length ? (
                <Text style={text}>No hay opciones para esta búsqueda.</Text>
              ) : null}
            </ScrollView>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              {multiple ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[text, { color: theme.textSecondary, flexShrink: 1 }]}
                >
                  {values.length} de {max} seleccionados
                </Text>
              ) : null}
              <Button style={{ marginLeft: 'auto' }} onPress={close}>
                Listo
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
