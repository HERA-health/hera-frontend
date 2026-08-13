import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { ClinicPatientForm } from '../clinicPatientDomain';
import { ClinicPatientFormPanel } from '../ClinicPatientFormPanel';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

const form: ClinicPatientForm = {
  firstName: 'Lucía',
  lastName: 'Martín',
  email: 'lucia@example.com',
  phone: '',
  billingFullName: 'Empresa Familiar SL',
  billingTaxId: 'B12345678',
  billingAddress: 'Calle Sur 2',
  billingPostalCode: '28002',
  billingCity: 'Madrid',
  billingCountry: 'España',
};

interface RenderPanelOptions {
  sameBillingData?: boolean;
  saving?: boolean;
  onToggleSameBillingData?: () => void;
}

const renderPanel = ({
  sameBillingData = false,
  saving = false,
  onToggleSameBillingData = jest.fn(),
}: RenderPanelOptions = {}) => render(
  <ClinicPatientFormPanel
    mode="edit"
    form={form}
    errors={{}}
    saving={saving}
    feedback={null}
    canManage
    sameBillingData={sameBillingData}
    onChange={jest.fn()}
    onToggleSameBillingData={onToggleSameBillingData}
    onSubmit={jest.fn()}
    onCancel={jest.fn()}
  />,
);

describe('ClinicPatientFormPanel billing copy', () => {
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

  it('explains the exact copy scope and exposes an unchecked accessible control', () => {
    const onToggleSameBillingData = jest.fn();
    renderPanel({ onToggleSameBillingData });

    const checkbox = screen.getByRole('checkbox', {
      name: 'Usar los mismos datos para facturación',
    });
    expect(checkbox.props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
    });
    expect(screen.getByText(
      'Nombre y apellidos → Nombre fiscal. NIF y dirección fiscal se completan por separado.',
    )).toBeTruthy();

    fireEvent.press(checkbox);
    expect(onToggleSameBillingData).toHaveBeenCalledTimes(1);
  });

  it('locks only the synchronized fiscal name', () => {
    renderPanel({ sameBillingData: true });

    const checkbox = screen.getByRole('checkbox', {
      name: 'Usar los mismos datos para facturación',
    });
    expect(checkbox.props.accessibilityState.checked).toBe(true);
    expect(screen.getByPlaceholderText('Lucía Martín García').props.editable).toBe(false);
    expect(screen.getByPlaceholderText('00000000T').props.editable).toBe(true);
    expect(screen.getByPlaceholderText('Calle Norte 1, 2A').props.editable).toBe(true);
    expect(screen.getByText(
      'Sincronizado con el nombre y los apellidos administrativos.',
    )).toBeTruthy();
  });

  it('disables the control and all fields while saving', () => {
    const onToggleSameBillingData = jest.fn();
    renderPanel({ saving: true, onToggleSameBillingData });

    const checkbox = screen.getByRole('checkbox', {
      name: 'Usar los mismos datos para facturación',
    });
    expect(checkbox.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByPlaceholderText('Lucía').props.editable).toBe(false);
    expect(screen.getByPlaceholderText('00000000T').props.editable).toBe(false);

    fireEvent.press(checkbox);
    expect(onToggleSameBillingData).not.toHaveBeenCalled();
  });
});
