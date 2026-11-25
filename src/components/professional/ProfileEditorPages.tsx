import React, { useLayoutEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp, type NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileEditorParamList } from '../../constants/types';

const Stack = createNativeStackNavigator<ProfileEditorParamList>();
export type ProfilePageNavigation = NativeStackNavigationProp<ProfileEditorParamList>;

type Props = {
  onPageChange: (navigation: ProfilePageNavigation, tab?: string) => void;
  children: React.ReactElement;
};

function Page({ route, navigation, onPageChange, children }: Props & NativeStackScreenProps<ProfileEditorParamList, keyof ProfileEditorParamList>) {
  const active = useNavigationState(state => state.routes[state.index].key === route.key);
  const detail = route.name === 'ProfileSection';
  const tab = detail ? route.params?.tab : undefined;
  useLayoutEffect(() => {
    if (active) onPageChange(navigation, detail ? tab ?? 'information' : undefined);
  }, [active, detail, tab, navigation, onPageChange]);
  return active ? children : null;
}

// The draft belongs to the parent editor. Only the page belongs to the navigation stack.
export function ProfileEditorPages(props: Props) {
  return <Stack.Navigator initialRouteName="ProfileSections" screenOptions={{ headerShown: false, animation: 'none' }}>
    <Stack.Screen name="ProfileSections">{screen => <Page {...screen} {...props} />}</Stack.Screen>
    <Stack.Screen name="ProfileSection">{screen => <Page {...screen} {...props} />}</Stack.Screen>
  </Stack.Navigator>;
}
