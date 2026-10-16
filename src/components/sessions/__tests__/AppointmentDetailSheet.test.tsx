const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../professional/SessionMeetingControls', () => ({ SessionMeetingControls: () => null }));
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ProfessionalSessionDetail } from '../../../services/professionalService';
import { AppointmentDetailSheet } from '../AppointmentDetailSheet';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

const buildProfessionalSession = (
  overrides: Partial<ProfessionalSessionDetail> = {},
): ProfessionalSessionDetail => ({
  id: 'session-1',
  clientId: 'client-1',
  specialistId: 'specialist-1',
  date: '2026-09-01T08:00:00.000Z',
  duration: 60,
  bookedDuration: 60,
  bookedServiceName: null,
  status: 'CONFIRMED',
  type: 'IN_PERSON',
  origin: 'PRIVATE',
  client: {
    id: 'client-1',
    userId: null,
    displayName: 'Lucía Gómez',
    primaryEmail: 'lucia@example.com',
    primaryPhone: '+34600000000',
    user: null,
  },
  price: {
    amount: 70,
    currency: 'EUR',
    tariffName: 'Sesión estándar',
  },
  professional: {
    id: 'specialist-1',
    displayName: 'Dra. Ana Ruiz',
    professionalTitle: 'Psicóloga sanitaria',
  },
  clinicalTarget: null,
  actions: {
    canConfirm: false,
    canCancel: false,
    canComplete: false,
    canModifySchedule: false,
    canJoinVideo: false,
    canOpenClinicalNotes: false,
  },
  ...overrides,
});

describe('AppointmentDetailSheet service and tariff labels', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  it('shows the booked service snapshot for a clinic-managed appointment', () => {
    render(
      <AppointmentDetailSheet
        visible
        embedded
        mode="professional"
        professionalSession={buildProfessionalSession({
          origin: 'CLINIC',
          bookedServiceName: 'Seguimiento emocional',
          price: {
            amount: 70,
            currency: 'EUR',
            tariffName: null,
          },
        })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Servicio')).toBeTruthy();
    expect(screen.getByText('Seguimiento emocional')).toBeTruthy();
    expect(screen.queryByText('Sin tarifa')).toBeNull();
  });

  it('keeps the tariff label for a private appointment', () => {
    render(
      <AppointmentDetailSheet
        visible
        embedded
        mode="professional"
        professionalSession={buildProfessionalSession()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Tarifa')).toBeTruthy();
    expect(screen.getByText('Sesión estándar')).toBeTruthy();
    expect(screen.queryByText('Servicio')).toBeNull();
  });
  it('shows missing patient fiscal data before completion and opens the scoped billing editor', () => {
    const onClose = jest.fn();
    const issue = 'Faltan datos fiscales del paciente: NIF, Dirección fiscal.';
    render(<AppointmentDetailSheet visible embedded mode="professional" onClose={onClose}
      professionalSession={buildProfessionalSession({ invoiceCompletionIssue: issue })} />);
    expect(screen.getByText(issue)).toBeTruthy();
    fireEvent.press(screen.getByText('Completar datos'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('ClientProfile', { clientId: 'client-1', initialTab: 'summary', focusBillingEditor: true, returnAfterBillingSave: true });
  });

  it('offers professional management actions according to server permissions and blocks them while processing', () => {
    const onConfirm = jest.fn(), onCancel = jest.fn(), onReschedule = jest.fn();
    const session = buildProfessionalSession({ status: 'PENDING', actions: { canConfirm: true, canCancel: true, canComplete: false, canModifySchedule: true, canJoinVideo: false, canOpenClinicalNotes: false } });
    const props = { visible: true, embedded: true, mode: 'professional' as const, professionalSession: session, onClose: jest.fn(), onConfirm, onCancel, onReschedule };
    const view = render(<AppointmentDetailSheet {...props} />);
    fireEvent.press(view.getByText('Confirmar')); fireEvent.press(view.getByText('Rechazar'));
    expect(onConfirm).toHaveBeenCalledTimes(1); expect(onCancel).toHaveBeenCalledTimes(1);
    view.rerender(<AppointmentDetailSheet {...props} processing />);
    fireEvent.press(view.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    view.rerender(<AppointmentDetailSheet {...props} professionalSession={{ ...session, status: 'CONFIRMED' }} />);
    fireEvent.press(view.getByText('Modificar horario'));
    expect(onReschedule).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Confirmar')).toBeNull();
    view.rerender(<AppointmentDetailSheet {...props} professionalSession={{ ...session, origin: 'CLINIC' }} />);
    expect(view.queryByText('Confirmar')).toBeNull(); expect(view.queryByText('Rechazar')).toBeNull();
    view.rerender(<AppointmentDetailSheet {...props} professionalSession={buildProfessionalSession()} />);
    expect(view.queryByText('Cancelar cita')).toBeNull(); expect(view.queryByText('Modificar horario')).toBeNull();
  });
});
jest.mock('../../../services/packageService', () => ({ downloadPackageInvoice: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../common/alert', () => ({ useAppAlert: () => jest.fn(), showAppAlert: jest.fn() }));
