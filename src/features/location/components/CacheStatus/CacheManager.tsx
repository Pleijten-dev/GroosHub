"use client";

import React, { useState, useEffect } from 'react';
import { locationDataCache, type CacheStats } from '../../data/cache/locationDataCache';
import { ConfirmDialog } from '@/shared/components/UI/Modal/ConfirmDialog';
import { AlertDialog } from '@/shared/components/UI/Modal/AlertDialog';

export interface CacheManagerProps {
  locale: 'nl' | 'en';
  onClearCache?: () => void;
  onRefresh?: () => void;
}

/**
 * Cache management component
 * Shows cache statistics and provides clear/refresh controls
 */
export const CacheManager: React.FC<CacheManagerProps> = ({
  locale,
  onClearCache,
  onRefresh,
}) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [clearDialog, setClearDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  useEffect(() => {
    updateStats();
  }, []);

  const updateStats = () => {
    const newStats = locationDataCache.getStats();
    setStats(newStats);
  };

  const handleClearCache = () => {
    setClearDialog(true);
  };

  const confirmClearCache = () => {
    locationDataCache.clearAll();
    updateStats();
    setClearDialog(false);
    if (onClearCache) {
      onClearCache();
    }
  };

  const handleCleanupExpired = () => {
    const removed = locationDataCache.cleanupExpired();
    updateStats();
    setSuccessDialog({
      isOpen: true,
      message: locale === 'nl'
        ? `${removed} verlopen items verwijderd`
        : `${removed} expired items removed`,
    });
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  if (!stats) {
    return null;
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-sm">
      <div className="flex items-center justify-between mb-xs">
        <h3 className="text-sm font-semibold text-gray-800">
          {locale === 'nl' ? 'Cache Beheer' : 'Cache Management'}
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {expanded
            ? (locale === 'nl' ? 'Verberg' : 'Hide')
            : (locale === 'nl' ? 'Toon details' : 'Show details')}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-sm text-xs mb-sm">
        <div className="bg-white p-xs rounded border border-gray-200">
          <div className="text-gray-500 mb-xs">
            {locale === 'nl' ? 'Totaal items' : 'Total items'}
          </div>
          <div className="text-lg font-semibold text-gray-800">
            {stats.totalEntries}
          </div>
        </div>
        <div className="bg-white p-xs rounded border border-gray-200">
          <div className="text-gray-500 mb-xs">
            {locale === 'nl' ? 'Geldig' : 'Valid'}
          </div>
          <div className="text-lg font-semibold text-green-600">
            {stats.validEntries}
          </div>
        </div>
        <div className="bg-white p-xs rounded border border-gray-200">
          <div className="text-gray-500 mb-xs">
            {locale === 'nl' ? 'Verlopen' : 'Expired'}
          </div>
          <div className="text-lg font-semibold text-orange-600">
            {stats.expiredEntries}
          </div>
        </div>
        <div className="bg-white p-xs rounded border border-gray-200">
          <div className="text-gray-500 mb-xs">
            {locale === 'nl' ? 'Grootte' : 'Size'}
          </div>
          <div className="text-lg font-semibold text-gray-800">
            {formatSize(stats.cacheSize)}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && stats.cachedAddresses.length > 0 && (
        <div className="mb-sm">
          <div className="text-xs font-medium text-gray-700 mb-xs">
            {locale === 'nl' ? 'Gecachte adressen:' : 'Cached addresses:'}
          </div>
          <div className="bg-white p-xs rounded border border-gray-200 max-h-32 overflow-y-auto">
            <ul className="text-xs space-y-xs">
              {stats.cachedAddresses.map((address, idx) => (
                <li key={idx} className="text-gray-600">
                  • {address}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-xs">
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className="px-sm py-xs text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {locale === 'nl' ? '🔄 Vernieuw data' : '🔄 Refresh data'}
          </button>
        )}

        {stats.expiredEntries > 0 && (
          <button
            onClick={handleCleanupExpired}
            className="px-sm py-xs text-xs font-medium rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          >
            {locale === 'nl'
              ? `🧹 Verwijder verlopen (${stats.expiredEntries})`
              : `🧹 Remove expired (${stats.expiredEntries})`}
          </button>
        )}

        {stats.totalEntries > 0 && (
          <button
            onClick={handleClearCache}
            className="px-sm py-xs text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {locale === 'nl' ? '🗑️ Wis alle cache' : '🗑️ Clear all cache'}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-sm text-xs text-gray-500">
        {locale === 'nl'
          ? 'Cache vervalt automatisch na 24 uur. Data wordt lokaal opgeslagen in je browser.'
          : 'Cache expires automatically after 24 hours. Data is stored locally in your browser.'}
      </div>

      {/* Clear Cache Confirmation Dialog */}
      <ConfirmDialog
        isOpen={clearDialog}
        onClose={() => setClearDialog(false)}
        onConfirm={confirmClearCache}
        title={locale === 'nl' ? 'Cache wissen' : 'Clear Cache'}
        message={locale === 'nl'
          ? 'Weet je zeker dat je de cache wilt wissen? Je moet de locatiegegevens opnieuw laden.'
          : 'Are you sure you want to clear the cache? You will need to reload location data.'}
        confirmText={locale === 'nl' ? 'Wissen' : 'Clear'}
        cancelText={locale === 'nl' ? 'Annuleren' : 'Cancel'}
        variant="warning"
      />

      {/* Success Alert Dialog */}
      <AlertDialog
        isOpen={successDialog.isOpen}
        onClose={() => setSuccessDialog({ isOpen: false, message: '' })}
        title={locale === 'nl' ? 'Succes' : 'Success'}
        message={successDialog.message}
        closeText={locale === 'nl' ? 'Sluiten' : 'Close'}
        variant="success"
      />
    </div>
  );
};
