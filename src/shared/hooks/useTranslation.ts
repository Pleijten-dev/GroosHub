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
    delete: string;
    edit: string;
    create: string;
    confirm: string;
  };
  login: {
    title: string;
    email: string;
    password: string;
    signIn: string;
    signOut: string;
    invalidCredentials: string;
    error: string;
  };
  admin: {
    title: string;
    userManagement: string;
    createUser: string;
    editUser: string;
    deleteUser: string;
    confirmDelete: string;
    name: string;
    email: string;
    role: string;
    password: string;
    userRole: string;
    adminRole: string;
    actions: string;
    noUsers: string;
    userCreated: string;
    userUpdated: string;
    userDeleted: string;
    accessDenied: string;
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