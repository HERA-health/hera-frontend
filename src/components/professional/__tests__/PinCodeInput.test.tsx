import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme as mockTheme } from '../../../constants/theme';
import { PinCodeInput } from '../PinCodeInput';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: mockTheme }) }));
afterEach(() => jest.restoreAllMocks());

test('web PIN starts empty and does not expose a password autofill field', () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const change = jest.fn();
  render(<PinCodeInput label="PIN actual" value="" onChange={change} />);
  const input = screen.getByLabelText('PIN actual');
  expect(input.props.value).toBe('');
  expect(input.props.secureTextEntry).toBe(false);
  expect(input.props.autoComplete).toBe('off');
  fireEvent(input, 'focus');
  expect(change).not.toHaveBeenCalled();
  fireEvent.changeText(input, 'saved-password1');
  expect(change).not.toHaveBeenCalled();
  fireEvent.changeText(input, '1');
  expect(change).toHaveBeenLastCalledWith('1');
});

test('accepts a pasted numeric PIN and keeps native input masked', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const change = jest.fn();
  render(<PinCodeInput label="Nuevo PIN" value="" onChange={change} />);
  const input = screen.getByLabelText('Nuevo PIN');
  expect(input.props.secureTextEntry).toBe(true);
  fireEvent.changeText(input, '123 456');
  expect(change).toHaveBeenCalledWith('123456');
});
