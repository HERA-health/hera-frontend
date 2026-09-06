import { CommonActions, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import type { RootStackParamList } from '../constants/types';

const sections = [
  'ProfessionalHome', 'ProfessionalClients', 'ProfessionalSessions',
  'ProfessionalBilling', 'ProfessionalDashboard', 'ProfessionalAvailability',
  'ProfessionalProfile', 'ProfessionalHelp', 'ProfessionalClinicWorkspace',
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
  navigation.dispatch(CommonActions.navigate({ name, params: args[0], pop: true }));
}
