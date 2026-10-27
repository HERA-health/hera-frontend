import React from 'react';

/** Keep reservation and location together; a tall column must remain fully scrollable. */
export function ProfileBookingAside({ children }: { children: React.ReactNode }) {
  return <aside aria-label="Reserva y consulta" style={{ width: 420, flexShrink: 0, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 16 }}>
    {children}
  </aside>;
}
