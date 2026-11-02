import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePatientDirectory } from '../usePatientDirectory';
import { getPatientDirectory } from '../../services/patientDirectoryService';
jest.mock('../../services/patientDirectoryService', () => ({ getPatientDirectory: jest.fn() }));
const read = jest.mocked(getPatientDirectory);
type Page = Awaited<ReturnType<typeof getPatientDirectory>>;
const page = (id: string): Page => ({items:[{id,userId:null,source:'MANAGED',firstName:id,lastName:null,createdAt:'2026-01-01',displayName:id,primaryEmail:null,primaryPhone:null,initials:id,archivedAt:null,treatmentConsentStatus:'PENDING',sessionCount:0,nextSessionDate:null,lastValidSessionAt:null,activity:'NO_SESSIONS',heraOrigin:{origin:'UNKNOWN'},user:{id:null,name:id,email:'',phone:'',avatar:null,userType:'CLIENT'}}],pageInfo:{page:1,limit:50,hasMore:false,nextPage:null},computedAt:'2026-01-01'});
beforeEach(()=>jest.resetAllMocks());
it('discards an obsolete response even if cancellation is ignored',async()=>{
 let finish: ((value: Page)=>void) | undefined;
 read.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce(page('new'));
 const {result,rerender}=renderHook<ReturnType<typeof usePatientDirectory>, { q: string }>(({q})=>usePatientDirectory({q}),{initialProps:{q:''}});
 await waitFor(()=>expect(read).toHaveBeenCalledTimes(1));rerender({q:'new'});
 await waitFor(()=>expect(result.current.items[0]?.id).toBe('new'));
 await act(async()=>{finish?.(page('old'));});expect(result.current.items[0].id).toBe('new');
});
it('keeps previous data on failed refresh and supports retry',async()=>{
 read.mockResolvedValueOnce(page('first')).mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(page('second'));
 const {result}=renderHook(()=>usePatientDirectory());await waitFor(()=>expect(result.current.items).toHaveLength(1));
 act(()=>result.current.refresh());await waitFor(()=>expect(result.current.error).toBeTruthy());expect(result.current.items[0].id).toBe('first');
 act(()=>result.current.refresh());await waitFor(()=>expect(result.current.items[0].id).toBe('second'));expect(result.current.error).toBe('');
});
it('does not request pages for a hidden selector',async()=>{
 const {result}=renderHook(()=>usePatientDirectory({},false));expect(result.current.loading).toBe(false);expect(read).not.toHaveBeenCalled();
});
