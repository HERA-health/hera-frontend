import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardTypeOptions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from '../../../components/common';
import { spacing, borderRadius } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';

interface ProfileFormFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
  isPickerField?: boolean;
  onPickerPress?: () => void;
  helperText?: string;
  isVerified?: boolean;
  isNotVerified?: boolean;
  onVerifyPress?: () => void;
  isVerifying?: boolean;
  secureTextEntry?: boolean;
  maxLength?: number;
  isOptional?: boolean;
  pickerIcon?: keyof typeof Ionicons.glyphMap;
}

export const ProfileFormField: React.FC<ProfileFormFieldProps> = ({
  label,
  value,
  placeholder,
  onChangeText,
  disabled = false,
  keyboardType = 'default',
  isPickerField = false,
  onPickerPress,
  helperText,
  isVerified,
  isNotVerified,
  onVerifyPress,
  isVerifying,
  secureTextEntry,
  maxLength,
  isOptional,
  pickerIcon = 'chevron-down',
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <View style={styles.labelGroup}>
          <Text style={styles.label}>{label}</Text>
          {isOptional ? <Text style={styles.optional}>(Opcional)</Text> : null}
        </View>

        {isVerified ? (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={14} color={theme.success} />
            <Text style={[styles.statusText, { color: theme.success }]}>Verificado</Text>
          </View>
        ) : null}

        {isNotVerified ? (
          <View style={styles.statusBadge}>
            <Ionicons name="alert-circle" size={14} color={theme.warningAmber} />
            <Text style={[styles.statusText, { color: theme.warningAmber }]}>No verificado</Text>
          </View>
        ) : null}
      </View>

      {isPickerField ? (
        <AnimatedPressable
          style={[
            styles.inputShell,
            {
              backgroundColor: disabled ? theme.bgMuted : theme.bgCard,
              borderColor: theme.border,
            },
          ]}
          onPress={onPickerPress}
        >
          <Text
            style={[
              styles.inputText,
              { color: value ? theme.textPrimary : theme.textMuted },
            ]}
          >
            {value || placeholder}
          </Text>
          <Ionicons name={pickerIcon} size={20} color={theme.textMuted} />
        </AnimatedPressable>
      ) : (
        <TextInput
          style={[
            styles.inputShell,
            styles.inputControl,
            {
              backgroundColor: disabled ? theme.bgMuted : theme.bgCard,
              borderColor: theme.border,
              color: disabled ? theme.textSecondary : theme.textPrimary,
            },
          ]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          onChangeText={onChangeText}
          editable={!disabled}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          selectionColor={theme.primary}
        />
      )}

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      {isNotVerified && onVerifyPress ? (
        <AnimatedPressable
          style={[styles.verifyButton, { backgroundColor: theme.primary }]}
          onPress={onVerifyPress}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color={theme.textOnPrimary} />
          ) : (
            <>
              <Ionicons name="mail-outline" size={16} color={theme.textOnPrimary} />
              <Text style={styles.verifyButtonText}>Verificar ahora</Text>
            </>
          )}
        </AnimatedPressable>
      ) : null}
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
) =>
  StyleSheet.create({
    field: {
      gap: spacing.xs,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    labelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    label: {
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
    },
    optional: {
      color: theme.textMuted,
      fontSize: 12,
      fontFamily: theme.fontSansMedium,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusText: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
    },
    inputShell: {
      minHeight: 58,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    inputControl: {
      fontSize: 16,
      fontFamily: theme.fontSansMedium,
    },
    inputText: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fontSansMedium,
    },
    helperText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: theme.fontSansMedium,
    },
    verifyButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      marginTop: spacing.xs,
      shadowColor: isDark ? '#000000' : theme.primary,
      shadowOpacity: isDark ? 0.16 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    verifyButtonText: {
      color: theme.textOnPrimary,
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
    },
  });

export default ProfileFormField;
