import React from 'react';
import {render,screen} from '@testing-library/react-native';
import {SpecializationsGrid} from '../SpecializationsGrid';
jest.mock('../../../../contexts/ThemeContext', () => ({useTheme: () => ({theme: require('../../../../constants/theme').lightTheme})}));
test('shows fixed and custom specialties as readable labels without invented descriptions', () => {
 render(<SpecializationsGrid specializations={['anxiety','psychosis','Terapia propia']} />);
 expect(screen.getByText('Ansiedad')).toBeTruthy();
 expect(screen.getByText('Psicosis y trastornos psicóticos')).toBeTruthy();
 expect(screen.getByText('Terapia propia')).toBeTruthy();
 expect(screen.queryByText('Manejo del estrés y ataques de pánico.')).toBeNull();
});
