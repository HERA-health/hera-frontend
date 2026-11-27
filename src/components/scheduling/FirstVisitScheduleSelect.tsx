import React from 'react';
import { SimpleDropdown } from '../common/SimpleDropdown';

interface Props {
  firstMinutes: number;
  regularMinutes: number;
  firstVisit: boolean;
  onChange: (firstVisit: boolean) => void;
  disabled?: boolean;
}

export function FirstVisitScheduleSelect({ firstMinutes, regularMinutes, firstVisit, onChange, disabled }: Props) {
  return <SimpleDropdown accessibilityLabel="Horarios que quieres consultar" presentation="portal" keyboardNavigation
    value={firstVisit ? 'first' : 'regular'} disabled={disabled}
    options={[{ value: 'first', label: `Primera visita · ${firstMinutes} min` }, { value: 'regular', label: `Consulta habitual · ${regularMinutes} min` }]}
    onSelect={value => onChange(value === 'first')} />;
}
