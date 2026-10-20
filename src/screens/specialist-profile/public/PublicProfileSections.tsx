import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useProfileOptions } from '../../../hooks/useProfileOptions';
import { optionLabel } from '../../../utils/profileOptions';
import { RowLimitedPracticeTags } from '../../../components/common/RowLimitedPracticeTags';
import { LocationMapPreview } from '../../../components/location';
import { Button } from '../../../components/common/Button';
import type { Specialist } from '../types';

export function PublicProfilePractice({ specialist, onLayout }: { specialist: Specialist; onLayout: (y: number) => void }) {
  const { theme } = useTheme();
  const { options } = useProfileOptions();
  const approaches = specialist.therapeuticApproaches ?? specialist.therapeuticApproach?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
  const religion = options?.religionEnabled && specialist.religionCode;
  if (!specialist.specializations.length && !approaches.length && !religion) return null;
  const label = { fontFamily: theme.fontSansSemiBold, color: theme.textPrimary, fontSize: 13, lineHeight: 20 };
  return <View onLayout={event => onLayout(event.nativeEvent.layout.y)}
    style={{ borderTopWidth: 1, borderTopColor: theme.borderLight, paddingTop: 28, marginTop: 32 }}>
    <Text accessibilityRole="header" aria-level={2} style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Áreas de acompañamiento</Text>
    <View style={styles.practice}>
      {specialist.specializations.length ? <View style={styles.practiceGroup}>
        <Text style={label}>Especialidades</Text>
        <RowLimitedPracticeTags title="Especialidades" kind="specialties" values={specialist.specializations} />
      </View> : null}
      {approaches.length ? <View style={styles.practiceGroup}>
        <Text style={label}>Enfoques terapéuticos</Text>
        <RowLimitedPracticeTags title="Enfoques terapéuticos" kind="approaches" values={approaches} />
      </View> : null}
    </View>
    {religion ? <View style={{ marginTop: 20, gap: 6 }}>
      <Text style={label}>Perspectiva espiritual o religiosa</Text>
      <Text style={{ fontFamily: theme.fontSans, color: theme.textSecondary, fontSize: 14 }}>
        {religion === 'other' ? specialist.religionOtherText || 'Otra' : optionLabel(options?.religions ?? [], religion)}
      </Text>
    </View> : null}
  </View>;
}

export function PublicProfileLocation({ specialist }: { specialist: Specialist }) {
  const { theme } = useTheme();
  const [error, setError] = useState(false);
  const address = specialist.offersInPerson ? specialist.address : undefined;
  if (!address) return null;
  const latitude = address.latitude;
  const longitude = address.longitude;
  const directions = async () => {
    setError(false);
    const destination = latitude != null && longitude != null ? `${latitude},${longitude}` : `${address.street}, ${address.city}`;
    try { await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`); }
    catch { setError(true); }
  };
  return <View testID="public-profile-location" style={{ gap: 12 }}>
    <Text accessibilityRole="header" aria-level={2} style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 26, lineHeight: 34 }}>La consulta</Text>
    {latitude != null && longitude != null ? <LocationMapPreview lat={latitude} lng={longitude} address={address.street} city={address.city} showDirectionsButton={false} width="100%" height={180} /> :
      <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 22 }}>{[address.street, address.city].filter(Boolean).join(' · ')}</Text>}
    <Button variant="outline" size="small" onPress={() => void directions()} style={{ alignSelf: 'flex-start' }}>Cómo llegar</Button>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>No hemos podido abrir las indicaciones. Inténtalo de nuevo.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 34, marginBottom: 18 },
  practice: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  practiceGroup: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, gap: 12 },
});
