import React from 'react';
import { useDiscoveryRevalidation } from '../../../../hooks/useDiscoveryRevalidation';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import * as sessionsService from '../../../../services/sessionsService';
import { SelectableAvailabilityPreview } from '../SelectableAvailabilityPreview';

jest.mock('../../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));

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

  it('loads the new service duration and ignores a late response from the previous option', async () => {
    const oldSlot = { startTime: '09:00', endTime: '10:00', available: true };
    const newSlot = { startTime: '12:05', endTime: '12:10', available: true };
    let resolveOld: (slots: typeof oldSlot[]) => void = () => {};
    mockedSessionsService.getAvailableSlots.mockImplementation((_id, _date, optionId) => optionId === 'old'
      ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve([newSlot]));
    const onSlotChange = jest.fn();
    const base = { specialistId: 'specialist-1', nextAvailable: '2099-07-29', onSlotChange };
    const view = render(<SelectableAvailabilityPreview {...base} optionId="old" />);
    view.rerender(<SelectableAvailabilityPreview {...base} optionId="new" />);
    await waitFor(() => expect(screen.getByText('12:05')).toBeTruthy());
    await act(async () => resolveOld([oldSlot]));
    expect(screen.queryByText('09:00')).toBeNull();
    fireEvent.press(screen.getByText('12:05'));
    expect(onSlotChange).toHaveBeenLastCalledWith({ date: '2099-07-29', slot: newSlot });
    expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledWith('specialist-1', '2099-07-29', 'new');
  });

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
        undefined,
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
        undefined,
      );
      expect(screen.getByText('16:00')).toBeTruthy();
    });
    expect(screen.queryByText('09:00')).toBeNull();
    expect(onSlotChange).toHaveBeenLastCalledWith(null);
  });

  it('revalidates the visible date without clearing a valid selection, then removes an unavailable slot', async () => {
    const slot = { startTime: '11:05', endTime: '12:05', available: true };
    const onSlotChange = jest.fn();
    render(<SelectableAvailabilityPreview
      specialistId="specialist-1"
      nextAvailable="2099-07-29"
      selectedSlot={{ date: '2099-07-29', slot }}
      onSlotChange={onSlotChange}
    />);
    await screen.findByText('11:05');
    const reload = () => jest.mocked(useDiscoveryRevalidation).mock.calls.at(-1)![0]();
    await act(async () => { reload(); });
    await waitFor(() => expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledTimes(2));
    expect(onSlotChange).not.toHaveBeenCalled();
    mockedSessionsService.getAvailableSlots.mockResolvedValueOnce([]);
    await act(async () => { reload(); });
    await waitFor(() => expect(onSlotChange).toHaveBeenCalledWith(null));
  });

  it('does not start another availability request while a slow read is pending', async () => {
    let resolve: (slots: sessionsService.TimeSlot[]) => void = () => undefined;
    mockedSessionsService.getAvailableSlots.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    render(<SelectableAvailabilityPreview specialistId="specialist-1" nextAvailable="2099-07-29" onSlotChange={jest.fn()} />);
    await waitFor(() => expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledTimes(1));
    await act(async () => { jest.mocked(useDiscoveryRevalidation).mock.calls.at(-1)![0](); });
    expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledTimes(1);
    await act(async () => resolve([{ startTime: '11:05', endTime: '12:05', available: true }]));
    expect(screen.getByText('11:05')).toBeTruthy();
  });
});
