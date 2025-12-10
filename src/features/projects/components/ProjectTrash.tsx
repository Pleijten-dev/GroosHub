'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';

interface ProjectTrashProps {
  projectId: string;
  locale: string;
}

interface DeletedFile {
  id: string;
  file_name: string;
  file_type: string | null;
  mime_type: string;
  file_size: number;
  deleted_at: string;
  deleted_by_user_id: number;
  deleted_by_user_name: string | null;
  uploaded_by_user_name: string | null;
  created_at: string;
}

const translations = {
  nl: {
    title: 'Prullenbak',
    noFiles: 'Geen verwijderde bestanden',
    noFilesDesc: 'Bestanden worden 30 dagen bewaard voordat ze permanent worden verwijderd.',
    fileName: 'Bestandsnaam',
    deletedBy: 'Verwijderd door',
    deletedAt: 'Verwijderd op',
    uploadedBy: 'Geüpload door',
    daysRemaining: 'dagen resterend',
    restore: 'Herstellen',
    permanentlyDelete: 'Permanent verwijderen',
    confirmPermanentDelete: 'Weet je zeker dat je dit bestand permanent wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.',
    restoreSuccess: 'Bestand hersteld',
    loading: 'Laden...',
    error: 'Fout bij laden prullenbak'
  },
  en: {
    title: 'Trash',
    noFiles: 'No deleted files',
    noFilesDesc: 'Files are kept for 30 days before being permanently deleted.',
    fileName: 'File Name',
    deletedBy: 'Deleted by',
    deletedAt: 'Deleted at',
    uploadedBy: 'Uploaded by',
    daysRemaining: 'days remaining',
    restore: 'Restore',
    permanentlyDelete: 'Permanently Delete',
    confirmPermanentDelete: 'Are you sure you want to permanently delete this file? This action cannot be undone.',
    restoreSuccess: 'File restored',
    loading: 'Loading...',
    error: 'Error loading trash'
  }
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getDaysRemaining(deletedAt: string): number {
  const deleted = new Date(deletedAt);
  const now = new Date();
  const diffMs = now.getTime() - deleted.getTime();
  const daysPassed = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(30 - daysPassed));
}

export function ProjectTrash({ projectId, locale }: ProjectTrashProps) {
  const [files, setFiles] = useState<DeletedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchDeletedFiles();
  }, [projectId]);

  async function fetchDeletedFiles() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/files/trash?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        setError(t.error);
      }
    } catch (error) {
      console.error('Failed to fetch deleted files:', error);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRestore(fileId: string) {
    try {
      const res = await fetch(`/api/files/${fileId}/restore`, {
        method: 'PATCH'
      });

      if (res.ok) {
        // Remove from trash list
        setFiles(files.filter(f => f.id !== fileId));
      }
    } catch (error) {
      console.error('Failed to restore file:', error);
    }
  }

  async function handlePermanentDelete(fileId: string) {
    if (!confirm(t.confirmPermanentDelete)) return;

    try {
      // Use the same delete endpoint - it will permanently delete if already soft-deleted
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // Remove from trash list
        setFiles(files.filter(f => f.id !== fileId));
      }
    } catch (error) {
      console.error('Failed to permanently delete file:', error);
    }
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) {
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
      );
    }
    if (mimeType === 'application/pdf') {
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
        </svg>
      );
    }
    if (mimeType === 'text/plain') {
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      );
    }
    if (mimeType === 'text/csv' || mimeType === 'application/csv') {
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" />
      </svg>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-600 mt-sm">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-lg text-red-600">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-lg">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-base"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-xs">{t.noFiles}</h3>
        <p className="text-gray-600">{t.noFilesDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-base">
      <h2 className="text-xl font-semibold">{t.title}</h2>

      {/* Files List */}
      <div className="space-y-sm">
        {files.map(file => {
          const daysRemaining = getDaysRemaining(file.deleted_at);
          const isExpiringSoon = daysRemaining <= 7;

          return (
            <div
              key={file.id}
              className={cn(
                'flex items-center justify-between p-base rounded-lg border transition-colors',
                isExpiringSoon ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
              )}
            >
              <div className="flex items-center gap-base flex-1 min-w-0">
                {/* File Icon */}
                <div className="w-10 h-10 bg-gray-200 text-gray-600 flex items-center justify-center rounded flex-shrink-0">
                  {getFileIcon(file.mime_type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.file_name}</p>
                  <div className="text-xs text-gray-600 mt-xs flex items-center gap-md flex-wrap">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{t.deletedBy} {file.deleted_by_user_name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{new Date(file.deleted_at).toLocaleDateString(locale)}</span>
                  </div>
                  {file.uploaded_by_user_name && (
                    <div className="text-xs text-gray-500 mt-xs">
                      {t.uploadedBy} {file.uploaded_by_user_name}
                    </div>
                  )}
                </div>

                {/* Days Remaining Badge */}
                <div className={cn(
                  'px-sm py-xs rounded-full text-xs font-medium',
                  isExpiringSoon ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                )}>
                  {daysRemaining} {t.daysRemaining}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-xs ml-base">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRestore(file.id)}
                >
                  {t.restore}
                </Button>
                <button
                  onClick={() => handlePermanentDelete(file.id)}
                  className="p-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                  title={t.permanentlyDelete}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectTrash;
