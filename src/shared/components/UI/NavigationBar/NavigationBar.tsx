// src/shared/components/UI/NavigationBar/NavigationBar.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NavigationBarProps } from './types';
import { NAVIGATION_ITEMS } from './constants';
import NavigationItem from './NavigationItem';
import { useTranslation } from '../../../hooks/useTranslation';
import { localeConfig, Locale } from '../../../../lib/i18n/config';
import styles from './NavigationBar.module.css';

const NavigationBar: React.FC<NavigationBarProps> = ({
  locale,
  currentPath,
  className = '',
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isLanguageSubMenuOpen, setIsLanguageSubMenuOpen] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation(locale);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const languageSubMenuRef = useRef<HTMLDivElement>(null);

  // Determine active navigation item
  const getActiveItemId = (): string => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    const activeItem = NAVIGATION_ITEMS.find(item => 
      pathWithoutLocale.startsWith(item.href) || 
      (item.href === '/' && pathWithoutLocale === '/')
    );
    return activeItem?.id || '';
  };

  const activeItemId = getActiveItemId();

  // Handle language switching
  const handleLanguageSwitch = (newLocale: Locale) => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    router.push(newPath);
    setIsLanguageSubMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  // Handle language submenu toggle
  const handleLanguageSubMenuToggle = () => {
    setIsLanguageSubMenuOpen(!isLanguageSubMenuOpen);
  };

  // Handle user profile navigation
  const handleUserProfile = () => {
    router.push(`/${locale}/user`);
    setIsUserMenuOpen(false);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current && 
        userButtonRef.current &&
        !userDropdownRef.current.contains(event.target as Node) &&
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
        setIsLanguageSubMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isLanguageSubMenuOpen) {
          setIsLanguageSubMenuOpen(false);
        } else {
          setIsUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isLanguageSubMenuOpen]);

  // Get user initials (placeholder for now)
  const getUserInitials = (): string => {
    return 'U'; // This would come from user context/auth in real app
  };

  const currentLocaleConfig = localeConfig[locale];
  const allLocales = ['nl', 'en'] as const;

  return (
    <nav 
      className={`${styles.navigationBar} ${className}`} 
      role="navigation" 
      aria-label="Main navigation"
    >
      
      {/* Brand Section - Left */}
      <div className={styles.brandSection}>
        <a href={`/${locale}`} className={styles.logo}>
          GroosHub
        </a>
      </div>

      {/* Navigation Items - Center */}
      <div className={styles.navItems} role="menubar">
        {NAVIGATION_ITEMS.map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            locale={locale}
            isActive={activeItemId === item.id}
            onClick={() => {
              console.log(`Navigation: ${item.id} clicked`);
            }}
          />
        ))}
      </div>

      {/* User Section - Right */}
      <div className={styles.userSection}>
        
        {/* User Profile Button */}
        <button
          ref={userButtonRef}
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={styles.userButton}
          type="button"
          aria-label="User menu"
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
        >
          <svg className={styles.userIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </button>
        
        {/* User Dropdown Menu */}
        <div 
          ref={userDropdownRef}
          className={`${styles.userDropdown} ${isUserMenuOpen ? styles.userDropdownOpen : ''}`}
          role="menu"
          aria-hidden={!isUserMenuOpen}
        >
          {/* User Profile Option */}
          <button
            onClick={handleUserProfile}
            className={styles.dropdownItem}
            role="menuitem"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            {locale === 'nl' ? 'Gebruikersprofiel' : 'User Profile'}
          </button>
          
          {/* Separator */}
          <div className={styles.dropdownSeparator} />
          
          {/* Language Section */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleLanguageSubMenuToggle}
              className={`${styles.languageOption} ${styles.languageParent}`}
              role="menuitem"
              type="button"
              aria-expanded={isLanguageSubMenuOpen}
              aria-haspopup="true"
            >
              <div className={styles.languageFlag}>
                {currentLocaleConfig.flag}
              </div>
              <span className={styles.languageName}>
                {currentLocaleConfig.name}
              </span>
              <svg 
                className={`${styles.languageChevron} ${isLanguageSubMenuOpen ? styles.languageChevronOpen : ''}`}
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            
            {/* Language Sub-dropdown */}
            <div 
              ref={languageSubMenuRef}
              className={`${styles.languageSubMenu} ${isLanguageSubMenuOpen ? styles.languageSubMenuOpen : ''}`}
              role="menu"
              aria-hidden={!isLanguageSubMenuOpen}
            >
              {allLocales.map((localeOption) => {
                const localeOptionConfig = localeConfig[localeOption];
                const isCurrentLocale = localeOption === locale;
                
                return (
                  <button
                    key={localeOption}
                    onClick={() => handleLanguageSwitch(localeOption)}
                    className={`${styles.languageOption} ${isCurrentLocale ? styles.languageOptionActive : ''}`}
                    role="menuitem"
                    type="button"
                    disabled={isCurrentLocale}
                  >
                    <div className={styles.languageFlag}>
                      {localeOptionConfig.flag}
                    </div>
                    <span className={styles.languageName}>
                      {localeOptionConfig.name}
                    </span>
                    {isCurrentLocale && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;