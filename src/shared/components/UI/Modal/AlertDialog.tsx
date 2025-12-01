// src/shared/components/UI/Modal/AlertDialog.tsx
'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from '../Button/Button';

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  closeText?: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

/**
 * AlertDialog Component
 * A modal for showing informational alerts (success, error, etc.)
 */
export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  closeText = 'OK',
  variant = 'info',
}: AlertDialogProps) {
  const variantStyles = {
    success: {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-green-50',
    },
    error: {
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-red-50',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-yellow-50',
    },
    info: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-blue-50',
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="space-y-base">
        {/* Icon and Content */}
        <div className={`flex items-start gap-sm p-sm rounded-md ${currentVariant.bgColor}`}>
          <div className="flex-shrink-0">
            {currentVariant.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="mt-xs text-sm text-text-secondary">{message}</p>
          </div>
        </div>

        {/* Action */}
        <div className="flex justify-end">
          <Button onClick={onClose} variant="primary" size="sm">
            {closeText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

AlertDialog.displayName = 'AlertDialog';

export default AlertDialog;
