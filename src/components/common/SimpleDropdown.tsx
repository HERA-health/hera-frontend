import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius, typography, shadows } from '../../constants/colors';
import { overlayLayers } from '../../constants/overlayLayers';
import { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  AnimatedPressable,
  type AnimatedPressableHandle,
} from './AnimatedPressable';
import { VisibleScrollView } from './VisibleScrollView';

export interface DropdownOption<T> {
  label: string;
  value: T;
  subtitle?: string;
}

export interface SimpleDropdownProps<T> {
  options: readonly DropdownOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  accessibilityLabel?: string;
  placeholder?: string;
  maxHeight?: number;
  optionsMinWidth?: number;
  optionsAlign?: 'left' | 'right';
  compact?: boolean;
  selectionIndicator?: 'none' | 'checkbox' | 'radio';
  onClear?: () => void;
  highlightSelection?: boolean;
  presentation?: 'inline' | 'portal';
}

interface DropdownAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function SimpleDropdown<T extends string | number>({
  options,
  value,
  onSelect,
  accessibilityLabel,
  placeholder = 'Seleccionar...',
  maxHeight = 200,
  optionsMinWidth,
  optionsAlign = 'left',
  compact = false,
  selectionIndicator = 'none',
  onClear,
  highlightSelection = true,
  presentation = 'inline',
}: SimpleDropdownProps<T>) {
  const { theme, isDark } = useTheme();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const dropdownStyles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);
  const triggerRef = React.useRef<AnimatedPressableHandle>(null);
  const selected = options.find((o) => o.value === value);
  const selectionHighlighted = Boolean(selected && highlightSelection);

  const closeDropdown = React.useCallback((restoreFocus = true): void => {
    setOpen(false);
    setAnchor(null);
    if (restoreFocus && Platform.OS === 'web') {
      setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }, []);

  const measureTrigger = React.useCallback((): void => {
    const trigger = triggerRef.current;
    if (!trigger || typeof trigger.measureInWindow !== 'function') {
      setAnchor({ x: spacing.md, y: spacing.md, width: 220, height: compact ? 44 : 48 });
      return;
    }
    trigger.measureInWindow((x, y, triggerWidth, triggerHeight) => {
      setAnchor({ x, y, width: triggerWidth, height: triggerHeight });
    });
  }, [compact]);

  React.useEffect(() => {
    if (!open || presentation !== 'portal') return;
    measureTrigger();
  }, [measureTrigger, open, presentation, viewportHeight, viewportWidth]);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !open || typeof document === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDropdown();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [closeDropdown, open]);

  const portalLayout = React.useMemo(() => {
    if (presentation !== 'portal' || !anchor) return null;
    const viewportMargin = spacing.md;
    const desiredWidth = Math.max(anchor.width, optionsMinWidth ?? 0);
    const width = Math.min(desiredWidth, Math.max(0, viewportWidth - viewportMargin * 2));
    const preferredLeft = optionsAlign === 'right'
      ? anchor.x + anchor.width - width
      : anchor.x;
    const left = Math.max(
      viewportMargin,
      Math.min(preferredLeft, viewportWidth - width - viewportMargin),
    );
    const estimatedHeight = Math.min(maxHeight, Math.max(48, options.length * 44));
    const belowTop = anchor.y + anchor.height + spacing.xs;
    const availableBelow = Math.max(0, viewportHeight - belowTop - viewportMargin);
    const availableAbove = Math.max(0, anchor.y - viewportMargin - spacing.xs);
    const shouldOpenAbove = estimatedHeight > availableBelow
      && availableAbove > availableBelow;
    const availableHeight = shouldOpenAbove ? availableAbove : availableBelow;
    const resolvedMaxHeight = Math.max(48, Math.min(maxHeight, availableHeight));
    const resolvedHeight = Math.min(estimatedHeight, resolvedMaxHeight);
    const top = shouldOpenAbove
      ? Math.max(viewportMargin, anchor.y - resolvedHeight - spacing.xs)
      : belowTop;
    return { left, top, width, maxHeight: resolvedMaxHeight };
  }, [anchor, maxHeight, options.length, optionsAlign, optionsMinWidth, presentation, viewportHeight, viewportWidth]);

  const renderOptions = (portal: boolean): React.ReactElement => (
    <View
      testID={accessibilityLabel ? `${accessibilityLabel}-options` : undefined}
      style={[
        dropdownStyles.optionsList,
        portal ? dropdownStyles.portalOptionsList : null,
        portal && portalLayout ? portalLayout : null,
        !portal ? { maxHeight, minWidth: optionsMinWidth } : null,
        !portal && optionsAlign === 'right' ? dropdownStyles.optionsListRight : null,
      ]}
    >
      <VisibleScrollView nestedScrollEnabled bounces={false}>
        {options.map((opt) => {
          const active = opt.value === value;
          const indicatorRole = selectionIndicator === 'checkbox'
            ? 'checkbox'
            : selectionIndicator === 'radio'
              ? 'radio'
              : 'button';

          return (
            <AnimatedPressable
              key={String(opt.value)}
              style={active ? [dropdownStyles.option, dropdownStyles.optionActive] : dropdownStyles.option}
              onPress={() => {
                if (active && onClear) {
                  onClear();
                } else {
                  onSelect(opt.value);
                }
                closeDropdown();
              }}
              hoverLift={false}
              pressScale={0.98}
              accessibilityRole={indicatorRole}
              accessibilityLabel={opt.label}
              accessibilityState={selectionIndicator === 'none'
                ? { selected: active }
                : { checked: active, selected: active }}
            >
              <View style={dropdownStyles.optionRow}>
                {selectionIndicator !== 'none' ? (
                  <View
                    style={[
                      dropdownStyles.selectionIndicator,
                      selectionIndicator === 'radio' && dropdownStyles.radioIndicator,
                      {
                        backgroundColor: active && selectionIndicator === 'checkbox' ? theme.primary : 'transparent',
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    {active && selectionIndicator === 'checkbox' ? (
                      <Ionicons name="checkmark" size={13} color={theme.actionPrimaryText} />
                    ) : null}
                    {active && selectionIndicator === 'radio' ? (
                      <View style={[dropdownStyles.radioDot, { backgroundColor: theme.primary }]} />
                    ) : null}
                  </View>
                ) : null}
                <View style={dropdownStyles.optionCopy}>
                  <Text
                    style={active ? [dropdownStyles.optionText, dropdownStyles.optionTextActive] : dropdownStyles.optionText}
                  >
                    {opt.label}
                  </Text>
                  {opt.subtitle ? (
                    <Text style={dropdownStyles.optionSubtitle} numberOfLines={1}>
                      {opt.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            </AnimatedPressable>
          );
        })}
      </VisibleScrollView>
    </View>
  );

  return (
    <>
      <View style={[dropdownStyles.container, open && presentation === 'inline' ? dropdownStyles.containerOpen : null]}>
        <AnimatedPressable
          focusRef={triggerRef}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={[
            dropdownStyles.trigger,
            compact && dropdownStyles.triggerCompact,
            selectionHighlighted && dropdownStyles.triggerSelected,
          ]}
          onPress={() => {
            if (open) {
              closeDropdown(false);
              return;
            }
            if (presentation === 'portal') measureTrigger();
            setOpen(true);
          }}
          hoverLift={false}
          pressScale={0.98}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                dropdownStyles.triggerText,
                !selected && dropdownStyles.placeholderText,
                selectionHighlighted && dropdownStyles.triggerTextSelected,
              ]}
              numberOfLines={1}
            >
              {selected ? selected.label : placeholder}
            </Text>
            {selected?.subtitle && (
              <Text style={dropdownStyles.subtitleText} numberOfLines={1}>
                {selected.subtitle}
              </Text>
            )}
          </View>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={selectionHighlighted ? theme.primary : theme.textMuted}
          />
        </AnimatedPressable>
        {open && presentation === 'inline' ? (
          <>
            <Pressable
              style={dropdownStyles.backdrop}
              onPress={() => closeDropdown(false)}
            />
            {renderOptions(false)}
          </>
        ) : null}
      </View>

      {open && presentation === 'portal' && portalLayout ? (
        <Modal
          animationType="fade"
          transparent
          visible
          statusBarTranslucent
          onRequestClose={() => closeDropdown()}
        >
          <View style={dropdownStyles.portalLayer} accessibilityViewIsModal>
            <Pressable
              accessible={false}
              style={StyleSheet.absoluteFill}
              onPress={() => closeDropdown()}
            />
            {renderOptions(true)}
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      position: 'relative',
      zIndex: 1,
      overflow: 'visible',
    },
    containerOpen: {
      zIndex: overlayLayers.popover,
      elevation: 20,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 48,
    },
    triggerText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
    },
    placeholderText: {
      color: theme.textMuted,
    },
    subtitleText: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      marginTop: 2,
      fontFamily: theme.fontSans,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: -1000,
      right: -1000,
      bottom: -1000,
      zIndex: overlayLayers.popoverBackdrop,
    },
    optionsList: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      marginTop: spacing.xs,
      zIndex: overlayLayers.popover + 1,
      overflow: 'hidden',
      ...shadows.md,
      elevation: 10,
      ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' } as Record<string, string> : {}),
    },
    triggerCompact: {
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 7,
    },
    triggerSelected: {
      backgroundColor: theme.primaryAlpha12,
      borderColor: theme.primary,
    },
    triggerTextSelected: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    optionsListRight: {
      left: 'auto',
      right: 0,
    },
    portalLayer: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: overlayLayers.popover,
    },
    portalOptionsList: {
      left: 0,
      marginTop: 0,
      right: 'auto',
      top: 0,
    },
    option: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    optionCopy: {
      flex: 1,
      minWidth: 0,
    },
    selectionIndicator: {
      width: 20,
      height: 20,
      borderWidth: 1,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    radioIndicator: {
      borderRadius: 10,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    optionActive: {
      backgroundColor: theme.primaryAlpha12,
    },
    optionText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
    },
    optionTextActive: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    optionSubtitle: {
      fontSize: typography.fontSizes.xs,
      color: theme.textMuted,
      marginTop: 2,
      fontFamily: theme.fontSans,
    },
  });
}

export default SimpleDropdown;
