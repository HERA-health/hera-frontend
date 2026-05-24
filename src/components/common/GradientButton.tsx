import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/colors';

interface GradientButtonProps {
  title?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  children,
  style,
  textStyle,
  size = 'large',
}) => {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.84}
      style={[
        styles.button,
        styles[`button_${size}`],
        {
          backgroundColor: isDisabled ? theme.border : theme.actionPrimary,
          borderColor: isDisabled ? theme.border : theme.actionPrimary,
          shadowColor: theme.shadowSecondary,
          opacity: isDisabled ? 0.64 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.actionPrimaryText} size="small" />
      ) : (
        <>
          {icon}
          {title ? (
            <Text style={[styles.text, styles[`text_${size}`], { color: theme.actionPrimaryText }, textStyle]}>
              {title}
            </Text>
          ) : null}
          {children}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    gap: spacing.xs,
  },
  button_small: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  button_medium: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  button_large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0,
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 15,
  },
  text_large: {
    fontSize: 16,
  },
});
