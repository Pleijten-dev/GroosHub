'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectsSidebar } from '@/features/projects/components/ProjectsSidebar';
import { useProjectsSidebar } from '@/features/projects/hooks/useProjectsSidebar';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';

interface ProjectsListClientProps {
  locale: string;
  userEmail?: string;
  userName?: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_pinned: boolean;
  user_role: string;
  member_count: number;
  chat_count: number;
  file_count: number;
  last_accessed_at: string;
  created_at: string;
}

export function ProjectsListClient({
  locale,
  userEmail,
  userName
}: ProjectsListClientProps) {
  const router = useRouter();
  const { isCollapsed, toggleSidebar, isLoaded } = useProjectsSidebar();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pinned' | 'recent'>('all');

  const translations = {
    nl: {
      allProjects: 'Alle Projecten',
      newProject: 'Nieuw Project',
      pinned: 'Vastgepind',
      recent: 'Recent',
      all: 'Alle',
      members: 'leden',
      chats: 'chats',
      files: 'bestanden',
      loading: 'Laden...',
      noProjects: 'Geen projecten gevonden',
      noProjectsDesc: 'Begin met het maken van je eerste project',
      role: 'Rol',
      lastAccessed: 'Laatst geopend'
    },
    en: {
      allProjects: 'All Projects',
      newProject: 'New Project',
      pinned: 'Pinned',
      recent: 'Recent',
      all: 'All',
      members: 'members',
      chats: 'chats',
      files: 'files',
      loading: 'Loading...',
      noProjects: 'No projects found',
      noProjectsDesc: 'Start by creating your first project',
      role: 'Role',
      lastAccessed: 'Last accessed'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredProjects = projects.filter(p => {
    if (filter === 'pinned') return p.is_pinned;
    if (filter === 'recent') return !p.is_pinned;
    return true;
  }).sort((a, b) => {
    if (filter === 'recent') {
      return new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime();
    }
    return 0;
  });

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
        <div className="p-lg max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-base pb-base border-b border-gray-200">
            <h1 className="text-3xl font-bold">{t.allProjects}</h1>
            <Button
              variant="primary"
              size="base"
              onClick={() => router.push(`/${locale}/projects/new`)}
            >
              + {t.newProject}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-sm mb-base">
            {[
              { id: 'all', label: t.all },
              { id: 'pinned', label: t.pinned },
              { id: 'recent', label: t.recent }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={cn(
                  'px-base py-sm rounded-lg text-sm font-medium transition-colors',
                  filter === f.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="text-center py-2xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-base"></div>
              <p className="text-gray-600">{t.loading}</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <div className="text-center py-2xl">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-base" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <h3 className="text-xl font-medium text-gray-700 mb-xs">{t.noProjects}</h3>
                <p className="text-gray-500 mb-base">{t.noProjectsDesc}</p>
                <Button
                  variant="primary"
                  size="base"
                  onClick={() => router.push(`/${locale}/projects/new`)}
                >
                  {t.newProject}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-base">
              {filteredProjects.map(project => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-base">
                    <h3 className="text-lg font-semibold text-text-primary truncate flex-1">
                      {project.name}
                    </h3>
                    {project.is_pinned && (
                      <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 ml-sm" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    )}
                  </div>

                  {project.description && (
                    <p className="text-sm text-gray-600 mb-base line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-base text-xs text-gray-500 mb-base">
                    <span>{project.member_count} {t.members}</span>
                    <span>•</span>
                    <span>{project.chat_count} {t.chats}</span>
                    <span>•</span>
                    <span>{project.file_count} {t.files}</span>
                  </div>

                  <div className="flex items-center justify-between pt-base border-t border-gray-200">
                    <span className="text-xs text-gray-500 capitalize">
                      {t.role}: {project.user_role}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(project.last_accessed_at).toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProjectsListClient;
