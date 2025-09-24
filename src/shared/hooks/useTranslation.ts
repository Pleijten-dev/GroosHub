// src/shared/hooks/useTranslation.ts
import { Locale } from '../../lib/i18n/config';

// Translation structure interface
interface TranslationData {
  nav: {
    aiAssistant: string;
    urbanAnalysis: string;
    projectAnalysis: string;
    projectDesign: string;
    projectOverview: string;
    user: string;
  };
  common: {
    loading: string;
    error: string;
    close: string;
    save: string;
    cancel: string;
  };
}

// Type for nested object traversal
type NestedKeyOf<T> = T extends object 
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<TranslationData>;

// Simple translation hook - can be enhanced with more features later
export function useTranslation(locale: Locale) {
  // Import translations dynamically or use a simple object for now
  const translations: Record<Locale, TranslationData> = {
    nl: {
      nav: {
        aiAssistant: 'AI Assistent',
        urbanAnalysis: 'Stedelijke Analyse',
        projectAnalysis: 'Project Analyse',
        projectDesign: 'Project Ontwerp',
        projectOverview: 'Project Overzicht',
        user: 'Gebruiker',
      },
      common: {
        loading: 'Laden...',
        error: 'Fout',
        close: 'Sluiten',
        save: 'Opslaan',
        cancel: 'Annuleren',
      },
    },
    en: {
      nav: {
        aiAssistant: 'AI Assistant',
        urbanAnalysis: 'Urban Analysis',
        projectAnalysis: 'Project Analysis',
        projectDesign: 'Project Design',
        projectOverview: 'Project Overview',
        user: 'User',
      },
      common: {
        loading: 'Loading...',
        error: 'Error',
        close: 'Close',
        save: 'Save',
        cancel: 'Cancel',
      },
    },
  };

  const t = (key: TranslationKey | string): string => {
    const keys = key.split('.');
    let value: unknown = translations[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Return key as fallback if path not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t };
}