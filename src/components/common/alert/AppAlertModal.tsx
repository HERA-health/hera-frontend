import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { borderRadius, spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../AnimatedPressable';
import { Button } from '../Button';
import type { AppAlertAction, AppAlertRequest, AppAlertTone } from './types';

interface AppAlertModalProps {
  request: AppAlertRequest | null;
  onAction: (action: AppAlertAction) => void;
  onDismiss: () => void;
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

const ICONS: Record<AppAlertTone, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  error: 'alert-circle-outline',
  warning: 'warning-outline',
  danger: 'trash-outline',
};

export function AppAlertModal({ request, onAction, onDismiss }: AppAlertModalProps) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 520;
  const styles = useMemo(() => createStyles(theme, isDark, isCompact), [theme, isDark, isCompact]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(18)).current;
  const cardScale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (!request) {
      backdropOpacity.setValue(0);
      cardTranslateY.setValue(18);
      cardScale.setValue(0.98);
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 72,
        friction: 9,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 72,
        friction: 9,
      }),
    ]).start();
  }, [backdropOpacity, cardScale, cardTranslateY, request]);

  if (!request) return null;

  const tone = request.tone ?? 'info';
  const toneColors = getToneColors(theme, tone);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay} testID="hera-alert-overlay">
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <AnimatedPressable
            onPress={request.dismissible ? onDismiss : undefined}
            style={StyleSheet.absoluteFillObject}
            hoverLift={false}
            pressScale={1}
            accessibilityRole="none"
          >
            <View style={StyleSheet.absoluteFillObject} />
          </AnimatedPressable>
        </Animated.View>

        <Animated.View
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.iconShell, { backgroundColor: toneColors.bg, borderColor: toneColors.border }]}>
              <Ionicons name={ICONS[tone]} size={24} color={toneColors.icon} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>HERA</Text>
              <Text style={styles.title}>{request.title}</Text>
            </View>
          </View>

          {request.message ? (
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={styles.messageScroll}
              contentContainerStyle={styles.messageContent}
            >
              <Text style={styles.message}>{request.message}</Text>
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            {request.actions.map((action) => (
              <Button
                key={action.value}
                onPress={() => onAction(action)}
                variant={getButtonVariant(action)}
                size="medium"
                fullWidth={isCompact}
                style={isCompact ? styles.compactAction : styles.action}
              >
                {action.label}
              </Button>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getButtonVariant(action: AppAlertAction): ButtonVariant {
  if (action.role === 'destructive') return 'danger';
  if (action.role === 'confirm') return 'primary';
  return 'outline';
}

function getToneColors(theme: Theme, tone: AppAlertTone) {
  if (tone === 'success') {
    return { bg: theme.successBg, border: theme.successLight, icon: theme.success };
  }
  if (tone === 'error' || tone === 'danger') {
    return { bg: theme.errorBg, border: theme.error, icon: theme.error };
  }
  if (tone === 'warning') {
    return { bg: theme.warningBg, border: theme.warning, icon: theme.warning };
  }
  return { bg: theme.primaryAlpha12, border: theme.primaryAlpha20, icon: theme.primary };
}

function createStyles(theme: Theme, isDark: boolean, isCompact: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(2, 4, 3, 0.76)' : 'rgba(18, 28, 18, 0.48)',
      ...Platform.select({
        web: {
          backdropFilter: 'blur(8px)',
        },
        default: {},
      }),
    },
    card: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '82%',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      backgroundColor: theme.bgElevated,
      padding: isCompact ? spacing.lg : spacing.xl,
      shadowColor: theme.shadowStrong,
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 1,
      shadowRadius: 34,
      elevation: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconShell: {
      width: 52,
      height: 52,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 11,
      letterSpacing: 1.4,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplayBold,
      fontSize: isCompact ? 22 : 25,
      lineHeight: isCompact ? 28 : 32,
      letterSpacing: 0,
    },
    messageScroll: {
      marginTop: spacing.lg,
    },
    messageContent: {
      paddingRight: 2,
    },
    message: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 15,
      lineHeight: 23,
      letterSpacing: 0,
    },
    actions: {
      flexDirection: isCompact ? 'column-reverse' : 'row',
      justifyContent: 'flex-end',
      alignItems: isCompact ? 'stretch' : 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    action: {
      minWidth: 116,
    },
    compactAction: {
      width: '100%',
    },
  });
}
