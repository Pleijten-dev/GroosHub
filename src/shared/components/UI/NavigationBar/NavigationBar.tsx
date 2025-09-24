// src/shared/components/UI/NavigationBar/NavigationBar.tsx
'use client';

import React from 'react';
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
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation(locale);

  // Determine active navigation item
  const getActiveItemId = (): string => {
    // Remove locale prefix from pathname for comparison
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    
    // Find matching navigation item
    const activeItem = NAVIGATION_ITEMS.find(item => 
      pathWithoutLocale.startsWith(item.href) || 
      (item.href === '/' && pathWithoutLocale === '/')
    );
    
    return activeItem?.id || '';
  };

  const activeItemId = getActiveItemId();

  // Handle language switching
  const handleLanguageSwitch = () => {
    const newLocale: Locale = locale === 'nl' ? 'en' : 'nl';
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    router.push(newPath);
  };

  const currentLocaleConfig = localeConfig[locale];
  const otherLocale: Locale = locale === 'nl' ? 'en' : 'nl';
  const otherLocaleConfig = localeConfig[otherLocale];

  return (
    <nav className={`${styles.navigationBar} ${className}`} role="navigation" aria-label="Main navigation">
      
      {/* Brand/Logo Section */}
      <div className={styles.brandSection}>
        <a href={`/${locale}`} className={styles.logo}>
          🏢
        </a>
        <h1 className={styles.appTitle}>GroosHub</h1>
      </div>

      {/* Navigation Items */}
      <div className={styles.navItems} role="menubar">
        {NAVIGATION_ITEMS.map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            locale={locale}
            isActive={activeItemId === item.id}
            onClick={() => {
              // Optional: Add analytics tracking here
              console.log(`Navigation: ${item.id} clicked`);
            }}
          />
        ))}
      </div>

      {/* Utility Section */}
      <div className={styles.utilitySection}>
        
        {/* Language Selector */}
        <button
          onClick={handleLanguageSwitch}
          className={styles.languageSelector}
          type="button"
          aria-label={`Switch to ${otherLocaleConfig.name}`}
          title={`Switch to ${otherLocaleConfig.name}`}
        >
          <span className={styles.languageFlag} role="img" aria-hidden="true">
            {otherLocaleConfig.flag}
          </span>
          <span className={styles.languageCode}>
            {otherLocale}
          </span>
        </button>
        
        {/* Current Language Indicator */}
        <div 
          className={`${styles.languageSelector} ${styles.currentLanguage}`}
          aria-label={`Current language: ${currentLocaleConfig.name}`}
        >
          <span className={styles.languageFlag} role="img" aria-hidden="true">
            {currentLocaleConfig.flag}
          </span>
          <span className={styles.languageCode}>
            {locale}
          </span>
        </div>
        
      </div>
    </nav>
  );
};

export default NavigationBar;