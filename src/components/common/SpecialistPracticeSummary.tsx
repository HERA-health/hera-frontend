import React from 'react';
import {View} from 'react-native';
import {PracticeTags} from './PracticeTags';
import {useProfileOptions} from '../../hooks/useProfileOptions';
import {optionLabel} from '../../utils/profileOptions';
import type {Specialist} from '../../constants/types';

/** Public fields have already passed the server's publication checks. */
export function SpecialistPracticeSummary({specialist}: {specialist: Specialist}) {
  const {options} = useProfileOptions();
  const profile = specialist.matchingProfile;
  return <View style={{gap: 12}}>
    <PracticeTags title="Especialidades" kind="specialties" values={[...(profile?.specialties ?? []), ...(profile?.customSpecialties ?? [])]} />
    <PracticeTags title="Enfoques terapéuticos" kind="approaches" values={[...(profile?.therapeuticApproach ?? []), ...(profile?.customTherapeuticApproaches ?? [])]} />
    <PracticeTags title="Idiomas" values={(profile?.language ?? []).map(value => optionLabel(options?.languages ?? [], value))} />
    {options?.religionEnabled && specialist.religionCode ? <PracticeTags title="Perspectiva espiritual o religiosa" values={[specialist.religionCode === 'other' ? specialist.religionOtherText || 'Otra' : optionLabel(options.religions, specialist.religionCode)]} /> : null}
  </View>;
}
