import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { lightTheme } from '../../../constants/theme';
import { MultiSelectDropdown } from '../MultiSelectDropdown';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../AnimatedPressable', () => ({
  AnimatedPressable: ({
    children,
    onPress,
    accessibilityLabel,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => {
    const { Pressable } = require('react-native');
    return <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel}>{children}</Pressable>;
  },
}));

const mockedUseTheme = jest.mocked(useTheme);
const options = [
  { label: 'Ansiedad', value: 'anxiety' },
  { label: 'Depresión', value: 'depression' },
] as const;

describe('MultiSelectDropdown', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  it('keeps checkbox changes local until the user applies them', () => {
    const onApply = jest.fn();
    render(
      <MultiSelectDropdown
        options={options}
        values={[]}
        onApply={onApply}
        placeholder="Tema"
      />
    );

    fireEvent.press(screen.getByLabelText('Tema: Tema'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Ansiedad' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Depresión' }));

    expect(onApply).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Aplicar'));
    expect(onApply).toHaveBeenCalledWith(['anxiety', 'depression']);
  });

  it('can clear an existing multiselection before applying it', () => {
    const onApply = jest.fn();
    render(
      <MultiSelectDropdown
        options={options}
        values={['anxiety']}
        onApply={onApply}
        placeholder="Tema"
      />
    );

    fireEvent.press(screen.getByLabelText('Tema: Ansiedad'));
    fireEvent.press(screen.getByText('Limpiar'));
    fireEvent.press(screen.getByText('Aplicar'));

    expect(onApply).toHaveBeenCalledWith([]);
  });
});
