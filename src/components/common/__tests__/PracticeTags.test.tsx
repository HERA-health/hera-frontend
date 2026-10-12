import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {PracticeTags} from '../PracticeTags';
jest.mock('../../../contexts/ThemeContext',()=>({useTheme:()=>({theme:require('../../../constants/theme').lightTheme})}));
test('compact discovery indicates additional approaches without dropping them from the full presentation',()=>{
 const values=['cbt','emdr','humanistic','Una práctica propia'];
 const view=render(<PracticeTags title="Enfoques" kind="approaches" values={values} compact maxItems={3}/>);
 expect(screen.getByText(/\+1 en el perfil/)).toBeTruthy();
 expect(screen.queryByText(/Una práctica propia/)).toBeNull();
 view.rerender(<PracticeTags title="Enfoques" kind="approaches" values={values}/>);
 expect(screen.getByText('Una práctica propia')).toBeTruthy();
 expect(screen.queryByText(/en el perfil/)).toBeNull();
});
