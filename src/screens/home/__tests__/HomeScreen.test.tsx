import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Animated, Platform } from 'react-native';
import HomeScreen from '../HomeScreen';
import { getMatchedSpecialists, getSpecialistPersonalization, type SpecialistData } from '../../../services/specialistsService';
import { getMySessions } from '../../../services/sessionsService';
import { invalidateSpecialistDiscovery } from '../../../utils/specialistDiscoveryRevision';

const mockUser = {id:'client',name:'Paciente de prueba',type:'client'};
const mockListeners = new Set<() => void>();
const mockNavigation = {navigate:jest.fn(),dispatch:jest.fn(),isFocused:()=>true,addListener:(_event:string,callback:()=>void)=>{mockListeners.add(callback);return ()=>mockListeners.delete(callback);}};
jest.mock('@react-navigation/native',()=>({ CommonActions: jest.requireActual('@react-navigation/native').CommonActions, useNavigation:()=>mockNavigation}));
jest.mock('../../../contexts/AuthContext',()=>({useAuth:()=>({user:mockUser})}));
jest.mock('../../../contexts/ThemeContext',()=>({useTheme:()=>({theme:require('../../../constants/theme').lightTheme})}));
jest.mock('../../../hooks/useDirectoryNavigation',()=>({useDirectoryNavigation:()=>jest.fn()}));
jest.mock('../../../components/auth',()=>({VerificationBanner:()=>null}));
jest.mock('../../../components/common/AmbientBackground',()=>({AmbientBackground:()=>null}));
jest.mock('../../../services/sessionsService',()=>({getMySessions:jest.fn()}));
jest.mock('../../../services/specialistsService',()=>({getMatchedSpecialists:jest.fn(),getSpecialistPersonalization:jest.fn(),invalidateSpecialistsCache:()=>require('../../../utils/specialistDiscoveryRevision').invalidateSpecialistDiscovery()}));

const professional: SpecialistData = {id:'one',userId:'pro',user:{name:'Profesional anterior'},specialization:'Psicología',professionalType:'PSYCHOLOGIST_HEALTH',professionalTypeLabel:'Psicología sanitaria',description:'',pricePerSession:50,rating:0,reviewCount:0,firstVisitFree:false,avatar:null};
beforeEach(()=>{
  jest.clearAllMocks();
  jest.spyOn(Animated, 'stagger').mockReturnValue({start:()=>undefined,stop:()=>undefined,reset:()=>undefined});
  jest.spyOn(Animated, 'spring').mockReturnValue({start:()=>undefined,stop:()=>undefined,reset:()=>undefined});
  jest.replaceProperty(Platform,'OS','web');
  jest.mocked(getMySessions).mockResolvedValue([]);
  jest.mocked(getSpecialistPersonalization).mockResolvedValue({primarySpecialist:null,favoriteSpecialists:[],favoriteSpecialistIds:[]});
});
afterEach(()=>jest.restoreAllMocks());

test('home consumes continuity and distinguishes exploration from the booking entry', async () => {
  jest.mocked(getMatchedSpecialists).mockResolvedValue({ specialists: [], hasCompletedQuestionnaire: false });
  jest.mocked(getSpecialistPersonalization).mockResolvedValue({ primarySpecialist: {
    specialist: professional, session: { id: 'linked-session', date: '2026-01-01T10:00:00Z', status: 'COMPLETED', type: 'VIDEO_CALL' },
  }, favoriteSpecialists: [], favoriteSpecialistIds: [] });
  render(<HomeScreen />);
  await screen.findByText('Profesional anterior');
  expect(screen.getByText('Última sesión')).toBeTruthy();
  fireEvent.press(screen.getByText('Ver especialistas'));
  expect(mockNavigation.dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ payload: { name: 'SpecialistsDirectory', pop: true } }));
  fireEvent.press(screen.getByText('Encontrar especialista'));
  expect(mockNavigation.dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ payload: { name: 'Specialists', pop: true } }));
});

test('returning home after a booking refreshes recommendations and sessions',async()=>{
  jest.mocked(getMatchedSpecialists).mockResolvedValueOnce({specialists:[professional],hasCompletedQuestionnaire:true})
    .mockResolvedValueOnce({specialists:[{...professional,user:{name:'Profesional actualizado'}}],hasCompletedQuestionnaire:true});
  render(<HomeScreen />);
  await screen.findByText('Profesional anterior');
  invalidateSpecialistDiscovery();
  await act(async()=>mockListeners.forEach(listener=>listener()));
  await screen.findByText('Profesional actualizado');
  expect(screen.queryByText('Profesional anterior')).toBeNull();
  expect(getMySessions).toHaveBeenCalledTimes(2);
});

test('a recommendation response invalidated by withdrawal cannot restore home cards',async()=>{
  let finish!: (value:Awaited<ReturnType<typeof getMatchedSpecialists>>)=>void;
  jest.mocked(getMatchedSpecialists).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  render(<HomeScreen />);
  invalidateSpecialistDiscovery();
  await act(async()=>finish({specialists:[professional],hasCompletedQuestionnaire:true}));
  expect(screen.queryByText('Profesional anterior')).toBeNull();
});
