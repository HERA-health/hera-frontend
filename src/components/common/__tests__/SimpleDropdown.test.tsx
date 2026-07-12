import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { lightTheme } from '../../../constants/theme';
import { SimpleDropdown } from '../SimpleDropdown';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../AnimatedPressable', () => ({
  AnimatedPressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: 'button' | 'checkbox' | 'radio';
    accessibilityState?: { checked?: boolean; selected?: boolean };
  }) => {
    const { Pressable } = require('react-native');
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
      >
        {children}
      </Pressable>
    );
  },
}));

const mockedUseTheme = jest.mocked(useTheme);
const options = [
  { label: 'Psicólogo/a', value: 'PSYCHOLOGIST' },
  { label: 'Psiquiatra', value: 'PSYCHIATRIST' },
] as const;

describe('SimpleDropdown selection indicators', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  it('selects and clears a checkbox option', () => {
    const onSelect = jest.fn();
    const onClear = jest.fn();
    const { rerender } = render(
      <SimpleDropdown
        options={options}
        value={null}
        onSelect={onSelect}
        onClear={onClear}
        placeholder="Perfil"
        selectionIndicator="checkbox"
      />
    );

    fireEvent.press(screen.getByText('Perfil'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Psicólogo/a' }));
    expect(onSelect).toHaveBeenCalledWith('PSYCHOLOGIST');

    rerender(
      <SimpleDropdown
        options={options}
        value="PSYCHOLOGIST"
        onSelect={onSelect}
        onClear={onClear}
        placeholder="Perfil"
        selectionIndicator="checkbox"
      />
    );

    fireEvent.press(screen.getByText('Psicólogo/a'));
    const activeOption = screen.getByRole('checkbox', { name: 'Psicólogo/a' });
    expect(activeOption.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    fireEvent.press(activeOption);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('uses radio semantics for ordering options', () => {
    render(
      <SimpleDropdown
        options={[{ label: 'Más recientes', value: 'RECENT' }]}
        value="RECENT"
        onSelect={jest.fn()}
        placeholder="Ordenar"
        selectionIndicator="radio"
      />
    );

    fireEvent.press(screen.getByText('Más recientes'));
    expect(screen.getByRole('radio', { name: 'Más recientes' }).props.accessibilityState)
      .toEqual(expect.objectContaining({ checked: true }));
  });
});
