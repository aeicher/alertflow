import React from 'react';
import { Incident } from '../../../types';

interface Props {
  incident: Incident;
}

export const IncidentCard: React.FC<Props> = ({ incident }) => {
  return (
    <div className="border rounded p-4 shadow-sm bg-white dark:bg-gray-800">
      <h3 className="font-semibold text-lg">{incident.title || 'Untitled Incident'}</h3>
      <p className="text-sm text-gray-500">Severity: {incident.severity || 'unknown'}</p>
      <p className="mt-2 text-sm">{incident.ai_summary || incident.raw_logs?.slice(0, 200) + '...'}</p>
    </div>
  );
}; 