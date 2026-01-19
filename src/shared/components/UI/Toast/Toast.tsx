'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ToastOptions {
  duration?: number;
  action?: string;
  onAction?: () => void;
  type?: 'success' | 'error' | 'info' | 'warning';
}

interface Toast {
  id: string;
  message: string;
  options: ToastOptions;
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = Math.random().toString(36).substring(7);
    const duration = options.duration ?? 5000;

    setToasts(prev => [...prev, { id, message, options }]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { message, options } = toast;
  const type = options.type || 'info';

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-orange-500 text-white',
    info: 'bg-gray-900 text-white'
  };

  return (
    <div
      className={`${typeStyles[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px] pointer-events-auto animate-slide-in-right`}
      role="alert"
    >
      <p className="flex-1 text-sm font-medium">{message}</p>

      <div className="flex items-center gap-2">
        {options.action && options.onAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              options.onAction?.();
              onClose();
            }}
            className="text-sm font-semibold hover:underline"
          >
            {options.action}
          </button>
        )}

        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ToastProvider;
