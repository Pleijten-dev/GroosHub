'use client';

import React from 'react';
import { ProjectsSidebarEnhanced } from '@/features/projects/components/ProjectsSidebarEnhanced';
import { ProjectOverview } from '@/features/projects/components/ProjectOverview';
import { useProjectsSidebar } from '@/features/projects/hooks/useProjectsSidebar';

interface ProjectPageClientProps {
  projectId: string;
  locale: string;
  userEmail?: string;
  userName?: string;
}

export function ProjectPageClient({
  projectId,
  locale,
  userEmail,
  userName
}: ProjectPageClientProps) {
  const { isCollapsed, toggleSidebar, isLoaded } = useProjectsSidebar();

  // Don't render until sidebar state is loaded from localStorage
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectsSidebarEnhanced
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        locale={locale}
        userEmail={userEmail}
        userName={userName}
      />

      {/* Main content area - adjust margin based on sidebar state */}
      <main
        className="flex-1 overflow-hidden transition-all duration-normal"
        style={{
          marginLeft: isCollapsed ? '60px' : '280px'
        }}
      >
        <ProjectOverview projectId={projectId} locale={locale} />
      </main>
    </div>
  );
}

export default ProjectPageClient;
