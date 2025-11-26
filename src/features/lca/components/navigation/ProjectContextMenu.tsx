/**
 * Project Context Menu Component
 *
 * Dropdown menu for project actions, triggered by a ⋮ button.
 * Provides actions: Open, Duplicate, Rename, Export, Archive, Delete.
 *
 * Features:
 * - Click-outside detection to close
 * - Keyboard navigation (Escape to close)
 * - Positioned relative to trigger button
 * - Bilingual support
 * - Action callbacks
 *
 * @module features/lca/components/navigation
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ProjectContextMenuProps {
  /** Project ID for actions */
  projectId: string;
  /** Project name (for confirmation dialogs) */
  projectName?: string;
  /** Callback when Open is clicked */
  onOpen?: (projectId: string) => void;
  /** Callback when Duplicate is clicked */
  onDuplicate?: (projectId: string) => void;
  /** Callback when Rename is clicked */
  onRename?: (projectId: string) => void;
  /** Callback when Export is clicked */
  onExport?: (projectId: string) => void;
  /** Callback when Archive is clicked */
  onArchive?: (projectId: string) => void;
  /** Callback when Delete is clicked */
  onDelete?: (projectId: string) => void;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Additional CSS classes for trigger button */
  className?: string;
}

interface MenuAction {
  id: string;
  label: {
    nl: string;
    en: string;
  };
  icon: string;
  variant: 'default' | 'danger';
  action: (projectId: string) => void;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    menuLabel: 'Project acties',
  },
  en: {
    menuLabel: 'Project actions',
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * Project Context Menu Component
 *
 * @example
 * ```tsx
 * <ProjectContextMenu
 *   projectId="abc-123"
 *   projectName="Timber House"
 *   onOpen={(id) => router.push(`/lca/projects/${id}`)}
 *   onDelete={(id) => handleDeleteProject(id)}
 *   locale="nl"
 * />
 * ```
 */
export function ProjectContextMenu({
  projectId,
  projectName = '',
  onOpen,
  onDuplicate,
  onRename,
  onExport,
  onArchive,
  onDelete,
  locale = 'nl',
  className,
}: ProjectContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = TRANSLATIONS[locale];

  // ============================================
  // MENU ACTIONS
  // ============================================

  const actions: MenuAction[] = [
    {
      id: 'open',
      label: { nl: 'Openen', en: 'Open' },
      icon: '📂',
      variant: 'default',
      action: (id: string) => {
        onOpen?.(id);
        setIsOpen(false);
      },
    },
    {
      id: 'duplicate',
      label: { nl: 'Dupliceren', en: 'Duplicate' },
      icon: '📋',
      variant: 'default',
      action: (id: string) => {
        onDuplicate?.(id);
        setIsOpen(false);
      },
    },
    {
      id: 'rename',
      label: { nl: 'Hernoemen', en: 'Rename' },
      icon: '✏️',
      variant: 'default',
      action: (id: string) => {
        onRename?.(id);
        setIsOpen(false);
      },
    },
    {
      id: 'export',
      label: { nl: 'Exporteren', en: 'Export' },
      icon: '💾',
      variant: 'default',
      action: (id: string) => {
        onExport?.(id);
        setIsOpen(false);
      },
    },
    {
      id: 'archive',
      label: { nl: 'Archiveren', en: 'Archive' },
      icon: '📦',
      variant: 'default',
      action: (id: string) => {
        onArchive?.(id);
        setIsOpen(false);
      },
    },
    {
      id: 'delete',
      label: { nl: 'Verwijderen', en: 'Delete' },
      icon: '🗑️',
      variant: 'danger',
      action: (id: string) => {
        // Confirmation is handled by the parent
        onDelete?.(id);
        setIsOpen(false);
      },
    },
  ];

  // ============================================
  // CLICK OUTSIDE HANDLER
  // ============================================

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center',
          'h-8 w-8 rounded-base',
          'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
          'transition-colors',
          className
        )}
        aria-label={t.menuLabel}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            'absolute right-0 z-50 mt-2',
            'w-48 rounded-base border border-gray-200 bg-white shadow-lg',
            'py-1',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => action.action(projectId)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2',
                'text-left text-sm',
                'transition-colors',
                action.variant === 'danger'
                  ? 'text-red-700 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50',
                'focus:outline-none focus:bg-gray-100'
              )}
              role="menuitem"
            >
              <span className="text-base" aria-hidden="true">
                {action.icon}
              </span>
              <span>{action.label[locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

ProjectContextMenu.displayName = 'ProjectContextMenu';

export default ProjectContextMenu;
