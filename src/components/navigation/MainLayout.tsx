/**
 * MainLayout
 * Simple permanent sidebar layout without animations
 * Shows sidebar on large screens, hides on mobile
 */

import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { CustomDrawerContent } from './CustomDrawerContent';
import { colors, layout } from '../../constants/colors';
import { useNavigationState } from '@react-navigation/native';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  // Get current route name from navigation state
  const currentRoute = useNavigationState(state => {
    if (!state || !state.routes || state.routes.length === 0) return 'Home';
    const route = state.routes[state.index];
    // If it's MainStack, get the nested route
    if (route.name === 'MainStack' && route.state) {
      const nestedState = route.state as any;
      if (nestedState.routes && nestedState.routes.length > 0) {
        return nestedState.routes[nestedState.index].name;
      }
    }
    return route.name;
  });

  if (!isLargeScreen) {
    // On mobile, just show content (we can add a simple drawer later)
    return <View style={styles.container}>{children}</View>;
  }

  // On desktop/tablet: permanent sidebar + content
  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <CustomDrawerContent currentRoute={currentRoute} />
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.neutral.gray50,
  },
  sidebar: {
    width: layout.drawerWidth,
    backgroundColor: colors.neutral.white,
    borderRightWidth: 1,
    borderRightColor: colors.neutral.gray200,
  },
  content: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
});
