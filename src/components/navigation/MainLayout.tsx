import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigationState } from '@react-navigation/native';
import { layout, shadows, spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { AmbientBackground } from '../common/AmbientBackground';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { StyledLogo } from '../common/StyledLogo';
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
  const mobileSidebarWidth = Math.min(
    SIDEBAR_THEME.width,
    Math.max(layout.mobileDrawerMinWidth, windowWidth - spacing.xl),
  );
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

  useEffect(() => {
    if (!mobileOpen) {
      mobileSlide.setValue(-mobileSidebarWidth);
    }
  }, [mobileOpen, mobileSidebarWidth, mobileSlide]);

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
        toValue: -mobileSidebarWidth,
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
  }, [mobileSidebarWidth, mobileSlide, overlayOpacity]);

  if (!isLargeScreen) {
    return (
      <View style={[styles.mobileContainer, { backgroundColor: theme.bg }]}>
        <AnimatedPressable
          style={[
            styles.mobileMenuButton,
            {
              backgroundColor: theme.glassBg,
              borderColor: theme.glassBorder,
              shadowColor: theme.shadowCard,
            },
          ]}
          onPress={openMobileSidebar}
          hoverLift={false}
          pressScale={0.92}
          accessibilityLabel="Abrir menú"
        >
          <View
            style={[
              styles.mobileLogoShell,
              {
                backgroundColor: theme.bgMuted,
                borderColor: theme.borderLight,
              },
            ]}
          >
            <StyledLogo size={22} />
          </View>
          <View
            style={[
              styles.mobileMenuIconShell,
              { backgroundColor: theme.primaryAlpha12 },
            ]}
          >
            <Ionicons name="menu" size={18} color={theme.primary} />
          </View>
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
                Platform.OS === 'web' ? styles.webFixedFill : null,
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
                  width: mobileSidebarWidth,
                },
                Platform.OS === 'web' ? styles.webFixedSidebar : null,
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
    minHeight: Platform.OS === 'web' ? '100vh' as unknown as number : undefined,
  },
  sidebar: {
    borderRightWidth: 1,
    height: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  mobileMenuButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 50,
    width: 78,
    height: 46,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  mobileLogoShell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mobileMenuIconShell: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  webFixedFill: {
    position: 'fixed' as unknown as 'absolute',
  },
  webFixedSidebar: {
    position: 'fixed' as unknown as 'absolute',
    height: '100vh' as unknown as number,
  },
});

export default MainLayout;
