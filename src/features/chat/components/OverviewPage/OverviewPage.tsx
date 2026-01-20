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
    myDeadlines: 'Mijn deadlines',
    taskSummary: 'Taak overzicht',
    myTasks: 'Mijn taken',
    loadingTasks: 'Taken laden...',
    errorLoading: 'Kon taken niet laden',
    noUpcomingDeadlines: 'Geen komende deadlines',
    todo: 'Te doen',
    doing: 'Bezig',
    overdue: 'Achterstallig',
    dueThisWeek: 'Deze week',
  },
  en: {
    welcomeTitle: 'How can I help you?',
    welcomeSubtitle: 'Ask a question or choose an example to get started',
    myDeadlines: 'My deadlines',
    taskSummary: 'Task summary',
    myTasks: 'My tasks',
    loadingTasks: 'Loading tasks...',
    errorLoading: 'Could not load tasks',
    noUpcomingDeadlines: 'No upcoming deadlines',
    todo: 'To do',
    doing: 'In progress',
    overdue: 'Overdue',
    dueThisWeek: 'Due this week',
  },
};

// ============================================================================
// Component
// ============================================================================

export function OverviewPage({ locale, className }: OverviewPageProps) {
  const router = useRouter();
  const t = translations[locale];

  // State
  const [tasks, setTasks] = useState<TaskPreview[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [taskStats, setTaskStats] = useState<{
    todo: number;
    doing: number;
    overdue: number;
    dueThisWeek: number;
  }>({ todo: 0, doing: 0, overdue: 0, dueThisWeek: 0 });
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

        // Set task stats from API response
        setTaskStats({
          todo: data.data.stats.todo_count,
          doing: data.data.stats.doing_count,
          overdue: data.data.stats.overdue_count,
          dueThisWeek: data.data.stats.due_this_week,
        });
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

        // Navigate to the new chat with initial message
        router.push(`/${locale}/ai-assistant?chat=${data.chat.id}&message=${encodeURIComponent(message)}`);
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
          {/* Calendar with personal deadlines */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-sm">
              {t.myDeadlines}
            </h3>
            <MiniCalendar
              deadlines={deadlines}
              onDeadlineClick={handleDeadlineClick}
              locale={locale}
            />
          </div>

          {/* Personal task summary */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-sm">
              {t.taskSummary}
            </h3>
            {isLoadingTasks ? (
              <div className="bg-white rounded-lg border border-gray-200 p-base">
                <div className="grid grid-cols-2 gap-sm">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-base">
                <div className="grid grid-cols-2 gap-sm">
                  {/* To Do */}
                  <div className="bg-gray-50 rounded-md p-sm text-center">
                    <div className="text-2xl font-bold text-gray-900">{taskStats.todo}</div>
                    <div className="text-xs text-gray-500">{t.todo}</div>
                  </div>
                  {/* In Progress */}
                  <div className="bg-blue-50 rounded-md p-sm text-center">
                    <div className="text-2xl font-bold text-blue-600">{taskStats.doing}</div>
                    <div className="text-xs text-blue-600">{t.doing}</div>
                  </div>
                  {/* Overdue */}
                  <div className={cn(
                    'rounded-md p-sm text-center',
                    taskStats.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'
                  )}>
                    <div className={cn(
                      'text-2xl font-bold',
                      taskStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'
                    )}>
                      {taskStats.overdue}
                    </div>
                    <div className={cn(
                      'text-xs',
                      taskStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'
                    )}>
                      {t.overdue}
                    </div>
                  </div>
                  {/* Due this week */}
                  <div className={cn(
                    'rounded-md p-sm text-center',
                    taskStats.dueThisWeek > 0 ? 'bg-yellow-50' : 'bg-gray-50'
                  )}>
                    <div className={cn(
                      'text-2xl font-bold',
                      taskStats.dueThisWeek > 0 ? 'text-yellow-600' : 'text-gray-400'
                    )}>
                      {taskStats.dueThisWeek}
                    </div>
                    <div className={cn(
                      'text-xs',
                      taskStats.dueThisWeek > 0 ? 'text-yellow-600' : 'text-gray-400'
                    )}>
                      {t.dueThisWeek}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Personal tasks list */}
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
              title={t.myTasks}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

OverviewPage.displayName = 'OverviewPage';

export default OverviewPage;
