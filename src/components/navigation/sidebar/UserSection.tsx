import React, { useCallback } from 'react';
import { Image, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../common/AnimatedPressable';
import { ThemeToggleButton } from '../../common/ThemeToggleButton';
import { useOptionalProfessionalTour } from '../../onboarding/professionalTourContext';
import { getSidebarTheme } from './navConfig';
import { userSectionStyles as styles } from './styles';
import { UserSectionProps } from './types';

export function UserSection({
  user,
  subtitle,
  onLogout,
  onGuideStart,
  isCollapsed = false,
}: UserSectionProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 1).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: sidebarTheme.background.secondary,
            borderColor: sidebarTheme.border,
            shadowColor: sidebarTheme.shadow,
          },
          isCollapsed ? styles.panelCollapsed : null,
        ]}
      >
        <View style={[styles.topRow, isCollapsed ? styles.topRowCollapsed : null]}>
          {user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={[
                styles.avatarImage,
                isCollapsed ? styles.avatarCollapsed : null,
              ]}
              accessibilityLabel={`${user.name} avatar`}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: theme.secondaryMuted,
                },
                isCollapsed ? styles.avatarCollapsed : null,
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  {
                    color: theme.selection,
                    fontFamily: theme.fontSansBold,
                  },
                ]}
              >
                {getInitials(user.name)}
              </Text>
            </View>
          )}

          {!isCollapsed && (
            <View style={styles.infoContainer}>
              <Text
                style={[
                  styles.userName,
                  {
                    color: sidebarTheme.text.primary,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
                numberOfLines={1}
              >
                {user.name}
              </Text>
              <Text
                style={[
                  styles.userSubtitle,
                  {
                    color: sidebarTheme.text.muted,
                    fontFamily: theme.fontSans,
                  },
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          )}
        </View>

        {!isCollapsed && user.role === 'PROFESSIONAL' ? (
          <ProfessionalGuideButton onGuideStart={onGuideStart} />
        ) : null}

        {!isCollapsed && (
          <View style={styles.actionRow}>
            <ThemeToggleButton
              size="sm"
              showLabel
              style={{
                flex: 1,
                justifyContent: 'center',
              }}
            />
            <AnimatedPressable
              onPress={handleLogout}
              hoverLift={false}
              pressScale={0.92}
              style={[
                styles.iconButton,
                {
                  backgroundColor: sidebarTheme.background.subtle,
                  borderColor: sidebarTheme.border,
                },
              ]}
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={sidebarTheme.text.secondary}
              />
            </AnimatedPressable>
          </View>
        )}

        {isCollapsed && (
          <>
            {user.role === 'PROFESSIONAL' ? (
              <ProfessionalGuideButton isCollapsed onGuideStart={onGuideStart} />
            ) : null}
            <AnimatedPressable
              onPress={handleLogout}
              hoverLift={false}
              pressScale={0.92}
              style={[
                styles.iconButton,
                styles.iconButtonCollapsed,
                {
                  backgroundColor: sidebarTheme.background.subtle,
                  borderColor: sidebarTheme.border,
                },
              ]}
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={sidebarTheme.text.secondary}
              />
            </AnimatedPressable>
          </>
        )}
      </View>
    </View>
  );
}

interface ProfessionalGuideButtonProps {
  isCollapsed?: boolean;
  onGuideStart?: () => Promise<void> | void;
}

function ProfessionalGuideButton({
  isCollapsed = false,
  onGuideStart,
}: ProfessionalGuideButtonProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);
  const tour = useOptionalProfessionalTour();
  const disabled = !tour
    || !tour.hasTourForCurrentRoute
    || !tour.canStartCurrentRouteTour
    || tour.isRunning;

  const handleOpenGuide = useCallback(() => {
    if (!disabled && tour) {
      void Promise.resolve(onGuideStart?.()).then(() => {
        void tour.startCurrentRouteTour('manual');
      }).catch(() => undefined);
    }
  }, [disabled, onGuideStart, tour]);

  return (
    <AnimatedPressable
      onPress={handleOpenGuide}
      disabled={disabled}
      hoverLift={false}
      pressScale={0.94}
      style={[
        isCollapsed ? styles.guideButtonCollapsed : styles.guideButton,
        {
          backgroundColor: sidebarTheme.background.subtle,
          borderColor: sidebarTheme.border,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
      accessibilityLabel="Abrir guía de esta pantalla"
    >
      <Ionicons name="help-circle-outline" size={16} color={sidebarTheme.text.secondary} />
      {!isCollapsed ? (
        <Text
          style={[
            styles.guideButtonText,
            {
              color: sidebarTheme.text.secondary,
              fontFamily: theme.fontSansSemiBold,
            },
          ]}
        >
          Guía
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

export default UserSection;
