import React from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { PatientActivityCount } from '../PatientActivityCount';
import { getPatientActivity, type PatientActivitySummary } from '../../../services/patientDirectoryService';
jest.mock('../../../services/patientDirectoryService',()=>({getPatientActivity:jest.fn()}));
jest.mock('../../../services/dashboardService',()=>({subscribeProfessionalHomeChanges:()=>()=>{}}));
let mockNavigationFocused = true;
jest.mock('@react-navigation/native',()=>({useFocusEffect:(effect:()=>void|(()=>void))=>{const ReactModule=jest.requireActual<typeof React>('react');ReactModule.useEffect(()=>mockNavigationFocused ? effect() : undefined,[effect,mockNavigationFocused]);}}));
jest.mock('../../../contexts/ThemeContext',()=>({useTheme:()=>({theme:require('../../../constants/theme').lightTheme})}));
const value:PatientActivitySummary={activePatients:9,windowDays:60,cutoff:'2026-09-01T00:00:00Z',computedAt:'2026-11-01T00:00:00Z',stale:false,unavailable:false};
beforeEach(()=>{ jest.mocked(getPatientActivity).mockReset(); mockNavigationFocused = true; });
it('retains and labels the previous count on refresh failure',async()=>{
 jest.mocked(getPatientActivity).mockResolvedValueOnce(value).mockRejectedValueOnce(Error('offline'));
 render(<PatientActivityCount/>);expect(await screen.findByText('Pacientes activos · últimos 60 días: 9')).toBeTruthy();
 fireEvent.press(screen.getByText('Actualizar actividad'));expect(await screen.findByText('El recuento no está disponible.')).toBeTruthy();
 expect(screen.getByText('Pacientes activos · últimos 60 días: 9')).toBeTruthy();expect(screen.getByText(/Dato anterior:/)).toBeTruthy();
 expect(getPatientActivity).toHaveBeenLastCalledWith(true);
});
it('shows administrative restriction without fetching the professional endpoint or showing zero',()=>{
 render(<PatientActivityCount value={{...value,activePatients:null,restricted:true}}/>);
 expect(screen.getByText('Pacientes activos · últimos 60 días: —')).toBeTruthy();expect(getPatientActivity).not.toHaveBeenCalled();
 expect(screen.getByText(/Recuento restringido/)).toBeTruthy();
});

it('retains the previous count when the server explicitly reports unavailability',async()=>{
 jest.mocked(getPatientActivity).mockResolvedValueOnce(value).mockResolvedValueOnce({...value,activePatients:null,computedAt:null,unavailable:true});
 render(<PatientActivityCount/>);await screen.findByText('Pacientes activos · últimos 60 días: 9');
 fireEvent.press(screen.getByText('Actualizar actividad'));await screen.findByText('El recuento no está disponible.');
 expect(screen.getByText('Pacientes activos · últimos 60 días: 9')).toBeTruthy();expect(screen.getByText(/Dato anterior:/)).toBeTruthy();
});

describe('foreground refresh', () => {
 const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');
 const originalAppState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
 const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
 const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
 const visibilityListeners = new Set<() => void>();
 const focusListeners = new Set<() => void>();
 const documentFixture = {
  visibilityState: 'visible',
  addEventListener: (_name: string, listener: () => void) => visibilityListeners.add(listener),
  removeEventListener: (_name: string, listener: () => void) => visibilityListeners.delete(listener),
 };
 const windowFixture = {
  addEventListener: (_name: string, listener: () => void) => focusListeners.add(listener),
  removeEventListener: (_name: string, listener: () => void) => focusListeners.delete(listener),
 };
 let appListener: (state: AppStateStatus) => void;
 const remove = jest.fn();
 beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  visibilityListeners.clear(); focusListeners.clear(); remove.mockReset();
  documentFixture.visibilityState = 'visible';
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
   appListener = listener; return { remove };
  });
  jest.mocked(getPatientActivity).mockResolvedValue(value);
 });
 afterEach(() => {
  cleanup(); jest.restoreAllMocks(); jest.useRealTimers();
  for (const [target, key, descriptor] of [
   [Platform, 'OS', originalPlatform], [AppState, 'currentState', originalAppState],
   [globalThis, 'document', originalDocument], [globalThis, 'window', originalWindow],
  ] as const) {
   if (descriptor) Object.defineProperty(target, key, descriptor);
   else Reflect.deleteProperty(target, key);
  }
 });
 const changeAppState = async (state: AppStateStatus) => {
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: state });
  await act(async () => appListener(state));
 };
 const configureWeb = () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentFixture });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: windowFixture });
 };

 it('refreshes on native return without navigation and never polls in the background', async () => {
  const view = render(<PatientActivityCount/>);
  await act(async () => undefined);
  expect(getPatientActivity).toHaveBeenCalledTimes(1);
  await changeAppState('background');
  act(() => jest.advanceTimersByTime(300_000));
  expect(getPatientActivity).toHaveBeenCalledTimes(1);
  await changeAppState('active');
  expect(getPatientActivity).toHaveBeenCalledTimes(2);
  expect(getPatientActivity).toHaveBeenLastCalledWith(true);
  view.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  await changeAppState('active');
  expect(getPatientActivity).toHaveBeenCalledTimes(2);
 });

 it('refreshes visible web tabs once for paired visibility/focus events and supports window focus', async () => {
  configureWeb();
  const view = render(<PatientActivityCount/>);
  await act(async () => undefined);
  expect(AppState.addEventListener).not.toHaveBeenCalled();
  documentFixture.visibilityState = 'hidden';
  await act(async () => { visibilityListeners.forEach(fn => fn()); focusListeners.forEach(fn => fn()); });
  expect(getPatientActivity).toHaveBeenCalledTimes(1);
  documentFixture.visibilityState = 'visible';
  await act(async () => visibilityListeners.forEach(fn => fn()));
  await act(async () => focusListeners.forEach(fn => fn()));
  expect(getPatientActivity).toHaveBeenCalledTimes(2);
  act(() => jest.advanceTimersByTime(2000));
  expect(getPatientActivity).toHaveBeenCalledTimes(2);
  await act(async () => focusListeners.forEach(fn => fn()));
  expect(getPatientActivity).toHaveBeenCalledTimes(3);
  expect(getPatientActivity).toHaveBeenLastCalledWith(true);
  view.unmount();
  expect(visibilityListeners.size).toBe(0); expect(focusListeners.size).toBe(0);
 });

 it('does not fetch from hidden tabs or navigation screens and refreshes on their return', async () => {
  configureWeb(); documentFixture.visibilityState = 'hidden';
  const view = render(<PatientActivityCount/>);
  expect(getPatientActivity).not.toHaveBeenCalled();
  documentFixture.visibilityState = 'visible';
  await act(async () => visibilityListeners.forEach(fn => fn()));
  expect(getPatientActivity).toHaveBeenCalledTimes(1);
  mockNavigationFocused = false; view.rerender(<PatientActivityCount/>);
  act(() => jest.advanceTimersByTime(2000));
  await act(async () => { visibilityListeners.forEach(fn => fn()); focusListeners.forEach(fn => fn()); });
  expect(getPatientActivity).toHaveBeenCalledTimes(1);
  expect(visibilityListeners.size).toBe(0); expect(focusListeners.size).toBe(0);
  mockNavigationFocused = true; view.rerender(<PatientActivityCount/>);
  await act(async () => undefined);
  expect(getPatientActivity).toHaveBeenCalledTimes(2);
 });

 it('does not overlap a slow foreground read and labels a failed refresh without losing the count', async () => {
  render(<PatientActivityCount/>); await act(async () => undefined);
  let rejectRead: (error: Error) => void = () => { throw new Error('read not started'); };
  jest.mocked(getPatientActivity).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRead = reject; }));
  await changeAppState('background'); await changeAppState('active');
  act(() => jest.advanceTimersByTime(2000));
  await changeAppState('background'); await changeAppState('active');
  expect(getPatientActivity).toHaveBeenCalledTimes(2);
  await act(async () => rejectRead(new Error('offline')));
  expect(screen.getByText('Pacientes activos · últimos 60 días: 9')).toBeTruthy();
  expect(screen.getByText(/Dato anterior:/)).toBeTruthy();
  expect(screen.getByText('El recuento no está disponible.')).toBeTruthy();
 });

 it('does not subscribe or use the professional endpoint for an administrative value', () => {
  configureWeb();
  render(<PatientActivityCount value={{...value, activePatients:null, restricted:true}}/>);
  expect(getPatientActivity).not.toHaveBeenCalled();
  expect(AppState.addEventListener).not.toHaveBeenCalled();
  expect(visibilityListeners.size).toBe(0); expect(focusListeners.size).toBe(0);
 });
});
