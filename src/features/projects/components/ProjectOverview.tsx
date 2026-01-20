'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';
import { ProjectMembers } from './ProjectMembers';
import { ProjectFiles } from './ProjectFiles';
import { ProjectChats } from './ProjectChats';
import { ProjectLocations } from './ProjectLocations';
import { ProjectTrash } from './ProjectTrash';
import { ProjectTasks } from '@/features/tasks/components/ProjectTasks';
import { ProjectOverviewPage } from '@/features/chat/components/ProjectOverviewPage';

interface ProjectOverviewProps {
  projectId: string;
  locale: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_number: string | null;
  status: string;
  is_pinned: boolean;
  user_role: string;
  permissions: {
    can_edit: boolean;
    can_delete: boolean;
    can_manage_members: boolean;
    can_manage_files: boolean;
    can_view_analytics: boolean;
  };
  member_count: number;
  chat_count: number;
  file_count: number;
  location_count: number;
  lca_count: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

type Tab = 'overview' | 'tasks' | 'files' | 'members' | 'chats' | 'locations' | 'lca' | 'trash';

export function ProjectOverview({ projectId, locale }: ProjectOverviewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const translations = {
    nl: {
      overview: 'Overzicht',
      tasks: 'Taken',
      files: 'Bestanden',
      members: 'Leden',
      chats: 'Chats',
      locations: 'Locaties',
      lca: 'LCA',
      trash: 'Prullenbak',
      settings: 'Instellingen',
      projectStatistics: 'Projectstatistieken',
      messages: 'Berichten',
      description: 'Beschrijving',
      projectNumber: 'Projectnummer',
      status: 'Status',
      role: 'Jouw rol',
      created: 'Gemaakt',
      lastAccessed: 'Laatst geopend',
      noDescription: 'Geen beschrijving',
      loading: 'Laden...',
      error: 'Fout bij laden project',
      notFound: 'Project niet gevonden'
    },
    en: {
      overview: 'Overview',
      tasks: 'Tasks',
      files: 'Files',
      members: 'Members',
      chats: 'Chats',
      locations: 'Locations',
      lca: 'LCA',
      trash: 'Trash',
      settings: 'Settings',
      projectStatistics: 'Project Statistics',
      messages: 'Messages',
      description: 'Description',
      projectNumber: 'Project Number',
      status: 'Status',
      role: 'Your Role',
      created: 'Created',
      lastAccessed: 'Last Accessed',
      noDescription: 'No description',
      loading: 'Loading...',
      error: 'Error loading project',
      notFound: 'Project not found'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  async function fetchProject() {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}`);

      if (!res.ok) {
        if (res.status === 404) {
          setError(t.notFound);
        } else {
          setError(t.error);
        }
        return;
      }

      const data = await res.json();
      setProject(data.data);
    } catch (err) {
      console.error('Failed to fetch project:', err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-base"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-base" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p className="text-lg text-gray-700 font-medium">{error || t.error}</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: t.overview },
    { id: 'tasks', label: t.tasks },
    { id: 'chats', label: t.chats, count: project.chat_count },
    { id: 'files', label: t.files, count: project.file_count },
    { id: 'locations', label: t.locations, count: project.location_count },
    { id: 'lca', label: t.lca, count: project.lca_count },
    { id: 'members', label: t.members, count: project.member_count },
    { id: 'trash', label: t.trash }
  ];

  return (
    <div className="p-lg h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-base pb-base border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-text-primary mb-xs truncate">
            {project.name}
          </h1>
          {project.project_number && (
            <p className="text-sm text-gray-500">
              {t.projectNumber}: {project.project_number}
            </p>
          )}
        </div>

        {project.permissions.can_edit && (
          <Button variant="secondary" size="sm">
            {t.settings}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-base border-b border-gray-200 mb-base overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'pb-sm px-xs whitespace-nowrap transition-colors relative',
              activeTab === tab.id
                ? 'text-primary font-medium'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-xs text-xs bg-gray-200 text-gray-700 px-xs py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-base">
        {activeTab === 'overview' && (
          <div className="h-[calc(100vh-200px)]">
            <ProjectOverviewPage
              locale={locale as 'nl' | 'en'}
              projectId={projectId}
              projectName={project.name}
            />
          </div>
        )}

        {activeTab === 'tasks' && (
          <Card>
            <ProjectTasks
              projectId={projectId}
              locale={locale}
            />
          </Card>
        )}

        {activeTab === 'chats' && (
          <Card>
            <ProjectChats
              projectId={projectId}
              locale={locale}
            />
          </Card>
        )}

        {activeTab === 'files' && (
          <Card>
            <ProjectFiles
              projectId={projectId}
              locale={locale}
              canManageFiles={project.permissions.can_manage_files}
            />
          </Card>
        )}

        {activeTab === 'members' && (
          <Card>
            <ProjectMembers
              projectId={projectId}
              locale={locale}
              canManageMembers={project.permissions.can_manage_members}
            />
          </Card>
        )}

        {activeTab === 'locations' && (
          <Card>
            <ProjectLocations
              projectId={projectId}
              locale={locale}
            />
          </Card>
        )}

        {activeTab === 'lca' && (
          <Card>
            <h2 className="text-xl font-semibold mb-base">{t.lca}</h2>
            <p className="text-gray-600">LCA snapshots coming soon...</p>
          </Card>
        )}

        {activeTab === 'trash' && (
          <Card>
            <ProjectTrash
              projectId={projectId}
              locale={locale}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export default ProjectOverview;
