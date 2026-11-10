import { CommonActions, StackActions, StackRouter } from '@react-navigation/routers';
import { navigatePatientSpecialists } from '../patientSpecialistsNavigation';

const options = { routeNames: ['Home', 'Specialists', 'SpecialistsDirectory', 'SpecialistDetail'], routeParamList: {}, routeGetIdList: {} };

test('profile visits reuse the original directory, and the menu returns to the continuity entry', () => {
  const router = StackRouter({ initialRouteName: 'Home' });
  let state = router.getInitialState(options);
  const dispatch = (action: ReturnType<typeof CommonActions.navigate>) => {
    const next = router.getStateForAction(state, action, options);
    if (!next) throw new Error('Unhandled navigation');
    state = router.getRehydratedState(next, options);
  };
  dispatch(CommonActions.navigate('Specialists'));
  const entry = state.routes[state.index];
  navigatePatientSpecialists({ dispatch }, 'SpecialistsDirectory');
  const directory = state.routes[state.index];
  for (let i = 0; i < 4; i++) {
    dispatch(CommonActions.navigate('SpecialistDetail', { specialistId: `fixture-${i}` }));
    navigatePatientSpecialists({ dispatch }, 'SpecialistsDirectory');
    expect(state.routes).toHaveLength(3);
    expect(state.routes[state.index]).toEqual(directory);
  }
  navigatePatientSpecialists({ dispatch }, 'Specialists');
  expect(state.routes[state.index]).toEqual(entry);
  expect(state.routes).toHaveLength(2);
});

test('an unlinked entry reuses an existing directory or replaces only the resolver', () => {
  const router = StackRouter({ initialRouteName: 'Specialists' });
  const initial = router.getInitialState(options);
  const result = router.getStateForAction(initial, StackActions.popTo('SpecialistsDirectory', undefined, { merge: true }), options);
  expect(result?.routes).toHaveLength(1);
  expect(result?.routes[0].name).toBe('SpecialistsDirectory');
});
