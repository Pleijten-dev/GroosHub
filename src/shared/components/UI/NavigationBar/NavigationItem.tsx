// src/shared/components/UI/NavigationBar/NavigationItem.tsx
// Updated with Design System Components

import React from 'react';
import Link from 'next/link';
import { NavigationItemProps } from './types';
import { useTranslation } from '../../../hooks/useTranslation';
import { useDesignSystem } from '../../../hooks/useDesignSystem';
import { cn } from '../../../utils/cn';

export const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  locale,
  isActive,
  onClick,
}) => {
  const { t } = useTranslation(locale);
  const { utils } = useDesignSystem();
  const href = `/${locale}${item.href}`;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link
      href={href}
      className={cn(
        // Base nav item styles
        'flex items-center px-base py-sm rounded-md text-sm font-medium transition-all duration-fast border border-transparent',
        // Default state
        'text-text-secondary hover:text-text-primary hover:bg-gray-100',
        // Active state
        isActive && 'bg-primary-light text-primary border-primary font-semibold',
        // Interactive effects
        'hover:transform hover:-translate-y-px hover:shadow-sm',
        // Focus state
        utils.focusRing('primary')
      )}
      onClick={handleClick}
      role="menuitem"
    >
      <span>
        {t(item.labelKey)}
      </span>
    </Link>
  );
};

export default NavigationItem;