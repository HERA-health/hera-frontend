import React from 'react';
import SharedLoadingState from '../../../components/common/LoadingState';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Cargando tus sesiones...' }) => (
  <SharedLoadingState fullScreen size="small" message={message} />
);

export default LoadingState;
