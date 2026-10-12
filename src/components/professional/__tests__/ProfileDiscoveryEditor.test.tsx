import React, {useState} from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {ProfileDiscoveryEditor} from '../ProfileDiscoveryEditor';
import {SearchableProfileSelect} from '../../common/SearchableProfileSelect';
import type {PerspectiveDraft, ProfileOptions} from '../../../services/profileDiscoveryService';
jest.mock('../../../contexts/ThemeContext', () => ({useTheme: () => ({theme: require('../../../constants/theme').lightTheme})}));
const options: ProfileOptions = {languages: [{value:'spanish',label:'Español',aliases:[]}], religions: [{value:'catholic',label:'Católica',aliases:[]},{value:'other',label:'Otra',aliases:[]}], religionEnabled:true, religionNotice:'Autorización pública y voluntaria.', religionNoticeVersion:'v1'};
const empty: PerspectiveDraft = {religionCode:'',religionOtherText:'',publish:false,noticeVersion:null,hasDeclaration:false,needsReconfirmation:false};
function Harness({initial = empty, enabled = true}: {initial?: PerspectiveDraft; enabled?: boolean}) {
  const [perspective,onPerspectiveChange] = useState(initial);
  return <ProfileDiscoveryEditor languages={[]} onLanguagesChange={jest.fn()} perspective={perspective} onPerspectiveChange={onPerspectiveChange} options={{...options,religionEnabled:enabled}} retry={jest.fn()} />;
}
test('selecting a perspective requires explicitly enabling publication', () => {
  render(<Harness />);
  fireEvent.press(screen.getByLabelText('Católica'));
  expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.value).toBe(false);
  fireEvent(screen.getByLabelText('Mostrar en mi perfil y en el directorio'),'valueChange',true);
  expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.value).toBe(true);
  fireEvent.press(screen.getByLabelText('Otra'));
  expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.value).toBe(false);
  expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.disabled).toBe(true);
  fireEvent.changeText(screen.getByLabelText('Otra perspectiva espiritual o religiosa'),'Perspectiva propia');
  expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.disabled).toBe(false);
});
test('removal stays available while publication is disabled', () => {
  render(<Harness enabled={false} initial={{...empty,religionCode:'catholic',hasDeclaration:true}} />);
  fireEvent.press(screen.getByText('Quitar esta información de mi perfil'));
  expect(screen.queryByLabelText('Mostrar en mi perfil y en el directorio')).toBeNull();
});
test('legacy declaration is never preconsented', () => {
  render(<Harness initial={{...empty,religionCode:'catholic',hasDeclaration:true,needsReconfirmation:true}} />);
  expect(screen.getByText(/Tu declaración anterior requiere revisión/)).toBeTruthy();
  expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.value).toBe(false);
});
test('language search ignores accents and legacy values remain removable', () => {
  const change = jest.fn();
  render(<SearchableProfileSelect label="Idiomas" options={[{value:'arabic',label:'Árabe',aliases:[]}]} values={['Idioma antiguo']} onChange={change} multiple />);
  fireEvent.press(screen.getByLabelText('Quitar Idioma antiguo'));
  expect(change).toHaveBeenCalledWith([]);
  fireEvent.press(screen.getByText('Seleccionar ▾'));
  fireEvent.changeText(screen.getByLabelText('Buscar idiomas'),'arabe');
  fireEvent.press(screen.getByText('Árabe'));
  expect(change).toHaveBeenCalledWith(['Idioma antiguo','arabic']);
});

test('removed legacy categories cannot be republished without choosing a supported perspective', () => {
 render(<Harness initial={{...empty,religionCode:'legacy-removed',hasDeclaration:true,needsReconfirmation:true}} />);
 expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.disabled).toBe(true);
 fireEvent.press(screen.getByLabelText('Católica'));
 expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.disabled).toBe(false);
 expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.value).toBe(false);
});

test('publication uses only the switch and explains removal on save', () => {
 render(<Harness initial={{...empty,religionCode:'catholic',publish:true,hasDeclaration:true,noticeVersion:'v1'}} />);
 expect(screen.queryByText('Quitar esta información de mi perfil')).toBeNull();
 fireEvent(screen.getByLabelText('Mostrar en mi perfil y en el directorio'),'valueChange',false);
 expect(screen.getByLabelText('Mostrar en mi perfil y en el directorio').props.value).toBe(false);
 expect(screen.getByText('Al guardar los cambios, se borrará tu perspectiva anterior y dejará de aparecer en tu perfil.')).toBeTruthy();
});
