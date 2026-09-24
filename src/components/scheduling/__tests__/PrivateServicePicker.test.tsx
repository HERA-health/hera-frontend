import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PrivateServicePicker } from '../PrivateServicePicker';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { PrivateServiceOption } from '../../../services/privateCatalogService';
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
const option = (id: string, name: string, modality: PrivateServiceOption['modality'] = 'VIDEO_CALL'): PrivateServiceOption => ({
  id, serviceId: id, serviceKey: id, serviceName: name, name, modality, durationMinutes: 50, priceCents: 6000,
  currency: 'EUR', isActive: true, isPublic: true, isPreferred: true, version: 1, legacyDuration: false, legacyTariffId: null,
});
beforeEach(() => { jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() }); });
test('same duration and price remain distinct services and emit exact option ids', () => {
  const onChange = jest.fn();
  render(<PrivateServicePicker options={[option('base','General'),option('mdr','Terapia MDR'),option('couple','Terapia de pareja','IN_PERSON')]} modality="VIDEO_CALL" value="base" onChange={onChange} />);
  expect(screen.queryByText('Terapia de pareja')).toBeNull();
  fireEvent.press(screen.getByText('Terapia MDR'));
  expect(onChange).toHaveBeenCalledWith('mdr');
  expect(screen.getAllByRole('radio')).toHaveLength(2);
});
