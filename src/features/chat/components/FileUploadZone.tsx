/**
 * FileUploadZone Component
 *
 * Handles file upload UI with drag-and-drop and file picker
 * Features:
 * - Only shows upload button if model supports vision
 * - Blocks drag-and-drop with warning for non-vision models
 * - Auto-uploads files to /api/upload
 * - Displays file previews with FilePreview component
 * - Progress tracking for uploads
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/shared/utils/cn';
import { FilePreview } from './FilePreview';
import { validateFiles, FileValidationError, type FileType } from '@/lib/storage/file-validation';

interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  mimeType: string;
  size: number;
  previewUrl?: string;
}

export interface FileUploadZoneProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  uploadedFiles: UploadedFile[];
  chatId: string;
  disabled: boolean; // Disable during message sending
  modelSupportsVision: boolean; // NEW: Hide upload button if false
  locale: 'nl' | 'en';
}

interface FileWithProgress {
  file: File;
  id: string;
  progress: number;
  error?: string;
  uploaded?: UploadedFile;
}

export function FileUploadZone({
  onFilesUploaded,
  onFileRemove,
  uploadedFiles,
  chatId,
  disabled,
  modelSupportsVision,
  locale,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<FileWithProgress[]>([]);
  const [showModelWarning, setShowModelWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const translations = {
    nl: {
      attachFiles: 'Bestanden bijvoegen',
      dragDrop: 'Sleep bestanden hierheen of klik om te selecteren',
      modelWarning: 'Dit model ondersteunt geen afbeeldingen. Kies een vision model zoals GPT-4o, Claude Sonnet, of Gemini.',
      uploadError: 'Upload mislukt',
      validationError: 'Validatiefout',
    },
    en: {
      attachFiles: 'Attach Files',
      dragDrop: 'Drag files here or click to select',
      modelWarning: 'This model does not support images. Choose a vision model like GPT-4o, Claude Sonnet, or Gemini.',
      uploadError: 'Upload failed',
      validationError: 'Validation error',
    },
  };

  const t = translations[locale];

  /**
   * Handle file selection (from picker or drag-and-drop)
   */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Validate files client-side first
      try {
        validateFiles(
          fileArray.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
          }))
        );
      } catch (error) {
        if (error instanceof FileValidationError) {
          alert(`${t.validationError}: ${error.message}`);
        }
        return;
      }

      // Initialize upload tracking
      const filesWithProgress: FileWithProgress[] = fileArray.map((file) => ({
        file,
        id: crypto.randomUUID(),
        progress: 0,
      }));

      setUploadingFiles((prev) => [...prev, ...filesWithProgress]);

      // Upload each file
      for (const fileWithProgress of filesWithProgress) {
        try {
          await uploadFile(fileWithProgress);
        } catch (error) {
          console.error('[FileUploadZone] Upload error:', error);
          // Error is already set in uploadFile function
        }
      }
    },
    [chatId, t]
  );

  /**
   * Upload a single file to /api/upload
   */
  const uploadFile = async (fileWithProgress: FileWithProgress) => {
    const { file, id } = fileWithProgress;

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, progress } : f
            )
          );
        }
      });

      // Handle completion
      const uploadPromise = new Promise<UploadedFile>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.files && response.files.length > 0) {
              const uploadedFile = response.files[0];

              // Create preview URL for images
              let previewUrl: string | undefined;
              if (uploadedFile.fileType === 'image') {
                previewUrl = URL.createObjectURL(file);
              }

              const result: UploadedFile = {
                id: uploadedFile.id,
                name: uploadedFile.fileName,
                type: uploadedFile.fileType,
                mimeType: uploadedFile.mimeType,
                size: uploadedFile.fileSize,
                previewUrl,
              };

              resolve(result);
            } else {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);

      // Wait for upload to complete
      const uploadedFile = await uploadPromise;

      // Update state with successful upload
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, progress: 100, uploaded: uploadedFile } : f
        )
      );

      // Notify parent component
      onFilesUploaded([uploadedFile]);

      // Remove from uploading list after a short delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
      }, 500);
    } catch (error) {
      console.error('[FileUploadZone] Upload error:', error);

      // Update state with error
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                error: error instanceof Error ? error.message : t.uploadError,
              }
            : f
        )
      );
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  /**
   * Handle drag events
   */
  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);

    // If model doesn't support vision, show warning instead
    if (!modelSupportsVision) {
      setShowModelWarning(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    // Hide warning when drag leaves
    if (showModelWarning) {
      setTimeout(() => setShowModelWarning(false), 2000);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    // Block drop if model doesn't support vision
    if (!modelSupportsVision) {
      setShowModelWarning(true);
      setTimeout(() => setShowModelWarning(false), 3000);
      return;
    }

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  /**
   * Handle file remove
   */
  const handleRemoveFile = (fileId: string) => {
    // Check if file is in uploadedFiles
    const isUploaded = uploadedFiles.some((f) => f.id === fileId);
    if (isUploaded) {
      onFileRemove(fileId);
      return;
    }

    // Check if file is in uploadingFiles
    const isUploading = uploadingFiles.some((f) => f.id === fileId);
    if (isUploading) {
      setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
    }
  };

  /**
   * Retry failed upload
   */
  const handleRetryUpload = (fileId: string) => {
    const fileToRetry = uploadingFiles.find((f) => f.id === fileId);
    if (fileToRetry) {
      // Reset error and progress
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, error: undefined, progress: 0 } : f
        )
      );
      // Retry upload
      uploadFile(fileToRetry);
    }
  };

  const hasFiles = uploadedFiles.length > 0 || uploadingFiles.length > 0;

  return (
    <div className="space-y-sm">
      {/* Model Warning (shows when user tries to upload to non-vision model) */}
      {showModelWarning && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-md px-3 py-2 flex items-start gap-2">
          <svg
            className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-yellow-800">{t.modelWarning}</p>
        </div>
      )}

      {/* File Previews */}
      {hasFiles && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
          {/* Uploaded Files */}
          {uploadedFiles.map((file) => (
            <FilePreview
              key={file.id}
              file={file}
              onRemove={() => handleRemoveFile(file.id)}
              locale={locale}
            />
          ))}

          {/* Uploading Files */}
          {uploadingFiles.map((fileWithProgress) => (
            <FilePreview
              key={fileWithProgress.id}
              file={{
                name: fileWithProgress.file.name,
                type: fileWithProgress.file.type.startsWith('image/') ? 'image' : 'pdf',
                mimeType: fileWithProgress.file.type,
                size: fileWithProgress.file.size,
                previewUrl: fileWithProgress.file.type.startsWith('image/')
                  ? URL.createObjectURL(fileWithProgress.file)
                  : undefined,
              }}
              onRemove={() => handleRemoveFile(fileWithProgress.id)}
              uploading={!fileWithProgress.uploaded && !fileWithProgress.error}
              uploadProgress={fileWithProgress.progress}
              error={fileWithProgress.error}
              locale={locale}
            />
          ))}
        </div>
      )}

      {/* Upload Button (only shown if model supports vision) */}
      {modelSupportsVision && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg transition-colors',
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            onChange={handleFileInputChange}
            disabled={disabled}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-3 flex items-center justify-center gap-2',
              'text-sm font-medium text-gray-700 hover:text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg',
              disabled && 'cursor-not-allowed'
            )}
          >
            {/* Paperclip Icon */}
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            <span>{isDragging ? t.dragDrop : t.attachFiles}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default FileUploadZone;
