import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppRouteProp, RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { psychologyPages } from '../../seo/publicContent';
import { usePublicDirectory } from '../specialists/usePublicDirectory';
import { Button } from '../../components/common/Button';
import { PublicSpecialistCard } from '../../components/features/PublicSpecialistCard';

export function PsychologyPageScreen() {
  const route = useRoute<AppRouteProp<'PsychologyTopic' | 'PsychologyOnline'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const topic = route.name === 'PsychologyOnline' ? 'online' : route.params?.topic;
  const page = psychologyPages[topic === 'ansiedad' || topic === 'autoestima' ? topic : 'online'];
  const { theme } = useTheme();
  const { data, loading, error, retry } = usePublicDirectory(page.filters);
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 17, lineHeight: 26 };
  return <ScrollView style={{ backgroundColor: theme.landingCanvas }} contentContainerStyle={styles.content}>
    <Button onPress={() => navigation.navigate('Landing')}>Volver al inicio</Button>
    <Text accessibilityRole="header" style={[text, { fontFamily: theme.fontDisplay, fontSize: 36, lineHeight: 42 }]}>{page.heading}</Text>
    <Text style={text}>{page.introduction}</Text>
    {loading && <Text style={text}>Estamos buscando perfiles para ti…</Text>}
    {error && <Button onPress={retry}>Volver a intentar</Button>}
    {data?.items.slice(0, 6).map(item => <PublicSpecialistCard key={item.id} specialist={item} variant="directory" onPress={() => navigation.navigate('PublicSpecialistProfile', { profileRef: item.publicSlug || item.id })} />)}
    {data && !data.items.length && <Text style={text}>Ahora mismo no hay perfiles disponibles con estas características.</Text>}
    <Button onPress={() => navigation.navigate('PublicSpecialists', { topic: topic || 'online' })}>Explorar el directorio</Button>
    <Button onPress={() => navigation.navigate('Questionnaire')}>Hacer el cuestionario</Button>
    {page.guidance.map(item => <View key={item.title}><Text accessibilityRole="header" style={[text, styles.heading]}>{item.title}</Text><Text style={text}>{item.text}</Text></View>)}
    {page.questions.map(item => <View key={item.question}><Text accessibilityRole="header" style={[text, styles.heading]}>{item.question}</Text><Text style={text}>{item.answer}</Text></View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ content: { padding: 24, gap: 24 }, heading: { fontSize: 22, marginBottom: 12 } });
