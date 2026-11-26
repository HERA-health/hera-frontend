jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({useDiscoveryRevalidation: jest.fn()}));
import React, {useState} from 'react';
import {fireEvent,render,screen} from '@testing-library/react-native';
import {ProfessionalMatchingEditor} from '../ProfessionalMatchingEditor';
import type {PerspectiveDraft} from '../../../services/profileDiscoveryService';
jest.mock('../../../contexts/ThemeContext', () => ({useTheme: () => ({theme: require('../../../constants/theme').lightTheme})}));
jest.mock('../../../hooks/useProfileOptions', () => ({useProfileOptions: () => ({options:{languages:[],religions:[],religionEnabled:false},error:false,retry:jest.fn()})}));
function Harness({initial = [], initialCustomApproaches = []}: {initial?: string[]; initialCustomApproaches?: string[]}) {
  const [specialties,setSpecialties] = useState(initial);
  const [custom,setCustom] = useState<string[]>([]);
  const [approaches,setApproaches] = useState<string[]>([]);
  const [customApproaches,setCustomApproaches] = useState(initialCustomApproaches);
  const [perspective,setPerspective] = useState<PerspectiveDraft>({religionCode:'',religionOtherText:'',publish:false,noticeVersion:null,hasDeclaration:false,needsReconfirmation:false});
  return <ProfessionalMatchingEditor onGenderChange={jest.fn()} specialties={specialties} approaches={approaches} customSpecialties={custom} customApproaches={customApproaches} languages={[]} matchingNeedsReview={false} perspective={perspective} onPerspectiveChange={setPerspective} onLanguagesChange={jest.fn()} onCustomSpecialtiesChange={setCustom} onCustomApproachesChange={setCustomApproaches} onToggle={(field,value) => {const update = (values: string[]) => values.includes(value) ? values.filter(item => item !== value) : [...values,value]; if(field === 'specialties') setSpecialties(update); else setApproaches(update);}} />;
}
test('shows the remaining optional declarations without a duplicate preview or personal contexts', () => {
  render(<Harness />);
  expect(screen.getByRole('button', {name: 'Género declarado (opcional): Seleccionar'})).toBeTruthy();
  expect(screen.getByText('Perspectiva espiritual o religiosa (opcional)')).toBeTruthy();
  expect(screen.queryByText(/Experiencia en contextos personales/)).toBeNull();
  expect(screen.queryByText('Así te verán los pacientes')).toBeNull();
});

test('a sixth specialty and a custom seventh can be selected and removed', () => {
  render(<Harness initial={['anxiety','depression','sleep','trauma','grief']} />);
  fireEvent.press(screen.getByRole('button', {name: 'Editar especialidades'}));
  fireEvent.press(screen.getByLabelText('Psicología forense y pericial'));
  fireEvent.press(screen.getByText('+ Añadir otra'));
  fireEvent.changeText(screen.getByLabelText('Otra especialidad'), 'Área ficticia');
  fireEvent.press(screen.getByText('Añadir'));
  expect(screen.getByText('7 seleccionadas')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Quitar Área ficticia'));
  expect(screen.getByText('6 seleccionadas')).toBeTruthy();
});
test('therapeutic approaches keep their limit of thirty', () => {
  const approaches = Array.from({length: 30}, (_, i) => 'Enfoque ' + (i + 1));
  render(<Harness initialCustomApproaches={approaches} />);
  fireEvent.press(screen.getByRole('button', {name: 'Editar enfoques terapéuticos'}));
  expect(screen.getByText('Has alcanzado el límite de 30 enfoques.')).toBeTruthy();
  expect(screen.getByRole('button', {name: '+ Añadir otro'})).toBeDisabled();
  fireEvent.press(screen.getByLabelText('Quitar Enfoque 30'));
  expect(screen.getByRole('button', {name: '+ Añadir otro'})).toBeEnabled();
});

test('custom choices reject catalog aliases and update the live preview', () => {
  render(<Harness />);
  fireEvent.press(screen.getByRole('button', {name: 'Editar especialidades'}));
  fireEvent.press(screen.getByText('+ Añadir otra'));
  fireEvent.changeText(screen.getByLabelText('Otra especialidad'),'ANSIEDAD');
  fireEvent.press(screen.getByText('Añadir'));
  expect(screen.getByText('Esta opción ya existe en la lista.')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Otra especialidad'),'Migración y adaptación');
  fireEvent.press(screen.getByText('Añadir'));
  expect(screen.getByLabelText('Quitar Migración y adaptación')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Quitar Migración y adaptación'));
  expect(screen.queryByText('Migración y adaptación')).toBeNull();
});

test('web checkbox Space toggles a choice above five specialties', () => {
  const {Platform} = require('react-native');
  const original = Platform.OS;
  Platform.OS = 'web';
  try {
    render(<Harness initial={['anxiety','depression','sleep','trauma','grief']} />);
    fireEvent.press(screen.getByRole('button', {name: 'Editar especialidades'}));
    const preventDefault = jest.fn();
    fireEvent(screen.getByLabelText('Sexualidad'), 'keyDown', {key:' ', repeat:false, preventDefault});
    expect(screen.getByText('6 seleccionadas')).toBeTruthy();
    fireEvent(screen.getByLabelText('Ansiedad'), 'keyDown', {key:' ', repeat:false, preventDefault});
    expect(screen.getByText('5 seleccionadas')).toBeTruthy();
    expect(preventDefault).toHaveBeenCalled();
  } finally {Platform.OS = original;}
});
