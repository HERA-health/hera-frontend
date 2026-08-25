/** @jest-environment jsdom */

import React, { useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { darkTheme, lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  SchedulerDateRangeSelector,
  SchedulerWebPopoverPortal,
  type SchedulerDateRangeOpenField,
  type SchedulerDateRangeValue,
} from '../SchedulerDateRangeSelector';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));

jest.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children,
}));

jest.mock('react-native-calendars', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    LocaleConfig: { locales: {}, defaultLocale: 'es' },
    Calendar: ({ onDayPress, testID, minDate, maxDate, markingType, enableSwipeMonths, theme }: {
      onDayPress?: (day: { dateString: string }) => void;
      testID?: string;
      minDate?: string;
      maxDate?: string;
      markingType?: string;
      enableSwipeMonths?: boolean;
      theme?: { weekVerticalMargin?: number };
    }) => (
      <Text
        testID={testID}
        accessibilityHint={`${minDate ?? ''}|${maxDate ?? ''}|${markingType ?? ''}|${enableSwipeMonths ? 'swipe' : 'static'}|week-${theme?.weekVerticalMargin ?? ''}`}
        onPress={() => onDayPress?.({
          dateString: testID?.includes('start') ? '2030-02-20' : '2030-05-30',
        })}
      >
        calendar
      </Text>
    ),
  };
});

const mockedUseTheme = jest.mocked(useTheme);

function Harness(): React.ReactElement {
  const [value, setValue] = useState<SchedulerDateRangeValue>({
    startDate: '2030-01-01',
    endDate: '2030-01-31',
  });
  const [openField, setOpenField] = useState<SchedulerDateRangeOpenField>(null);
  return (
    <SchedulerDateRangeSelector
      value={value}
      openField={openField}
      onChange={setValue}
      onOpenFieldChange={setOpenField}
      presentation="inline"
      testIDPrefix="range-test"
    />
  );
}

describe('SchedulerDateRangeSelector', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  it('moves an invalid end date when a later start is selected', () => {
    render(<Harness />);
    fireEvent.press(screen.getByTestId('range-test-start-trigger'));
    fireEvent.press(screen.getByTestId('range-test-start-calendar'));

    expect(screen.getAllByText('2030-02-20')).toHaveLength(2);
  });

  it('limits the end selector to 42 inclusive days and clamps defensive input', () => {
    render(<Harness />);
    fireEvent.press(screen.getByTestId('range-test-end-trigger'));
    const calendar = screen.getByTestId('range-test-end-calendar');
    expect(calendar.props.accessibilityHint).toBe('2030-01-01|2030-02-11|period|static|week-2');
    fireEvent.press(calendar);

    expect(screen.getByText('2030-02-11')).toBeTruthy();
  });

  it('renders with dark theme tokens and exposes controlled expanded state', () => {
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    });
    render(<Harness />);
    const trigger = screen.getByTestId('range-test-start-trigger');
    expect(trigger.props.accessibilityState.expanded).toBe(false);
    fireEvent.press(trigger);
    expect(screen.getByTestId('range-test-start-trigger').props.accessibilityState.expanded).toBe(true);
  });

  it('keeps a dense, scroll-friendly inline calendar in the natural page flow', () => {
    render(<Harness />);
    fireEvent.press(screen.getByTestId('range-test-end-trigger'));

    const fieldStyle = StyleSheet.flatten(screen.getByTestId('range-test-start-field').props.style);
    expect(fieldStyle).toEqual(expect.objectContaining({
      flexBasis: 'auto',
      flexGrow: 0,
      flexShrink: 0,
    }));
    const calendar = screen.getByTestId('range-test-end-calendar');
    const panelStyle = StyleSheet.flatten(screen.getByTestId('range-test-end-popover').props.style);
    expect(calendar.props.accessibilityHint).toContain('|static|week-2');
    expect(panelStyle).toEqual(expect.objectContaining({
      maxWidth: 340,
      position: 'relative',
      width: '100%',
    }));
  });

  it('moves web focus into the calendar dialog at the shared popover layer', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    try {
      render(
        <SchedulerWebPopoverPortal
          accessibilityLabel="Seleccionar fecha desde"
          id="range-popover-web-popover-root"
          layout={{ left: 16, top: 80, width: 340 }}
        >
          <Text>calendar</Text>
        </SchedulerWebPopoverPortal>,
      );

      const portal = await waitFor(() => {
        const element = document.getElementById('range-popover-web-popover-root');
        expect(element).not.toBeNull();
        return element as HTMLDivElement;
      });
      await waitFor(() => expect(document.activeElement).toBe(portal));
      expect(portal.getAttribute('role')).toBe('dialog');
      expect(portal.getAttribute('aria-label')).toBe('Seleccionar fecha desde');
      expect(portal.style.zIndex).toBe('20000');
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  it('closes the controlled calendar with Escape on web', () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    try {
      render(<Harness />);
      fireEvent.press(screen.getByTestId('range-test-start-trigger'));
      expect(screen.getByTestId('range-test-start-trigger').props.accessibilityState.expanded)
        .toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(screen.getByTestId('range-test-start-trigger').props.accessibilityState.expanded)
        .toBe(false);
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });
});
