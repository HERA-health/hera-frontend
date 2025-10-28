import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/colors';

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'scheduled';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    pending: {
      colors: ['#FF9800', '#FFB74D'],
      text: 'Pendiente',
    },
    confirmed: {
      colors: ['#4CAF50', '#66BB6A'],
      text: 'Confirmada',
    },
    scheduled: {
      colors: ['#2196F3', '#64B5F6'],
      text: 'Programada',
    },
    completed: {
      colors: ['#2196F3', '#64B5F6'],
      text: 'Completada',
    },
    cancelled: {
      colors: ['#9E9E9E', '#BDBDBD'],
      text: 'Cancelada',
    },
  };

  const { colors: gradientColors, text } = config[status];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.badge}
    >
      <Text style={styles.text}>{text}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
