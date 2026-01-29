/**
 * ProjectOverviewPage Component
 *
 * Project-specific landing page showing:
 * - Main section: Welcome message, sample prompts, message input
 * - Side section: Calendar with project deadlines, task distribution by team member, project tasks
 *
 * This component is designed to replace the "Overzicht" tab on project pages.
 *
 * Features:
 * - Project-specific sample prompts
 * - Quick message input to start project-specific chat
 * - Project task overview with team member distribution
 * - Project deadlines calendar
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/shared/utils/cn';
import { MessageInput, type UploadedFile } from '@/shared/components/UI/MessageInput';
import { MiniCalendar, type Deadline } from '@/shared/components/UI/MiniCalendar';
import { HorizontalStackedBarChart, type StackedBarSegment } from '@/shared/components/common/HorizontalStackedBarChart';
import { TaskListPreview, type TaskPreview } from '@/features/tasks/components/TaskListPreview';
import { SamplePrompts } from '../SamplePrompts';

// ============================================================================
// Types
// ============================================================================

export interface ProjectOverviewPageProps {
  locale: 'nl' | 'en';
  projectId: string;
  projectName?: string;
  className?: string;
  onNavigateToTasks?: () => void;
  isEntering?: boolean; // Optional: signals that the component is entering (for animations)
}

interface ProjectTasksResponse {
  success: boolean;
  data: Array<{
    id: string;
    title: string;
    status: 'todo' | 'doing' | 'done';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    deadline: string | null;
    created_at: string;
    is_overdue: boolean;
    days_until_deadline: number | null;
    assigned_users: Array<{ id: string; name: string; email: string }> | null;
  }>;
}

interface ProjectStatsResponse {
  success: boolean;
  data: {
    overall: {
      total_tasks: number;
      todo_count: number;
      doing_count: number;
      done_count: number;
      overdue_count: number;
    };
    byUser: Array<{
      user_id: string;
      user_name: string;
      assigned_tasks: number;
      todo_count: number;
      doing_count: number;
      done_count: number;
    }>;
    upcomingDeadlines: Array<{
      id: string;
      title: string;
      deadline: string;
      priority: string;
    }>;
  };
}

// ============================================================================
// Translations
// ============================================================================

const translations = {
  nl: {
    welcomeTitle: 'Project Assistent',
    welcomeSubtitle: 'Stel een vraag over dit project of kies een voorbeeld',
    projectDeadlines: 'Project deadlines',
    teamTasks: 'Taken per teamlid',
    projectTasks: 'Project taken',
    loadingTasks: 'Taken laden...',
    errorLoading: 'Kon taken niet laden',
    noUpcomingDeadlines: 'Geen komende deadlines',
    todo: 'Te doen',
    doing: 'Bezig',
    done: 'Gereed',
    overdue: 'Achterstallig',
    unassigned: 'Niet toegewezen',
    quickNotes: 'Project notities',
    notesPlaceholder: 'Schrijf een notitie...',
    noNotes: 'Geen notities',
  },
  en: {
    welcomeTitle: 'Project Assistant',
    welcomeSubtitle: 'Ask a question about this project or choose an example',
    projectDeadlines: 'Project deadlines',
    teamTasks: 'Tasks per team member',
    projectTasks: 'Project tasks',
    loadingTasks: 'Loading tasks...',
    errorLoading: 'Could not load tasks',
    noUpcomingDeadlines: 'No upcoming deadlines',
    todo: 'To do',
    doing: 'In progress',
    done: 'Done',
    overdue: 'Overdue',
    unassigned: 'Unassigned',
    quickNotes: 'Project notes',
    notesPlaceholder: 'Write a note...',
    noNotes: 'No notes',
  },
};

// ============================================================================
// Default user colors for task distribution
// ============================================================================

const USER_COLORS = [
  '#477638', // Primary green
  '#48806a', // Teal green
  '#8a976b', // Sage green
  '#d4af37', // Gold
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#f59e0b', // Orange
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

// ============================================================================
// Component
// ============================================================================

export function ProjectOverviewPage({
  locale,
  projectId,
  projectName,
  className,
  onNavigateToTasks,
  isEntering = false,
}: ProjectOverviewPageProps) {
  const router = useRouter();
  const t = translations[locale];

  // State
  const [tasks, setTasks] = useState<TaskPreview[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasksByUser, setTasksByUser] = useState<StackedBarSegment[]>([]);
  const [totalOpenTasks, setTotalOpenTasks] = useState<number>(0);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskSortBy, setTaskSortBy] = useState<'created' | 'deadline'>('deadline');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [promptRefreshKey, setPromptRefreshKey] = useState(0);
  const [ragEnabled, setRagEnabled] = useState(true);

  // Generate chatId upfront so files can be uploaded to R2 before chat is created
  const [pendingChatId] = useState(() => crypto.randomUUID());

  // Notes state (project-specific storage key)
  const [notes, setNotes] = useState<Array<{ id: string; text: string; createdAt: Date }>>([]);
  const [noteInput, setNoteInput] = useState('');
  const notesStorageKey = `projectNotes_${projectId}`;

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem(notesStorageKey);
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        setNotes(parsed.map((n: { id: string; text: string; createdAt: string }) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        })));
      } catch (e) {
        console.error('[ProjectOverviewPage] Error parsing saved notes:', e);
      }
    }
  }, [notesStorageKey]);

  // Save notes to localStorage when they change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(notesStorageKey, JSON.stringify(notes));
    }
  }, [notes, notesStorageKey]);

  // Add a new note
  const handleAddNote = useCallback(() => {
    if (!noteInput.trim()) return;

    const newNote = {
      id: crypto.randomUUID(),
      text: noteInput.trim(),
      createdAt: new Date(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setNoteInput('');
  }, [noteInput]);

  // Delete a note
  const handleDeleteNote = useCallback((noteId: string) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== noteId);
      if (updated.length === 0) {
        localStorage.removeItem(notesStorageKey);
      }
      return updated;
    });
  }, [notesStorageKey]);

  // Fetch project tasks and stats
  useEffect(() => {
    async function fetchProjectData() {
      try {
        setIsLoadingTasks(true);

        // Fetch tasks and stats in parallel
        const [tasksResponse, statsResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/tasks`),
          fetch(`/api/projects/${projectId}/tasks/stats`),
        ]);

        const tasksData: ProjectTasksResponse = await tasksResponse.json();
        const statsData: ProjectStatsResponse = await statsResponse.json();

        console.log('[ProjectOverviewPage] Tasks response:', tasksData);
        console.log('[ProjectOverviewPage] Stats response:', statsData);

        // Handle case where data might be empty array (no tasks yet)
        if (!tasksData.success) {
          console.error('[ProjectOverviewPage] Tasks API error:', tasksData);
          // Don't throw - just use empty data
        }

        const tasks = tasksData.data || [];

        // Transform tasks for TaskListPreview
        const transformedTasks: TaskPreview[] = tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          createdAt: task.created_at,
          isOverdue: task.is_overdue,
          daysUntilDeadline: task.days_until_deadline,
          assignedUsers: task.assigned_users?.filter((u) => u && u.id) || [],
        }));

        setTasks(transformedTasks);

        // Extract deadlines for calendar
        const mapPriority = (p: string): 'low' | 'medium' | 'high' | 'urgent' => {
          if (p === 'normal') return 'medium';
          return p as 'low' | 'medium' | 'high' | 'urgent';
        };

        const upcomingDeadlines: Deadline[] = tasks
          .filter((task) => task.deadline && task.status !== 'done')
          .map((task) => ({
            id: task.id,
            date: new Date(task.deadline!),
            title: task.title,
            taskId: task.id,
            priority: mapPriority(task.priority),
          }));

        setDeadlines(upcomingDeadlines);

        // Process stats for task distribution chart
        if (statsData.success && statsData.data) {
          const { overall, byUser } = statsData.data;

          // Calculate total open tasks (todo + doing) - this is the actual count from the database
          const actualTotalOpenTasks = (overall?.todo_count || 0) + (overall?.doing_count || 0);
          setTotalOpenTasks(actualTotalOpenTasks);

          // Build segments for assigned users
          // Note: A task can be assigned to multiple users, so the sum of user assignments
          // may exceed the actual total. We use actualTotalOpenTasks for the display.
          const userSegments: StackedBarSegment[] = (byUser || [])
            .filter((user) => user.todo_count + user.doing_count > 0) // Only show users with open tasks
            .sort((a, b) => (b.todo_count + b.doing_count) - (a.todo_count + a.doing_count))
            .map((user, index) => ({
              id: user.user_id,
              label: user.user_name,
              value: user.todo_count + user.doing_count,
              color: USER_COLORS[index % USER_COLORS.length],
            }));

          // Calculate how many tasks have any assignment
          // If sum of assigned > actual total, tasks have multiple assignees, so don't show unassigned
          const sumAssignedOpenTasks = userSegments.reduce((sum, seg) => sum + seg.value, 0);

          // Only show unassigned if assigned count is less than total (accounting for no multi-assignment)
          if (sumAssignedOpenTasks < actualTotalOpenTasks) {
            const unassignedOpenTasks = actualTotalOpenTasks - sumAssignedOpenTasks;
            userSegments.push({
              id: 'unassigned',
              label: translations[locale].unassigned,
              value: unassignedOpenTasks,
              color: '#9ca3af', // Grey color for unassigned
            });
          }

          setTasksByUser(userSegments);
        }
      } catch (error) {
        console.error('[ProjectOverviewPage] Error fetching project data:', error);
      } finally {
        setIsLoadingTasks(false);
      }
    }

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  // Handle starting a new project-specific chat
  const handleStartChat = useCallback(
    async (message: string, files?: UploadedFile[]) => {
      if (isCreatingChat) return;

      setIsCreatingChat(true);

      try {
        // Create a new chat linked to this project (using pre-generated chatId so files are already associated)
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: pendingChatId, // Use pre-generated ID so files uploaded via MessageInput are associated
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            initialMessage: message,
            projectId: projectId,
            fileIds: files?.map((f) => f.id) || [],
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create chat');
        }

        // Navigate to the new chat in AI assistant with project context and file IDs
        const fileIdsParam = files && files.length > 0 ? `&fileIds=${files.map(f => f.id).join(',')}` : '';
        router.push(`/${locale}/ai-assistant?chat=${data.chat.id}&project_id=${projectId}&message=${encodeURIComponent(message)}${fileIdsParam}`);
      } catch (error) {
        console.error('[ProjectOverviewPage] Error creating chat:', error);
        setIsCreatingChat(false);
      }
    },
    [isCreatingChat, locale, pendingChatId, projectId, router]
  );

  // Handle prompt selection
  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      handleStartChat(prompt);
    },
    [handleStartChat]
  );

  // Handle task click - navigate to project task
  const handleTaskClick = useCallback(
    (taskId: string) => {
      router.push(`/${locale}/projects/${projectId}/tasks?task=${taskId}`);
    },
    [locale, projectId, router]
  );

  // Handle deadline click
  const handleDeadlineClick = useCallback(
    (taskId: string) => {
      handleTaskClick(taskId);
    },
    [handleTaskClick]
  );

  // Handle view all tasks - use callback if provided, otherwise navigate
  const handleViewAllTasks = useCallback(() => {
    if (onNavigateToTasks) {
      onNavigateToTasks();
    } else {
      router.push(`/${locale}/projects/${projectId}/tasks`);
    }
  }, [locale, projectId, router, onNavigateToTasks]);

  // Handle user segment click
  const handleUserClick = useCallback(
    (segment: StackedBarSegment) => {
      router.push(`/${locale}/projects/${projectId}/tasks?assignee=${segment.id}`);
    },
    [locale, projectId, router]
  );

  return (
    <div className={cn('flex h-full', className)}>
      {/* Main Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Welcome area */}
        <div className={cn(
          "flex-1 flex flex-col items-center justify-center px-base py-2xl",
          isEntering && "animate-initial"
        )}>
          <div className={cn(
            "w-full max-w-2xl",
            isEntering && "animate-scale-fade-in fill-both"
          )}>
            {/* Welcome message */}
            <div className={cn(
              "text-center mb-2xl",
              isEntering && "animate-fade-slide-up fill-both"
            )}>
              <h1 className="text-3xl font-bold text-gray-900 mb-sm">
                {t.welcomeTitle}
              </h1>
              <p className="text-gray-500">
                {projectName ? (
                  <>
                    {t.welcomeSubtitle} <span className="font-medium text-gray-700">{projectName}</span>
                  </>
                ) : (
                  t.welcomeSubtitle
                )}
              </p>
            </div>

            {/* Sample prompts - filtered for project context */}
            <div className={cn(
              isEntering && "animate-fade-slide-up fill-both stagger-1"
            )}>
              <SamplePrompts
                onSelectPrompt={handleSelectPrompt}
                locale={locale}
                count={4}
                refreshKey={promptRefreshKey}
                context="project"
                className="mb-xl"
              />
            </div>

            {/* Refresh prompts button */}
            <div className={cn(
              "flex justify-center mb-lg",
              isEntering && "animate-fade-slide-up fill-both stagger-2"
            )}>
              <button
                type="button"
                onClick={() => setPromptRefreshKey((k) => k + 1)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {locale === 'nl' ? 'Andere voorbeelden' : 'More examples'}
              </button>
            </div>
          </div>
        </div>

        {/* Message input - anchored at bottom with RAG for project docs */}
        <div className={cn(
          isEntering && "animate-message-flow fill-both stagger-3"
        )}>
          <MessageInput
            onSubmit={handleStartChat}
            locale={locale}
            disabled={isCreatingChat}
            isLoading={isCreatingChat}
            showRagToggle={true}
            ragEnabled={ragEnabled}
            onRagToggle={setRagEnabled}
            showFileAttachment={true}
            chatId={pendingChatId}
            projectId={projectId}
            autoFocus
          />
        </div>
      </div>

      {/* Side Section */}
      <div className={cn(
        "w-80 flex-shrink-0 border-l border-gray-200 overflow-y-auto",
        isEntering && "animate-slide-in-left fill-both stagger-2"
      )}>
        <div className="p-base space-y-base">
          {/* Calendar with project deadlines */}
          <div className={cn(
            isEntering && "animate-fade-slide-up fill-both stagger-3"
          )}>
            <h3 className="text-sm font-medium text-gray-700 mb-sm">
              {t.projectDeadlines}
            </h3>
            <MiniCalendar
              deadlines={deadlines}
              onDeadlineClick={handleDeadlineClick}
              locale={locale}
            />
          </div>

          {/* Task distribution by team member */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-sm">
              {t.teamTasks}
            </h3>
            {isLoadingTasks ? (
              <div className="bg-white rounded-lg border border-gray-200 p-base">
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-base">
                <HorizontalStackedBarChart
                  data={tasksByUser}
                  height={24}
                  showLegend={true}
                  showValues={true}
                  onSegmentClick={handleUserClick}
                  locale={locale}
                  totalOverride={totalOpenTasks}
                />
              </div>
            )}
          </div>

          {/* Project tasks list */}
          <div>
            <TaskListPreview
              tasks={tasks}
              sortBy={taskSortBy}
              onSortChange={setTaskSortBy}
              onTaskClick={handleTaskClick}
              onViewAllClick={handleViewAllTasks}
              maxVisible={5}
              showProject={false}
              locale={locale}
              title={t.projectTasks}
            />
          </div>

          {/* Quick Notes Section */}
          <div className={cn(
            isEntering && "animate-fade-slide-up fill-both stagger-5"
          )}>
            <h3 className="text-sm font-medium text-gray-700 mb-sm">
              {t.quickNotes}
            </h3>
            <div className="bg-white rounded-lg border border-gray-200 p-sm">
              {/* Note input */}
              <div className="flex gap-xs mb-sm">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder={t.notesPlaceholder}
                  className="flex-1 px-sm py-xs text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteInput.trim()}
                  className={cn(
                    'px-sm py-xs rounded-md text-sm transition-colors',
                    noteInput.trim()
                      ? 'bg-gray-800 text-white hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Notes list */}
              <div className="space-y-xs max-h-40 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-sm">{t.noNotes}</p>
                ) : (
                  notes.slice(0, 5).map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start gap-xs p-xs bg-gray-50 rounded group"
                    >
                      <p className="flex-1 text-xs text-gray-700 break-words">{note.text}</p>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ProjectOverviewPage.displayName = 'ProjectOverviewPage';

export default ProjectOverviewPage;
