/**
 * MainLayout
 *
 * Responsive layout wrapper that manages sidebar visibility and collapse.
 * - Large screens (>=768px): Collapsible sidebar + content side-by-side
 * - Mobile (<768px): Hidden sidebar with hamburger toggle (overlay)
 *
 * Single Responsibility Principle (SRP):
 * - Only responsible for layout management and collapse state
 * - Sidebar content delegated to CustomDrawerContent
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CustomDrawerContent } from './CustomDrawerContent';
import { colors, layout, heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import { useNavigationState } from '@react-navigation/native';
import { SIDEBAR_THEME, SIDEBAR_ANIMATIONS } from './sidebar/navConfig';

const STORAGE_KEY = 'sidebar_collapsed';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * MainLayout provides a responsive layout with collapsible sidebar
 */
export function MainLayout({ children }: MainLayoutProps): React.ReactElement {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;

  // Collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Mobile overlay state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Animated values
  const sidebarWidth = useRef(
    new Animated.Value(SIDEBAR_THEME.width)
  ).current;
  const mobileSlide = useRef(new Animated.Value(-SIDEBAR_THEME.width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Get current route name from navigation state
  const currentRoute = useNavigationState((state) => {
    if (!state || !state.routes || state.routes.length === 0) return 'Home';
    const route = state.routes[state.index];
    if (route.name === 'MainStack' && route.state) {
      const nestedState = route.state as { routes: { name: string }[]; index: number };
      if (nestedState.routes && nestedState.routes.length > 0) {
        return nestedState.routes[nestedState.index].name;
      }
    }
    return route.name;
  });

  // Restore saved collapse state
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'true') {
        setIsCollapsed(true);
        sidebarWidth.setValue(SIDEBAR_THEME.collapsedWidth);
      }
      setIsInitialized(true);
    });
  }, []);

  // Animate sidebar width when collapse state changes (desktop only)
  useEffect(() => {
    if (!isInitialized) return;
    const toWidth = isCollapsed ? SIDEBAR_THEME.collapsedWidth : SIDEBAR_THEME.width;
    Animated.timing(sidebarWidth, {
      toValue: toWidth,
      duration: SIDEBAR_ANIMATIONS.transitionDuration,
      useNativeDriver: false,
    }).start();
  }, [isCollapsed, isInitialized]);

  const handleToggleCollapse = useCallback(() => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next));
  }, [isCollapsed]);

  // Mobile overlay open/close
  const openMobileSidebar = useCallback(() => {
    setMobileOpen(true);
    Animated.parallel([
      Animated.timing(mobileSlide, {
        toValue: 0,
        duration: SIDEBAR_ANIMATIONS.transitionDuration,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: SIDEBAR_ANIMATIONS.transitionDuration,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeMobileSidebar = useCallback(() => {
    Animated.parallel([
      Animated.timing(mobileSlide, {
        toValue: -SIDEBAR_THEME.width,
        duration: SIDEBAR_ANIMATIONS.transitionDuration,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: SIDEBAR_ANIMATIONS.transitionDuration,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMobileOpen(false);
    });
  }, []);

  // ─── Mobile layout ────────────────────────────────────────────────────

  if (!isLargeScreen) {
    return (
      <View style={styles.mobileContainer}>
        {/* Hamburger button */}
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={openMobileSidebar}
          accessibilityRole="button"
          accessibilityLabel="Abrir menú"
        >
          <Ionicons name="menu" size={24} color={heraLanding.textPrimary} />
        </TouchableOpacity>

        {children}

        {/* Overlay sidebar */}
        {mobileOpen && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={closeMobileSidebar}>
              <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
            </TouchableWithoutFeedback>

            {/* Sliding sidebar */}
            <Animated.View
              style={[
                styles.mobileSidebar,
                { transform: [{ translateX: mobileSlide }] },
              ]}
            >
              <CustomDrawerContent
                currentRoute={currentRoute}
                isCollapsed={false}
                onToggleCollapse={closeMobileSidebar}
              />
            </Animated.View>
          </View>
        )}
      </View>
    );
  }

  // ─── Desktop layout ───────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.sidebar,
          { width: sidebarWidth },
        ]}
      >
        <CustomDrawerContent
          currentRoute={currentRoute}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </Animated.View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: heraLanding.background,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: SIDEBAR_THEME.border,
    height: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  hamburgerButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 50,
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: heraLanding.overlay,
  },
  mobileSidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_THEME.width,
    backgroundColor: SIDEBAR_THEME.background.primary,
    ...shadows.xl,
    zIndex: 60,
  },
});

export default MainLayout;
