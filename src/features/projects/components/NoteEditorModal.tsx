'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { MarkdownEditor } from './MarkdownEditor';

interface NoteEditorModalProps {
  projectId: string;
  fileId?: string | null; // null for new note, string for editing
  fileName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  locale: 'nl' | 'en';
}

const translations = {
  nl: {
    newNote: 'Nieuwe Notitie',
    editNote: 'Notitie Bewerken',
    fileName: 'Bestandsnaam',
    content: 'Inhoud',
    cancel: 'Annuleren',
    save: 'Opslaan',
    saving: 'Opslaan...',
    loading: 'Laden...',
    fileNamePlaceholder: 'Voer bestandsnaam in (zonder .txt)',
    contentPlaceholder: 'Begin met typen... Gebruik markdown voor opmaak.\n\n**Vet tekst**\n*Cursieve tekst*\n~~Doorgehaalde tekst~~\n\n# Kop 1\n## Kop 2\n### Kop 3\n\n* Opsomming item 1\n* Opsomming item 2\n\n1. Genummerde item 1\n2. Genummerde item 2',
    errorSaving: 'Fout bij opslaan notitie',
    errorLoading: 'Fout bij laden notitie',
    fileNameRequired: 'Bestandsnaam is verplicht'
  },
  en: {
    newNote: 'New Note',
    editNote: 'Edit Note',
    fileName: 'File Name',
    content: 'Content',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    loading: 'Loading...',
    fileNamePlaceholder: 'Enter file name (without .txt)',
    contentPlaceholder: 'Start typing... Use markdown for formatting.\n\n**Bold text**\n*Italic text*\n~~Strikethrough text~~\n\n# Heading 1\n## Heading 2\n### Heading 3\n\n* Bullet item 1\n* Bullet item 2\n\n1. Numbered item 1\n2. Numbered item 2',
    errorSaving: 'Error saving note',
    errorLoading: 'Error loading note',
    fileNameRequired: 'File name is required'
  }
};

export function NoteEditorModal({
  projectId,
  fileId = null,
  fileName: initialFileName = '',
  isOpen,
  onClose,
  onSaved,
  locale
}: NoteEditorModalProps) {
  const [fileName, setFileName] = useState(initialFileName.replace(/\.txt$/, ''));
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[locale];
  const isEditMode = !!fileId;

  useEffect(() => {
    if (isOpen && fileId) {
      loadFileContent();
    } else if (isOpen && !fileId) {
      // Reset for new note
      setFileName('');
      setContent('');
      setError(null);
    }
  }, [isOpen, fileId]);

  async function loadFileContent() {
    setIsLoading(true);
    setError(null);

    try {
      // Get presigned URL
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) {
        throw new Error(t.errorLoading);
      }

      const data = await res.json();

      // Fetch file content
      const contentRes = await fetch(data.url);
      if (!contentRes.ok) {
        throw new Error(t.errorLoading);
      }

      const text = await contentRes.text();
      setContent(text);
    } catch (err) {
      console.error('Failed to load file content:', err);
      setError(err instanceof Error ? err.message : t.errorLoading);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!fileName.trim()) {
      setError(t.fileNameRequired);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const newFileName = `${fileName.trim()}.txt`;

      // Create file blob
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], newFileName, { type: 'text/plain' });

      // Upload new/updated file
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('files', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.errorSaving);
      }

      // If editing an existing file, delete the old version
      if (isEditMode && fileId) {
        await fetch(`/api/files/${fileId}`, {
          method: 'DELETE'
        });
      }

      // Success
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save note:', err);
      setError(err instanceof Error ? err.message : t.errorSaving);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-base">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-base border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {isEditMode ? t.editNote : t.newNote}
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-base"></div>
              <p className="text-gray-600">{t.loading}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-base space-y-base">
            {/* File Name Input */}
            <div>
              <label htmlFor="note-filename" className="block text-sm font-medium text-gray-700 mb-xs">
                {t.fileName} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-xs">
                <input
                  type="text"
                  id="note-filename"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={t.fileNamePlaceholder}
                  className="flex-1 px-base py-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSaving}
                />
                <span className="text-gray-600 font-medium">.txt</span>
              </div>
            </div>

            {/* Markdown Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-xs">
                {t.content}
              </label>
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder={t.contentPlaceholder}
                locale={locale}
                minHeight="400px"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-base py-sm rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-base p-base border-t border-gray-200">
          <Button
            variant="secondary"
            size="base"
            onClick={onClose}
            disabled={isSaving || isLoading}
          >
            {t.cancel}
          </Button>
          <Button
            variant="primary"
            size="base"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? t.saving : t.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NoteEditorModal;
