/**
 * Generation Progress Modal Component
 * Shows real-time progress during LLM building program generation
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';
import type { BuildingProgram } from '@/app/api/generate-building-program/route';

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  details?: string;
}

export interface GenerationProgressModalProps {
  isOpen: boolean;
  steps: GenerationStep[];
  currentStep?: string;
  partialData?: Partial<BuildingProgram>;
  locale?: 'nl' | 'en';
}

export const GenerationProgressModal: React.FC<GenerationProgressModalProps> = ({
  isOpen,
  steps,
  currentStep,
  partialData,
  locale = 'nl',
}) => {
  if (!isOpen) return null;

  const getStatusIcon = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'in_progress':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
        );
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {locale === 'nl' ? 'Bouwprogramma Genereren' : 'Generating Building Program'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {locale === 'nl'
              ? 'AI analyseert de locatiegegevens en creëert gedetailleerde scenario\'s...'
              : 'AI is analyzing location data and creating detailed scenarios...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {locale === 'nl' ? 'Voortgang' : 'Progress'}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {completedSteps} / {totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-[#477638] h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg transition-all duration-300',
                  step.status === 'in_progress' && 'bg-blue-50 border border-blue-200',
                  step.status === 'completed' && 'bg-green-50 border border-green-200',
                  step.status === 'error' && 'bg-red-50 border border-red-200',
                  step.status === 'pending' && 'bg-gray-50'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      {locale === 'nl' ? 'Stap' : 'Step'} {index + 1}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {step.label}
                  </p>
                  {step.details && (
                    <p className="text-xs text-gray-600 mt-1">
                      {step.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partial Data Preview (if available) */}
        {partialData && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-700 font-medium mb-2">
                {locale === 'nl' ? 'Bekijk ontvangen data' : 'View received data'}
              </summary>
              <pre className="bg-white p-3 rounded border border-gray-200 overflow-auto max-h-40 text-xs">
                {JSON.stringify(partialData, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            {locale === 'nl'
              ? 'Dit kan enkele minuten duren. Sluit dit venster niet.'
              : 'This may take a few minutes. Please do not close this window.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GenerationProgressModal;
