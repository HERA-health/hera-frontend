import React from 'react';
import { View } from 'react-native';

export function ProfileBookingAside({ children }: { children: React.ReactNode }) {
  return <View style={{ width: 360 }}>{children}</View>;
}
