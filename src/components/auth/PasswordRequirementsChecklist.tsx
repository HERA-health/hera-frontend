import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getPasswordRequirementStatuses } from '../../utils/validation';

interface PasswordRequirementsChecklistProps {
  password: string;
  containerStyle?: StyleProp<ViewStyle>;
  showWhenEmpty?: boolean;
}

export function PasswordRequirementsChecklist({
  password,
  containerStyle,
  showWhenEmpty = true,
}: PasswordRequirementsChecklistProps): React.ReactElement | null {
  const { theme } = useTheme();
  const requirements = getPasswordRequirementStatuses(password);
  const hasPassword = password.length > 0;

  if (!showWhenEmpty && password.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bgMuted,
          borderColor: theme.borderLight,
        },
        containerStyle,
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]}>
          Debe incluir:
        </Text>
        {requirements.map((requirement) => {
          const status = requirement.met ? 'met' : hasPassword ? 'missing' : 'neutral';
          const iconColor =
            status === 'met'
              ? theme.success
              : status === 'missing'
              ? theme.error
              : theme.textMuted;
          const iconName =
            status === 'met'
              ? 'checkmark-circle'
              : status === 'missing'
              ? 'close-circle'
              : 'ellipse-outline';
          const accessibilityStatus = requirement.met ? 'cumplido' : 'pendiente';

          return (
            <View
              key={requirement.key}
              style={styles.requirementItem}
              accessible
              accessibilityLabel={`${requirement.label}: ${accessibilityStatus}`}
            >
              <Ionicons
                name={iconName}
                size={13}
                color={iconColor}
              />
              <Text
                style={[
                  styles.requirementText,
                  {
                    color: iconColor,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
              >
                {requirement.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
  title: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  requirementText: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 14,
  },
});
