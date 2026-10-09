import { CommonActions, StackActions, StackRouter } from '@react-navigation/routers';

const options = {
  routeNames: ['Landing', 'PublicSpecialists', 'PublicSpecialistProfile'],
  routeParamList: {},
  routeGetIdList: {},
};

test('four profile visits reuse the directory and keep its original route/state', () => {
  const router = StackRouter({ initialRouteName: 'Landing' });
  let state = router.getInitialState(options);
  const apply = (action: ReturnType<typeof CommonActions.navigate> | ReturnType<typeof StackActions.popTo>) => {
    const next = router.getStateForAction(state, action, options);
    if (!next) throw new Error('Navigation action was not handled');
    state = router.getRehydratedState(next, options);
  };
  apply(CommonActions.navigate('PublicSpecialists', { specialty: 'anxiety' }));
  const directory = state.routes[state.index];
  for (let i = 0; i < 4; i++) {
    apply(CommonActions.navigate('PublicSpecialistProfile', { profileRef: `fixture-${i}` }));
    apply(StackActions.popTo('PublicSpecialists', undefined, { merge: true }));
    expect(state.routes).toHaveLength(2);
    expect(state.routes[state.index]).toEqual(directory);
  }
});

test('a direct-link profile is replaced with the directory when no directory exists', () => {
  const router = StackRouter({ initialRouteName: 'PublicSpecialistProfile' });
  const state = router.getInitialState(options);
  const result = router.getStateForAction(state, StackActions.popTo('PublicSpecialists', undefined, { merge: true }), options);
  expect(result?.routes).toHaveLength(1);
  expect(result?.routes[0].name).toBe('PublicSpecialists');
});
