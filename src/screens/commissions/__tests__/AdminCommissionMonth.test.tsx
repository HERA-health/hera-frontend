import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AdminCommissionMonth } from '../AdminCommissionMonth';
import * as service from '../../../services/heraCommissionService';

let mockFocused=true;
jest.mock('@react-navigation/native',()=>({useFocusEffect:(effect:React.EffectCallback)=>require('react').useEffect(()=>mockFocused?effect():undefined,[effect,mockFocused])}));
jest.mock('../../../services/heraCommissionService',()=>({cachedOperators:jest.fn(),operators:jest.fn(),adminMonth:jest.fn(),exportMonth:jest.fn()}));
const operators: Awaited<ReturnType<typeof service.operators>>=[{operatorKey:'operator',mode:'LIVE',operatorName:'HERA'}];
const result:Awaited<ReturnType<typeof service.adminMonth>>={items:[],hasMore:false,month:'2026-10',totals:{specialistCount:0,countedSessions:0,netCents:0}};
beforeEach(()=>{
 jest.resetAllMocks();mockFocused=true;
 jest.mocked(service.cachedOperators).mockReturnValue(operators);
 jest.mocked(service.operators).mockResolvedValue(operators);
 jest.mocked(service.adminMonth).mockResolvedValue(result);
});
afterEach(()=>jest.useRealTimers());

it('starts the monthly read with cached operator metadata and refreshes when focused again',async()=>{
 let resolveOperators!:(value:typeof operators)=>void;
 jest.mocked(service.operators).mockImplementationOnce(()=>new Promise(resolve=>{resolveOperators=resolve;}));
 const props={onOpen:jest.fn(),refresh:0};
 const view=render(<AdminCommissionMonth {...props}/>);
 await view.findByText('No hay profesionales para esta selección.');
 expect(service.adminMonth).toHaveBeenCalledTimes(1);
 mockFocused=false;view.rerender(<AdminCommissionMonth {...props}/>);
 mockFocused=true;view.rerender(<AdminCommissionMonth {...props}/>);
 await view.findByText('No hay profesionales para esta selección.');
 expect(service.adminMonth).toHaveBeenCalledTimes(2);
 await act(async()=>resolveOperators([]));
 expect(view.queryByText(/No hay acuerdos de comisiones/)).toBeNull();
});

it('debounces searches and never renders an obsolete response',async()=>{
 jest.useFakeTimers();
 const view=render(<AdminCommissionMonth onOpen={jest.fn()} refresh={0}/>);
 await act(async()=>{});
 let oldResponse!:(value:typeof result)=>void;
 jest.mocked(service.adminMonth).mockImplementationOnce(()=>new Promise(resolve=>{oldResponse=resolve;}));
 fireEvent.changeText(view.getByLabelText('Buscar profesional'),'Ana');
 await act(async()=>{jest.advanceTimersByTime(299);});
 expect(service.adminMonth).toHaveBeenCalledTimes(1);
 await act(async()=>{jest.advanceTimersByTime(1);});
 expect(service.adminMonth).toHaveBeenLastCalledWith(expect.objectContaining({search:'Ana',page:0}));
 fireEvent.changeText(view.getByLabelText('Buscar profesional'),'Beatriz');
 await act(async()=>{jest.advanceTimersByTime(300);});
 await act(async()=>oldResponse({...result,totals:{...result.totals,specialistCount:123}}));
 expect(service.adminMonth).toHaveBeenCalledTimes(3);
 expect(view.queryByText('123')).toBeNull();
});

it('shows read failures and allows the existing refresh action to recover',async()=>{
 jest.mocked(service.adminMonth).mockRejectedValueOnce(new Error('No se pudo actualizar'));
 const onOpen=jest.fn();const view=render(<AdminCommissionMonth onOpen={onOpen} refresh={0}/>);
 await view.findByText('No se pudo actualizar');
 view.rerender(<AdminCommissionMonth onOpen={onOpen} refresh={1}/>);
 await view.findByText('No hay profesionales para esta selección.');
 expect(view.queryByText('No se pudo actualizar')).toBeNull();
});
