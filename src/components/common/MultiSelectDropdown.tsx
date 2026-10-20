import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable, type AnimatedPressableHandle } from './AnimatedPressable';
import { choiceKeyboardProps } from '../../utils/choiceKeyboard';

interface MultiSelectOption<T extends string> {
  label: string;
  value: T;
}

interface MultiSelectDropdownProps<T extends string> {
  options: readonly MultiSelectOption<T>[];
  values: readonly T[];
  onApply: (values: T[]) => void;
  placeholder: string;
  menuWidth?: number;
  maxOptionsHeight?: number;
  optionsAlign?: 'left' | 'right';
  presentation?: 'inline' | 'modal';
}

export function MultiSelectDropdown<T extends string>({
  options,
  values,
  onApply,
  placeholder,
  menuWidth = 520,
  maxOptionsHeight = 250,
  optionsAlign = 'left',
  presentation = 'inline',
}: MultiSelectDropdownProps<T>) {
  const { theme, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [draftValues, setDraftValues] = useState<T[]>([...values]);
  const triggerRef = useRef<AnimatedPressableHandle>(null);
  const closeMenu = useCallback(() => {
    setOpen(false);
    if (Platform.OS === 'web') setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);
  useEffect(() => {
    // Modal handles Escape for the topmost dialog, including nested filter sheets.
    if (Platform.OS !== 'web' || !open || presentation === 'modal' || typeof document === 'undefined') return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      }
    };
    document.addEventListener('keyup', escape, true);
    return () => document.removeEventListener('keyup', escape, true);
  }, [open, closeMenu, presentation]);
  const resolvedMenuWidth = Math.min(menuWidth, Math.max(280, width - 32));
  const singleColumn = resolvedMenuWidth < 460;

  const selectedLabels = useMemo(
    () => options.filter((option) => values.includes(option.value)).map((option) => option.label),
    [options, values]
  );
  const triggerLabel = selectedLabels.length === 0
    ? placeholder
    : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} seleccionados`;
  const hasChanges = draftValues.length !== values.length
    || draftValues.some((value) => !values.includes(value));

  const openMenu = () => {
    setDraftValues([...values]);
    setOpen(true);
  };

  const toggleValue = (value: T) => {
    setDraftValues((currentValues) => (
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value]
    ));
  };

  const applySelection = () => {
    onApply(draftValues);
    closeMenu();
  };

  const menu = (
    <View
      style={[
        styles.menu,
        optionsAlign === 'right' && styles.menuRight,
        presentation === 'modal' && styles.modalMenu,
        {
          width: resolvedMenuWidth,
          backgroundColor: theme.bgElevated,
          borderColor: theme.border,
          shadowColor: theme.shadowCard,
        },
      ]}
    >
      {presentation === 'modal' ? <View style={styles.modalHeading}>
        <Text accessibilityRole="header" style={{ flex: 1, fontFamily: theme.fontSansSemiBold, color: theme.textPrimary, fontSize: 18 }}>{placeholder}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Cerrar ${placeholder.toLowerCase()}`} onPress={closeMenu} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={theme.textPrimary} />
        </Pressable>
      </View> : null}
      <ScrollView style={{ maxHeight: Math.min(maxOptionsHeight, Math.max(80, height - 240)) }} nestedScrollEnabled bounces={false}>
        <View style={styles.optionsGrid}>
          {options.map((option) => {
            const checked = draftValues.includes(option.value);
            return (
              <Pressable key={option.value} {...choiceKeyboardProps(() => toggleValue(option.value))}
                onPress={() => toggleValue(option.value)} accessibilityRole="checkbox"
                accessibilityLabel={option.label} accessibilityState={{ checked }} aria-checked={checked}
                style={({ pressed }) => [styles.option, singleColumn ? styles.optionSingleColumn : styles.optionTwoColumns, pressed && { backgroundColor: theme.primaryAlpha12 }]}>
                <View style={[styles.checkbox, { backgroundColor: checked ? theme.primary : 'transparent', borderColor: checked ? theme.primary : theme.border }]}>
                  {checked ? <Ionicons name="checkmark" size={14} color={theme.actionPrimaryText} /> : null}
                </View>
                <Text style={[styles.optionText, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
        <Pressable accessibilityRole="button" onPress={() => setDraftValues([])} disabled={draftValues.length === 0}
          style={({ pressed }) => [styles.footerAction, pressed && styles.footerActionPressed]}>
          <Text style={[styles.clearText, { color: draftValues.length > 0 ? theme.primary : theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>Limpiar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={applySelection} disabled={!hasChanges}
          style={({ pressed }) => [styles.applyButton, { backgroundColor: hasChanges ? theme.actionPrimary : theme.bgMuted }, pressed && hasChanges && styles.footerActionPressed]}>
          <Text style={[styles.applyText, { color: hasChanges ? theme.actionPrimaryText : theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>Aplicar</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, open && styles.containerOpen]}>
      <AnimatedPressable
        focusRef={triggerRef}
        onPress={open ? closeMenu : openMenu}
        hoverLift={false}
        pressScale={0.98}
        accessibilityLabel={`${placeholder}: ${triggerLabel}`}
        accessibilityState={{ expanded: open }}
        style={[
          styles.trigger,
          {
            backgroundColor: open || values.length > 0
              ? theme.primaryAlpha12
              : isDark ? theme.surfaceMuted : theme.bgMuted,
            borderColor: open || values.length > 0 ? theme.primary : theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            {
              color: values.length > 0 ? theme.primary : theme.textMuted,
              fontFamily: values.length > 0 ? theme.fontSansSemiBold : theme.fontSans,
            },
          ]}
          numberOfLines={1}
        >
          {triggerLabel}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={values.length > 0 ? theme.primary : theme.textMuted} />
      </AnimatedPressable>

      {open && presentation === 'inline' ? <>
        <Pressable style={styles.backdrop} onPress={closeMenu} />
        {menu}
      </> : null}
      {open && presentation === 'modal' ? <Modal transparent visible animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.modalLayer} accessibilityViewIsModal>
          <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={closeMenu} />
          {menu}
        </View>
      </Modal> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  modalLayer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalMenu: { position: 'relative', top: 0, left: 0, marginTop: 0 },
  modalHeading: { paddingLeft: 20, paddingRight: 8, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  container: {
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  containerOpen: {
    zIndex: 30000,
    elevation: 24,
  },
  trigger: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  triggerText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: -2000,
    right: -2000,
    bottom: -2000,
    zIndex: 29998,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 7,
    borderWidth: 1,
    borderRadius: 16,
    zIndex: 30001,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 18,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 16px 36px rgba(22, 38, 31, 0.16)' } as Record<string, string>
      : {}),
  },
  menuRight: {
    left: 'auto',
    right: 0,
  },
  optionsGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
  },
  option: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionSingleColumn: {
    width: '100%',
  },
  optionTwoColumns: {
    width: '48%',
  },
  checkbox: {
    width: 21,
    height: 21,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  footer: {
    minHeight: 64,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  footerAction: {
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActionPressed: {
    opacity: 0.72,
  },
  clearText: {
    fontSize: 13,
  },
  applyButton: {
    minWidth: 92,
    minHeight: 40,
    borderRadius: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 13,
  },
});

export default MultiSelectDropdown;
