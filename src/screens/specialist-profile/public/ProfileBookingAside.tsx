import React from 'react';
import { View } from 'react-native';

export function ProfileBookingAside({ children }: { children: React.ReactNode }) {
  return <View style={{ width: 420, gap: 16 }}>{children}</View>;
}
