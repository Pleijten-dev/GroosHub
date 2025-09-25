// src/shared/components/UI/Sidebar/types.ts
import { ReactNode } from 'react';

export interface SidebarSection {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  className?: string;
}

export interface SidebarProps {
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;
  
  /** Toggle function for sidebar collapse state */
  onToggle: () => void;
  
  /** Array of sections to display in the sidebar */
  sections: SidebarSection[];
  
  /** Custom CSS class for the sidebar container */
  className?: string;
  
  /** Position of the sidebar */
  position?: 'left' | 'right';
  
  /** Width when expanded */
  expandedWidth?: string;
  
  /** Width when collapsed */
  collapsedWidth?: string;
  
  /** Custom header content */
  headerContent?: ReactNode;
  
  /** Show/hide the default toggle button */
  showToggleButton?: boolean;
  
  /** Custom toggle button content */
  customToggleButton?: ReactNode;
  
  /** Sidebar title when expanded */
  title?: string;
  
  /** Sidebar subtitle when expanded */
  subtitle?: string;
}