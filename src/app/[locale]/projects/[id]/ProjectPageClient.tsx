'use client';

import React from 'react';
import { ProjectsSidebarEnhanced } from '@/features/projects/components/ProjectsSidebarEnhanced';
import { ProjectOverview } from '@/features/projects/components/ProjectOverview';
import { useProjectsSidebar } from '@/features/projects/hooks/useProjectsSidebar';
import { MainLayout } from '@/shared/components/UI/MainLayout';

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
    >
      <ProjectOverview projectId={projectId} locale={locale} />
    </MainLayout>
  );
}

export default ProjectPageClient;
