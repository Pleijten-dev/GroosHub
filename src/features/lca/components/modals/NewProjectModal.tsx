/**
 * New Project Modal Component
 *
 * Modal for starting a new LCA project with 4 different options:
 * 1. Quick Start - Fastest way with predefined templates
 * 2. Custom Build - Build from scratch
 * 3. From Template - Use a community template
 * 4. BIM Import - Import from Grasshopper/Revit
 *
 * Features:
 * - Modal overlay with backdrop
 * - Close on backdrop click or Escape key
 * - Responsive design
 * - Bilingual support
 * - Accessible with focus trap
 *
 * @module features/lca/components/modals
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/shared/utils/cn';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface NewProjectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Locale for translations */
  locale?: 'nl' | 'en';
}

interface StartOption {
  id: string;
  title: {
    nl: string;
    en: string;
  };
  description: {
    nl: string;
    en: string;
  };
  icon: string;
  path: string;
  recommended?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const START_OPTIONS: StartOption[] = [
  {
    id: 'quick-start',
    title: {
      nl: 'Snelstart',
      en: 'Quick Start',
    },
    description: {
      nl: 'Kies een bouwsysteem en start direct. Ideaal voor eerste verkenning.',
      en: 'Choose a construction system and start immediately. Ideal for first exploration.',
    },
    icon: '⚡',
    path: '/lca/quick-start',
    recommended: true,
  },
  {
    id: 'custom',
    title: {
      nl: 'Aangepast Project',
      en: 'Custom Build',
    },
    description: {
      nl: 'Bouw volledig op maat. Volledige controle over elk element en materiaal.',
      en: 'Build completely custom. Full control over every element and material.',
    },
    icon: '🔧',
    path: '/lca/projects/new',
  },
  {
    id: 'template',
    title: {
      nl: 'Vanuit Sjabloon',
      en: 'From Template',
    },
    description: {
      nl: 'Start met een bestaand sjabloon en pas aan naar wens.',
      en: 'Start with an existing template and customize as needed.',
    },
    icon: '📋',
    path: '/lca/templates',
  },
  {
    id: 'bim-import',
    title: {
      nl: 'BIM Import',
      en: 'BIM Import',
    },
    description: {
      nl: 'Importeer geometrie en materialen uit Grasshopper of Revit.',
      en: 'Import geometry and materials from Grasshopper or Revit.',
    },
    icon: '📦',
    path: '/lca/import',
  },
];

const TRANSLATIONS = {
  nl: {
    title: 'Nieuw LCA Project',
    subtitle: 'Kies hoe je wilt beginnen',
    cancel: 'Annuleren',
    recommended: 'Aanbevolen',
  },
  en: {
    title: 'New LCA Project',
    subtitle: 'Choose how you want to start',
    cancel: 'Cancel',
    recommended: 'Recommended',
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * New Project Modal Component
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <NewProjectModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   locale="nl"
 * />
 * ```
 */
export function NewProjectModal({
  isOpen,
  onClose,
  locale = 'nl',
}: NewProjectModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[locale];

  // ============================================
  // KEYBOARD & FOCUS HANDLING
  // ============================================

  useEffect(() => {
    if (!isOpen) return;

    // Focus trap and Escape key handler
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    // Trap focus within modal
    function handleFocusTrap(event: FocusEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        event.preventDefault();
        modalRef.current.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusTrap);

    // Focus modal on open
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusTrap);
    };
  }, [isOpen, onClose]);

  // ============================================
  // HANDLERS
  // ============================================

  function handleOptionSelect(path: string) {
    onClose();
    router.push(`/${locale}${path}`);
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  // Don't render if not open
  if (!isOpen) return null;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-3xl',
          'rounded-lg bg-white shadow-2xl',
          'animate-in zoom-in-95 duration-200'
        )}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="modal-title"
                className="text-2xl font-semibold text-gray-900"
              >
                {t.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{t.subtitle}</p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'rounded-base p-1',
                'text-gray-400 hover:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-primary'
              )}
              aria-label={t.cancel}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {START_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionSelect(option.path)}
              className={cn(
                'group relative flex flex-col items-start gap-3 rounded-lg border-2 p-6 text-left transition-all',
                'hover:border-primary hover:shadow-md',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                option.recommended
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white'
              )}
            >
              {/* Recommended badge */}
              {option.recommended && (
                <span className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                  {t.recommended}
                </span>
              )}

              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl group-hover:bg-primary/10">
                {option.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary">
                  {option.title[locale]}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {option.description[locale]}
                </p>
              </div>

              {/* Arrow icon */}
              <div className="ml-auto text-gray-400 group-hover:text-primary">
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'rounded-base px-4 py-2',
                'text-sm font-medium text-gray-700',
                'hover:bg-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

NewProjectModal.displayName = 'NewProjectModal';

export default NewProjectModal;
