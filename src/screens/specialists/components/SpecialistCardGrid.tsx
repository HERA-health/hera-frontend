import React from 'react';
import { Specialist } from '../../../constants/types';
import { SpecialistCard } from '../../../components/features/SpecialistCard';
import { useTheme } from '../../../contexts/ThemeContext';

interface SpecialistCardGridProps {
  specialist: Specialist;
  onPress: () => void;
  position?: 1 | 2 | 3;
  animationDelay?: number;
}

export const SpecialistCardGrid: React.FC<SpecialistCardGridProps> = ({
  specialist,
  onPress,
  position,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <SpecialistCard
      key={`${specialist.id}-${isDark ? 'dark' : 'light'}`}
      specialist={specialist}
      onPress={onPress}
      position={position}
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.borderLight,
      }}
    />
  );
};

export default SpecialistCardGrid;
