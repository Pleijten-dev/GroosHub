'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProjectsSidebarEnhanced } from '@/features/projects/components/ProjectsSidebarEnhanced';
import { ChatUI } from '@/features/chat/components/ChatUI';
import { OverviewPage } from '@/features/chat/components/OverviewPage';
import { useProjectsSidebar } from '@/features/projects/hooks/useProjectsSidebar';
import { MainLayout } from '@/shared/components/UI/MainLayout';

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
  /** Initial file IDs to include with the initial message */
  initialFileIds?: string[];
}

type TransitionPhase = 'idle' | 'exiting' | 'entering';

// Navbar height is 64px
const NAVBAR_HEIGHT = 64;

export function AIAssistantClient({
  locale,
  userEmail,
  userName,
  chatId,
  projectId,
  activeView = 'overview',
  initialMessage,
  initialFileIds
}: AIAssistantClientProps) {
  const { isCollapsed, toggleSidebar, isLoaded } = useProjectsSidebar();

  // Track current view for transitions
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [currentView, setCurrentView] = useState<'overview' | 'chat'>(chatId ? 'chat' : 'overview');
  const [displayedContent, setDisplayedContent] = useState<'overview' | 'chat'>(chatId ? 'chat' : 'overview');
  const previousChatId = useRef<string | undefined>(chatId);
  const animationKey = useRef(0);

  // Handle view transitions with phased animation
  useEffect(() => {
    const newView = chatId ? 'chat' : 'overview';

    // Detect view change
    if (newView !== currentView || (chatId && chatId !== previousChatId.current)) {
      // Start exit animation
      setTransitionPhase('exiting');

      // After exit animation, switch content and start enter animation
      const exitTimer = setTimeout(() => {
        setDisplayedContent(newView);
        setCurrentView(newView);
        previousChatId.current = chatId;
        animationKey.current += 1;
        setTransitionPhase('entering');

        // After enter animation, return to idle
        const enterTimer = setTimeout(() => {
          setTransitionPhase('idle');
        }, 400);

        return () => clearTimeout(enterTimer);
      }, 200);

      return () => clearTimeout(exitTimer);
    }
  }, [chatId, currentView]);

  // Generate unique key for content to trigger fresh animations
  const contentKey = `${displayedContent}-${chatId || 'overview'}-${animationKey.current}`;

  // Get transition classes based on current phase
  const getTransitionClasses = () => {
    switch (transitionPhase) {
      case 'exiting':
        return 'page-exit-active';
      case 'entering':
        return 'animate-content-flow';
      default:
        return '';
    }
  };

  // Determine which content to show based on displayed content (which updates during transition)
  const renderContent = () => {
    // If displaying chat view
    if (displayedContent === 'chat') {
      return (
        <ChatUI
          key={contentKey}
          locale={locale as 'nl' | 'en'}
          chatId={chatId}
          projectId={projectId}
          initialMessage={initialMessage}
          initialFileIds={initialFileIds}
          isEntering={transitionPhase === 'entering'}
        />
      );
    }

    // Show overview page for the default/overview view
    if (activeView === 'overview' || !activeView) {
      return (
        <OverviewPage
          key={contentKey}
          locale={locale as 'nl' | 'en'}
          isEntering={transitionPhase === 'entering'}
        />
      );
    }

    // For other views (chats, tasks, files, etc.) show ChatUI as fallback
    // These will be handled by their own pages in the future
    return (
      <ChatUI
        key={contentKey}
        locale={locale as 'nl' | 'en'}
        chatId={chatId}
        projectId={projectId}
        isEntering={transitionPhase === 'entering'}
      />
    );
  };

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

  return (
    <MainLayout
      isCollapsed={isCollapsed}
      sidebar={
        <ProjectsSidebarEnhanced
          isCollapsed={isCollapsed}
          onToggle={toggleSidebar}
          locale={locale}
          userEmail={userEmail}
          userName={userName}
        />
      }
      mainClassName={getTransitionClasses()}
    >
      {renderContent()}
    </MainLayout>
  );
}

export default AIAssistantClient;
