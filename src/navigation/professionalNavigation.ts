import { CommonActions, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import type { RootStackParamList } from '../constants/types';

const sections = [
  'ProfessionalHome', 'ProfessionalClients', 'ProfessionalSessions',
  'ProfessionalPayments', 'ProfessionalTariffs', 'ProfessionalBilling', 'ProfessionalDashboard', 'ProfessionalAvailability',
  'ProfessionalProfile', 'ProfessionalHelp', 'ProfessionalClinicWorkspace', 'ResourceLibrary', 'ProfessionalSubscription',
] as const;

export type ProfessionalSection = typeof sections[number];

export const isProfessionalSection = (name: string): name is ProfessionalSection =>
  sections.some((section) => section === name);

export function navigateProfessionalSection<T extends ProfessionalSection>(
  navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>,
  name: T,
  ...args: undefined extends RootStackParamList[T]
    ? [params?: RootStackParamList[T]]
    : [params: RootStackParamList[T]]
): void {
  const params = name === 'ProfessionalProfile' && !args[0]
    ? { screen: 'ProfileSections', pop: true } satisfies RootStackParamList['ProfessionalProfile']
    : args[0];
  navigation.dispatch(CommonActions.navigate({ name, params, pop: true }));
}
