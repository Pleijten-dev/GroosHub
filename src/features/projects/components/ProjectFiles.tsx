'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';
import { FileUploadZone } from './FileUploadZone';
import { FileRenameModal } from './FileRenameModal';
import { FilePreviewModal } from './FilePreviewModal';
import { NoteEditorModal } from './NoteEditorModal';

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

type ViewMode = 'grid' | 'list';

export function ProjectFiles({ projectId, locale, canManageFiles }: ProjectFilesProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modal states
  const [previewFile, setPreviewFile] = useState<FileUpload | null>(null);
  const [renameFile, setRenameFile] = useState<FileUpload | null>(null);
  const [editNoteFile, setEditNoteFile] = useState<FileUpload | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);

  const translations = {
    nl: {
      files: 'Bestanden',
      uploadFile: 'Bestand Uploaden',
      createNote: 'Notitie Maken',
      noFiles: 'Nog geen bestanden',
      uploadedBy: 'Geüpload door',
      confirmDelete: 'Weet je zeker dat je dit bestand wilt verwijderen? Het kan binnen 30 dagen worden hersteld.',
      loading: 'Laden...',
      errorLoading: 'Fout bij laden bestanden',
      gridView: 'Roosterweergave',
      listView: 'Lijstweergave',
      preview: 'Voorbeeld',
      edit: 'Bewerken',
      rename: 'Hernoemen',
      delete: 'Verwijderen',
      download: 'Downloaden'
    },
    en: {
      files: 'Files',
      uploadFile: 'Upload File',
      createNote: 'Create Note',
      noFiles: 'No files yet',
      uploadedBy: 'Uploaded by',
      confirmDelete: 'Are you sure you want to delete this file? It can be restored within 30 days.',
      loading: 'Loading...',
      errorLoading: 'Error loading files',
      gridView: 'Grid View',
      listView: 'List View',
      preview: 'Preview',
      edit: 'Edit',
      rename: 'Rename',
      delete: 'Delete',
      download: 'Download'
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

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) {
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (mimeType === 'application/pdf') {
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }

  // Drag and drop handlers for the entire files section
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only activate if user can manage files and files are being dragged
    if (canManageFiles && e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
      setShowUpload(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set dragOver false, keep showUpload true so zone stays visible
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // Check if mouse left the container bounds
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

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
    <div
      className="space-y-base"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t.files}</h2>
        <div className="flex items-center gap-sm">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-sm py-xs rounded-l-lg transition-colors',
                viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-gray-100'
              )}
              title={t.gridView}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-sm py-xs rounded-r-lg transition-colors',
                viewMode === 'list' ? 'bg-primary text-white' : 'hover:bg-gray-100'
              )}
              title={t.listView}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {canManageFiles && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNewNote(true)}
              >
                {t.createNote}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowUpload(!showUpload)}
              >
                {t.uploadFile}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      {showUpload && canManageFiles && (
        <FileUploadZone
          projectId={projectId}
          onUploadComplete={() => {
            fetchFiles();
            setShowUpload(false);
            setIsDragOver(false);
          }}
          locale={locale as 'nl' | 'en'}
        />
      )}

      {/* Files Display */}
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-base">
          {files.map(file => (
            <div
              key={file.id}
              className="group relative bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail/Icon */}
              <div
                className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center cursor-pointer"
                onClick={() => setPreviewFile(file)}
              >
                <div className="text-blue-600">
                  {getFileIcon(file.mime_type)}
                </div>
              </div>

              {/* File Info */}
              <div className="p-sm">
                <p className="font-medium text-sm text-gray-900 truncate" title={file.file_name}>
                  {file.file_name}
                </p>
                <p className="text-xs text-gray-600 mt-xs">
                  {formatFileSize(file.file_size)}
                </p>
              </div>

              {/* Actions Overlay */}
              {canManageFiles && (
                <div className="absolute top-sm right-sm flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.mime_type === 'text/plain' && (
                    <button
                      onClick={() => setEditNoteFile(file)}
                      className="p-xs bg-white rounded shadow hover:bg-blue-50"
                      title={t.edit}
                    >
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setRenameFile(file)}
                    className="p-xs bg-white rounded shadow hover:bg-gray-100"
                    title={t.rename}
                  >
                    <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-xs bg-white rounded shadow hover:bg-red-50"
                    title={t.delete}
                  >
                    <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
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
                  {getFileIcon(file.mime_type)}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewFile(file)}
                  title={t.preview}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Button>

                {canManageFiles && (
                  <>
                    {file.mime_type === 'text/plain' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditNoteFile(file)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title={t.edit}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRenameFile(file)}
                      title={t.rename}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title={t.delete}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal
          fileId={previewFile.id}
          fileName={previewFile.file_name}
          fileType={previewFile.file_type || 'unknown'}
          mimeType={previewFile.mime_type}
          fileSize={previewFile.file_size}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          locale={locale as 'nl' | 'en'}
        />
      )}

      {renameFile && (
        <FileRenameModal
          fileId={renameFile.id}
          currentName={renameFile.file_name}
          isOpen={!!renameFile}
          onClose={() => setRenameFile(null)}
          onRename={() => {
            fetchFiles();
            setRenameFile(null);
          }}
          locale={locale as 'nl' | 'en'}
        />
      )}

      {/* Note Editor Modals */}
      <NoteEditorModal
        projectId={projectId}
        fileId={editNoteFile?.id || null}
        fileName={editNoteFile?.file_name || ''}
        isOpen={!!editNoteFile}
        onClose={() => setEditNoteFile(null)}
        onSaved={() => {
          fetchFiles();
          setEditNoteFile(null);
        }}
        locale={locale as 'nl' | 'en'}
      />

      <NoteEditorModal
        projectId={projectId}
        isOpen={showNewNote}
        onClose={() => setShowNewNote(false)}
        onSaved={() => {
          fetchFiles();
          setShowNewNote(false);
        }}
        locale={locale as 'nl' | 'en'}
      />
    </div>
  );
}

export default ProjectFiles;
