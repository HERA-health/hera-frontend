import { act, renderHook } from '@testing-library/react-native';
import type { PanelMode } from '../clinicPatientDomain';
import { useClinicPatientAdaptiveNavigation } from '../useClinicPatientAdaptiveNavigation';

interface HookProps {
  isCompact: boolean;
  panelMode: PanelMode;
  selectedPatientId: string | null;
  busy: boolean;
  onCancelForm: () => void;
  onRestoreOriginFocus: () => void;
}

const renderAdaptiveNavigation = (initialProps: HookProps) =>
  renderHook(
    (props: HookProps) => useClinicPatientAdaptiveNavigation(props),
    { initialProps },
  );

describe('useClinicPatientAdaptiveNavigation', () => {
  beforeEach(() => {
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts on the list in compact mode and restores its focus after closing a detail', () => {
    const onRestoreOriginFocus = jest.fn();
    const { result } = renderAdaptiveNavigation({
      isCompact: true,
      panelMode: 'detail',
      selectedPatientId: 'patient-1',
      busy: false,
      onCancelForm: jest.fn(),
      onRestoreOriginFocus,
    });

    expect(result.current.panelOpen).toBe(false);

    act(() => result.current.openPanel());
    expect(result.current.panelOpen).toBe(true);

    act(() => result.current.handleBack());
    expect(result.current.panelOpen).toBe(false);
    expect(onRestoreOriginFocus).toHaveBeenCalledTimes(1);
  });

  it('returns from edit to detail before returning to the list', () => {
    const onCancelForm = jest.fn();
    const { result, rerender } = renderAdaptiveNavigation({
      isCompact: true,
      panelMode: 'edit',
      selectedPatientId: 'patient-1',
      busy: false,
      onCancelForm,
      onRestoreOriginFocus: jest.fn(),
    });

    act(() => result.current.openPanel());
    act(() => result.current.handleBack());

    expect(onCancelForm).toHaveBeenCalledTimes(1);
    expect(result.current.panelOpen).toBe(true);

    rerender({
      isCompact: true,
      panelMode: 'detail',
      selectedPatientId: 'patient-1',
      busy: false,
      onCancelForm,
      onRestoreOriginFocus: jest.fn(),
    });
    act(() => result.current.handleBack());
    expect(result.current.panelOpen).toBe(false);
  });

  it('cancels creation and returns directly to the list', () => {
    const onCancelForm = jest.fn();
    const { result } = renderAdaptiveNavigation({
      isCompact: true,
      panelMode: 'create',
      selectedPatientId: null,
      busy: false,
      onCancelForm,
      onRestoreOriginFocus: jest.fn(),
    });

    act(() => result.current.openPanel());
    act(() => result.current.handleBack());

    expect(onCancelForm).toHaveBeenCalledTimes(1);
    expect(result.current.panelOpen).toBe(false);
  });

  it('does not carry a cancelled desktop creation into a later compact viewport', () => {
    const onCancelForm = jest.fn();
    const baseProps: HookProps = {
      isCompact: false,
      panelMode: 'create',
      selectedPatientId: null,
      busy: false,
      onCancelForm,
      onRestoreOriginFocus: jest.fn(),
    };
    const { result, rerender } = renderAdaptiveNavigation(baseProps);

    act(() => result.current.openPanel());
    act(() => result.current.handleCancelForm());
    expect(result.current.panelOpen).toBe(false);

    rerender({ ...baseProps, isCompact: true, panelMode: 'detail' });
    expect(result.current.panelOpen).toBe(false);
  });

  it('keeps the active desktop context visible when the viewport becomes compact', () => {
    const baseProps: HookProps = {
      isCompact: false,
      panelMode: 'detail',
      selectedPatientId: 'patient-1',
      busy: false,
      onCancelForm: jest.fn(),
      onRestoreOriginFocus: jest.fn(),
    };
    const { result, rerender } = renderAdaptiveNavigation(baseProps);

    expect(result.current.panelOpen).toBe(false);
    rerender({ ...baseProps, isCompact: true });
    expect(result.current.panelOpen).toBe(true);
  });

  it('closes compact state and restores focus when the viewport returns to desktop', () => {
    const onRestoreOriginFocus = jest.fn();
    const baseProps: HookProps = {
      isCompact: true,
      panelMode: 'detail',
      selectedPatientId: 'patient-1',
      busy: false,
      onCancelForm: jest.fn(),
      onRestoreOriginFocus,
    };
    const { result, rerender } = renderAdaptiveNavigation(baseProps);

    act(() => result.current.openPanel());
    expect(result.current.panelOpen).toBe(true);

    rerender({ ...baseProps, isCompact: false });

    expect(result.current.panelOpen).toBe(false);
    expect(onRestoreOriginFocus).toHaveBeenCalledTimes(1);
  });

  it('does not close the panel while a patient operation is being saved', () => {
    const onCancelForm = jest.fn();
    const { result } = renderAdaptiveNavigation({
      isCompact: true,
      panelMode: 'edit',
      selectedPatientId: 'patient-1',
      busy: true,
      onCancelForm,
      onRestoreOriginFocus: jest.fn(),
    });

    act(() => result.current.openPanel());
    act(() => result.current.handleBack());

    expect(result.current.panelOpen).toBe(true);
    expect(onCancelForm).not.toHaveBeenCalled();
  });
});
