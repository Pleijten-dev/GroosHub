// src/shared/components/UI/NavigationBar/NavigationItem.tsx
import React from 'react';
import Link from 'next/link';
import { NavigationItemProps } from './types';
import { useTranslation } from '../../../hooks/useTranslation';
import styles from './NavigationBar.module.css';

export const NavigationItem: React.FC<NavigationItemProps> = ({
  item,
  locale,
  isActive,
  onClick,
}) => {
  const { t } = useTranslation(locale);
  const href = `/${locale}${item.href}`;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link
      href={href}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
      onClick={handleClick}
    >
      <span className={styles.navIcon} role="img" aria-hidden="true">
        {item.icon}
      </span>
      <span className={styles.navLabel}>
        {t(item.labelKey)}
      </span>
    </Link>
  );
};

export default NavigationItem;