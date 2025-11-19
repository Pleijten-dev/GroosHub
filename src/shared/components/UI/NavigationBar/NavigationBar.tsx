// src/shared/components/UI/NavigationBar/NavigationBar.tsx
// Updated with Design System Components

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { NavigationBarProps } from './types';
import { NAVIGATION_ITEMS } from './constants';
import NavigationItem from './NavigationItem';
import { useTranslation } from '../../../hooks/useTranslation';
import { localeConfig, Locale } from '../../../../lib/i18n/config';
import { useDesignSystem, COMMON_CLASSES } from '../../../hooks/useDesignSystem';
import { Button } from '../Button/Button';
import { cn } from '../../../utils/cn';

const NavigationBar: React.FC<NavigationBarProps> = ({
  locale,
  currentPath,
  className = '',
  user,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isLanguageSubMenuOpen, setIsLanguageSubMenuOpen] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation(locale);
  const { classBuilders, utils } = useDesignSystem();
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

  // Handle admin navigation
  const handleAdminPanel = () => {
    router.push(`/${locale}/admin`);
    setIsUserMenuOpen(false);
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: `/${locale}/login` });
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

  const currentLocaleConfig = localeConfig[locale];
  const allLocales = ['nl', 'en'] as const;

  return (
    <nav
      className={cn(
        COMMON_CLASSES.flexBetween,
        'fixed top-0 left-0 right-0 z-fixed h-navbar px-lg',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      
      {/* Brand Section - Left */}
      <div className="flex items-center flex-shrink-0">
        <a 
          href={`/${locale}`}
          className="text-2xl font-bold text-text-primary hover:text-text-secondary transition-colors"
        >
          GroosHub
        </a>
      </div>

      {/* Navigation Items - Center */}
      <div className={cn(COMMON_CLASSES.flexCenter, 'gap-xs flex-1 max-w-3xl')} role="menubar">
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
      <div className="flex items-center flex-shrink-0 relative">
        
        {/* User Profile Button */}
        <Button
          ref={userButtonRef}
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0"
          aria-label="User menu"
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </Button>
        
        {/* User Dropdown Menu */}
        <div
          ref={userDropdownRef}
          className={cn(
            'absolute top-full right-0 mt-sm',
            classBuilders.glass(true, 'border shadow-xl rounded-xl p-sm min-w-[200px]'),
            'transition-all duration-fast',
            isUserMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          )}
          role="menu"
          aria-hidden={!isUserMenuOpen}
        >
          {/* User Info */}
          {user && (
            <>
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-medium text-text-primary">{user.name}</p>
                <p className="text-xs text-text-muted">{user.email}</p>
              </div>
              <div className="h-px bg-border mb-sm" />
            </>
          )}

          {/* User Profile Option */}
          <Button
            onClick={handleUserProfile}
            variant="ghost"
            className="w-full justify-start gap-md"
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            {locale === 'nl' ? 'Gebruikersprofiel' : 'User Profile'}
          </Button>

          {/* Admin Panel Option (only for admin users) */}
          {user?.role === 'admin' && (
            <Button
              onClick={handleAdminPanel}
              variant="ghost"
              className="w-full justify-start gap-md"
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              {locale === 'nl' ? 'Administratie' : 'Administration'}
            </Button>
          )}

          {/* Separator */}
          <div className="h-px bg-border my-sm" />
          
          {/* Language Section */}
          <div className="relative">
            <Button
              onClick={handleLanguageSubMenuToggle}
              variant="ghost"
              className="w-full justify-between"
              role="menuitem"
              aria-expanded={isLanguageSubMenuOpen}
              aria-haspopup="true"
            >
              <div className={COMMON_CLASSES.flexCenter + ' gap-md'}>
                <div className="w-5 h-4 rounded-sm bg-gray-100 border border-gray-200 flex items-center justify-center text-xs">
                  {currentLocaleConfig.flag}
                </div>
                <span>{currentLocaleConfig.name}</span>
              </div>
              <svg 
                className={cn(
                  'w-3 h-3 transition-transform duration-fast',
                  isLanguageSubMenuOpen ? 'rotate-180' : ''
                )}
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </Button>
            
            {/* Language Sub-dropdown */}
            <div 
              ref={languageSubMenuRef}
              className={cn(
                'absolute left-0 top-full mt-xs',
                classBuilders.glass(true, 'border shadow-lg rounded-lg p-xs min-w-[180px]'),
                'transition-all duration-fast',
                isLanguageSubMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
              )}
              role="menu"
              aria-hidden={!isLanguageSubMenuOpen}
            >
              {allLocales.map((localeOption) => {
                const localeOptionConfig = localeConfig[localeOption];
                const isCurrentLocale = localeOption === locale;
                
                return (
                  <Button
                    key={localeOption}
                    onClick={() => handleLanguageSwitch(localeOption)}
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-md',
                      isCurrentLocale && 'bg-primary-light text-primary'
                    )}
                    role="menuitem"
                    disabled={isCurrentLocale}
                  >
                    <div className="w-5 h-4 rounded-sm bg-gray-100 border border-gray-200 flex items-center justify-center text-xs">
                      {localeOptionConfig.flag}
                    </div>
                    <span className="flex-1 text-left">{localeOptionConfig.name}</span>
                    {isCurrentLocale && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Logout Button */}
          {user && (
            <>
              <div className="h-px bg-border my-sm" />
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-md text-error hover:bg-error-light"
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                {t('login.signOut')}
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;