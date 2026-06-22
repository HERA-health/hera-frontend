import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PasswordRequirementsChecklist } from '../PasswordRequirementsChecklist';
import { useTheme } from '../../../contexts/ThemeContext';
import { lightTheme } from '../../../constants/theme';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const requirementLabels = [
  'Mínimo 8 caracteres',
  '1 mayúscula',
  '1 minúscula',
  '1 número',
  '1 símbolo',
];

describe('PasswordRequirementsChecklist', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  it('shows every requirement in a neutral state before typing', () => {
    render(<PasswordRequirementsChecklist password="" />);

    requirementLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByLabelText(`${label}: pendiente`)).toBeTruthy();
    });
    expect(screen.getAllByText('ellipse-outline')).toHaveLength(requirementLabels.length);
  });

  it('marks met and missing requirements while typing', () => {
    render(<PasswordRequirementsChecklist password="password" />);

    expect(screen.getByLabelText('Mínimo 8 caracteres: cumplido')).toBeTruthy();
    expect(screen.getByLabelText('1 minúscula: cumplido')).toBeTruthy();
    expect(screen.getByLabelText('1 mayúscula: pendiente')).toBeTruthy();
    expect(screen.getByLabelText('1 número: pendiente')).toBeTruthy();
    expect(screen.getByLabelText('1 símbolo: pendiente')).toBeTruthy();
    expect(screen.getAllByText('checkmark-circle')).toHaveLength(2);
    expect(screen.getAllByText('close-circle')).toHaveLength(3);
  });

  it('marks every requirement as met for a valid password', () => {
    render(<PasswordRequirementsChecklist password="Password1!" />);

    requirementLabels.forEach((label) => {
      expect(screen.getByLabelText(`${label}: cumplido`)).toBeTruthy();
    });
    expect(screen.getAllByText('checkmark-circle')).toHaveLength(requirementLabels.length);
  });
});
