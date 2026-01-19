'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';

interface FileUploadZoneProps {
  projectId: string;
  onUploadComplete: () => void;
  locale: 'nl' | 'en';
}

const translations = {
  nl: {
    uploadFiles: 'Bestanden Uploaden',
    dragDrop: 'Sleep bestanden hierheen of',
    browse: 'bladeren',
    uploading: 'Uploaden...',
    uploadSuccess: 'Bestanden succesvol geüpload',
    uploadError: 'Fout bij uploaden',
    maxFiles: 'Maximaal 10 bestanden per keer',
    supportedTypes: 'Ondersteunde types voor RAG: afbeeldingen (JPG, PNG, GIF, WebP), PDF, CSV, TXT, XML'
  },
  en: {
    uploadFiles: 'Upload Files',
    dragDrop: 'Drag files here or',
    browse: 'browse',
    uploading: 'Uploading...',
    uploadSuccess: 'Files uploaded successfully',
    uploadError: 'Upload failed',
    maxFiles: 'Maximum 10 files at once',
    supportedTypes: 'Supported types for RAG: images (JPG, PNG, GIF, WebP), PDF, CSV, TXT, XML'
  }
};

export function FileUploadZone({ projectId, onUploadComplete, locale }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[locale];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    if (files.length > 10) {
      setError(t.maxFiles);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);

      files.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.uploadError);
      }

      onUploadComplete();

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : t.uploadError);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-sm">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-lg text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
          isUploading && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.csv,.txt,text/plain,text/csv"
          disabled={isUploading}
        />

        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-base"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <p className="text-base font-medium text-gray-700 mb-xs">
          {isUploading ? t.uploading : t.dragDrop}{' '}
          {!isUploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-primary hover:underline"
            >
              {t.browse}
            </button>
          )}
        </p>

        <p className="text-sm text-gray-500">
          {t.supportedTypes}
        </p>
        <p className="text-xs text-gray-400 mt-xs">
          {t.maxFiles}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-base py-sm rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
