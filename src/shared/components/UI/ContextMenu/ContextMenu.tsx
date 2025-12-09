'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';
import { useDesignSystem } from '@/shared/hooks/useDesignSystem';
import { Button } from '../Button/Button';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  separator?: boolean; // Show separator after this item
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  className?: string;
  iconClassName?: string;
}

export function ContextMenu({ items, className, iconClassName }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { classBuilders } = useDesignSystem();

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Three-dot menu button */}
      <Button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        variant="ghost"
        size="sm"
        className={cn(
          'w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity',
          iconClassName
        )}
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </Button>

      {/* Dropdown menu */}
      <div
        ref={menuRef}
        className={cn(
          'absolute right-0 top-full mt-xs z-dropdown',
          classBuilders.glass(true, 'border shadow-lg rounded-lg py-xs'),
          'min-w-[160px]',
          'transition-all duration-fast',
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        )}
        role="menu"
        aria-hidden={!isOpen}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <button
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              className={cn(
                'w-full text-left px-sm py-xs flex items-center gap-sm transition-colors',
                'text-sm',
                item.variant === 'danger'
                  ? 'text-error hover:bg-error-light'
                  : 'text-text-primary hover:bg-gray-100',
                item.disabled && 'opacity-50 cursor-not-allowed',
                !item.disabled && 'cursor-pointer'
              )}
              role="menuitem"
            >
              {item.icon && (
                <span className="flex-shrink-0">{item.icon}</span>
              )}
              <span className="flex-1">{item.label}</span>
            </button>
            {item.separator && index < items.length - 1 && (
              <div className="h-px bg-border my-xs" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default ContextMenu;
