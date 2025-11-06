// src/shared/components/UI/Panel/Panel.tsx
import React from 'react';
import { cn } from '../../../utils/cn';

export interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export interface PanelOuterProps extends PanelProps {
  /**
   * Apply hover effect that lifts the panel
   */
  hover?: boolean;
}

// PanelInnerProps is an alias for PanelProps for consistency
export type PanelInnerProps = PanelProps;

/**
 * PanelOuter - Frosted glass outer panel
 *
 * Features:
 * - Semi-transparent white background (70% opacity)
 * - Backdrop blur effect (12px)
 * - Subtle border and shadow
 * - Large padding (32px)
 * - Optional hover effect
 *
 * Usage:
 * ```tsx
 * <PanelOuter hover>
 *   <PanelInner>
 *     Content here
 *   </PanelInner>
 * </PanelOuter>
 * ```
 */
export const PanelOuter: React.FC<PanelOuterProps> = ({
  children,
  className,
  hover = false
}) => {
  return (
    <div
      className={cn(
        'panel-outer',
        hover && 'transition-all duration-200 hover:shadow-lg hover:-translate-y-1',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * PanelInner - Cream nested panel
 *
 * Features:
 * - Cream background (#f8eee4)
 * - Very subtle border
 * - Medium padding (24px)
 * - Medium border radius
 *
 * Usage:
 * ```tsx
 * <PanelInner>
 *   Content here
 * </PanelInner>
 * ```
 */
export const PanelInner: React.FC<PanelInnerProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('panel-inner', className)}>
      {children}
    </div>
  );
};

/**
 * Panel - Combined outer + inner panel for convenience
 *
 * Automatically wraps content in both PanelOuter and PanelInner
 *
 * Usage:
 * ```tsx
 * <Panel>
 *   Content here (automatically in nested panels)
 * </Panel>
 * ```
 */
export interface CombinedPanelProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  hover?: boolean;
}

export const Panel: React.FC<CombinedPanelProps> = ({
  children,
  className,
  innerClassName,
  hover = false
}) => {
  return (
    <PanelOuter className={className} hover={hover}>
      <PanelInner className={innerClassName}>
        {children}
      </PanelInner>
    </PanelOuter>
  );
};

// Export all components
export default Panel;
