import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfessionalAgendaToolbar } from '../ProfessionalAgendaToolbar';
import type { GoogleCalendarStatus } from '../../../../../services/googleCalendarService';

jest.mock('../../../../../components/common/AnimatedPressable', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return { AnimatedPressable: ReactModule.forwardRef((props: React.ComponentProps<typeof Pressable> & { focusRef?: React.Ref<unknown> }, ref) => {
    ReactModule.useImperativeHandle(props.focusRef ?? ref, () => ({ measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(10, 10, 150, 38) }));
    return <Pressable {...props} accessibilityRole="button" />;
  }) };
});

const weekDays = Array.from({ length: 7 }, (_, index) => new Date(2026, 7, 3 + index));
const connectedCalendar: GoogleCalendarStatus = {
  enabled: true, status: 'CONNECTED', email: null, pending: 0, failed: 0,
  lastSyncedAt: null, errorCode: null, reconciling: false,
};

function renderCalendarStatus(googleCalendarStatus: GoogleCalendarStatus | null, onGoogleCalendar = jest.fn()) {
  return render(<ProfessionalAgendaToolbar
    viewMode="week" selectedDate={weekDays[0]} weekDays={weekDays}
    originFilter="ALL" statusFilter="ACTIVE" visibleCount={0} pendingCount={0} summaryAvailable
    isMobile={false} googleCalendarStatus={googleCalendarStatus} onGoogleCalendar={onGoogleCalendar}
    onChangeView={jest.fn()} onChangeOrigin={jest.fn()} onChangeStatus={jest.fn()}
    onResetFilters={jest.fn()} onNavigateDate={jest.fn()} onGoToToday={jest.fn()}
    onPickDate={jest.fn()} onSettings={jest.fn()}
  />);
}

describe('ProfessionalAgendaToolbar', () => {
  it('keeps all four views discoverable on compact/mobile layouts', () => {
    const onChangeView = jest.fn();
    const screen = render(
      <ProfessionalAgendaToolbar
        viewMode="week"
        selectedDate={new Date(2026, 7, 6)}
        weekDays={weekDays}
        originFilter="ALL"
        statusFilter="ACTIVE" visibleCount={4} pendingCount={1} summaryAvailable
        googleCalendarStatus={null}
        onChangeStatus={jest.fn()} onResetFilters={jest.fn()} onPickDate={jest.fn()} onSettings={jest.fn()} onGoogleCalendar={jest.fn()}
        isMobile
        onChangeView={onChangeView}
        onChangeOrigin={jest.fn()}
        onNavigateDate={jest.fn()}
        onGoToToday={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText('Vista del calendario'));
    expect(screen.getByText('Día')).toBeTruthy();
    expect(screen.getAllByText('Semana').length).toBeGreaterThan(0);
    expect(screen.getByText('Mes')).toBeTruthy();
    expect(screen.getByText('Lista')).toBeTruthy();
    fireEvent.press(screen.getByText('Mes'));
    expect(onChangeView).toHaveBeenCalledWith('month');
  });

  it('exposes direct date navigation and today actions', () => {
    const onNavigateDate = jest.fn();
    const onGoToToday = jest.fn();
    const onSettings = jest.fn();
    const onGoogleCalendar = jest.fn();
    const screen = render(
      <ProfessionalAgendaToolbar
        viewMode="week"
        selectedDate={new Date(2026, 7, 6)}
        weekDays={weekDays}
        originFilter="ALL"
        statusFilter="ACTIVE" visibleCount={4} pendingCount={1} summaryAvailable
        googleCalendarStatus={{ ...connectedCalendar, status: 'DISCONNECTED' }}
        onChangeStatus={jest.fn()} onResetFilters={jest.fn()} onPickDate={jest.fn()} onSettings={onSettings} onGoogleCalendar={onGoogleCalendar}
        isMobile={false}
        onChangeView={jest.fn()}
        onChangeOrigin={jest.fn()}
        onNavigateDate={onNavigateDate}
        onGoToToday={onGoToToday}
      />,
    );

    fireEvent.press(screen.getByLabelText('Periodo anterior'));
    fireEvent.press(screen.getByLabelText('Periodo siguiente'));
    const todayButton = screen.getByLabelText('Ir a hoy');
    expect(todayButton.props.accessibilityRole).toBe('button');
    expect(todayButton).toHaveStyle({ borderWidth: 1 });
    fireEvent.press(todayButton);
    expect(onNavigateDate.mock.calls).toEqual([[-1], [1]]);
    expect(onGoToToday).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Ajustes de agenda'));
    expect(onSettings).toHaveBeenCalledWith({ x: 160, y: 48 });
    fireEvent.press(screen.getByLabelText('Sincronizar con Google Calendar'));
    expect(onGoogleCalendar).toHaveBeenCalledTimes(1);
  });

  it('shows a check and the synchronized state while keeping settings accessible', () => {
    const onGoogleCalendar = jest.fn();
    const screen = renderCalendarStatus(connectedCalendar, onGoogleCalendar);

    expect(screen.getByText('Google Calendar · Sincronizado')).toBeTruthy();
    expect(screen.getByText('checkmark-circle')).toBeTruthy();
    expect(screen.queryByText('Sincronizar con Google Calendar')).toBeNull();
    fireEvent.press(screen.getByLabelText('Google Calendar · Sincronizado'));
    expect(onGoogleCalendar).toHaveBeenCalledTimes(1);
  });

  it.each<{ status: GoogleCalendarStatus | null; label: string }>([
    { status: null, label: 'Google Calendar' },
    { status: { ...connectedCalendar, enabled: false, status: 'DISCONNECTED' }, label: 'Google Calendar' },
    { status: { ...connectedCalendar, status: 'DISCONNECTED' }, label: 'Sincronizar con Google Calendar' },
    { status: { ...connectedCalendar, status: 'DISCONNECTING' }, label: 'Google Calendar · Desconectando…' },
    { status: { ...connectedCalendar, status: 'REAUTH_REQUIRED' }, label: 'Revisar Google Calendar' },
    { status: { ...connectedCalendar, privacyUpdateRequired: true }, label: 'Revisar Google Calendar' },
    { status: { ...connectedCalendar, errorCode: 'CALENDAR_CREDENTIAL_STORAGE_ERROR' }, label: 'Revisar Google Calendar' },
  ])('does not claim synchronization for $label', ({ status, label }) => {
    const screen = renderCalendarStatus(status);
    expect(screen.getByLabelText(label)).toBeTruthy();
    expect(screen.queryByText('checkmark-circle')).toBeNull();
  });
});
