// src/shared/components/UI/StatusBadge/StatusBadge.tsx
// Clean implementation of StatusBadge component using design system

import React from 'react';
import { useDesignSystem, ColorVariant } from '../../../hooks/useDesignSystem';

export interface StatusBadgeProps {
  variant: ColorVariant;
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  children,
  className = ''
}) => {
  const { classBuilders, utils } = useDesignSystem();

  const badgeClass = classBuilders.status(
    variant,
    utils.cn('inline-flex items-center px-sm py-xs text-xs font-medium rounded-base border', className)
  );

  return (
    <span className={badgeClass}>
      {children}
    </span>
  );
};

export default StatusBadge;