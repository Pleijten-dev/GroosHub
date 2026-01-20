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
}: ProjectOverviewPageProps) {
  const router = useRouter();
  const t = translations[locale];

  // State
  const [tasks, setTasks] = useState<TaskPreview[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasksByUser, setTasksByUser] = useState<StackedBarSegment[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskSortBy, setTaskSortBy] = useState<'created' | 'deadline'>('deadline');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [promptRefreshKey, setPromptRefreshKey] = useState(0);

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

          // Calculate total open tasks (todo + doing)
          const totalOpenTasks = (overall?.todo_count || 0) + (overall?.doing_count || 0);

          // Calculate total assigned open tasks
          const totalAssignedOpenTasks = (byUser || []).reduce(
            (sum, user) => sum + user.todo_count + user.doing_count,
            0
          );

          // Calculate unassigned open tasks
          const unassignedOpenTasks = totalOpenTasks - totalAssignedOpenTasks;

          // Build segments for assigned users
          const userSegments: StackedBarSegment[] = (byUser || [])
            .filter((user) => user.todo_count + user.doing_count > 0) // Only show users with open tasks
            .sort((a, b) => (b.todo_count + b.doing_count) - (a.todo_count + a.doing_count))
            .map((user, index) => ({
              id: user.user_id,
              label: user.user_name,
              value: user.todo_count + user.doing_count,
              color: USER_COLORS[index % USER_COLORS.length],
            }));

          // Add unassigned segment in grey if there are unassigned tasks
          if (unassignedOpenTasks > 0) {
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
        // Create a new chat linked to this project
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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

        // Navigate to the new chat within the project context
        router.push(`/${locale}/projects/${projectId}?chat=${data.chat.id}`);
      } catch (error) {
        console.error('[ProjectOverviewPage] Error creating chat:', error);
        setIsCreatingChat(false);
      }
    },
    [isCreatingChat, locale, projectId, router]
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
        <div className="flex-1 flex flex-col items-center justify-center px-base py-2xl">
          <div className="w-full max-w-2xl">
            {/* Welcome message */}
            <div className="text-center mb-2xl">
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
            <SamplePrompts
              onSelectPrompt={handleSelectPrompt}
              locale={locale}
              count={4}
              refreshKey={promptRefreshKey}
              className="mb-xl"
            />

            {/* Refresh prompts button */}
            <div className="flex justify-center mb-lg">
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
        <MessageInput
          onSubmit={handleStartChat}
          locale={locale}
          disabled={isCreatingChat}
          isLoading={isCreatingChat}
          showRagToggle={true}
          ragEnabled={true}
          showFileAttachment={false}
          autoFocus
          className="shadow-lg"
        />
      </div>

      {/* Side Section */}
      <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-base space-y-base">
          {/* Calendar with project deadlines */}
          <div>
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
        </div>
      </div>
    </div>
  );
}

ProjectOverviewPage.displayName = 'ProjectOverviewPage';

export default ProjectOverviewPage;
