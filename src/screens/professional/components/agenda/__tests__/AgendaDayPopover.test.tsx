import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { ProfessionalSession } from '../../../../../constants/types';
import { AgendaDayPopover } from '../AgendaDayPopover';

const createSession = (id: string, name: string, hour: number): ProfessionalSession => ({
  id,
  clientId: `client-${id}`,
  clientName: name,
  clientInitial: name[0],
  date: new Date(2026, 7, 6, hour, 0),
  duration: 60,
  status: 'scheduled',
  type: 'video',
  origin: 'PRIVATE',
});

describe('AgendaDayPopover', () => {
  it('orders hidden appointments and opens the existing detail flow', () => {
    const onClose = jest.fn();
    const onOpenSession = jest.fn();
    const screen = render(
      <AgendaDayPopover
        visible
        date={new Date(2026, 7, 6)}
        sessions={[
          createSession('late', 'Paciente tarde', 17),
          createSession('early', 'Paciente temprano', 9),
        ]}
        anchor={{ x: 240, y: 160 }}
        onClose={onClose}
        onOpenSession={onOpenSession}
      />,
    );

    const names = screen.getAllByText(/Paciente/).map((node) => node.props.children);
    expect(names).toEqual(['Paciente temprano', 'Paciente tarde']);
    fireEvent.press(screen.getByLabelText(/Abrir cita de Paciente temprano/));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenSession).toHaveBeenCalledWith('early');
  });

  it('closes when pressing outside the anchored popover', () => {
    const onClose = jest.fn();
    const screen = render(
      <AgendaDayPopover
        visible
        date={new Date(2026, 7, 6)}
        sessions={[createSession('session', 'Paciente', 10)]}
        anchor={{ x: 240, y: 160 }}
        onClose={onClose}
        onOpenSession={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText('Cerrar citas del día'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
