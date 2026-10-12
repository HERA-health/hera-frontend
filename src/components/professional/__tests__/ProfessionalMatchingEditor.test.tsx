jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({useDiscoveryRevalidation: jest.fn()}));
import React, {useState} from 'react';
import {fireEvent,render,screen} from '@testing-library/react-native';
import {ProfessionalMatchingEditor} from '../ProfessionalMatchingEditor';
import type {PerspectiveDraft} from '../../../services/profileDiscoveryService';
jest.mock('../../../contexts/ThemeContext', () => ({useTheme: () => ({theme: require('../../../constants/theme').lightTheme})}));
jest.mock('../../../hooks/useProfileOptions', () => ({useProfileOptions: () => ({options:{languages:[],religions:[],religionEnabled:false},error:false,retry:jest.fn()})}));
function Harness({initial = []}: {initial?: string[]}) {
  const [specialties,setSpecialties] = useState(initial);
  const [custom,setCustom] = useState<string[]>([]);
  const [approaches,setApproaches] = useState<string[]>([]);
  const [customApproaches,setCustomApproaches] = useState<string[]>([]);
  const [perspective,setPerspective] = useState<PerspectiveDraft>({religionCode:'',religionOtherText:'',publish:false,noticeVersion:null,hasDeclaration:false,needsReconfirmation:false});
  return <ProfessionalMatchingEditor name="Ana" title="Psicóloga" avatar={null} specialties={specialties} approaches={approaches} customSpecialties={custom} customApproaches={customApproaches} languages={[]} profileVisible matchingNeedsReview={false} perspective={perspective} onPerspectiveChange={setPerspective} onLanguagesChange={jest.fn()} onCustomSpecialtiesChange={setCustom} onCustomApproachesChange={setCustomApproaches} onToggle={(field,value) => {const update = (values: string[]) => values.includes(value) ? values.filter(item => item !== value) : [...values,value]; if(field === 'specialties') setSpecialties(update); else setApproaches(update);}} />;
}
test('five specialties disable additions while selected ones stay removable', () => {
  render(<Harness initial={['anxiety','depression','sleep','trauma','grief']} />);
  expect(screen.getByLabelText('Sexualidad').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByLabelText('Ansiedad'));
  expect(screen.getByLabelText('Sexualidad').props.accessibilityState.disabled).toBe(false);
  expect(screen.getByText('4/5 seleccionadas')).toBeTruthy();
});
test('custom choices reject catalog aliases and update the live preview', () => {
  render(<Harness />);
  fireEvent.press(screen.getByText('+ Añadir otra'));
  fireEvent.changeText(screen.getByLabelText('Otra especialidad'),'ANSIEDAD');
  fireEvent.press(screen.getByText('Añadir'));
  expect(screen.getByText('Esta opción ya existe en la lista.')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Otra especialidad'),'Migración y adaptación');
  fireEvent.press(screen.getByText('Añadir'));
  expect(screen.getAllByText('Migración y adaptación')).toHaveLength(2);
  fireEvent.press(screen.getByLabelText('Quitar Migración y adaptación'));
  expect(screen.queryByText('Migración y adaptación')).toBeNull();
});

test('web checkbox Space toggles a choice and blocked options stay disabled', () => {
  const {Platform} = require('react-native');
  const original = Platform.OS;
  Platform.OS = 'web';
  try {
    render(<Harness initial={['anxiety','depression','sleep','trauma','grief']} />);
    const preventDefault = jest.fn();
    fireEvent(screen.getByLabelText('Sexualidad'), 'keyDown', {key:' ', repeat:false, preventDefault});
    expect(screen.getByText('5/5 seleccionadas')).toBeTruthy();
    fireEvent(screen.getByLabelText('Ansiedad'), 'keyDown', {key:' ', repeat:false, preventDefault});
    expect(screen.getByText('4/5 seleccionadas')).toBeTruthy();
    expect(preventDefault).toHaveBeenCalled();
  } finally {Platform.OS = original;}
});
