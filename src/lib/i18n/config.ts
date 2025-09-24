// src/lib/i18n/config.ts
export const defaultLocale = 'nl' as const;
export const locales = ['nl', 'en'] as const;

export type Locale = (typeof locales)[number];

// Locale configuration
export const localeConfig = {
  nl: {
    name: 'Nederlands',
    flag: '🇳🇱',
    dir: 'ltr' as const,
  },
  en: {
    name: 'English', 
    flag: '🇺🇸',
    dir: 'ltr' as const,
  },
} as const;

// Helper functions
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleConfig(locale: Locale) {
  return localeConfig[locale];
}