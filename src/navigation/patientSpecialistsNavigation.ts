import { CommonActions, type NavigationProp, type ParamListBase } from '@react-navigation/native';

/** Reuse existing destinations so profile visits do not duplicate the directory. */
export function navigatePatientSpecialists(
  navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>,
  name: 'Specialists' | 'SpecialistsDirectory',
) {
  navigation.dispatch(CommonActions.navigate({ name, pop: true }));
}
