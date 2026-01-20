'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProjectsSidebarEnhanced } from '@/features/projects/components/ProjectsSidebarEnhanced';
import { ChatUI } from '@/features/chat/components/ChatUI';
import { OverviewPage } from '@/features/chat/components/OverviewPage';
import { useProjectsSidebar } from '@/features/projects/hooks/useProjectsSidebar';
import { cn } from '@/shared/utils/cn';

interface AIAssistantClientProps {
  locale: string;
  userEmail?: string;
  userName?: string;
  chatId?: string;
  projectId?: string;
  /** Current active view from sidebar navigation */
  activeView?: 'overview' | 'chats' | 'tasks' | 'files' | 'notes' | 'members' | 'trash';
  /** Initial message to send automatically when chat loads */
  initialMessage?: string;
}

export function AIAssistantClient({
  locale,
  userEmail,
  userName,
  chatId,
  projectId,
  activeView = 'overview',
  initialMessage
}: AIAssistantClientProps) {
  const { isCollapsed, toggleSidebar, isLoaded } = useProjectsSidebar();

  // Track current view for transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentView, setCurrentView] = useState<'overview' | 'chat'>('overview');
  const previousChatId = useRef<string | undefined>(chatId);

  // Handle view transitions
  useEffect(() => {
    const newView = chatId ? 'chat' : 'overview';

    // Detect view change
    if (newView !== currentView || chatId !== previousChatId.current) {
      setIsTransitioning(true);

      // Brief transition delay for smooth effect
      const timer = setTimeout(() => {
        setCurrentView(newView);
        previousChatId.current = chatId;
        setIsTransitioning(false);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [chatId, currentView]);

  // Navbar height is 64px
  const NAVBAR_HEIGHT = 64;

  // Don't render until sidebar state is loaded from localStorage
  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Determine which content to show
  const renderContent = () => {
    // If a specific chat is selected, show ChatUI
    if (chatId) {
      return (
        <ChatUI
          locale={locale as 'nl' | 'en'}
          chatId={chatId}
          projectId={projectId}
          initialMessage={initialMessage}
        />
      );
    }

    // Show overview page for the default/overview view
    if (activeView === 'overview' || !activeView) {
      return (
        <OverviewPage
          locale={locale as 'nl' | 'en'}
        />
      );
    }

    // For other views (chats, tasks, files, etc.) show ChatUI as fallback
    // These will be handled by their own pages in the future
    return (
      <ChatUI
        locale={locale as 'nl' | 'en'}
        chatId={chatId}
        projectId={projectId}
      />
    );
  };

  return (
    <div className="flex overflow-hidden" style={{ height: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}>
      <ProjectsSidebarEnhanced
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        locale={locale}
        userEmail={userEmail}
        userName={userName}
      />

      {/* Main content area - adjust margin based on sidebar state */}
      <main
        className={cn(
          'flex-1 overflow-hidden transition-all duration-200',
          // Fade transition when switching views
          isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
        )}
        style={{
          marginLeft: isCollapsed ? '60px' : '280px'
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
}

export default AIAssistantClient;
