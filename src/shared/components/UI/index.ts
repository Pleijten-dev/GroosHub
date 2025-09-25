// src/shared/components/UI/index.ts
// Export all UI components for easy importing

// Navigation components
export { default as NavigationBar } from './NavigationBar/NavigationBar';
export { default as NavigationItem } from './NavigationBar/NavigationItem';
export * from './NavigationBar/types';
export * from './NavigationBar/constants';

// Core design system components
export { default as Button } from './Button/Button';
export { default as Input } from './Input/Input';
export { default as Card } from './Card/Card';
export { default as StatusBadge } from './StatusBadge/StatusBadge';

// Sidebar component
export { default as Sidebar } from './Sidebar/Sidebar';
export * from './Sidebar/types';

// Re-export types for convenience
export type { ButtonProps } from './Button/Button';
export type { InputProps } from './Input/Input';
export type { CardProps } from './Card/Card';
export type { StatusBadgeProps } from './StatusBadge/StatusBadge';
export type { SidebarProps, SidebarSection } from './Sidebar/types';

// Re-export utilities and hooks
export { cn } from '../../utils/cn';
export { useDesignSystem, COMMON_CLASSES } from '../../hooks/useDesignSystem';
export { useSidebar } from '../../hooks/useSidebar';