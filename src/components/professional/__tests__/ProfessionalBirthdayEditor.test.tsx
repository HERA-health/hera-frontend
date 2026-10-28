import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { birthdayPreviewAge, ProfessionalBirthdayEditor } from '../ProfessionalBirthdayEditor';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, isDark: false }) }));

test('birthday preview agrees with calendar birthdays including leap years', () => {
  expect(birthdayPreviewAge('2000-02-29', '2025-02-28')).toBe(24);
  expect(birthdayPreviewAge('2000-02-29', '2025-03-01')).toBe(25);
  expect(birthdayPreviewAge('2000-02-29', '2024-02-29')).toBe(24);
  expect(birthdayPreviewAge('2099-01-01', '2026-01-01')).toBeNull();
});

test('a date can be selected privately, published, hidden and deleted', () => {
  const change = jest.fn();
  const Editor = () => {
    const [value, setValue] = useState<{birthDate: string | null; showAge: boolean}>({birthDate: null, showAge: false});
    return <ProfessionalBirthdayEditor {...value} onChange={(birthDate, showAge) => { change(birthDate, showAge); setValue({birthDate, showAge}); }} />;
  };
  render(<Editor />);
  expect(screen.getByLabelText('Mostrar mi edad en el perfil').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByLabelText('Elegir fecha de nacimiento'));
  fireEvent.press(screen.getByText('1990'));
  fireEvent.press(screen.getByText('Octubre'));
  fireEvent.press(screen.getByText('28'));
  fireEvent.press(screen.getByText('Confirmar'));
  expect(change).toHaveBeenLastCalledWith('1990-10-28', false);
  expect(screen.getByText('28/10/1990')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Mostrar mi edad en el perfil'));
  expect(change).toHaveBeenLastCalledWith('1990-10-28', true);
  fireEvent.press(screen.getByLabelText('Mostrar mi edad en el perfil'));
  expect(change).toHaveBeenLastCalledWith('1990-10-28', false);
  fireEvent.press(screen.getByLabelText('Borrar fecha de nacimiento'));
  expect(change).toHaveBeenLastCalledWith(null, false);
});
