import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ExternalCalendarNotice } from './ExternalCalendarNotice';

export function ExternalCalendarResultNotice() {
  const { user } = useAuth();
  return <ExternalCalendarNotice result patient={!user || user.type === 'client'} />;
}
