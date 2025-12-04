'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';

interface ProjectFilesProps {
  projectId: string;
  locale: string;
  canManageFiles: boolean;
}

interface FileUpload {
  id: string;
  file_name: string;
  file_type: string | null;
  mime_type: string;
  file_size: number;
  storage_url: string | null;
  processing_status: string;
  created_at: string;
  user_name: string;
  chat_id: string | null;
}

export function ProjectFiles({ projectId, locale, canManageFiles }: ProjectFilesProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const translations = {
    nl: {
      files: 'Bestanden',
      uploadFile: 'Bestand Uploaden',
      noFiles: 'Nog geen bestanden',
      uploadedBy: 'Geüpload door',
      confirmDelete: 'Weet je zeker dat je dit bestand wilt verwijderen?',
      loading: 'Laden...',
      errorLoading: 'Fout bij laden bestanden'
    },
    en: {
      files: 'Files',
      uploadFile: 'Upload File',
      noFiles: 'No files yet',
      uploadedBy: 'Uploaded by',
      confirmDelete: 'Are you sure you want to delete this file?',
      loading: 'Loading...',
      errorLoading: 'Error loading files'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  async function fetchFiles() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/files?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        setError(t.errorLoading);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setError(t.errorLoading);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchFiles();
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
      <div className="text-center py-lg">
        <p className="text-red-600">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchFiles} className="mt-base">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-base">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t.files}</h2>
        {canManageFiles && (
          <Button variant="primary" size="sm" disabled>
            {t.uploadFile}
          </Button>
        )}
      </div>

      {/* Files List */}
      {files.length === 0 ? (
        <div className="text-center py-lg border-2 border-dashed border-gray-300 rounded-lg">
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
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-600">{t.noFiles}</p>
        </div>
      ) : (
        <div className="space-y-sm">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center justify-between p-base bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-base flex-1 min-w-0">
                {/* File Icon */}
                <div className="w-10 h-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded flex-shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.file_name}</p>
                  <div className="text-xs text-gray-600 mt-xs flex items-center gap-md flex-wrap">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{file.file_type || 'unknown'}</span>
                    <span>•</span>
                    <span className={cn(
                      file.processing_status === 'completed' && 'text-green-600',
                      file.processing_status === 'processing' && 'text-blue-600',
                      file.processing_status === 'failed' && 'text-red-600',
                      file.processing_status === 'pending' && 'text-gray-500'
                    )}>
                      {file.processing_status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-xs">
                    {t.uploadedBy} {file.user_name} • {new Date(file.created_at).toLocaleDateString(locale)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-sm">
                {file.storage_url && (
                  <a
                    href={file.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark"
                  >
                    <Button variant="ghost" size="sm">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </Button>
                  </a>
                )}

                {canManageFiles && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectFiles;
