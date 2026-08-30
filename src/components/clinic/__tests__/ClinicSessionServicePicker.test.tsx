import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ClinicSessionServiceOption } from '../../../services/clinicService';
import { ClinicSessionServicePicker } from '../ClinicSessionServicePicker';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

const services: ClinicSessionServiceOption[] = [
  {
    id: 'service-1',
    name: 'Primera consulta',
    description: null,
    durationMinutes: 60,
    price: 70,
    currency: 'EUR',
    modalities: ['IN_PERSON'],
    isDefault: true,
    version: 1,
  },
  {
    id: 'service-2',
    name: 'Seguimiento',
    description: null,
    durationMinutes: 45,
    price: 55,
    currency: 'EUR',
    modalities: ['PHONE_CALL'],
    isDefault: false,
    version: 1,
  },
];

describe('ClinicSessionServicePicker', () => {
  const originalPlatform = Platform.OS;

  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  it('exposes a named radio group and moves selection with arrow keys', () => {
    const onChange = jest.fn();
    render(
      <ClinicSessionServicePicker
        services={services}
        value="service-1"
        onChange={onChange}
      />,
    );

    const group = screen.getByLabelText('Servicios disponibles');
    expect(group.props.accessibilityRole).toBe('radiogroup');
    const first = screen.getByRole('radio', { name: /Primera consulta/ });
    const second = screen.getByRole('radio', { name: /Seguimiento/ });
    expect(first.props.tabIndex).toBe(0);
    expect(second.props.tabIndex).toBe(-1);

    fireEvent(first, 'keyDown', { key: 'ArrowRight', preventDefault: jest.fn() });
    expect(onChange).toHaveBeenCalledWith(services[1]);
  });

  it('marks every option disabled without changing the selection', () => {
    const onChange = jest.fn();
    render(
      <ClinicSessionServicePicker
        services={services}
        value="service-1"
        disabled
        onChange={onChange}
      />,
    );

    const first = screen.getByRole('radio', { name: /Primera consulta/ });
    expect(first.props.accessibilityState).toEqual({ checked: true, disabled: true });
    expect(first.props.tabIndex).toBe(-1);
    fireEvent.press(first);
    expect(onChange).not.toHaveBeenCalled();
  });
});
