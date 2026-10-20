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

  it('discards uncommitted modal selections when closed and restores the applied selection on reopening', () => {
    const onApply = jest.fn();
    render(<MultiSelectDropdown options={options} values={['anxiety']} onApply={onApply} placeholder="Tema" presentation="modal" />);
    fireEvent.press(screen.getByLabelText('Tema: Ansiedad'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Depresión' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cerrar tema' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole('checkbox', { name: 'Depresión' })).toBeNull();
    fireEvent.press(screen.getByLabelText('Tema: Ansiedad'));
    expect(screen.getByRole('checkbox', { name: 'Ansiedad' }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByRole('checkbox', { name: 'Depresión' }).props.accessibilityState.checked).toBe(false);
  });
});
