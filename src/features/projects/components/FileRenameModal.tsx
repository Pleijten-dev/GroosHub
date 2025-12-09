'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';

interface FileRenameModalProps {
  fileId: string;
  currentName: string;
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  locale: 'nl' | 'en';
}

const translations = {
  nl: {
    rename: 'Hernoemen',
    newName: 'Nieuwe naam',
    cancel: 'Annuleren',
    save: 'Opslaan',
    saving: 'Opslaan...',
    error: 'Fout bij hernoemen',
    required: 'Bestandsnaam is verplicht'
  },
  en: {
    rename: 'Rename',
    newName: 'New name',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    error: 'Failed to rename',
    required: 'Filename is required'
  }
};

export function FileRenameModal({
  fileId,
  currentName,
  isOpen,
  onClose,
  onRename,
  locale
}: FileRenameModalProps) {
  const [newName, setNewName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[locale];

  const handleRename = async () => {
    if (!newName.trim()) {
      setError(t.required);
      return;
    }

    setIsRenaming(true);
    setError(null);

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_filename: newName.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.error);
      }

      onRename();
      onClose();
    } catch (err) {
      console.error('Rename error:', err);
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsRenaming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-base">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-lg">
          <h2 className="text-xl font-semibold mb-base">{t.rename}</h2>

          <div className="space-y-base">
            <div>
              <label htmlFor="new-name" className="block text-sm font-medium text-gray-700 mb-xs">
                {t.newName}
              </label>
              <input
                id="new-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-base py-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isRenaming}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') onClose();
                }}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-base py-sm rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-sm justify-end">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isRenaming}
              >
                {t.cancel}
              </Button>
              <Button
                variant="primary"
                onClick={handleRename}
                disabled={isRenaming || !newName.trim()}
              >
                {isRenaming ? t.saving : t.save}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
