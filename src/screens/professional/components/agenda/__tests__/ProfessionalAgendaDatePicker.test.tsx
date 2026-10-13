import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfessionalAgendaDatePicker } from '../ProfessionalAgendaDatePicker';
import { calendarDate, toCalendarDateKey } from '../professionalAgendaUtils';
jest.mock('../../../../../components/scheduling/SchedulerCalendar', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SchedulerCalendar: ({ current, onSelectDate }: { current: string; onSelectDate: (key: string) => void }) => <Pressable onPress={() => onSelectDate('2026-03-29')}><Text>{current}</Text></Pressable> };
});
it('selects a calendar date across DST and closes, without interpreting it in the device zone', () => {
  const select = jest.fn(), close = jest.fn();
  const screen = render(<ProfessionalAgendaDatePicker visible selectedDate={calendarDate('2026-10-25')} onSelect={select} onClose={close} />);
  fireEvent.press(screen.getByText('2026-10-25'));
  expect(toCalendarDateKey(select.mock.calls[0][0])).toBe('2026-03-29');
  expect(close).toHaveBeenCalledTimes(1);
});
