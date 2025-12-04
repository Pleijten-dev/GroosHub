'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/shared/components/UI/Sidebar/Sidebar';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_pinned: boolean;
  last_accessed_at: string;
  user_role: string;
  member_count: number;
  chat_count: number;
  file_count: number;
}

interface Chat {
  id: string;
  title: string;
  project_id: string | null;
  project_name: string | null;
  last_message_at: string;
  message_count: number;
}

interface ProjectsSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  locale: string;
  userEmail?: string;
  userName?: string;
}

export function ProjectsSidebar({
  isCollapsed,
  onToggle,
  locale,
  userEmail,
  userName
}: ProjectsSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [projects, setProjects] = useState<Project[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  useEffect(() => {
    fetchProjects();
    fetchChats();
  }, []);

  async function fetchProjects() {
    try {
      setIsLoadingProjects(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function fetchChats() {
    try {
      setIsLoadingChats(true);
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }

  // Separate pinned and recent projects
  const pinnedProjects = projects.filter(p => p.is_pinned);
  const recentProjects = projects
    .filter(p => !p.is_pinned)
    .sort((a, b) =>
      new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime()
    );

  const visibleProjects = showAllProjects ? recentProjects : recentProjects.slice(0, 5);
  const visibleChats = showAllChats ? chats : chats.slice(0, 10);

  const translations = {
    nl: {
      projects: 'Projecten',
      chats: 'Chats',
      newProject: 'Nieuw Project',
      newChat: 'Nieuwe Chat',
      pinned: 'Vastgepind',
      recent: 'Recent',
      showMore: 'Toon meer',
      showLess: 'Toon minder',
      noProjects: 'Geen projecten',
      noChats: 'Geen chats',
      loading: 'Laden...'
    },
    en: {
      projects: 'Projects',
      chats: 'Chats',
      newProject: 'New Project',
      newChat: 'New Chat',
      pinned: 'Pinned',
      recent: 'Recent',
      showMore: 'Show more',
      showLess: 'Show less',
      noProjects: 'No projects',
      noChats: 'No chats',
      loading: 'Loading...'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  // User header content
  const headerContent = userName || userEmail ? (
    <div className="flex items-center gap-sm">
      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
        {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {userName || userEmail}
        </p>
      </div>
    </div>
  ) : undefined;

  // Projects section content
  const projectsContent = (
    <div className="space-y-sm">
      {/* Header with New button */}
      <div className="flex items-center justify-between mb-base">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t.projects}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/projects/new`)}
          className="text-xs px-sm py-xs h-auto"
        >
          + {t.newProject}
        </Button>
      </div>

      {isLoadingProjects ? (
        <div className="text-sm text-gray-500 py-base text-center">{t.loading}</div>
      ) : projects.length === 0 ? (
        <div className="text-sm text-gray-500 py-base text-center">{t.noProjects}</div>
      ) : (
        <>
          {/* Pinned Projects */}
          {pinnedProjects.length > 0 && (
            <div className="mb-base">
              <div className="text-xs font-medium text-gray-500 mb-xs uppercase">
                {t.pinned}
              </div>
              {pinnedProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                  className={cn(
                    'w-full text-left px-sm py-sm rounded hover:bg-gray-100 mb-xs transition-colors',
                    pathname.includes(project.id) && 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                >
                  <div className="flex items-center gap-xs">
                    <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className="text-sm font-medium truncate">{project.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-xs flex items-center gap-md">
                    <span>{project.member_count} members</span>
                    <span>{project.chat_count} chats</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-xs uppercase">
                {t.recent}
              </div>
              {visibleProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                  className={cn(
                    'w-full text-left px-sm py-sm rounded hover:bg-gray-100 mb-xs transition-colors',
                    pathname.includes(project.id) && 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                >
                  <div className="text-sm font-medium truncate">{project.name}</div>
                  <div className="text-xs text-gray-500 mt-xs flex items-center gap-md">
                    <span>{project.member_count} members</span>
                    <span>{project.chat_count} chats</span>
                  </div>
                </button>
              ))}

              {/* Show More/Less Button */}
              {recentProjects.length > 5 && (
                <button
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-sm py-xs w-full text-left"
                >
                  {showAllProjects
                    ? `${t.showLess}`
                    : `${t.showMore} (${recentProjects.length - 5} more)`
                  }
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Chats section content
  const chatsContent = (
    <div className="space-y-sm">
      {/* Header with New button */}
      <div className="flex items-center justify-between mb-base">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t.chats}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/ai-assistant`)}
          className="text-xs px-sm py-xs h-auto"
        >
          + {t.newChat}
        </Button>
      </div>

      {isLoadingChats ? (
        <div className="text-sm text-gray-500 py-base text-center">{t.loading}</div>
      ) : chats.length === 0 ? (
        <div className="text-sm text-gray-500 py-base text-center">{t.noChats}</div>
      ) : (
        <>
          {visibleChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => router.push(`/${locale}/ai-assistant?chat=${chat.id}`)}
              className={cn(
                'w-full text-left px-sm py-sm rounded hover:bg-gray-100 mb-xs transition-colors',
                pathname.includes(chat.id) && 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              <div className="text-sm font-medium truncate">
                {chat.title || 'Untitled Chat'}
              </div>
              {chat.project_name && (
                <div className="text-xs text-gray-500 mt-xs truncate">
                  {chat.project_name}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-xs">
                {chat.message_count} messages
              </div>
            </button>
          ))}

          {/* Show More/Less Button */}
          {chats.length > 10 && (
            <button
              onClick={() => setShowAllChats(!showAllChats)}
              className="text-xs text-gray-500 hover:text-gray-700 px-sm py-xs w-full text-left"
            >
              {showAllChats
                ? `${t.showLess}`
                : `${t.showMore} (${chats.length - 10} more)`
              }
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <Sidebar
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      headerContent={headerContent}
      sections={[
        {
          id: 'projects',
          title: '',
          content: projectsContent
        },
        {
          id: 'chats',
          title: '',
          content: chatsContent
        }
      ]}
      expandedWidth="280px"
      collapsedWidth="60px"
      position="left"
      withNavbar={true}
    />
  );
}

export default ProjectsSidebar;
