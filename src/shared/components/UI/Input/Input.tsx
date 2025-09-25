// src/shared/components/UI/Input/Input.tsx
// Clean implementation of Input component using design system

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { useDesignSystem } from '../../../hooks/useDesignSystem';
import { cn } from '../../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  const { classBuilders } = useDesignSystem();

  const inputClass = classBuilders.input(
    cn(
      leftIcon && 'pl-xl',
      rightIcon && 'pr-xl',
      error && 'border-error focus:border-error focus:shadow-[0_0_0_3px_var(--color-error-light)]',
      className
    )
  );

  return (
    <div className="space-y-xs">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-md top-1/2 -translate-y-1/2 text-text-muted">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          className={inputClass}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-md top-1/2 -translate-y-1/2 text-text-muted">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-text-muted">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;