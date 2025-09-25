// src/shared/components/UI/Card/Card.tsx
// Clean implementation of Card component using design system

import React from 'react';
import { useDesignSystem } from '../../../hooks/useDesignSystem';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'sm' | 'base' | 'lg' | 'xl';
  shadow?: 'sm' | 'base' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  hoverable = false,
  padding = 'base',
  shadow = 'base',
  className = '',
  children,
  ...props
}) => {
  const { classBuilders, utils } = useDesignSystem();

  const cardClass = classBuilders.card(
    hoverable,
    utils.cn(
      `p-${padding}`,
      `shadow-${shadow}`,
      className
    )
  );

  return (
    <div className={cardClass} {...props}>
      {children}
    </div>
  );
};

export default Card;