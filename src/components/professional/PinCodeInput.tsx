import React, { useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { AnimatedPressable } from '../common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';

interface PinCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  masked?: boolean;
  label?: string;
  hint?: string;
  autoFocus?: boolean;
  error?: boolean;
}

const sanitizeDigits = (value: string, length: number): string =>
  value.replace(/\D/g, '').slice(0, length);

export function PinCodeInput({
  value,
  onChange,
  length = 6,
  masked = true,
  label,
  hint,
  autoFocus = false,
  error = false,
}: PinCodeInputProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput | null>(null);
  const [isFocused, setIsFocused] = useState(autoFocus);

  const digits = useMemo(
    () => Array.from({ length }, (_, index) => value[index] ?? ''),
    [length, value]
  );

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleChange = (nextValue: string) => {
    onChange(sanitizeDigits(nextValue, length));
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (event.nativeEvent.key === 'Backspace' && value.length === 0) {
      onChange('');
    }
  };

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <AnimatedPressable
      onPress={focusInput}
      hoverLift={false}
      pressScale={0.995}
      style={styles.wrapper}
    >
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}

      <View style={styles.row}>
        {digits.map((digit, index) => {
          const filled = digit.length > 0;
          const highlighted = isFocused && index === activeIndex;

          return (
            <View
              key={`${index}`}
              style={[
                styles.cell,
                {
                  backgroundColor: filled ? theme.bgCard : theme.bgMuted,
                  borderColor: error
                    ? theme.error
                    : highlighted
                      ? theme.primary
                      : filled
                        ? theme.borderStrong
                        : theme.border,
                  shadowColor: highlighted ? theme.shadowPrimary : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  {
                    color: theme.textPrimary,
                  },
                ]}
              >
                {filled ? (masked ? '•' : digit) : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyPress={handleKeyPress}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        style={styles.hiddenInput}
        caretHidden
        contextMenuHidden
        selectionColor={theme.primary}
      />

      {hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'nowrap',
  },
  cell: {
    flex: 1,
    minWidth: 38,
    maxWidth: 54,
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 2,
  },
  cellText: {
    fontSize: typography.fontSizes.xl,
    lineHeight: 24,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  hint: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
});
