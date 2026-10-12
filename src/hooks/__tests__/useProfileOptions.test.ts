import {act, renderHook, waitFor} from '@testing-library/react-native';
import {useProfileOptions} from '../useProfileOptions';
import {getProfileOptions, ProfileOptions} from '../../services/profileDiscoveryService';
jest.mock('../../services/profileDiscoveryService', () => ({getProfileOptions:jest.fn()}));
test('failed refresh clears stale publication options and allows retry', async () => {
 const options: ProfileOptions={languages:[],religions:[],religionEnabled:true,religionNotice:'Notice',religionNoticeVersion:'v1'};
 jest.mocked(getProfileOptions).mockResolvedValueOnce(options).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({...options,religionEnabled:false});
 const view=renderHook(()=>useProfileOptions());
 await waitFor(()=>expect(view.result.current.options).toEqual(options));
 act(()=>view.result.current.retry());
 await waitFor(()=>expect(view.result.current.error).toBe(true));
 expect(view.result.current.options).toBeNull();
 act(()=>view.result.current.retry());
 await waitFor(()=>expect(view.result.current.options?.religionEnabled).toBe(false));
 expect(view.result.current.error).toBe(false);
 view.unmount();
});
