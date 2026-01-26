'use client';

/**
 * SaveSnapshotButton - Save rapport to database
 *
 * Allows users to save generated rapport data to the database
 * so they can retrieve it later without regenerating.
 */

import React, { useState } from 'react';
import type { CachedRapportData } from '../../data/cache/rapportCache';
import type { CompactLocationExport } from '../../utils/jsonExportCompact';

interface SaveSnapshotButtonProps {
  locale: 'nl' | 'en';
  cachedData: CachedRapportData | null;
  inputData: CompactLocationExport | null;
  className?: string;
  onSaved?: (snapshotId: string) => void;
}

export function SaveSnapshotButton({
  locale,
  cachedData,
  inputData,
  className,
  onSaved,
}: SaveSnapshotButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  if (!cachedData || !inputData) {
    return null;
  }

  const defaultName = `${cachedData.locationAddress} - ${new Date().toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US')}`;

  const handleSave = async () => {
    if (!snapshotName.trim()) {
      setSnapshotName(defaultName);
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/rapport-snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: snapshotName.trim() || defaultName,
          locationAddress: cachedData.locationAddress,
          latitude: cachedData.coordinates?.lat,
          longitude: cachedData.coordinates?.lon,
          locale: cachedData.locale,
          stage1Output: cachedData.stage1Output,
          stage2Output: cachedData.stage2Output,
          stage3Output: cachedData.stage3Output,
          combinedProgram: cachedData.combinedProgram,
          inputData: inputData,
          inputHash: cachedData.inputHash,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save snapshot');
      }

      const result = await response.json();
      setSavedId(result.data.id);
      setShowNameInput(false);

      if (onSaved) {
        onSaved(result.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (savedId) {
    return (
      <div className={`text-sm text-green-600 flex items-center gap-1 ${className}`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {locale === 'nl' ? 'Opgeslagen!' : 'Saved!'}
      </div>
    );
  }

  if (showNameInput) {
    return (
      <div className={`space-y-2 ${className}`}>
        <input
          type="text"
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          placeholder={defaultName}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving
              ? (locale === 'nl' ? 'Opslaan...' : 'Saving...')
              : (locale === 'nl' ? 'Opslaan' : 'Save')}
          </button>
          <button
            onClick={() => setShowNameInput(false)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {locale === 'nl' ? 'Annuleren' : 'Cancel'}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowNameInput(true)}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 text-sm
        border border-gray-300 rounded-md
        hover:bg-gray-50 transition-colors
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
      {locale === 'nl' ? 'Bewaar snapshot' : 'Save snapshot'}
    </button>
  );
}

export default SaveSnapshotButton;
