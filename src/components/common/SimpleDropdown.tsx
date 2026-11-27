import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
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
  icon?: keyof typeof Ionicons.glyphMap;
  /** Consecutive tiles share a row in pairs. Other options use the full width. */
  tile?: boolean;
}

export interface SimpleDropdownProps<T> {
  options: readonly DropdownOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  onOpen?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  maxHeight?: number;
  optionsMinWidth?: number;
  optionsAlign?: 'left' | 'right';
  compact?: boolean;
  selectionIndicator?: 'none' | 'checkbox' | 'radio';
  onClear?: () => void;
  highlightSelection?: boolean;
  presentation?: 'inline' | 'portal';
  triggerLabel?: string;
  triggerIcon?: keyof typeof Ionicons.glyphMap;
  triggerFocusRef?: React.RefObject<AnimatedPressableHandle | null>;
  keyboardNavigation?: boolean;
  /** Nested dialogs can activate their focus/escape handling without waiting for a fade. */
  portalAnimation?: 'none' | 'fade';
  /** Restore option focus after a containing sheet's modal focus trap settles. */
  focusOptionOnShow?: boolean;
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
  onOpen,
  accessibilityLabel,
  disabled = false,
  placeholder = 'Seleccionar...',
  maxHeight = 200,
  optionsMinWidth,
  optionsAlign = 'left',
  compact = false,
  selectionIndicator = 'none',
  onClear,
  highlightSelection = true,
  presentation = 'inline',
  triggerLabel,
  triggerIcon,
  triggerFocusRef,
  keyboardNavigation = false,
  portalAnimation = 'fade',
  focusOptionOnShow = false,
}: SimpleDropdownProps<T>) {
  const { theme } = useTheme();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const dropdownStyles = React.useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpen.current) onOpen?.();
    wasOpen.current = open;
  }, [open, onOpen]);
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);
  const internalTriggerRef = React.useRef<AnimatedPressableHandle>(null);
  const triggerRef = triggerFocusRef ?? internalTriggerRef;
  const tileRows = React.useMemo(() => {
    if (!options.some(option => option.tile)) return null;
    const rows: number[][] = [];
    options.forEach((option, index) => {
      const previous = rows[rows.length - 1];
      if (option.tile && previous?.length === 1 && options[previous[0]].tile) previous.push(index);
      else rows.push([index]);
    });
    return rows;
  }, [options]);
  const optionRefs = React.useRef<Array<AnimatedPressableHandle | null>>([]);
  const selected = options.find((o) => o.value === value);
  const selectionHighlighted = Boolean(selected && highlightSelection);

  const closeDropdown = React.useCallback((restoreFocus = true): void => {
    setOpen(false);
    setAnchor(null);
    if (restoreFocus && Platform.OS === 'web') {
      setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }, [triggerRef]);

  React.useEffect(() => {
    if (disabled && open) closeDropdown();
  }, [disabled, open, closeDropdown]);

  const measureTrigger = React.useCallback((): void => {
    const trigger = triggerRef.current;
    if (!trigger || typeof trigger.measureInWindow !== 'function') {
      setAnchor({ x: spacing.md, y: spacing.md, width: 220, height: compact ? 44 : 48 });
      return;
    }
    trigger.measureInWindow((x, y, triggerWidth, triggerHeight) => {
      setAnchor({ x, y, width: triggerWidth, height: triggerHeight });
    });
  }, [compact, triggerRef]);

  React.useEffect(() => {
    if (!open || presentation !== 'portal') return;
    measureTrigger();
  }, [measureTrigger, open, presentation, viewportHeight, viewportWidth]);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !open || presentation === 'portal' || typeof document === 'undefined') return undefined;
    const handleKeyUp = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeDropdown();
      }
    };
    document.addEventListener('keyup', handleKeyUp, true);
    return () => document.removeEventListener('keyup', handleKeyUp, true);
  }, [closeDropdown, open, presentation]);

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
    const contentHeight = tileRows ? tileRows.length * 44 + (tileRows.length - 1) * 4 + 18 : options.length * 48 + 12;
    const estimatedHeight = Math.min(maxHeight, Math.max(56, contentHeight));
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
  }, [anchor, maxHeight, options.length, tileRows, optionsAlign, optionsMinWidth, presentation, viewportHeight, viewportWidth]);

  React.useEffect(() => {
    if (!open || !keyboardNavigation || Platform.OS !== 'web' || (presentation === 'portal' && !portalLayout)) return;
    const timer = setTimeout(() => {
      const index = Math.max(0, options.findIndex(option => option.value === value));
      optionRefs.current[index]?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [open, keyboardNavigation, portalLayout, presentation, options, value]);

  const renderOption = (opt: DropdownOption<T>, index: number): React.ReactElement => {
    const active = opt.value === value;
    const indicatorRole = selectionIndicator === 'none' ? 'button' : selectionIndicator;
    return (
      <AnimatedPressable
        key={String(opt.value)}
        focusRef={ref => { optionRefs.current[index] = ref; }}
        onKeyDown={event => {
          if (!keyboardNavigation) return;
          if (tileRows && event.key.startsWith('Arrow')) {
            event.preventDefault();
            const rowIndex = tileRows.findIndex(row => row.includes(index));
            const row = tileRows[rowIndex];
            const column = row.indexOf(index);
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              const next = column + (event.key === 'ArrowLeft' ? -1 : 1);
              optionRefs.current[row[Math.max(0, Math.min(next, row.length - 1))]]?.focus();
            } else {
              const next = rowIndex + (event.key === 'ArrowUp' ? -1 : 1);
              const target = tileRows[(next + tileRows.length) % tileRows.length];
              optionRefs.current[target[Math.min(column, target.length - 1)]]?.focus();
            }
            return;
          }
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(event.key)) return;
          event.preventDefault();
          const direction = event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey) ? -1 : 1;
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
            : (index + direction + options.length) % options.length;
          optionRefs.current[next]?.focus();
        }}
        disabled={disabled}
        style={[dropdownStyles.option, tileRows && dropdownStyles.gridOption, opt.tile && dropdownStyles.tile,
          active && dropdownStyles.optionActive, active && opt.tile && dropdownStyles.selectedTile]}
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
        <View style={[dropdownStyles.optionRow, opt.tile && dropdownStyles.tileContent]}>
          {opt.icon && <Ionicons name={opt.icon} size={18} color={active ? theme.primary : theme.textSecondary} />}
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
          <View style={!opt.tile && dropdownStyles.optionCopy}>
            <Text
              style={[dropdownStyles.optionText, active && dropdownStyles.optionTextActive, active && opt.tile && { color: theme.actionPrimaryText }]}
            >
              {opt.label}
            </Text>
            {opt.subtitle ? (
              <Text style={dropdownStyles.optionSubtitle} numberOfLines={1}>
                {opt.subtitle}
              </Text>
            ) : null}
          </View>
          {selectionIndicator === 'none' && active && (
            <Ionicons name="checkmark" size={opt.tile ? 15 : 18} color={opt.tile ? theme.actionPrimaryText : theme.primary} />
          )}
        </View>
      </AnimatedPressable>
    );
  };

  const OptionsScrollView = tileRows ? ScrollView : VisibleScrollView;
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
      <OptionsScrollView nestedScrollEnabled bounces={false} contentContainerStyle={[dropdownStyles.optionsContent, tileRows && dropdownStyles.tileMenu]}>
        {tileRows ? tileRows.map(row => (
          <View key={String(options[row[0]].value)} style={dropdownStyles.tileRow}>
            {row.map(index => renderOption(options[index], index))}
          </View>
        )) : options.map(renderOption)}
      </OptionsScrollView>
    </View>
  );

  return (
    <>
      <View style={[dropdownStyles.container, open && presentation === 'inline' ? dropdownStyles.containerOpen : null]}>
        <AnimatedPressable
          focusRef={triggerRef}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          style={[
            dropdownStyles.trigger,
            compact && dropdownStyles.triggerCompact,
            selectionHighlighted && dropdownStyles.triggerSelected,
            open && dropdownStyles.triggerOpen,
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
          {triggerIcon && <Ionicons name={triggerIcon} size={17} color={theme.textSecondary} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                dropdownStyles.triggerText,
                !selected && !triggerLabel && dropdownStyles.placeholderText,
                selectionHighlighted && dropdownStyles.triggerTextSelected,
              ]}
              numberOfLines={1}
            >
              {triggerLabel ?? (selected ? selected.label : placeholder)}
            </Text>
            {!triggerLabel && selected?.subtitle && (
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
          animationType={portalAnimation}
          transparent
          visible
          statusBarTranslucent
          onRequestClose={() => closeDropdown()}
          onShow={() => {
            if (focusOptionOnShow && keyboardNavigation && Platform.OS === 'web') {
              const index = Math.max(0, options.findIndex(option => option.value === value));
              optionRefs.current[index]?.focus();
            }
          }}
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

function createStyles(theme: Theme) {
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
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 48,
      gap: 12,
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
      backgroundColor: theme.primaryMuted,
      borderColor: theme.borderStrong,
    },
    triggerOpen: { borderColor: theme.focus },
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
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 48,
      justifyContent: 'center',
      borderRadius: 8,
    },
    optionsContent: { padding: 6, gap: 2 },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    tileRow: { flexDirection: 'row', gap: 6 },
    tileMenu: { padding: 8, gap: 4 },
    gridOption: { flex: 1, minHeight: 44, paddingVertical: 8, paddingHorizontal: 10 },
    tile: { backgroundColor: theme.bgMuted },
    selectedTile: { backgroundColor: theme.actionPrimary },
    tileContent: { justifyContent: 'center' },
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
      backgroundColor: theme.primaryMuted,
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
