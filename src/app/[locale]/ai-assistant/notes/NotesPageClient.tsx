/**
 * NotesPageClient Component
 *
 * Placeholder implementation for the Notes section.
 * Shows a grid of note cards with a prominent create button.
 *
 * TODO: Connect to backend once notes API is implemented
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectsSidebarEnhanced } from '@/features/projects/components/ProjectsSidebarEnhanced';
import { useProjectsSidebar } from '@/features/projects/hooks/useProjectsSidebar';
import { cn } from '@/shared/utils/cn';

interface NotesPageClientProps {
  locale: string;
}

// Placeholder note type - will be replaced with actual schema
interface Note {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
  color?: string;
}

const translations = {
  nl: {
    title: 'Notities',
    createNote: 'Nieuwe notitie',
    noNotes: 'Nog geen notities',
    noNotesDescription: 'Maak je eerste notitie om te beginnen',
    lastEdited: 'Laatst bewerkt',
    comingSoon: 'Binnenkort beschikbaar',
    comingSoonDescription: 'De notities functie wordt momenteel ontwikkeld. Binnenkort kun je hier je gedachten en ideeën vastleggen.',
  },
  en: {
    title: 'Notes',
    createNote: 'New note',
    noNotes: 'No notes yet',
    noNotesDescription: 'Create your first note to get started',
    lastEdited: 'Last edited',
    comingSoon: 'Coming soon',
    comingSoonDescription: 'The notes feature is currently being developed. Soon you will be able to capture your thoughts and ideas here.',
  },
};

// Placeholder notes for visual demonstration
const PLACEHOLDER_NOTES: Note[] = [
  // Empty for now - will show "coming soon" message
];

export function NotesPageClient({ locale }: NotesPageClientProps) {
  const router = useRouter();
  const { isCollapsed, toggleSidebar, isLoaded } = useProjectsSidebar();
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [notes] = useState<Note[]>(PLACEHOLDER_NOTES);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleCreateNote = () => {
    // TODO: Open create note modal or navigate to create page
    console.log('Create note clicked');
  };

  const handleNoteClick = (noteId: string) => {
    // TODO: Navigate to note editor
    console.log('Note clicked:', noteId);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectsSidebarEnhanced
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        locale={locale}
      />

      {/* Main content */}
      <main
        className="flex-1 overflow-auto transition-all duration-normal bg-gray-50"
        style={{
          marginLeft: isCollapsed ? '60px' : '280px',
        }}
      >
        <div className="p-lg max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-xl">
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>

            {/* Create note button - prominent */}
            <button
              type="button"
              onClick={handleCreateNote}
              className={cn(
                'flex items-center gap-2 px-lg py-sm',
                'bg-primary text-white rounded-lg font-medium',
                'hover:bg-primary-hover transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'shadow-sm hover:shadow-md'
              )}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.createNote}
            </button>
          </div>

          {/* Notes grid or empty state */}
          {notes.length === 0 ? (
            // Coming soon / empty state
            <div className="flex flex-col items-center justify-center py-3xl">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-lg">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-sm">{t.comingSoon}</h2>
              <p className="text-gray-500 text-center max-w-md">{t.comingSoonDescription}</p>
            </div>
          ) : (
            // Notes grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-base">
              {notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleNoteClick(note.id)}
                  className={cn(
                    'text-left p-base bg-white rounded-lg border border-gray-200',
                    'hover:shadow-md hover:border-gray-300 transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary'
                  )}
                  style={{
                    borderTopColor: note.color || undefined,
                    borderTopWidth: note.color ? '3px' : undefined,
                  }}
                >
                  <h3 className="font-medium text-gray-900 mb-sm truncate">{note.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3 mb-sm">{note.preview}</p>
                  <p className="text-xs text-gray-400">
                    {t.lastEdited}{' '}
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                    }).format(note.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default NotesPageClient;
