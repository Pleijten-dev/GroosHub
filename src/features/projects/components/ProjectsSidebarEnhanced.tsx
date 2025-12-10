'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/shared/components/UI/Sidebar/Sidebar';
import { Button } from '@/shared/components/UI/Button/Button';
import { ContextMenu, ContextMenuItem } from '@/shared/components/UI/ContextMenu/ContextMenu';
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

interface ArchivedProject {
  id: string;
  name: string;
  deleted_at: string;
  role: string;
  days_until_permanent_delete: number;
  chat_count: number;
  file_count: number;
}

interface ArchivedChat {
  id: string;
  title: string;
  project_id: string | null;
  deleted_at: string;
  days_until_permanent_delete: number;
  message_count: number;
  project_name: string | null;
}

interface ProjectsSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  locale: string;
  userEmail?: string;
  userName?: string;
}

export function ProjectsSidebarEnhanced({
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
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProject[]>([]);
  const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);

  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [showArchivedChats, setShowArchivedChats] = useState(false);

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);

  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const translations = {
    nl: {
      projects: 'Projecten',
      chats: 'Chats',
      newProject: 'Nieuw Project',
      newChat: 'Nieuwe Chat',
      pinned: 'Vastgepind',
      recent: 'Recent',
      archived: 'Gearchiveerd',
      showMore: 'Toon meer',
      showLess: 'Toon minder',
      noProjects: 'Geen projecten',
      noChats: 'Geen chats',
      noArchivedProjects: 'Geen gearchiveerde projecten',
      noArchivedChats: 'Geen gearchiveerde chats',
      loading: 'Laden...',
      pin: 'Vastpinnen',
      unpin: 'Losmaken',
      rename: 'Hernoemen',
      leave: 'Verlaten',
      delete: 'Verwijderen',
      restore: 'Herstellen',
      deletePermanently: 'Permanent verwijderen',
      daysRemaining: (days: number) => `${days} dagen resterend`,
      confirmLeave: 'Weet je zeker dat je dit project wilt verlaten?',
      confirmDelete: 'Weet je zeker dat je dit wilt verwijderen? Het gaat naar het archief voor 30 dagen.',
      confirmPermanentDelete: 'Weet je zeker dat je dit permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt!',
      renaming: 'Hernoemen...',
    },
    en: {
      projects: 'Projects',
      chats: 'Chats',
      newProject: 'New Project',
      newChat: 'New Chat',
      pinned: 'Pinned',
      recent: 'Recent',
      archived: 'Archived',
      showMore: 'Show more',
      showLess: 'Show less',
      noProjects: 'No projects',
      noChats: 'No chats',
      noArchivedProjects: 'No archived projects',
      noArchivedChats: 'No archived chats',
      loading: 'Loading...',
      pin: 'Pin',
      unpin: 'Unpin',
      rename: 'Rename',
      leave: 'Leave',
      delete: 'Delete',
      restore: 'Restore',
      deletePermanently: 'Delete Permanently',
      daysRemaining: (days: number) => `${days} days remaining`,
      confirmLeave: 'Are you sure you want to leave this project?',
      confirmDelete: 'Are you sure you want to delete this? It will be moved to archive for 30 days.',
      confirmPermanentDelete: 'Are you sure you want to permanently delete this? This cannot be undone!',
      renaming: 'Renaming...',
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchProjects();
    fetchChats();
    fetchArchive();
  }, []);

  async function fetchProjects() {
    try {
      setIsLoadingProjects(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
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
      const res = await fetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setChats(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }

  async function fetchArchive() {
    try {
      setIsLoadingArchive(true);
      const res = await fetch('/api/archive');
      if (res.ok) {
        const data = await res.json();
        setArchivedProjects(data.data.projects || []);
        setArchivedChats(data.data.chats || []);
      }
    } catch (error) {
      console.error('Failed to fetch archive:', error);
    } finally {
      setIsLoadingArchive(false);
    }
  }

  // Project actions
  async function togglePinProject(projectId: string, currentPinned: boolean) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !currentPinned }),
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  }

  async function leaveProject(projectId: string) {
    if (!confirm(t.confirmLeave)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/members/me`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to leave project:', error);
    }
  }

  async function deleteProject(projectId: string) {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchProjects();
        fetchArchive();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

  async function renameProject(projectId: string, newName: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        fetchProjects();
        setRenameProjectId(null);
        setRenameValue('');
      }
    } catch (error) {
      console.error('Failed to rename project:', error);
    }
  }

  // Chat actions
  async function deleteChat(chatId: string) {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchChats();
        fetchArchive();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }

  async function renameChat(chatId: string, newTitle: string) {
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        fetchChats();
        setRenameChatId(null);
        setRenameValue('');
      }
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  }

  // Archive actions
  async function restoreProject(projectId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchProjects();
        fetchArchive();
      }
    } catch (error) {
      console.error('Failed to restore project:', error);
    }
  }

  async function restoreChat(chatId: string) {
    try {
      const res = await fetch(`/api/chats/${chatId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchChats();
        fetchArchive();
      }
    } catch (error) {
      console.error('Failed to restore chat:', error);
    }
  }

  async function permanentlyDeleteProject(projectId: string) {
    if (!confirm(t.confirmPermanentDelete)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/permanent`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchArchive();
      }
    } catch (error) {
      console.error('Failed to permanently delete project:', error);
    }
  }

  async function permanentlyDeleteChat(chatId: string) {
    if (!confirm(t.confirmPermanentDelete)) return;

    try {
      const res = await fetch(`/api/chats/${chatId}/permanent`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchArchive();
      }
    } catch (error) {
      console.error('Failed to permanently delete chat:', error);
    }
  }

  // Build context menu items for project
  const getProjectMenuItems = (project: Project): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        id: 'pin',
        label: project.is_pinned ? t.unpin : t.pin,
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
          </svg>
        ),
        onClick: () => togglePinProject(project.id, project.is_pinned),
      },
      {
        id: 'rename',
        label: t.rename,
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        ),
        onClick: () => {
          setRenameProjectId(project.id);
          setRenameValue(project.name);
        },
        separator: true,
      },
    ];

    // Only non-creators can leave
    if (project.user_role !== 'creator') {
      items.push({
        id: 'leave',
        label: t.leave,
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        ),
        onClick: () => leaveProject(project.id),
        variant: 'danger',
      });
    }

    // Only creator can delete
    if (project.user_role === 'creator') {
      items.push({
        id: 'delete',
        label: t.delete,
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        ),
        onClick: () => deleteProject(project.id),
        variant: 'danger',
      });
    }

    return items;
  };

  // Build context menu items for chat
  const getChatMenuItems = (chat: Chat): ContextMenuItem[] => [
    {
      id: 'rename',
      label: t.rename,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      ),
      onClick: () => {
        setRenameChatId(chat.id);
        setRenameValue(chat.title || 'Untitled Chat');
      },
    },
    {
      id: 'delete',
      label: t.delete,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      ),
      onClick: () => deleteChat(chat.id),
      variant: 'danger',
    },
  ];

  // Separate pinned and recent projects
  const pinnedProjects = projects.filter(p => p.is_pinned);
  const recentProjects = projects
    .filter(p => !p.is_pinned)
    .sort((a, b) =>
      new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime()
    );

  const visibleProjects = showAllProjects ? recentProjects : recentProjects.slice(0, 5);
  const visibleChats = showAllChats ? chats : chats.slice(0, 10);
  const visibleArchivedProjects = showArchivedProjects ? archivedProjects : archivedProjects.slice(0, 3);
  const visibleArchivedChats = showArchivedChats ? archivedChats : archivedChats.slice(0, 3);

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

  // Render project item
  const renderProjectItem = (project: Project) => (
    <div
      key={project.id}
      className={cn(
        'group w-full text-left px-sm py-sm rounded hover:bg-gray-100 mb-xs transition-colors cursor-pointer',
        pathname.includes(project.id) && 'bg-primary/10 text-primary hover:bg-primary/20'
      )}
      onClick={() => router.push(`/${locale}/projects/${project.id}`)}
    >
      <div className="flex items-center justify-between">
        {renameProjectId === project.id ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => renameProject(project.id, renameValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') renameProject(project.id, renameValue);
              if (e.key === 'Escape') {
                setRenameProjectId(null);
                setRenameValue('');
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-medium px-xs py-xs border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        ) : (
          <>
            <div className="flex items-center gap-xs flex-1 min-w-0">
              {project.is_pinned && (
                <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              )}
              <span className="text-sm font-medium truncate">{project.name}</span>
            </div>
            <ContextMenu items={getProjectMenuItems(project)} />
          </>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-xs flex items-center gap-md">
        <span>{project.member_count} members</span>
        <span>{project.chat_count} chats</span>
      </div>
    </div>
  );

  // Render chat item
  const renderChatItem = (chat: Chat) => (
    <div
      key={chat.id}
      className={cn(
        'group w-full text-left px-sm py-sm rounded hover:bg-gray-100 mb-xs transition-colors cursor-pointer',
        pathname.includes(chat.id) && 'bg-primary/10 text-primary hover:bg-primary/20'
      )}
      onClick={() => router.push(`/${locale}/ai-assistant?chat=${chat.id}`)}
    >
      <div className="flex items-center justify-between">
        {renameChatId === chat.id ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => renameChat(chat.id, renameValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') renameChat(chat.id, renameValue);
              if (e.key === 'Escape') {
                setRenameChatId(null);
                setRenameValue('');
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-medium px-xs py-xs border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {chat.title || 'Untitled Chat'}
              </div>
            </div>
            <ContextMenu items={getChatMenuItems(chat)} />
          </>
        )}
      </div>
      {chat.project_name && (
        <div className="text-xs text-gray-500 mt-xs truncate">
          {chat.project_name}
        </div>
      )}
      <div className="text-xs text-gray-400 mt-xs">
        {chat.message_count} messages
      </div>
    </div>
  );

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
              {pinnedProjects.map(renderProjectItem)}
            </div>
          )}

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-xs uppercase">
                {t.recent}
              </div>
              {visibleProjects.map(renderProjectItem)}

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

          {/* Archived Projects Section */}
          {archivedProjects.length > 0 && (
            <div className="mt-base pt-base border-t border-gray-200">
              <button
                onClick={() => setShowArchivedProjects(!showArchivedProjects)}
                className="flex items-center justify-between w-full text-xs font-medium text-gray-500 uppercase mb-xs hover:text-gray-700"
              >
                <span>{t.archived}</span>
                <div className="flex items-center gap-xs">
                  <span className="bg-gray-200 text-gray-700 px-xs py-0.5 rounded-full text-xs">
                    {archivedProjects.length}
                  </span>
                  <svg
                    className={cn(
                      'w-3 h-3 transition-transform',
                      showArchivedProjects ? 'rotate-180' : ''
                    )}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </div>
              </button>

              {showArchivedProjects && (
                <>
                  {visibleArchivedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="px-sm py-sm rounded hover:bg-gray-50 mb-xs transition-colors"
                    >
                      <div className="flex items-center justify-between mb-xs">
                        <span className="text-sm font-medium text-gray-700 truncate flex-1">
                          {project.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-xs">
                        {t.daysRemaining(project.days_until_permanent_delete)}
                      </div>
                      <div className="flex gap-xs">
                        <Button
                          onClick={() => restoreProject(project.id)}
                          variant="secondary"
                          size="sm"
                          className="text-xs px-sm py-xs h-auto"
                        >
                          {t.restore}
                        </Button>
                        {project.role === 'creator' && (
                          <Button
                            onClick={() => permanentlyDeleteProject(project.id)}
                            variant="ghost"
                            size="sm"
                            className="text-xs px-sm py-xs h-auto text-error hover:bg-error-light"
                          >
                            {t.deletePermanently}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {archivedProjects.length > 3 && (
                    <button
                      onClick={() => setShowArchivedProjects(true)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-sm py-xs w-full text-left"
                    >
                      {showArchivedProjects && archivedProjects.length > 3
                        ? `${t.showLess}`
                        : archivedProjects.length > 3 && `${t.showMore} (${archivedProjects.length - 3} more)`
                      }
                    </button>
                  )}
                </>
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
          {visibleChats.map(renderChatItem)}

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

          {/* Archived Chats Section */}
          {archivedChats.length > 0 && (
            <div className="mt-base pt-base border-t border-gray-200">
              <button
                onClick={() => setShowArchivedChats(!showArchivedChats)}
                className="flex items-center justify-between w-full text-xs font-medium text-gray-500 uppercase mb-xs hover:text-gray-700"
              >
                <span>{t.archived}</span>
                <div className="flex items-center gap-xs">
                  <span className="bg-gray-200 text-gray-700 px-xs py-0.5 rounded-full text-xs">
                    {archivedChats.length}
                  </span>
                  <svg
                    className={cn(
                      'w-3 h-3 transition-transform',
                      showArchivedChats ? 'rotate-180' : ''
                    )}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </div>
              </button>

              {showArchivedChats && (
                <>
                  {visibleArchivedChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="px-sm py-sm rounded hover:bg-gray-50 mb-xs transition-colors"
                    >
                      <div className="flex items-center justify-between mb-xs">
                        <span className="text-sm font-medium text-gray-700 truncate flex-1">
                          {chat.title || 'Untitled Chat'}
                        </span>
                      </div>
                      {chat.project_name && (
                        <div className="text-xs text-gray-500 mb-xs truncate">
                          {chat.project_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mb-xs">
                        {t.daysRemaining(chat.days_until_permanent_delete)}
                      </div>
                      <div className="flex gap-xs">
                        <Button
                          onClick={() => restoreChat(chat.id)}
                          variant="secondary"
                          size="sm"
                          className="text-xs px-sm py-xs h-auto"
                        >
                          {t.restore}
                        </Button>
                        <Button
                          onClick={() => permanentlyDeleteChat(chat.id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs px-sm py-xs h-auto text-error hover:bg-error-light"
                        >
                          {t.deletePermanently}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {archivedChats.length > 3 && (
                    <button
                      onClick={() => setShowArchivedChats(!showArchivedChats)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-sm py-xs w-full text-left"
                    >
                      {showArchivedChats && archivedChats.length > 3
                        ? `${t.showLess}`
                        : `${t.showMore} (${archivedChats.length - 3} more)`
                      }
                    </button>
                  )}
                </>
              )}
            </div>
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

export default ProjectsSidebarEnhanced;
