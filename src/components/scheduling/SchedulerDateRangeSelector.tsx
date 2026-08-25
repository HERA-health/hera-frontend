import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { borderRadius, spacing } from '../../constants/colors';
import { overlayLayers } from '../../constants/overlayLayers';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMadridDateKey } from '../../utils/madridTime';
import { addSchedulerDateKeyDays } from '../../utils/schedulerDateTime';
import {
  AnimatedPressable,
  type AnimatedPressableHandle,
} from '../common/AnimatedPressable';
import { SchedulerCalendar } from './SchedulerCalendar';

export interface SchedulerDateRangeValue {
  startDate: string;
  endDate: string;
}

export type SchedulerDateRangeOpenField = 'start' | 'end' | null;

export interface SchedulerDateRangeSelectorProps {
  value: SchedulerDateRangeValue;
  openField: SchedulerDateRangeOpenField;
  disabled?: boolean;
  maxRangeDays?: number;
  presentation?: 'auto' | 'inline' | 'popover';
  testIDPrefix?: string;
  onChange: (value: SchedulerDateRangeValue) => void;
  onOpenFieldChange: (field: SchedulerDateRangeOpenField) => void;
}

interface SchedulerPopoverAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SchedulerPopoverLayout {
  left: number;
  top: number;
  width: number;
}

interface SchedulerWebPopoverPortalProps {
  accessibilityLabel: string;
  children: React.ReactNode;
  id: string;
  layout: SchedulerPopoverLayout;
}

interface SchedulerReactDomPortalApi {
  createPortal: (
    children: React.ReactNode,
    container: Element | DocumentFragment,
  ) => React.ReactElement;
}

const CALENDAR_POPOVER_WIDTH = 340;
const CALENDAR_POPOVER_ESTIMATED_HEIGHT = 360;
const INLINE_CALENDAR_BREAKPOINT = 920;
const STACKED_FIELDS_BREAKPOINT = 560;

export function SchedulerWebPopoverPortal({
  accessibilityLabel,
  children,
  id,
  layout,
}: SchedulerWebPopoverPortalProps): React.ReactElement | null {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    const container = document.createElement('div');
    container.id = id;
    container.style.position = 'fixed';
    container.style.zIndex = String(overlayLayers.popover);
    container.style.pointerEvents = 'auto';
    container.tabIndex = -1;
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-label', accessibilityLabel);
    document.body.appendChild(container);
    setPortalContainer(container);

    return () => {
      container.remove();
    };
  }, [accessibilityLabel, id]);

  useEffect(() => {
    if (!portalContainer) return undefined;

    const focusTimer = setTimeout(() => {
      portalContainer.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [portalContainer]);

  useEffect(() => {
    if (!portalContainer) return;
    portalContainer.style.left = `${layout.left}px`;
    portalContainer.style.top = `${layout.top}px`;
    portalContainer.style.width = `${layout.width}px`;
  }, [layout, portalContainer]);

  if (Platform.OS !== 'web' || !portalContainer) return null;

  const ReactDOM = require('react-dom') as SchedulerReactDomPortalApi;
  return ReactDOM.createPortal(children, portalContainer);
}

const formatDateLabel = (dateKey: string): string => formatMadridDateKey(dateKey, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function SchedulerDateRangeSelector({
  value,
  openField,
  disabled = false,
  maxRangeDays = 42,
  presentation = 'auto',
  testIDPrefix = 'scheduler-range',
  onChange,
  onOpenFieldChange,
}: SchedulerDateRangeSelectorProps): React.ReactElement {
  const { theme } = useTheme();
  const { height, width } = useWindowDimensions();
  const inlineCalendar = presentation === 'inline'
    || (presentation === 'auto' && width < INLINE_CALENDAR_BREAKPOINT);
  const stackedFields = presentation === 'inline' || width < STACKED_FIELDS_BREAKPOINT;
  const startTriggerRef = useRef<AnimatedPressableHandle>(null);
  const endTriggerRef = useRef<AnimatedPressableHandle>(null);
  const previousOpenFieldRef = useRef<SchedulerDateRangeOpenField>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<SchedulerPopoverAnchor | null>(null);
  const safeMaxRangeDays = Math.max(1, maxRangeDays);
  const maxEndDate = addSchedulerDateKeyDays(value.startDate, safeMaxRangeDays - 1)
    ?? value.startDate;

  const markedDates = useMemo(() => {
    const marked: Record<string, {
      color: string;
      textColor: string;
      startingDay?: boolean;
      endingDay?: boolean;
    }> = {};
    let current = value.startDate;

    for (let index = 0; index < safeMaxRangeDays && current <= value.endDate; index += 1) {
      marked[current] = {
        color: current === value.startDate || current === value.endDate
          ? theme.primary
          : theme.primaryAlpha12,
        textColor: current === value.startDate || current === value.endDate
          ? theme.textOnPrimary
          : theme.textPrimary,
        startingDay: current === value.startDate,
        endingDay: current === value.endDate,
      };
      const next = addSchedulerDateKeyDays(current, 1);
      if (!next) break;
      current = next;
    }

    return marked;
  }, [safeMaxRangeDays, theme.primary, theme.primaryAlpha12, theme.textOnPrimary, theme.textPrimary, value]);

  useEffect(() => {
    const previous = previousOpenFieldRef.current;
    previousOpenFieldRef.current = openField;
    if (previous && openField === null && Platform.OS === 'web') {
      const trigger = previous === 'start' ? startTriggerRef.current : endTriggerRef.current;
      setTimeout(() => trigger?.focus(), 0);
    }
  }, [openField]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !openField || typeof document === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenFieldChange(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onOpenFieldChange, openField]);

  const measureTrigger = useCallback((field: Exclude<SchedulerDateRangeOpenField, null>): void => {
    const trigger = field === 'start' ? startTriggerRef.current : endTriggerRef.current;
    if (!trigger || typeof trigger.measureInWindow !== 'function') {
      setPopoverAnchor({
        x: spacing.md,
        y: spacing.md,
        width: CALENDAR_POPOVER_WIDTH / 2,
        height: 56,
      });
      return;
    }

    trigger.measureInWindow((x, y, triggerWidth, triggerHeight) => {
      setPopoverAnchor({ x, y, width: triggerWidth, height: triggerHeight });
    });
  }, []);

  useEffect(() => {
    if (!openField || inlineCalendar) {
      setPopoverAnchor(null);
      return;
    }

    measureTrigger(openField);
  }, [inlineCalendar, measureTrigger, openField, width]);

  const popoverLayout = useMemo(() => {
    if (!openField || !popoverAnchor || inlineCalendar) return null;

    const horizontalMargin = spacing.md;
    const popoverWidth = Math.min(
      CALENDAR_POPOVER_WIDTH,
      Math.max(0, width - horizontalMargin * 2),
    );
    const preferredLeft = openField === 'end'
      ? popoverAnchor.x + popoverAnchor.width - popoverWidth
      : popoverAnchor.x;
    const left = Math.max(
      horizontalMargin,
      Math.min(preferredLeft, width - popoverWidth - horizontalMargin),
    );
    const verticalMargin = spacing.md;
    const estimatedHeight = Math.min(
      CALENDAR_POPOVER_ESTIMATED_HEIGHT,
      Math.max(0, height - verticalMargin * 2),
    );
    const belowTop = popoverAnchor.y + popoverAnchor.height + spacing.xs;
    const shouldOpenAbove = belowTop + estimatedHeight > height - verticalMargin
      && popoverAnchor.y >= estimatedHeight + verticalMargin;
    const preferredTop = shouldOpenAbove
      ? Math.max(spacing.md, popoverAnchor.y - CALENDAR_POPOVER_ESTIMATED_HEIGHT - spacing.xs)
      : belowTop;
    const top = Math.max(
      verticalMargin,
      Math.min(preferredTop, height - estimatedHeight - verticalMargin),
    );

    return { left, top, width: popoverWidth };
  }, [height, inlineCalendar, openField, popoverAnchor, width]);

  const webPopoverRootId = `${testIDPrefix}-web-popover-root`;

  useEffect(() => {
    if (
      Platform.OS !== 'web'
      || !openField
      || inlineCalendar
      || typeof document === 'undefined'
    ) {
      return undefined;
    }

    const activeField = openField;
    const handleViewportChange = (): void => measureTrigger(activeField);
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const portalRoot = document.getElementById(webPopoverRootId);
      const trigger = document.querySelector(
        `[data-testid="${testIDPrefix}-${activeField}-trigger"]`,
      );
      if (portalRoot?.contains(target) || trigger?.contains(target)) return;
      onOpenFieldChange(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [inlineCalendar, measureTrigger, onOpenFieldChange, openField, testIDPrefix, webPopoverRootId]);

  const selectDate = useCallback((
    field: Exclude<SchedulerDateRangeOpenField, null>,
    selectedDate: string,
  ): void => {
    if (field === 'end') {
      const safeEnd = selectedDate < value.startDate
        ? value.startDate
        : selectedDate > maxEndDate
          ? maxEndDate
          : selectedDate;
      onChange({ ...value, endDate: safeEnd });
    } else {
      const nextMaxEnd = addSchedulerDateKeyDays(selectedDate, safeMaxRangeDays - 1)
        ?? selectedDate;
      const nextEnd = value.endDate < selectedDate
        ? selectedDate
        : value.endDate > nextMaxEnd
          ? nextMaxEnd
          : value.endDate;
      onChange({ startDate: selectedDate, endDate: nextEnd });
    }
    onOpenFieldChange(null);
  }, [maxEndDate, onChange, onOpenFieldChange, safeMaxRangeDays, value]);

  const renderCalendar = (
    field: Exclude<SchedulerDateRangeOpenField, null>,
    date: string,
    inline: boolean,
  ): React.ReactElement => (
    <View
      testID={`${testIDPrefix}-${field}-popover`}
      style={[
        styles.calendarSurface,
        inline
          ? styles.inlinePanel
          : Platform.OS === 'web'
            ? styles.webPortalPanel
            : styles.portalPanel,
        !inline && Platform.OS !== 'web' && popoverLayout ? popoverLayout : null,
        {
          borderColor: theme.border,
          backgroundColor: theme.bgElevated,
          shadowColor: theme.shadowNeutral,
        },
      ]}
    >
      <SchedulerCalendar
        testID={`${testIDPrefix}-${field}-calendar`}
        current={date}
        density="compact"
        enableSwipeMonths={!inline}
        minDate={field === 'end' ? value.startDate : undefined}
        maxDate={field === 'end' ? maxEndDate : undefined}
        markedDates={markedDates}
        markingType="period"
        onSelectDate={(selectedDate) => selectDate(field, selectedDate)}
      />
    </View>
  );

  const renderField = (
    field: Exclude<SchedulerDateRangeOpenField, null>,
    label: string,
    date: string,
  ): React.ReactElement => {
    const open = openField === field;
    const isEnd = field === 'end';

    return (
      <View
        testID={`${testIDPrefix}-${field}-field`}
        style={[styles.field, stackedFields ? styles.compactField : null]}
      >
        <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{label}</Text>
        <AnimatedPressable
          focusRef={isEnd ? endTriggerRef : startTriggerRef}
          testID={`${testIDPrefix}-${field}-trigger`}
          accessibilityRole="button"
          accessibilityLabel={`Seleccionar fecha ${label.toLowerCase()}`}
          accessibilityHint={`Fecha actual ${date}. Rango máximo de ${safeMaxRangeDays} días`}
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          hoverLift={false}
          pressScale={0.98}
          onPress={() => {
            if (open) {
              onOpenFieldChange(null);
              return;
            }
            if (!inlineCalendar) measureTrigger(field);
            onOpenFieldChange(field);
          }}
          style={[
            styles.trigger,
            {
              borderColor: open ? theme.primary : theme.border,
              backgroundColor: open ? theme.primaryAlpha12 : theme.bgElevated,
            },
          ]}
        >
          <View style={styles.triggerCopy}>
            <Text
              numberOfLines={1}
              style={[styles.primaryText, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}
            >
              {formatDateLabel(date)}
            </Text>
            <Text style={[styles.secondaryText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              {date}
            </Text>
          </View>
          <Ionicons
            name={open ? 'chevron-up-outline' : 'calendar-clear-outline'}
            size={17}
            color={theme.primary}
          />
        </AnimatedPressable>

      </View>
    );
  };

  return (
    <>
      <View style={[styles.container, stackedFields ? styles.compactContainer : null]}>
        {renderField('start', 'Desde', value.startDate)}
        <View style={[styles.connector, stackedFields ? styles.compactConnector : null, { backgroundColor: theme.border }]} />
        {renderField('end', 'Hasta', value.endDate)}
      </View>

      {inlineCalendar && openField ? renderCalendar(
        openField,
        openField === 'start' ? value.startDate : value.endDate,
        true,
      ) : null}

      {!inlineCalendar && openField && popoverLayout && Platform.OS === 'web' ? (
        <SchedulerWebPopoverPortal
          accessibilityLabel={`Seleccionar fecha ${openField === 'start' ? 'desde' : 'hasta'}`}
          id={webPopoverRootId}
          layout={popoverLayout}
        >
          {renderCalendar(
            openField,
            openField === 'start' ? value.startDate : value.endDate,
            false,
          )}
        </SchedulerWebPopoverPortal>
      ) : null}

      {!inlineCalendar && openField && popoverLayout && Platform.OS !== 'web' ? (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => onOpenFieldChange(null)}
        >
          <View style={styles.portalLayer}>
            <Pressable
              accessible={false}
              testID={`${testIDPrefix}-popover-backdrop`}
              style={StyleSheet.absoluteFill}
              onPress={() => onOpenFieldChange(null)}
            />
            {renderCalendar(
              openField,
              openField === 'start' ? value.startDate : value.endDate,
              false,
            )}
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
    width: '100%',
  },
  compactContainer: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  field: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  compactField: {
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: '100%',
    width: '100%',
  },
  label: { fontSize: 12, marginBottom: spacing.xs },
  trigger: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  triggerCopy: { flex: 1, minWidth: 0 },
  primaryText: { fontSize: 13 },
  secondaryText: { fontSize: 11, marginTop: 2 },
  connector: {
    height: 1,
    marginBottom: 28,
    width: spacing.sm,
  },
  compactConnector: { display: 'none' },
  calendarSurface: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    elevation: 12,
    overflow: 'hidden',
    padding: spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  inlinePanel: {
    alignSelf: 'center',
    elevation: 0,
    marginTop: spacing.sm,
    maxWidth: CALENDAR_POPOVER_WIDTH,
    padding: spacing.xs,
    position: 'relative',
    shadowOpacity: 0,
    width: '100%',
  },
  portalLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  portalPanel: {
    position: 'absolute',
  },
  webPortalPanel: {
    position: 'relative',
    width: '100%',
  },
});
