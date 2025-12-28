/**
 * ViewToggle Component
 * Single Responsibility: Toggle between calendar and list views
 * Modern segmented control design inspired by Notion/Linear
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ViewToggleProps, ViewMode } from '../types';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

const ViewToggle: React.FC<ViewToggleProps> = ({ currentView, onViewChange }) => {
  const views: Array<{ id: ViewMode; icon: string; label: string }> = [
    { id: 'calendar', icon: 'calendar-outline', label: 'Calendario' },
    { id: 'list', icon: 'list-outline', label: 'Lista' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        {views.map((view, index) => {
          const isActive = currentView === view.id;
          const isFirst = index === 0;
          const isLast = index === views.length - 1;

          return (
            <TouchableOpacity
              key={view.id}
              style={[
                styles.button,
                isActive && styles.buttonActive,
                isFirst && styles.buttonFirst,
                isLast && styles.buttonLast,
              ]}
              onPress={() => onViewChange(view.id)}
              activeOpacity={0.7}
              accessibilityLabel={`Vista de ${view.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={(isActive ? view.icon.replace('-outline', '') : view.icon) as keyof typeof Ionicons.glyphMap}
                size={18}
                color={isActive ? colors.neutral.white : heraLanding.textSecondary}
              />
              <Text style={[styles.buttonText, isActive && styles.buttonTextActive]}>
                {view.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.background,
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl : spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: 4,
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  buttonActive: {
    backgroundColor: heraLanding.primary,
    shadowColor: heraLanding.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonFirst: {
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
  },
  buttonLast: {
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  buttonTextActive: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

export default ViewToggle;
