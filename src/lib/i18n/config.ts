// src/lib/i18n/config.ts
export const defaultLocale = 'nl' as const;
export const locales = ['nl', 'en'] as const;

export type Locale = (typeof locales)[number];

// Locale configuration with proper flags
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

// Server-side translation function for use in Server Components
export async function getTranslations(locale: Locale) {
  // Import the same translations structure from useTranslation
  const translations = {
    nl: {
      nav: {
        aiAssistant: 'AI Assistent',
        urbanAnalysis: 'Doelgroepen & Programma',
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
        delete: 'Verwijderen',
        edit: 'Bewerken',
        create: 'Aanmaken',
        confirm: 'Bevestigen',
      },
      login: {
        title: 'Inloggen',
        email: 'E-mailadres',
        password: 'Wachtwoord',
        signIn: 'Inloggen',
        signOut: 'Uitloggen',
        invalidCredentials: 'Onjuiste e-mailadres of wachtwoord',
        error: 'Er is een fout opgetreden. Probeer het opnieuw.',
      },
      changePassword: {
        title: 'Wachtwoord wijzigen',
        description: 'Je moet je wachtwoord wijzigen voordat je verder kunt.',
        newPassword: 'Nieuw wachtwoord',
        confirmPassword: 'Bevestig wachtwoord',
        submit: 'Wachtwoord wijzigen',
        success: 'Wachtwoord succesvol gewijzigd. Je wordt doorgestuurd naar de inlogpagina...',
        passwordMismatch: 'Wachtwoorden komen niet overeen',
        passwordTooShort: 'Wachtwoord moet minimaal 8 tekens bevatten',
        error: 'Er is een fout opgetreden. Probeer het opnieuw.',
      },
      admin: {
        title: 'Administratie',
        userManagement: 'Gebruikersbeheer',
        createUser: 'Gebruiker aanmaken',
        editUser: 'Gebruiker bewerken',
        deleteUser: 'Gebruiker verwijderen',
        confirmDelete: 'Weet je zeker dat je deze gebruiker wilt verwijderen?',
        name: 'Naam',
        email: 'E-mailadres',
        role: 'Rol',
        password: 'Wachtwoord',
        userRole: 'Gebruiker',
        adminRole: 'Beheerder',
        actions: 'Acties',
        noUsers: 'Geen gebruikers gevonden',
        userCreated: 'Gebruiker succesvol aangemaakt',
        userUpdated: 'Gebruiker succesvol bijgewerkt',
        userDeleted: 'Gebruiker succesvol verwijderd',
        accessDenied: 'Toegang geweigerd. Je hebt geen beheerderrechten.',
      },
    },
    en: {
      nav: {
        aiAssistant: 'AI Assistant',
        urbanAnalysis: 'Target Groups & Program',
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
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        confirm: 'Confirm',
      },
      login: {
        title: 'Sign In',
        email: 'Email',
        password: 'Password',
        signIn: 'Sign In',
        signOut: 'Sign Out',
        invalidCredentials: 'Invalid email or password',
        error: 'An error occurred. Please try again.',
      },
      changePassword: {
        title: 'Change Password',
        description: 'You must change your password before continuing.',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        submit: 'Change Password',
        success: 'Password changed successfully. Redirecting to login...',
        passwordMismatch: 'Passwords do not match',
        passwordTooShort: 'Password must be at least 8 characters',
        error: 'An error occurred. Please try again.',
      },
      admin: {
        title: 'Administration',
        userManagement: 'User Management',
        createUser: 'Create User',
        editUser: 'Edit User',
        deleteUser: 'Delete User',
        confirmDelete: 'Are you sure you want to delete this user?',
        name: 'Name',
        email: 'Email',
        role: 'Role',
        password: 'Password',
        userRole: 'User',
        adminRole: 'Administrator',
        actions: 'Actions',
        noUsers: 'No users found',
        userCreated: 'User created successfully',
        userUpdated: 'User updated successfully',
        userDeleted: 'User deleted successfully',
        accessDenied: 'Access denied. You do not have administrator rights.',
      },
    },
  };

  return translations[locale];
}