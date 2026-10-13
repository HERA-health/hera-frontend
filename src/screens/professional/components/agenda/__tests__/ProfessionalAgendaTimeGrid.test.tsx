import React from 'react';
import { ScrollView, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ProfessionalAgendaTimeGrid } from '../ProfessionalAgendaTimeGrid';
import { ProfessionalAgendaListView } from '../ProfessionalAgendaListView';
import { calendarDate } from '../professionalAgendaUtils';
import type { ProfessionalSession } from '../../../../../constants/types';

const item: ProfessionalSession = { id: 'midnight', clientId: 'synthetic', clientName: 'Paciente sintético', clientInitial: 'P', status: 'scheduled', type: 'video', provenance: 'OWN', date: new Date('2026-10-13T21:45Z'), duration: 60 };

beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

it('opens either midnight segment as the same session and exposes all 24 hours', () => {
  const open = jest.fn();
  const screen = render(<ProfessionalAgendaTimeGrid days={[calendarDate('2026-10-13'), calendarDate('2026-10-14')]} sessions={[item]} currentTime={new Date('2026-10-13T09:00Z')} scrollPosition={{ current: 0 }} scrollRequest={0} onOpenSession={open} />);
  expect(screen.getByText('00:00')).toBeTruthy();
  expect(screen.getByText('23:00')).toBeTruthy();
  expect(screen.getByText('UTC+2')).toBeTruthy();
  const segments = screen.getAllByRole('button', { name: /Paciente sintético, 23:45 - 00:45/ });
  expect(segments).toHaveLength(2);
  segments.forEach((segment) => fireEvent.press(segment));
  expect(open.mock.calls).toEqual([['midnight'], ['midnight']]);
});

it('labels the displayed dates with their actual UTC offsets, including clock changes', () => {
  const props = { sessions: [], currentTime: new Date('2026-10-13T09:00Z'), scrollPosition: { current: 0 }, scrollRequest: 0, onOpenSession: jest.fn() };
  const screen = render(<ProfessionalAgendaTimeGrid {...props} days={[calendarDate('2026-01-13')]} />);
  expect(screen.getByText('UTC+1')).toBeTruthy();
  screen.rerender(<ProfessionalAgendaTimeGrid {...props} days={[calendarDate('2026-10-25')]} />);
  expect(screen.getByLabelText('Zona horaria del calendario: Europe/Madrid, UTC+2 y UTC+1')).toBeTruthy();
});

it('restores scroll and does not recenter on clock updates or date navigation', () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
  const scrollPosition = { current: 480 as number | null };
  const props = { days: [calendarDate('2026-10-13')], sessions: [item], currentTime: new Date('2026-10-13T09:00Z'), scrollPosition, scrollRequest: 0, onOpenSession: jest.fn() };
  const screen = render(<ProfessionalAgendaTimeGrid {...props} />);
  act(() => jest.runOnlyPendingTimers());
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 480, animated: false });
  fireEvent.scroll(screen.UNSAFE_getByType(ScrollView), { nativeEvent: { contentOffset: { y: 900 } } });
  screen.rerender(<ProfessionalAgendaTimeGrid {...props} currentTime={new Date('2026-10-13T09:01Z')} />);
  screen.rerender(<ProfessionalAgendaTimeGrid {...props} days={[calendarDate('2026-10-14')]} />);
  act(() => jest.runOnlyPendingTimers());
  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(scrollPosition.current).toBe(900);
});

it('keeps list scroll in memory when leaving and reopening the view', () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
  const position = { current: 0 as number | null };
  const props = { sessions: [item], weekDays: [calendarDate('2026-10-12')], scrollPosition: position, renderSessionCard: (session: ProfessionalSession) => <Text key={session.id}>{session.clientName}</Text> };
  const first = render(<ProfessionalAgendaListView {...props} />);
  act(() => jest.runOnlyPendingTimers());
  fireEvent.scroll(first.UNSAFE_getByType(ScrollView), { nativeEvent: { contentOffset: { y: 360 } } });
  first.unmount();
  render(<ProfessionalAgendaListView {...props} />);
  act(() => jest.runOnlyPendingTimers());
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 360, animated: false });
});

it('waits for the active period before positioning at its first appointment', () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
  const props = { days: [calendarDate('2026-10-14')], currentTime: new Date('2026-10-13T09:00Z'), scrollPosition: { current: null as number | null }, scrollRequest: 0, onOpenSession: jest.fn() };
  const screen = render(<ProfessionalAgendaTimeGrid {...props} sessions={[]} dataReady={false} />);
  act(() => jest.runOnlyPendingTimers());
  expect(scrollTo).not.toHaveBeenCalled();
  screen.rerender(<ProfessionalAgendaTimeGrid {...props} sessions={[{ ...item, date: new Date('2026-10-14T16:00Z') }]} dataReady />);
  act(() => jest.runOnlyPendingTimers());
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 18 * 48, animated: false });
});

it('uses the explicit next appointment instead of the current hour, once per request', () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
  const props = { days: [calendarDate('2026-10-13')], sessions: [item], currentTime: new Date('2026-10-13T09:00Z'), scrollPosition: { current: null as number | null }, scrollRequest: 1, onOpenSession: jest.fn(), scrollTarget: new Date('2026-10-13T16:00Z') };
  const screen = render(<ProfessionalAgendaTimeGrid {...props} />);
  act(() => jest.runOnlyPendingTimers());
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 17 * 48, animated: false });
  screen.rerender(<ProfessionalAgendaTimeGrid {...props} currentTime={new Date('2026-10-13T09:01Z')} />);
  act(() => jest.runOnlyPendingTimers());
  expect(scrollTo).toHaveBeenCalledTimes(1);
});

it.each([45, 60])('shows pending status on a %i minute card', (duration) => {
  const screen = render(<ProfessionalAgendaTimeGrid days={[calendarDate('2026-10-13')]} sessions={[{ ...item, status: 'pending', duration, date: new Date('2026-10-13T09:00Z') }]} currentTime={new Date('2026-10-13T08:00Z')} scrollPosition={{ current: 0 }} scrollRequest={0} onOpenSession={jest.fn()} />);
  expect(screen.getByText('Pendiente')).toBeTruthy();
});

it('resets list scroll when Today requests it without remounting the list', () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
  const position = { current: 360 as number | null };
  const props = { sessions: [item], weekDays: [calendarDate('2026-10-12')], scrollPosition: position, renderSessionCard: (session: ProfessionalSession) => <Text key={session.id}>{session.clientName}</Text> };
  const view = render(<ProfessionalAgendaListView {...props} scrollRequest={0} />);
  act(() => jest.runOnlyPendingTimers());
  position.current = null;
  view.rerender(<ProfessionalAgendaListView {...props} scrollRequest={1} />);
  act(() => jest.runOnlyPendingTimers());
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
});
