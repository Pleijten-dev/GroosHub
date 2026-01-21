/**
 * MessageInput Component
 *
 * Reusable message input with file attachment, RAG toggle, and keyboard shortcuts.
 * Layout: |file attachment| |RAG| |text input field| |send|
 *
 * Features:
 * - Auto-resize textarea
 * - RAG toggle button (project view only)
 * - File attachment with drag and drop
 * - Send button with keyboard shortcuts (Ctrl/Cmd + Enter)
 * - Loading/disabled states
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
  /** Chat ID for file uploads */
  chatId?: string;
  /** Project ID for project-specific uploads (files will show in project files) */
  projectId?: string;
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
    ragTooltipOn: 'RAG is ingeschakeld - klik om uit te schakelen',
    ragTooltipOff: 'RAG is uitgeschakeld - klik om in te schakelen',
    attachFiles: 'Bestanden bijvoegen',
    dragDrop: 'Sleep bestanden hierheen om bij te voegen',
    shortcuts: 'Ctrl+Enter om te versturen',
    uploading: 'Uploaden...',
    removeFile: 'Verwijderen',
  },
  en: {
    placeholder: 'Type your message...',
    send: 'Send',
    stop: 'Stop',
    ragTooltipOn: 'RAG is enabled - click to disable',
    ragTooltipOff: 'RAG is disabled - click to enable',
    attachFiles: 'Attach files',
    dragDrop: 'Drop files here to attach',
    shortcuts: 'Ctrl+Enter to send',
    uploading: 'Uploading...',
    removeFile: 'Remove',
  },
};

// ============================================================================
// Icons
// ============================================================================

// Paperclip icon for file attachment
const PaperclipIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
    />
  </svg>
);

// Document/RAG icon
const DocumentIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    className="w-5 h-5"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

// Send icon (arrow up)
const SendIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
    />
  </svg>
);

// Stop icon (square)
const StopIcon = () => (
  <svg
    className="w-5 h-5"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

// Close icon
const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

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
  chatId,
  projectId,
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
  const [internalRagEnabled, setInternalRagEnabled] = useState(ragEnabled);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const t = translations[locale];
  const isDisabled = disabled || isLoading;
  const hasFiles = uploadedFiles.length > 0 || uploadingFiles.length > 0;
  const hasContent = input.trim().length > 0 || hasFiles;

  // Sync internal RAG state with prop
  useEffect(() => {
    setInternalRagEnabled(ragEnabled);
  }, [ragEnabled]);

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

  // Handle RAG toggle
  const handleRagToggle = useCallback(() => {
    const newValue = !internalRagEnabled;
    setInternalRagEnabled(newValue);
    onRagToggle?.(newValue);
  }, [internalRagEnabled, onRagToggle]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!hasContent || isDisabled) return;

    onSubmit(
      input.trim(),
      uploadedFiles.length > 0 ? uploadedFiles : undefined,
      internalRagEnabled
    );
    setInput('');
    setUploadedFiles([]);
  }, [input, hasContent, isDisabled, onSubmit, uploadedFiles, internalRagEnabled]);

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

  // File upload handler - uploads to R2 storage if chatId is provided
  const uploadFile = async (fileWithProgress: FileWithProgress) => {
    const { file, id } = fileWithProgress;

    try {
      // If we have a chatId, upload to R2
      if (chatId) {
        console.log('[MessageInput] Uploading file to R2:', file.name, 'chatId:', chatId, 'projectId:', projectId);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', chatId);
        if (projectId) {
          formData.append('projectId', projectId);
        }

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
              if (response.success && response.files && response.files.length > 0) {
                const uploadedFile = response.files[0];

                // Create preview URL for images
                let previewUrl: string | undefined;
                if (uploadedFile.fileType === 'image') {
                  previewUrl = URL.createObjectURL(file);
                }

                const result: UploadedFile = {
                  id: uploadedFile.id, // Real server ID
                  name: uploadedFile.fileName,
                  type: uploadedFile.fileType,
                  mimeType: uploadedFile.mimeType,
                  size: uploadedFile.fileSize,
                  previewUrl,
                };

                resolve(result);
              } else {
                reject(new Error(response.error || 'Upload failed'));
              }
            } else {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);

        const uploadedFile = await uploadPromise;
        console.log('[MessageInput] ✅ File uploaded to R2:', uploadedFile.id);

        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress: 100, uploaded: uploadedFile } : f))
        );

        setUploadedFiles((prev) => [...prev, uploadedFile]);

        // Remove from uploading after delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
        }, 300);
      } else {
        // No chatId - store locally with temporary ID
        console.warn('[MessageInput] No chatId provided - storing file locally (won\'t be sent to server)');

        // Simulate upload progress for local files
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, progress } : f))
          );
        }

        // Create preview URL for images
        let previewUrl: string | undefined;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }

        // Determine file type
        let fileType: 'image' | 'pdf' | 'document' = 'document';
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type === 'application/pdf') {
          fileType = 'pdf';
        }

        const uploaded: UploadedFile = {
          id,  // Local ID - won't work for server requests
          name: file.name,
          type: fileType,
          mimeType: file.type,
          size: file.size,
          previewUrl,
        };

        setUploadingFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress: 100, uploaded } : f))
        );

        setUploadedFiles((prev) => [...prev, uploaded]);

        // Remove from uploading after delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
        }, 300);
      }
    } catch (error) {
      console.error('[MessageInput] File upload error:', error);
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
    [maxFiles, uploadedFiles.length]
  );

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showFileAttachment) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
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

    if (!showFileAttachment) return;

    if (e.dataTransfer.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Remove file
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((f) => f.id !== fileId);
    });
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Button base styles - consistent height and styling
  const buttonBaseStyles = cn(
    'w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400',
    'disabled:opacity-40 disabled:cursor-not-allowed'
  );

  return (
    <div
      ref={dropZoneRef}
      className={cn('bg-white border-t border-gray-200 px-base py-sm', className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto space-y-sm">
        {/* Drag overlay */}
        {isDragging && (
          <div className="border-2 border-dashed border-gray-400 bg-gray-50 rounded-lg p-base text-center">
            <p className="text-sm text-gray-600 font-medium">{t.dragDrop}</p>
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
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
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
                  <CloseIcon />
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
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <span className="truncate max-w-[120px]">{fwp.file.name}</span>
                {fwp.error ? (
                  <span className="text-red-500 text-xs">{fwp.error}</span>
                ) : (
                  <span className="text-gray-500 text-xs">{fwp.progress}%</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(fwp.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row: |file| |RAG| |input| |send| */}
        <div className="flex gap-sm items-center">
          {/* File attachment button */}
          {showFileAttachment && (
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
                  buttonBaseStyles,
                  'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                )}
                title={t.attachFiles}
              >
                <PaperclipIcon />
              </button>
            </>
          )}

          {/* RAG Toggle */}
          {showRagToggle && (
            <button
              type="button"
              onClick={handleRagToggle}
              disabled={isDisabled}
              title={internalRagEnabled ? t.ragTooltipOn : t.ragTooltipOff}
              className={cn(
                buttonBaseStyles,
                internalRagEnabled
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              )}
            >
              <DocumentIcon filled={internalRagEnabled} />
            </button>
          )}

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t.placeholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              'flex-1 px-base py-2 bg-gray-50 border border-gray-200 rounded-lg resize-none',
              'text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent',
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
                buttonBaseStyles,
                'bg-gray-800 text-white hover:bg-gray-700'
              )}
              title={t.stop}
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasContent || isDisabled}
              className={cn(
                buttonBaseStyles,
                hasContent && !isDisabled
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-400'
              )}
              title={t.send}
            >
              <SendIcon />
            </button>
          )}
        </div>

        {/* Shortcuts hint */}
        <p className="text-xs text-gray-400 text-center">{t.shortcuts}</p>
      </div>
    </div>
  );
}

MessageInput.displayName = 'MessageInput';

export default MessageInput;
