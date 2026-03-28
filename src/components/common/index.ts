/**
 * Common Components Index
 * Export all reusable components for easy importing
 */

export { ErrorBoundary } from './ErrorBoundary';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';
export { EmptyState } from './EmptyState';

// Re-export existing components if they exist
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Input } from './Input';
export { default as Badge } from './Badge';
export { SimpleDropdown } from './SimpleDropdown';
export type { DropdownOption, SimpleDropdownProps } from './SimpleDropdown';
