import React from 'react';
import {View} from 'react-native';
import type {SpecializationsGridProps} from '../types';
import {PracticeTags} from '../../../components/common/PracticeTags';
export const SpecializationsGrid: React.FC<SpecializationsGridProps> = ({specializations}) => !specializations.length ? null : <View style={{padding: 20}}><PracticeTags title="Especialidades" values={specializations} kind="specialties" /></View>;
export default SpecializationsGrid;
