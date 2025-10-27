import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../constants/colors';

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
  const buttonStyles = [
    styles.button,
    size === 'small' && styles.buttonSmall,
    size === 'medium' && styles.buttonMedium,
    size === 'large' && styles.buttonLarge,
    style,
  ];

  const textStyles = [
    styles.text,
    size === 'small' && styles.textSmall,
    size === 'medium' && styles.textMedium,
    size === 'large' && styles.textLarge,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={styles.touchable}
    >
      <LinearGradient
        colors={disabled ? ['#9E9E9E', '#757575'] : ['#2196F3', '#00897B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={buttonStyles}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            {icon}
            {title && <Text style={textStyles}>{title}</Text>}
            {children}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  buttonSmall: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  buttonMedium: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
  },
  buttonLarge: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  text: {
    color: colors.neutral.white,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 15,
  },
  textLarge: {
    fontSize: 16,
  },
});
