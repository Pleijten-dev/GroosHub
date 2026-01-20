/**
 * OverviewPage Component
 *
 * Landing page for the AI Assistant showing:
 * - Main section: Welcome message, sample prompts, message input
 * - Side section: Calendar with deadlines, task distribution, open tasks list
 *
 * Features:
 * - Sample prompts that change on each load
 * - Quick message input to start new chat
 * - Task overview from across all projects
 * - Smooth transition to chat when message is sent
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

export interface OverviewPageProps {
  locale: 'nl' | 'en';
  className?: string;
}

interface UserTasksResponse {
  success: boolean;
  data: {
    tasks: Array<{
      id: string;
      title: string;
      status: 'todo' | 'doing' | 'done';
      priority: 'low' | 'normal' | 'high' | 'urgent';
      deadline: string | null;
      created_at: string;
      project_name: string;
      is_overdue: boolean;
      days_until_deadline: number | null;
      assigned_users: Array<{ id: string; name: string; email: string }>;
    }>;
    stats: {
      total_tasks: number;
      todo_count: number;
      doing_count: number;
      done_count: number;
      overdue_count: number;
      due_this_week: number;
      urgent_count: number;
    };
  };
}

// ============================================================================
// Translations
// ============================================================================

const translations = {
  nl: {
    welcomeTitle: 'Hoe kan ik je helpen?',
    welcomeSubtitle: 'Stel een vraag of kies een voorbeeld om te beginnen',
    deadlines: 'Deadlines',
    taskDistribution: 'Taken per persoon',
    openTasks: 'Openstaande taken',
    loadingTasks: 'Taken laden...',
    errorLoading: 'Kon taken niet laden',
    noUpcomingDeadlines: 'Geen komende deadlines',
  },
  en: {
    welcomeTitle: 'How can I help you?',
    welcomeSubtitle: 'Ask a question or choose an example to get started',
    deadlines: 'Deadlines',
    taskDistribution: 'Tasks per person',
    openTasks: 'Open tasks',
    loadingTasks: 'Loading tasks...',
    errorLoading: 'Could not load tasks',
    noUpcomingDeadlines: 'No upcoming deadlines',
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

export function OverviewPage({ locale, className }: OverviewPageProps) {
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

  // Fetch user tasks
  useEffect(() => {
    async function fetchTasks() {
      try {
        setIsLoadingTasks(true);

        // Fetch all user tasks with deadlines
        const response = await fetch('/api/tasks/user?withDeadline=false');
        const data: UserTasksResponse = await response.json();

        if (!data.success || !data.data) {
          throw new Error('Failed to fetch tasks');
        }

        const { tasks: rawTasks } = data.data;

        // Transform tasks for TaskListPreview
        const transformedTasks: TaskPreview[] = rawTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          createdAt: task.created_at,
          projectName: task.project_name,
          isOverdue: task.is_overdue,
          daysUntilDeadline: task.days_until_deadline,
          assignedUsers: task.assigned_users?.filter((u) => u && u.id) || [],
        }));

        setTasks(transformedTasks);

        // Extract deadlines for calendar
        // Map priority from task ('normal') to calendar ('medium')
        const mapPriority = (p: string): 'low' | 'medium' | 'high' | 'urgent' => {
          if (p === 'normal') return 'medium';
          return p as 'low' | 'medium' | 'high' | 'urgent';
        };

        const upcomingDeadlines: Deadline[] = rawTasks
          .filter((task) => task.deadline && task.status !== 'done')
          .map((task) => ({
            id: task.id,
            date: new Date(task.deadline!),
            title: task.title,
            taskId: task.id,
            priority: mapPriority(task.priority),
          }));

        setDeadlines(upcomingDeadlines);

        // Calculate tasks by user for stacked bar chart
        const userTaskCount = new Map<string, { id: string; name: string; count: number }>();

        rawTasks
          .filter((task) => task.status !== 'done')
          .forEach((task) => {
            if (task.assigned_users && task.assigned_users.length > 0) {
              task.assigned_users.forEach((user) => {
                if (user && user.id) {
                  const existing = userTaskCount.get(user.id);
                  if (existing) {
                    existing.count++;
                  } else {
                    userTaskCount.set(user.id, {
                      id: user.id,
                      name: user.name || 'Unknown',
                      count: 1,
                    });
                  }
                }
              });
            }
          });

        const userSegments: StackedBarSegment[] = Array.from(userTaskCount.values())
          .sort((a, b) => b.count - a.count)
          .map((user, index) => ({
            id: user.id,
            label: user.name,
            value: user.count,
            color: USER_COLORS[index % USER_COLORS.length],
          }));

        setTasksByUser(userSegments);
      } catch (error) {
        console.error('[OverviewPage] Error fetching tasks:', error);
      } finally {
        setIsLoadingTasks(false);
      }
    }

    fetchTasks();
  }, []);

  // Handle starting a new chat
  const handleStartChat = useCallback(
    async (message: string, files?: UploadedFile[]) => {
      if (isCreatingChat) return;

      setIsCreatingChat(true);

      try {
        // Create a new chat
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            initialMessage: message,
            fileIds: files?.map((f) => f.id) || [],
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create chat');
        }

        // Navigate to the new chat
        router.push(`/${locale}/ai-assistant?chat=${data.chat.id}`);
      } catch (error) {
        console.error('[OverviewPage] Error creating chat:', error);
        setIsCreatingChat(false);
      }
    },
    [isCreatingChat, locale, router]
  );

  // Handle prompt selection
  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      handleStartChat(prompt);
    },
    [handleStartChat]
  );

  // Handle task click - navigate to tasks page
  const handleTaskClick = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        // Navigate to project tasks page
        router.push(`/${locale}/ai-assistant/tasks`);
      }
    },
    [locale, router, tasks]
  );

  // Handle deadline click
  const handleDeadlineClick = useCallback(
    (taskId: string) => {
      handleTaskClick(taskId);
    },
    [handleTaskClick]
  );

  // Handle view all tasks
  const handleViewAllTasks = useCallback(() => {
    router.push(`/${locale}/ai-assistant/tasks`);
  }, [locale, router]);

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
                {t.welcomeSubtitle}
              </p>
            </div>

            {/* Sample prompts */}
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

        {/* Message input - anchored at bottom */}
        <MessageInput
          onSubmit={handleStartChat}
          locale={locale}
          disabled={isCreatingChat}
          isLoading={isCreatingChat}
          showRagToggle={false}
          showFileAttachment={false}
          autoFocus
          className="shadow-lg"
        />
      </div>

      {/* Side Section */}
      <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-base space-y-base">
          {/* Calendar with deadlines */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-sm">
              {t.deadlines}
            </h3>
            <MiniCalendar
              deadlines={deadlines}
              onDeadlineClick={handleDeadlineClick}
              locale={locale}
            />
          </div>

          {/* Task distribution chart */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-sm">
              {t.taskDistribution}
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
                  locale={locale}
                />
              </div>
            )}
          </div>

          {/* Open tasks list */}
          <div>
            <TaskListPreview
              tasks={tasks}
              sortBy={taskSortBy}
              onSortChange={setTaskSortBy}
              onTaskClick={handleTaskClick}
              onViewAllClick={handleViewAllTasks}
              maxVisible={5}
              showProject={true}
              locale={locale}
              title={t.openTasks}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

OverviewPage.displayName = 'OverviewPage';

export default OverviewPage;
