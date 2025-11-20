// src/shared/components/UI/NavigationBar/types.ts
import { Locale } from '../../../../lib/i18n/config';

export interface NavigationItem {
  id: string;
  labelKey: string;
  href: string;
  icon?: string;
  requiresAuth?: boolean;
  disabled?: boolean;
}

export interface NavigationBarProps {
  locale: Locale;
  currentPath: string;
  className?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface NavigationItemProps {
  item: NavigationItem;
  locale: Locale;
  isActive: boolean;
  onClick?: () => void;
}