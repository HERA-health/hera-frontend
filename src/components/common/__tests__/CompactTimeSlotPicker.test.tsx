import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CompactTimeSlotPicker, previewTimeSlots } from '../CompactTimeSlotPicker';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { TimeSlot } from '../../../services/sessionsService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
// Native test renderer does not measure anchors; exercise the real portal with a measured trigger.
jest.mock('../AnimatedPressable', () => ({
  AnimatedPressable: ({ children, focusRef, ...props }: React.PropsWithChildren<{
    focusRef?: React.Ref<{ measureInWindow: (callback: (...values: number[]) => void) => void; focus: () => void }>;
  }>) => {
    const React = require('react');
    const { Pressable } = require('react-native');
    React.useImperativeHandle(focusRef, () => ({
      measureInWindow: (callback: (...values: number[]) => void) => callback(20, 200, 300, 48),
      focus: () => {},
    }));
    return <Pressable {...props}>{children}</Pressable>;
  },
}));
const time = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const slots: TimeSlot[] = Array.from({ length: 80 }, (_, index) => ({
  startTime: time(9 * 60 + index * 5), endTime: time(10 * 60 + index * 5), available: true,
}));
const props = { slots, resetKey: 'day-1', onSelect: jest.fn(), renderSlot: (slot: TimeSlot) => <Text>{slot.startTime}</Text> };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, mode: 'light', isDark: false, setMode: jest.fn() });
});

test.each([0, 1, 4, 5, 80])('bounds preview for %i available times', count => {
  render(<CompactTimeSlotPicker {...props} slots={slots.slice(0, count)} />);
  expect(screen.queryAllByText(/^\d\d:\d\d$/).length).toBeLessThanOrEqual(4);
  expect(Boolean(screen.queryByText('Ver todos los horarios'))).toBe(count > 4);
});

test('every valid start is in the floating menu and selecting one preserves the slot object', () => {
  render(<CompactTimeSlotPicker {...props} slots={[...slots, { startTime: '20:00', endTime: '21:00', available: false }]} />);
  fireEvent.press(screen.getByText('Ver todos los horarios'));
  for (const slot of slots) expect(screen.getByRole('button', { name: slot.startTime })).toBeTruthy();
  expect(screen.queryByText('20:00')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '09:05' }));
  expect(props.onSelect).toHaveBeenCalledWith(slots[1]);
  expect(screen.queryByRole('button', { name: '09:10' })).toBeNull();
});

test('context changes close the menu and a selected alternative occupies one of four cells', () => {
  const view = render(<CompactTimeSlotPicker {...props} />);
  fireEvent.press(screen.getByText('Ver todos los horarios'));
  view.rerender(<CompactTimeSlotPicker {...props} resetKey="day-2" selectedTime="09:05" />);
  expect(screen.queryByRole('button', { name: '09:10' })).toBeNull();
  expect(screen.getByText('09:05')).toBeTruthy();
  expect(screen.getAllByText(/^\d\d:\d\d$/)).toHaveLength(4);
});

test('disabling the selector closes its menu without changing the selection', () => {
  const view = render(<CompactTimeSlotPicker {...props} selectedTime="09:05" />);
  fireEvent.press(screen.getByText('Ver todos los horarios'));
  view.rerender(<CompactTimeSlotPicker {...props} selectedTime="09:05" disabled />);
  expect(screen.queryByRole('button', { name: '09:10' })).toBeNull();
  expect(screen.getByText('09:05')).toBeTruthy();
  expect(props.onSelect).not.toHaveBeenCalled();
});

test('sampling prefers round starts across the day and retains exact starts when needed', () => {
  const sample = previewTimeSlots(slots);
  expect(sample[0]).toBe(slots[0]);
  expect(sample[3].startTime).toBe('15:30');
  expect(sample.every(slot => ['00', '30'].includes(slot.startTime.slice(3)))).toBe(true);
  const sparse = ['09:00', '09:05', '09:10', '09:15', '10:52', '17:00'].map(startTime => ({ startTime, endTime: '18:00', available: true }));
  expect(previewTimeSlots(sparse).map(slot => slot.startTime)).toEqual(['09:00', '09:15', '10:52', '17:00']);
  const tie = ['09:00', '09:05', '09:10', '09:15', '09:20', '09:25', '09:30', '09:35', '09:40', '09:45', '09:50', '09:55', '10:00'].map(startTime => ({ startTime, endTime: '11:00', available: true }));
  expect(previewTimeSlots(tie, '09:30').map(slot => slot.startTime)).toEqual(['09:00', '09:15', '09:30', '10:00']);
});

test('an irregular selected start stays visible without changing the actual time', () => {
  expect(previewTimeSlots(slots, '09:05').map(slot => slot.startTime)).toContain('09:05');
  const irregular = slots.map((slot, index) => ({ ...slot, startTime: time(9 * 60 + 7 + index * 60) })).slice(0, 6);
  const preview = previewTimeSlots(irregular);
  expect(preview).toHaveLength(4);
  expect(preview.every(slot => irregular.includes(slot))).toBe(true);
});
