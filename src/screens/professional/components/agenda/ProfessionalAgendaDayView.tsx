import React from 'react';
import { ProfessionalAgendaTimeGrid } from './ProfessionalAgendaTimeGrid';

export function ProfessionalAgendaDayView(props: Omit<React.ComponentProps<typeof ProfessionalAgendaTimeGrid>, 'days'> & { selectedDate: Date }) {
  const days = React.useMemo(() => [props.selectedDate], [props.selectedDate]);
  return <ProfessionalAgendaTimeGrid {...props} days={days} />;
}
