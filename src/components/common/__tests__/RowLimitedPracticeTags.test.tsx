import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react-native';
import {RowLimitedPracticeTags} from '../RowLimitedPracticeTags';
jest.mock('../../../contexts/ThemeContext',()=>({useTheme:()=>({theme:require('../../../constants/theme').lightTheme})}));
test('shows three measured rows and opens all labels in a dismissible modal',()=>{
 render(<RowLimitedPracticeTags title="Enfoques" kind="approaches" values={['Uno','Dos','Tres','Cuatro','Cinco']}/>);
 const measure=within(screen.getByTestId('practice-tags-measurement',{includeHiddenElements:true}));
 ['Uno','Dos','Tres','Cuatro','Cinco'].forEach((value,i)=>fireEvent(measure.getByText(value,{includeHiddenElements:true}),'layout',{nativeEvent:{layout:{x:0,y:[0,0,37,74,111][i],width:80,height:31}}}));
 expect(screen.getByText('Cuatro')).toBeTruthy();
 expect(screen.queryByText('Cinco')).toBeNull();
 fireEvent.press(screen.getByRole('button',{name:'Ver todos: enfoques (5)'}));
 expect(screen.getByText('Cinco')).toBeTruthy();
 fireEvent.press(screen.getByRole('button',{name:'Cerrar enfoques'}));
 expect(screen.queryByText('Cinco')).toBeNull();
 // A wider layout fits all values in three rows, removing the disclosure.
 fireEvent(measure.getByText('Cinco',{includeHiddenElements:true}),'layout',{nativeEvent:{layout:{x:90,y:74,width:80,height:31}}});
 expect(screen.queryByRole('button',{name:'Ver todos: enfoques (5)'})).toBeNull();
 expect(screen.getByText('Cinco')).toBeTruthy();
});
