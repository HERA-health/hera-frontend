import { act, renderHook, waitFor } from '@testing-library/react-native';
import type {
  ClinicSessionServiceOptionsResult,
  GetClinicSessionServiceOptionsInput,
} from '../../../services/clinicService';
import { useClinicSessionServiceOptions } from '../useClinicSessionServiceOptions';

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const serviceResult = (
  id: string,
  version = 1,
): ClinicSessionServiceOptionsResult => ({
  catalogActivated: true,
  services: [{
    id,
    name: `Servicio ${id}`,
    description: null,
    durationMinutes: 60,
    price: 70,
    currency: 'EUR',
    modalities: ['IN_PERSON'],
    isDefault: true,
    version,
  }],
});

describe('useClinicSessionServiceOptions', () => {
  it('discards an obsolete response when the patient context changes', async () => {
    const first = createDeferred<ClinicSessionServiceOptionsResult>();
    const second = createDeferred<ClinicSessionServiceOptionsResult>();
    const onLoad = jest.fn<
      Promise<ClinicSessionServiceOptionsResult>,
      [GetClinicSessionServiceOptionsInput]
    >()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { result, rerender } = renderHook<
      ReturnType<typeof useClinicSessionServiceOptions>,
      { contextKey: string }
    >(
      ({ contextKey }) => useClinicSessionServiceOptions({
        visible: true,
        contextKey,
        clinicSpecialistId: 'specialist-1',
        onLoad,
      }),
      { initialProps: { contextKey: 'patient-1' } },
    );

    rerender({ contextKey: 'patient-2' });
    await act(async () => {
      second.resolve(serviceResult('service-2'));
      await second.promise;
    });
    await act(async () => {
      first.resolve(serviceResult('service-1'));
      await first.promise;
    });

    expect(result.current.selectedServiceId).toBe('service-2');
    expect(result.current.services.map((service) => service.id)).toEqual(['service-2']);
  });

  it('retains a changed service but requires manual selection after it becomes unavailable', async () => {
    const onLoad = jest.fn<
      Promise<ClinicSessionServiceOptionsResult>,
      [GetClinicSessionServiceOptionsInput]
    >()
      .mockResolvedValueOnce(serviceResult('service-1', 1))
      .mockResolvedValueOnce(serviceResult('service-1', 2))
      .mockResolvedValueOnce(serviceResult('service-2', 1));

    const { result } = renderHook(() => useClinicSessionServiceOptions({
      visible: true,
      contextKey: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      onLoad,
    }));

    await waitFor(() => expect(result.current.selectedService?.version).toBe(1));
    act(() => result.current.refreshAfterConflict(false));
    await waitFor(() => expect(result.current.selectedService?.version).toBe(2));

    act(() => result.current.refreshAfterConflict(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.services[0]?.id).toBe('service-2');
    expect(result.current.selectedService).toBeNull();

    act(() => result.current.selectService('service-2'));
    expect(result.current.selectedService?.id).toBe('service-2');
  });

  it('blocks on load failure and retries explicitly', async () => {
    const onLoad = jest.fn<
      Promise<ClinicSessionServiceOptionsResult>,
      [GetClinicSessionServiceOptionsInput]
    >()
      .mockRejectedValueOnce(new Error('No se pudo cargar el catálogo.'))
      .mockResolvedValueOnce(serviceResult('service-1'));

    const { result } = renderHook(() => useClinicSessionServiceOptions({
      visible: true,
      contextKey: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      onLoad,
    }));

    await waitFor(() => expect(result.current.error).toBe('No se pudo cargar el catálogo.'));
    expect(result.current.catalogActivated).toBeNull();

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.selectedServiceId).toBe('service-1'));
    expect(result.current.error).toBeNull();
    expect(onLoad).toHaveBeenCalledTimes(2);
  });
});
