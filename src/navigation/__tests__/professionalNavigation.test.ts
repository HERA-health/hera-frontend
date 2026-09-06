import { CommonActions, StackActions, StackRouter } from '@react-navigation/routers';
import { navigateProfessionalSection } from '../professionalNavigation';

const names = ['ProfessionalHome', 'ProfessionalClients', 'ProfessionalSessions', 'ClientProfile'];
const options = { routeNames: names, routeParamList: {}, routeGetIdList: {} };

it('bounds the stack after ten Home / Patients / Agenda navigation cycles', () => {
  const router = StackRouter({ initialRouteName: 'ProfessionalHome' });
  let state = router.getInitialState(options);
  const navigation = { dispatch: (action: ReturnType<typeof CommonActions.navigate>) => {
    state = router.getRehydratedState(router.getStateForAction(state, action, options) ?? state, options);
  } };
  for (let i = 0; i < 10; i += 1) {
    navigateProfessionalSection(navigation, 'ProfessionalClients');
    navigateProfessionalSection(navigation, 'ProfessionalSessions');
    expect(state.routes).toHaveLength(3);
    navigateProfessionalSection(navigation, 'ProfessionalHome');
    expect(state.routes).toHaveLength(1);
  }
});

it('preserves section keys, action parameters and Back from a patient detail', () => {
  const router = StackRouter({ initialRouteName: 'ProfessionalHome' });
  let state = router.getInitialState(options);
  const dispatch = (action: ReturnType<typeof CommonActions.navigate> | ReturnType<typeof StackActions.pop>) => {
    state = router.getRehydratedState(router.getStateForAction(state, action, options) ?? state, options);
  };
  navigateProfessionalSection({ dispatch }, 'ProfessionalClients', { openCreatePatient: true });
  const clientsKey = state.routes[state.index].key;
  expect(state.routes[state.index].params).toEqual({ openCreatePatient: true });
  dispatch(CommonActions.navigate('ClientProfile', { clientId: 'fixture-patient' }));
  dispatch(StackActions.pop(1));
  expect(state.routes[state.index].key).toBe(clientsKey);
  navigateProfessionalSection({ dispatch }, 'ProfessionalSessions', { focusSessionId: 'fixture-session' });
  expect(state.routes[state.index].params).toEqual({ focusSessionId: 'fixture-session' });
});
