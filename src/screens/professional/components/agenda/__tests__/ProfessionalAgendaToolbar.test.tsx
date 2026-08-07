import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfessionalAgendaToolbar } from '../ProfessionalAgendaToolbar';

const weekDays = Array.from({ length: 7 }, (_, index) => new Date(2026, 7, 3 + index));

describe('ProfessionalAgendaToolbar', () => {
  it('keeps all four views discoverable on compact/mobile layouts', () => {
    const onChangeView = jest.fn();
    const screen = render(
      <ProfessionalAgendaToolbar
        viewMode="week"
        selectedDate={new Date(2026, 7, 6)}
        weekDays={weekDays}
        originFilter="ALL"
        compactOriginFilter
        isMobile
        onChangeView={onChangeView}
        onChangeOrigin={jest.fn()}
        onNavigateDate={jest.fn()}
        onGoToToday={jest.fn()}
      />,
    );

    expect(screen.getByText('Día')).toBeTruthy();
    expect(screen.getByText('Semana')).toBeTruthy();
    expect(screen.getByText('Mes')).toBeTruthy();
    expect(screen.getByText('Lista')).toBeTruthy();
    fireEvent.press(screen.getByText('Mes'));
    expect(onChangeView).toHaveBeenCalledWith('month');
  });

  it('exposes direct date navigation and today actions', () => {
    const onNavigateDate = jest.fn();
    const onGoToToday = jest.fn();
    const screen = render(
      <ProfessionalAgendaToolbar
        viewMode="week"
        selectedDate={new Date(2026, 7, 6)}
        weekDays={weekDays}
        originFilter="ALL"
        compactOriginFilter={false}
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
  });
});
