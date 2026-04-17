import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigationState } from '@react-navigation/native';
import { borderRadius, shadows, spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { AmbientBackground } from '../common/AmbientBackground';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { CustomDrawerContent } from './CustomDrawerContent';
import {
  SIDEBAR_ANIMATIONS,
  SIDEBAR_THEME,
  getSidebarTheme,
} from './sidebar/navConfig';

const STORAGE_KEY = 'sidebar_collapsed';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps): React.ReactElement {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = useRef(new Animated.Value(SIDEBAR_THEME.width)).current;
  const mobileSlide = useRef(new Animated.Value(-SIDEBAR_THEME.width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const currentRoute = useNavigationState((state) => {
    if (!state || state.routes.length === 0) {
      return 'Home';
    }

    const route = state.routes[state.index];
    if (route.name === 'MainStack' && route.state) {
      const nestedState = route.state as { routes: { name: string }[]; index: number };
      return nestedState.routes[nestedState.index]?.name ?? 'Home';
    }

    return route.name;
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'true') {
        setIsCollapsed(true);
        sidebarWidth.setValue(SIDEBAR_THEME.collapsedWidth);
      }
      setIsInitialized(true);
    });
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const nextWidth = isCollapsed ? SIDEBAR_THEME.collapsedWidth : SIDEBAR_THEME.width;
    Animated.timing(sidebarWidth, {
      toValue: nextWidth,
      duration: SIDEBAR_ANIMATIONS.transitionDuration,
      useNativeDriver: false,
    }).start();
  }, [isCollapsed, isInitialized, sidebarWidth]);

  const handleToggleCollapse = useCallback(() => {
    const nextValue = !isCollapsed;
    setIsCollapsed(nextValue);
    AsyncStorage.setItem(STORAGE_KEY, String(nextValue));
  }, [isCollapsed]);

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
  }, [mobileSlide, overlayOpacity]);

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
  }, [mobileSlide, overlayOpacity]);

  if (!isLargeScreen) {
    return (
      <View style={[styles.mobileContainer, { backgroundColor: theme.bg }]}>
        <AnimatedPressable
          style={[
            styles.hamburgerButton,
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              shadowColor: theme.shadowCard,
            },
          ]}
          onPress={openMobileSidebar}
          hoverLift={false}
          pressScale={0.92}
          accessibilityLabel="Abrir menú"
        >
          <Ionicons name="menu" size={22} color={theme.textPrimary} />
        </AnimatedPressable>

        {children}

        {mobileOpen && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={closeMobileSidebar}>
              <Animated.View
                style={[
                  styles.overlay,
                  {
                    opacity: overlayOpacity,
                    backgroundColor: sidebarTheme.background.overlay,
                  },
                ]}
              />
            </TouchableWithoutFeedback>

            <Animated.View
              style={[
                styles.mobileSidebar,
                {
                  transform: [{ translateX: mobileSlide }],
                  backgroundColor: sidebarTheme.background.primary,
                  borderRightColor: sidebarTheme.border,
                },
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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <AmbientBackground variant="subtle" />

      <Animated.View
        style={[
          styles.sidebar,
          {
            width: sidebarWidth,
            borderRightColor: theme.border,
            backgroundColor: sidebarTheme.background.primary,
          },
        ]}
      >
        <CustomDrawerContent
          currentRoute={currentRoute}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </Animated.View>
      <View style={[styles.content, { backgroundColor: theme.bg }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileContainer: {
    flex: 1,
  },
  sidebar: {
    borderRightWidth: 1,
    height: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  hamburgerButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 50,
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mobileSidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_THEME.width,
    borderRightWidth: 1,
    ...shadows.xl,
    zIndex: 60,
  },
});

export default MainLayout;
