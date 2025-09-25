// src/shared/components/UI/Button/Button.tsx
// Clean implementation of Button component using design system

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { useDesignSystem, ButtonVariant, ButtonSize } from '../../../hooks/useDesignSystem';
import { cn } from '../../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'base', 
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  const { classBuilders, utils } = useDesignSystem();

  // Build button classes using design system
  const buttonClass = classBuilders.button(
    variant,
    size,
    cn(
      fullWidth && 'w-full',
      loading && 'relative',
      className
    )
  );

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={buttonClass}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <div className={cn(
        'flex items-center gap-sm',
        loading && 'opacity-0'
      )}>
        {icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        
        <span>{children}</span>
        
        {icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </div>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;