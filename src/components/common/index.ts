/**
 * Common Components Index
 * Export all reusable components for easy importing
 */

export { ErrorBoundary } from './ErrorBoundary';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';
export { EmptyState } from './EmptyState';

// Re-export existing components if they exist
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Badge } from './Badge';
export { SimpleDropdown } from './SimpleDropdown';
export type { DropdownOption, SimpleDropdownProps } from './SimpleDropdown';

// Design System v5.0 — new components
export { MotionView } from './MotionView';
export { AnimatedPressable } from './AnimatedPressable';
export { GlassCard } from './GlassCard';
export { AmbientBackground } from './AmbientBackground';
export { ThemeToggleButton } from './ThemeToggleButton';
