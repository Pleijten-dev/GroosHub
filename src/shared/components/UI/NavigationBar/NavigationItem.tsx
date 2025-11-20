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

  const handleClick = (e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link
      href={href}
      className={cn(
        // Base nav item styles
        'flex items-center justify-center px-base py-sm rounded-md text-sm font-medium transition-all duration-fast border border-transparent',
        // Prevent text wrapping
        'whitespace-nowrap',
        // Default state
        !item.disabled && 'text-text-secondary hover:text-text-primary hover:bg-gray-100',
        // Active state
        isActive && !item.disabled && 'bg-primary-light text-primary border-primary font-semibold',
        // Interactive effects
        !item.disabled && 'hover:transform hover:-translate-y-px hover:shadow-sm',
        // Disabled state
        item.disabled && 'text-gray-400 cursor-not-allowed opacity-50 pointer-events-none',
        // Focus state
        !item.disabled && utils.focusRing('primary')
      )}
      onClick={handleClick}
      role="menuitem"
      aria-disabled={item.disabled}
    >
      <span>
        {t(item.labelKey)}
      </span>
    </Link>
  );
};

export default NavigationItem;