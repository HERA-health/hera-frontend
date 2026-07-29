import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import * as sessionsService from '../../../../services/sessionsService';
import { SelectableAvailabilityPreview } from '../SelectableAvailabilityPreview';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../services/sessionsService', () => ({
  getAvailableSlots: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedSessionsService = jest.mocked(sessionsService);

describe('SelectableAvailabilityPreview', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '11:05', endTime: '12:05', available: true },
    ]);
  });

  afterEach(() => jest.clearAllMocks());

  it('selects a slot without navigating and deselects it on a second press', async () => {
    const onSlotChange = jest.fn();
    const slot = { startTime: '11:05', endTime: '12:05', available: true };
    const view = render(
      <SelectableAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-07-29T10:00:00.000Z"
        selectedSlot={null}
        onSlotChange={onSlotChange}
      />,
    );

    await waitFor(() => expect(screen.getByText('11:05')).toBeTruthy());
    fireEvent.press(screen.getByText('11:05'));
    expect(onSlotChange).toHaveBeenLastCalledWith({ date: '2099-07-29', slot });

    view.rerender(
      <SelectableAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-07-29T10:00:00.000Z"
        selectedSlot={{ date: '2099-07-29', slot }}
        onSlotChange={onSlotChange}
      />,
    );
    fireEvent.press(screen.getByText('11:05'));
    expect(onSlotChange).toHaveBeenLastCalledWith(null);
  });

  it('keeps loading and empty availability states honest', async () => {
    mockedSessionsService.getAvailableSlots.mockResolvedValue([]);
    render(
      <SelectableAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-07-29T10:00:00.000Z"
        onSlotChange={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No hay horas libres este día.')).toBeTruthy();
    });
  });
  it('offers four weeks of horizontally navigable dates', async () => {
    render(
      <SelectableAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-07-29T10:00:00.000Z"
        onSlotChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Próximos 28 días')).toBeTruthy();
    expect(screen.getByTestId('availability-date-2099-07-29')).toBeTruthy();
    expect(screen.getByTestId('availability-date-2099-08-25')).toBeTruthy();
    expect(screen.getByLabelText('Ver días anteriores')).toBeTruthy();
    expect(screen.getByLabelText('Ver días siguientes')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('11:05')).toBeTruthy());
  });

  it('clears a selected slot when the user changes to another date', async () => {
    const onSlotChange = jest.fn();
    const slot = { startTime: '11:05', endTime: '12:05', available: true };
    render(
      <SelectableAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-07-29T10:00:00.000Z"
        selectedSlot={{ date: '2099-07-29', slot }}
        onSlotChange={onSlotChange}
      />,
    );

    await waitFor(() => expect(screen.getByText('11:05')).toBeTruthy());
    fireEvent.press(screen.getByTestId('availability-date-2099-07-30'));

    expect(onSlotChange).toHaveBeenLastCalledWith(null);
    await waitFor(() => {
      expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledWith(
        'specialist-1',
        '2099-07-30',
      );
    });
  });

  it('invalidates cached slots and selection when the specialist changes', async () => {
    const onSlotChange = jest.fn();
    mockedSessionsService.getAvailableSlots
      .mockResolvedValueOnce([{ startTime: '09:00', endTime: '10:00', available: true }])
      .mockResolvedValueOnce([{ startTime: '16:00', endTime: '17:00', available: true }]);
    const view = render(
      <SelectableAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-07-29T10:00:00.000Z"
        selectedSlot={null}
        onSlotChange={onSlotChange}
      />,
    );

    await waitFor(() => expect(screen.getByText('09:00')).toBeTruthy());
    view.rerender(
      <SelectableAvailabilityPreview
        specialistId="specialist-2"
        nextAvailable="2099-07-29T10:00:00.000Z"
        selectedSlot={null}
        onSlotChange={onSlotChange}
      />,
    );

    await waitFor(() => {
      expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledWith(
        'specialist-2',
        '2099-07-29',
      );
      expect(screen.getByText('16:00')).toBeTruthy();
    });
    expect(screen.queryByText('09:00')).toBeNull();
    expect(onSlotChange).toHaveBeenLastCalledWith(null);
  });
});
