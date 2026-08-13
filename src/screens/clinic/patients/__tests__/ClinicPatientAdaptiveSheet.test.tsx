import React, { useState } from 'react';
import { Modal, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ClinicPatientAdaptiveSheet } from '../ClinicPatientAdaptiveSheet';
import { AppointmentDetailSheet } from '../../../../components/sessions/AppointmentDetailSheet';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('ClinicPatientAdaptiveSheet', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes modal semantics and a visible return action', () => {
    const onBack = jest.fn();
    const view = render(
      <ClinicPatientAdaptiveSheet
        visible
        title="Ana Martín"
        busy={false}
        onBack={onBack}
        onDismiss={jest.fn()}
      >
        <Text>Contenido de la ficha</Text>
      </ClinicPatientAdaptiveSheet>,
    );

    const sheet = screen.getByTestId('clinic-patient-adaptive-sheet');
    expect(sheet.props.role).toBe('dialog');
    expect(sheet.props.accessibilityViewIsModal).toBe(true);
    expect(sheet.props['aria-modal']).toBe(true);
    expect(sheet.props.accessibilityLabel).toBe('Ficha de paciente: Ana Martín');
    expect(screen.getByRole('header', { name: 'Ana Martín' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Volver al listado de pacientes' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    act(() => view.UNSAFE_getByType(Modal).props.onRequestClose());
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('blocks visible and system dismissal while saving', () => {
    const onBack = jest.fn();
    const view = render(
      <ClinicPatientAdaptiveSheet
        visible
        title="Editar paciente"
        busy
        onBack={onBack}
        onDismiss={jest.fn()}
      >
        <Text>Formulario</Text>
      </ClinicPatientAdaptiveSheet>,
    );

    expect(
      screen.getByRole('button', { name: 'Volver al listado de pacientes' }).props
        .accessibilityState.disabled,
    ).toBe(true);

    act(() => view.UNSAFE_getByType(Modal).props.onRequestClose());
    expect(onBack).not.toHaveBeenCalled();
  });

  it('hosts appointment detail inside the patient modal and preserves the record after closing it', () => {
    function CompactFlow(): React.ReactElement {
      const [appointmentVisible, setAppointmentVisible] = useState(true);

      return (
        <ClinicPatientAdaptiveSheet
          visible
          title="Ana Martín"
          busy={false}
          onBack={jest.fn()}
          onDismiss={jest.fn()}
          onOverlayRequestClose={() => setAppointmentVisible(false)}
          overlay={(
            <AppointmentDetailSheet
              visible={appointmentVisible}
              embedded
              mode="clinic-admin"
              loading
              onClose={() => setAppointmentVisible(false)}
            />
          )}
        >
          <Text>Ficha de Ana Martín</Text>
        </ClinicPatientAdaptiveSheet>
      );
    }

    const view = render(<CompactFlow />);

    expect(view.UNSAFE_getAllByType(Modal)).toHaveLength(1);
    expect(screen.getByText('Cargando cita')).toBeTruthy();

    act(() => view.UNSAFE_getByType(Modal).props.onRequestClose());

    expect(screen.queryByText('Cargando cita')).toBeNull();
    expect(screen.getByText('Ficha de Ana Martín')).toBeTruthy();
    expect(view.UNSAFE_getAllByType(Modal)).toHaveLength(1);
  });
});
