'use client';

import React from 'react';
import { ProjectsSidebar } from '@/features/projects/components/ProjectsSidebar';
import { NewProjectForm } from '@/features/projects/components/NewProjectForm';
import { useProjectsSidebar } from '@/features/projects/hooks/useProjectsSidebar';

interface NewProjectPageClientProps {
  locale: string;
  userEmail?: string;
  userName?: string;
}

export function NewProjectPageClient({
  locale,
  userEmail,
  userName
}: NewProjectPageClientProps) {
  const { isCollapsed, toggleSidebar, isLoaded } = useProjectsSidebar();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectsSidebar
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        locale={locale}
        userEmail={userEmail}
        userName={userName}
      />

      <main
        className="flex-1 overflow-y-auto transition-all duration-normal"
        style={{
          marginLeft: isCollapsed ? '60px' : '280px'
        }}
      >
        <div className="p-lg">
          <NewProjectForm locale={locale} />
        </div>
      </main>
    </div>
  );
}

export default NewProjectPageClient;
