// src/shared/components/UI/Sidebar/Sidebar.tsx
'use client';

import React from 'react';
import { SidebarProps } from './types';
import { useDesignSystem, COMMON_CLASSES } from '../../../hooks/useDesignSystem';
import { Button } from '../Button/Button';
import { cn } from '../../../utils/cn';

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  sections = [],
  className = '',
  position = 'left',
  expandedWidth = '320px',
  collapsedWidth = '60px',
  headerContent,
  showToggleButton = true,
  customToggleButton,
  title,
  subtitle,
  withNavbar = true,
}) => {
  const { classBuilders } = useDesignSystem();

  const sidebarWidth = isCollapsed ? collapsedWidth : expandedWidth;
  const positionClass = position === 'left' ? 'left-0' : 'right-0';

  // Conditional positioning based on navbar presence
  const topClass = withNavbar ? 'top-navbar' : 'top-0';
  const heightClass = withNavbar ? 'h-[calc(100vh-var(--navbar-height))]' : 'h-screen';

  return (
    <aside
      className={cn(
        // Base positioning and layout
        'fixed z-fixed',
        topClass,
        heightClass,
        positionClass,
        
        // Glass background effect
        classBuilders.glass(true, 'border-r border-gray-200/50 shadow-lg'),
        
        // Flex layout
        'flex flex-col',
        
        // Smooth transitions
        'transition-all duration-normal ease-in-out',
        
        // Custom scrollbar for content
        'custom-scrollbar',
        
        className
      )}
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth
      }}
      aria-label={`${position} sidebar`}
    >
      
      {/* Sidebar Header */}
      <div className={cn(
        'p-base border-b border-gray-200/30 min-h-[70px] bg-white/50 flex-shrink-0',
        isCollapsed ? 'flex items-center justify-center' : COMMON_CLASSES.flexBetween
      )}>

        {/* When collapsed, only show toggle button centered */}
        {isCollapsed ? (
          <>
            {showToggleButton && (
              customToggleButton || (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="p-sm"
                  aria-label="Expand sidebar"
                >
                  <svg
                    className={cn(
                      'w-5 h-5 transition-transform duration-fast',
                      position === 'left' ? 'rotate-180' : 'rotate-0'
                    )}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </Button>
              )
            )}
          </>
        ) : (
          <>
            {/* Header Content or Default Title */}
            {headerContent ? (
              <div className="flex-1">
                {headerContent}
              </div>
            ) : (
              <div className="flex items-center gap-md flex-1">
                {title && (
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-text-primary truncate">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-sm text-text-muted truncate mt-xs">
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Toggle Button when expanded */}
            {showToggleButton && (
              <div className="flex-shrink-0">
                {customToggleButton || (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="p-sm"
                    aria-label="Collapse sidebar"
                  >
                    <svg
                      className={cn(
                        'w-4 h-4 transition-transform duration-fast',
                        position === 'left' ? 'rotate-0' : 'rotate-180'
                      )}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar Content - Only show when not collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {sections.map((section) => (
            <div 
              key={section.id}
              className={cn(
                'border-b border-gray-200/30 last:border-b-0',
                section.className
              )}
            >
              {/* Section Header */}
              {(section.title || section.description) && (
                <div className="p-lg">
                  {section.title && (
                    <h3 className="text-base font-semibold text-text-primary mb-xs">
                      {section.title}
                    </h3>
                  )}
                  {section.description && (
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {section.description}
                    </p>
                  )}
                </div>
              )}
              
              {/* Section Content */}
              <div className={cn(
                'px-lg pb-lg',
                // Add top padding if no title/description (content-only section)
                !(section.title || section.description) && 'pt-lg'
              )}>
                {section.content}
              </div>
            </div>
          ))}
          
          {/* Empty state when no sections */}
          {sections.length === 0 && (
            <div className="p-lg text-center">
              <div className="text-text-muted">
                <svg 
                  className="w-12 h-12 mx-auto mb-md opacity-50" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <p className="text-sm">
                  No content sections defined
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed State Indicator */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center justify-start pt-lg">
          {sections.map((section) => (
            <div
              key={section.id}
              className="w-8 h-1 bg-gray-300 rounded-full mb-sm last:mb-0"
              title={section.title}
            />
          ))}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;