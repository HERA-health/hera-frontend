import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'scheduled';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { theme } = useTheme();
  const normalizedStatus = status === 'scheduled' ? 'pending' : status;
  const statusTone = theme.status[normalizedStatus];
  const labelMap: Record<StatusBadgeProps['status'], string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    scheduled: 'Programada',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusTone.bg,
          borderColor: statusTone.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: statusTone.text }]}>{labelMap[status]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
  },
});
