/**
 * MessageInput Component
 *
 * Reusable message input with file attachment, RAG toggle, and keyboard shortcuts.
 * Used across the AI assistant for consistent messaging experience.
 *
 * Features:
 * - Auto-resize textarea
 * - RAG toggle button
 * - File attachment with drag and drop
 * - Send button with keyboard shortcuts (Ctrl/Cmd + Enter)
 * - Loading/disabled states
 * - Model-aware file uploads (vision support detection)
 */

'use client';

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/shared/utils/cn';

// ============================================================================
// Types
// ============================================================================

export interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  mimeType: string;
  size: number;
  previewUrl?: string;
}

export interface MessageInputProps {
  /** Called when user submits a message */
  onSubmit: (message: string, files?: UploadedFile[], ragEnabled?: boolean) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Disable the entire input */
  disabled?: boolean;
  /** Show loading state (e.g., during streaming) */
  isLoading?: boolean;
  /** Show the RAG toggle button */
  showRagToggle?: boolean;
  /** Current RAG state */
  ragEnabled?: boolean;
  /** Called when RAG is toggled */
  onRagToggle?: (enabled: boolean) => void;
  /** Show file attachment functionality */
  showFileAttachment?: boolean;
  /** Whether the current model supports vision (images) */
  modelSupportsVision?: boolean;
  /** Chat ID for file uploads */
  chatId?: string;
  /** Accepted file types */
  acceptedFileTypes?: string;
  /** Maximum number of files */
  maxFiles?: number;
  /** Current locale */
  locale?: 'nl' | 'en';
  /** Additional class names */
  className?: string;
  /** Called when stop is requested during loading */
  onStop?: () => void;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
}

interface FileWithProgress {
  file: File;
  id: string;
  progress: number;
  error?: string;
  uploaded?: UploadedFile;
}

// ============================================================================
// Translations
// ============================================================================

const translations = {
  nl: {
    placeholder: 'Typ je bericht...',
    send: 'Versturen',
    stop: 'Stop',
    ragOn: 'RAG AAN',
    ragOff: 'RAG UIT',
    attachFiles: 'Bestanden bijvoegen',
    dragDrop: 'Sleep bestanden hierheen',
    shortcuts: 'Ctrl+Enter om te versturen',
    modelWarning: 'Dit model ondersteunt geen afbeeldingen',
    uploading: 'Uploaden...',
    removeFile: 'Verwijderen',
  },
  en: {
    placeholder: 'Type your message...',
    send: 'Send',
    stop: 'Stop',
    ragOn: 'RAG ON',
    ragOff: 'RAG OFF',
    attachFiles: 'Attach files',
    dragDrop: 'Drop files here',
    shortcuts: 'Ctrl+Enter to send',
    modelWarning: 'This model does not support images',
    uploading: 'Uploading...',
    removeFile: 'Remove',
  },
};

// ============================================================================
// Component
// ============================================================================

export function MessageInput({
  onSubmit,
  placeholder,
  disabled = false,
  isLoading = false,
  showRagToggle = false,
  ragEnabled = false,
  onRagToggle,
  showFileAttachment = true,
  modelSupportsVision = false,
  chatId,
  acceptedFileTypes = 'image/png,image/jpeg,image/webp,image/gif,application/pdf',
  maxFiles = 5,
  locale = 'nl',
  className,
  onStop,
  autoFocus = false,
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showModelWarning, setShowModelWarning] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[locale];
  const isDisabled = disabled || isLoading;
  const hasFiles = uploadedFiles.length > 0 || uploadingFiles.length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!input.trim() || isDisabled) return;

    onSubmit(input.trim(), uploadedFiles.length > 0 ? uploadedFiles : undefined, ragEnabled);
    setInput('');
    setUploadedFiles([]);
  }, [input, isDisabled, onSubmit, uploadedFiles, ragEnabled]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter: Submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // File upload handler
  const uploadFile = async (fileWithProgress: FileWithProgress) => {
    if (!chatId) return;

    const { file, id } = fileWithProgress;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, progress } : f))
          );
        }
      });

      // Handle completion
      const uploadPromise = new Promise<UploadedFile>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.files?.length > 0) {
              const uploadedFile = response.files[0];
              let previewUrl: string | undefined;
              if (uploadedFile.fileType === 'image') {
                previewUrl = URL.createObjectURL(file);
              }

              resolve({
                id: uploadedFile.id,
                name: uploadedFile.fileName,
                type: uploadedFile.fileType,
                mimeType: uploadedFile.mimeType,
                size: uploadedFile.fileSize,
                previewUrl,
              });
            } else {
              reject(new Error('Invalid server response'));
            }
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);

      const uploaded = await uploadPromise;

      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: 100, uploaded } : f))
      );

      setUploadedFiles((prev) => [...prev, uploaded]);

      // Remove from uploading after delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
      }, 500);
    } catch (error) {
      console.error('[MessageInput] Upload error:', error);
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      );
    }
  };

  // Handle file selection
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!modelSupportsVision) {
        setShowModelWarning(true);
        setTimeout(() => setShowModelWarning(false), 3000);
        return;
      }

      const fileArray = Array.from(files).slice(0, maxFiles - uploadedFiles.length);

      const filesWithProgress: FileWithProgress[] = fileArray.map((file) => ({
        file,
        id: crypto.randomUUID(),
        progress: 0,
      }));

      setUploadingFiles((prev) => [...prev, ...filesWithProgress]);

      for (const fwp of filesWithProgress) {
        await uploadFile(fwp);
      }
    },
    [chatId, maxFiles, uploadedFiles.length, modelSupportsVision]
  );

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    if (!modelSupportsVision) {
      setShowModelWarning(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (showModelWarning) {
      setTimeout(() => setShowModelWarning(false), 2000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!modelSupportsVision) {
      setShowModelWarning(true);
      setTimeout(() => setShowModelWarning(false), 3000);
      return;
    }

    if (e.dataTransfer.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Remove file
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={cn('bg-white border-t border-gray-200 px-base py-sm', className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto space-y-sm">
        {/* Model Warning */}
        {showModelWarning && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-md px-3 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-yellow-800">{t.modelWarning}</p>
          </div>
        )}

        {/* Drag overlay */}
        {isDragging && modelSupportsVision && (
          <div className="border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg p-base text-center">
            <p className="text-sm text-blue-600 font-medium">{t.dragDrop}</p>
          </div>
        )}

        {/* Uploaded files preview */}
        {hasFiles && (
          <div className="flex flex-wrap gap-2">
            {/* Already uploaded files */}
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-gray-100 rounded-md px-2 py-1 text-sm"
              >
                {file.type === 'image' && file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span className="truncate max-w-[120px]">{file.name}</span>
                <span className="text-gray-400 text-xs">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title={t.removeFile}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Uploading files */}
            {uploadingFiles.map((fwp) => (
              <div
                key={fwp.id}
                className="flex items-center gap-2 bg-gray-100 rounded-md px-2 py-1 text-sm"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {fwp.error ? (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <span className="truncate max-w-[120px]">{fwp.file.name}</span>
                {fwp.error ? (
                  <span className="text-red-500 text-xs">{fwp.error}</span>
                ) : (
                  <span className="text-blue-500 text-xs">{fwp.progress}%</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(fwp.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-sm items-end">
          {/* RAG Toggle */}
          {showRagToggle && (
            <button
              type="button"
              onClick={() => onRagToggle?.(!ragEnabled)}
              disabled={isDisabled}
              title={ragEnabled ? t.ragOn : t.ragOff}
              className={cn(
                'px-3 py-sm rounded-lg text-xs font-bold transition-colors flex items-center gap-xs flex-shrink-0',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                ragEnabled
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              )}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>RAG</span>
            </button>
          )}

          {/* File attachment button */}
          {showFileAttachment && modelSupportsVision && chatId && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedFileTypes}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDisabled}
                className={cn(
                  'p-sm rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                  'disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0'
                )}
                title={t.attachFiles}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
            </>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t.placeholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              'flex-1 px-base py-sm bg-white border border-gray-300 rounded-lg resize-none',
              'text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'min-h-[40px] max-h-[200px]'
            )}
          />

          {/* Send/Stop Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className={cn(
                'px-base py-sm bg-red-600 text-white rounded-lg flex-shrink-0',
                'text-sm font-medium hover:bg-red-700',
                'focus:outline-none focus:ring-2 focus:ring-red-500',
                'transition-colors'
              )}
            >
              {t.stop}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() || isDisabled}
              className={cn(
                'px-base py-sm bg-primary text-white rounded-lg flex-shrink-0',
                'text-sm font-medium hover:bg-primary-hover',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'disabled:bg-gray-300 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              {t.send}
            </button>
          )}
        </div>

        {/* Shortcuts hint */}
        <p className="text-xs text-gray-500 text-center">{t.shortcuts}</p>
      </div>
    </div>
  );
}

MessageInput.displayName = 'MessageInput';

export default MessageInput;
