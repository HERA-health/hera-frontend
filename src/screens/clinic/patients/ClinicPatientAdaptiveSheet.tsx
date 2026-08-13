import React, { type ReactNode, useCallback, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/common/Button';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

interface ClinicPatientAdaptiveSheetProps {
  visible: boolean;
  title: string;
  busy: boolean;
  children: ReactNode;
  overlay?: ReactNode;
  onBack: () => void;
  onDismiss: () => void;
  onOverlayRequestClose?: () => void;
}

interface WebFocusableNode {
  focus?: () => void;
}

export const focusPatientAccessibilityTarget = (
  target: React.ElementRef<typeof View> | { focus?: () => void } | null,
): void => {
  if (!target) return;

  if (Platform.OS === 'web') {
    (target as unknown as WebFocusableNode).focus?.();
    return;
  }

  const reactTag = findNodeHandle(target as unknown as React.Component);
  if (reactTag !== null) {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
};

export function ClinicPatientAdaptiveSheet({
  visible,
  title,
  busy,
  children,
  overlay,
  onBack,
  onDismiss,
  onOverlayRequestClose,
}: ClinicPatientAdaptiveSheetProps): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isPhone = width < 600;
  const styles = useMemo(() => createStyles(theme, isPhone), [isPhone, theme]);
  const headingRef = useRef<React.ElementRef<typeof View>>(null);

  const handleRequestClose = useCallback(() => {
    if (busy) return;

    if (overlay && onOverlayRequestClose) {
      onOverlayRequestClose();
      return;
    }

    onBack();
  }, [busy, onBack, onOverlayRequestClose, overlay]);

  const handleShow = useCallback(() => {
    focusPatientAccessibilityTarget(headingRef.current);
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
      onShow={handleShow}
      onDismiss={onDismiss}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.backdrop}>
          <View
            testID="clinic-patient-adaptive-sheet"
            style={styles.sheet}
            role="dialog"
            accessibilityViewIsModal
            aria-modal
            accessibilityLabel={`Ficha de paciente: ${title}`}
          >
            <View style={styles.header}>
              <Button
                variant="ghost"
                size="small"
                onPress={handleRequestClose}
                disabled={busy}
                accessibilityLabel="Volver al listado de pacientes"
                icon={<Ionicons name="arrow-back-outline" size={18} color={theme.primary} />}
              >
                Volver a pacientes
              </Button>

              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>Ficha de clínica</Text>
                <View
                  ref={headingRef}
                  accessible
                  accessibilityRole="header"
                  tabIndex={-1}
                >
                  <Text style={styles.title} numberOfLines={2}>
                    {title}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {overlay}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: Theme, isPhone: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isPhone ? theme.bgCard : theme.overlay,
    },
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.overlay,
      padding: isPhone ? 0 : spacing.xl,
    },
    sheet: {
      flex: 1,
      width: '100%',
      maxWidth: 760,
      minWidth: 0,
      borderWidth: isPhone ? 0 : 1,
      borderColor: theme.border,
      borderRadius: isPhone ? 0 : 8,
      backgroundColor: theme.bg,
      overflow: 'hidden',
    },
    header: {
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bgCard,
      paddingHorizontal: isPhone ? spacing.md : spacing.lg,
      paddingVertical: spacing.md,
    },
    headerCopy: {
      minWidth: 0,
      gap: spacing.xs,
    },
    eyebrow: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 11,
      lineHeight: 15,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplay,
      fontSize: isPhone ? 24 : 28,
      lineHeight: isPhone ? 30 : 34,
    },
    scroll: {
      flex: 1,
      minWidth: 0,
    },
    body: {
      width: '100%',
      minWidth: 0,
      padding: isPhone ? spacing.md : spacing.lg,
      paddingBottom: spacing.xxxl,
    },
  });
