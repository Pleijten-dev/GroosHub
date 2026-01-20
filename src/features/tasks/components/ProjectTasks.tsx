'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';
import { ToastProvider } from '@/shared/components/UI/Toast';
import { KanbanBoard } from './KanbanBoard';
import { TaskCalendarView } from './TaskCalendarView';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskGroupsModal } from './TaskGroupsModal';
import { TaskDetailModal } from './TaskDetailModal';
import type { Task, TaskGroup, TaskFilters } from '../types';

export interface ProjectTasksProps {
  projectId: string;
  locale: string;
}

export function ProjectTasks({ projectId, locale }: ProjectTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentView, setCurrentView] = useState<'kanban' | 'calendar'>('kanban');
  const [filters, setFilters] = useState<TaskFilters>({
    sortBy: 'position',
    sortOrder: 'asc'
  });

  const translations = {
    nl: {
      tasks: 'Taken',
      newTask: 'Nieuwe Taak',
      manageGroups: 'Groepen Beheren',
      kanbanView: 'Kanban',
      calendarView: 'Kalender',
      loading: 'Laden...',
      error: 'Fout bij laden taken',
      noTasks: 'Geen taken',
      filterByUser: 'Filter op gebruiker',
      filterByGroup: 'Filter op groep',
      sortBy: 'Sorteren op',
      all: 'Alle',
      position: 'Positie',
      deadline: 'Deadline',
      priority: 'Prioriteit',
      created: 'Aangemaakt'
    },
    en: {
      tasks: 'Tasks',
      newTask: 'New Task',
      manageGroups: 'Manage Groups',
      kanbanView: 'Kanban',
      calendarView: 'Calendar',
      loading: 'Loading...',
      error: 'Error loading tasks',
      noTasks: 'No tasks',
      filterByUser: 'Filter by user',
      filterByGroup: 'Filter by group',
      sortBy: 'Sort by',
      all: 'All',
      position: 'Position',
      deadline: 'Deadline',
      priority: 'Priority',
      created: 'Created'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchTasks();
    fetchGroups();
  }, [projectId, filters]);

  async function fetchTasks() {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo.toString());
      if (filters.groupId) params.append('groupId', filters.groupId);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const res = await fetch(`/api/projects/${projectId}/tasks?${params.toString()}`);

      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await res.json();
      setTasks(data.data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchGroups() {
    try {
      const res = await fetch(`/api/projects/${projectId}/task-groups`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  }

  async function handleCreateTask(taskData: any) {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        await fetchTasks();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  }

  async function handleUpdateTask(taskId: string, updates: any) {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{t.tasks}</h2>

          {/* View toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCurrentView('kanban')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentView === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.kanbanView}
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentView === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.calendarView}
            </button>
          </div>

          {/* Sort selector - only show in Kanban view */}
          {currentView === 'kanban' && (
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="position">{t.position}</option>
              <option value="deadline">{t.deadline}</option>
              <option value="priority">{t.priority}</option>
              <option value="created">{t.created}</option>
            </select>
          )}

          {/* Group filter */}
          {groups.length > 0 && (
            <select
              value={filters.groupId || ''}
              onChange={(e) => setFilters({ ...filters, groupId: e.target.value || undefined })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">{t.all} {t.tasks.toLowerCase()}</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsGroupsModalOpen(true)} variant="secondary" size="sm">
            {t.manageGroups}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
            {t.newTask}
          </Button>
        </div>
      </div>

      {/* View Content */}
      {currentView === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          groups={groups}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onCreateTask={handleCreateTask}
          locale={locale}
          projectId={projectId}
        />
      ) : (
        <TaskCalendarView
          tasks={tasks}
          onTaskClick={(task) => setSelectedTask(task)}
          locale={locale}
        />
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <CreateTaskModal
          projectId={projectId}
          groups={groups}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateTask}
          locale={locale}
        />
      )}

      {/* Task Groups Modal */}
      {isGroupsModalOpen && (
        <TaskGroupsModal
          projectId={projectId}
          onClose={() => setIsGroupsModalOpen(false)}
          onUpdate={async () => {
            await fetchGroups();
            await fetchTasks();
          }}
          locale={locale}
        />
      )}

      {/* Task Detail Modal (for calendar view) */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          groups={groups}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (updates) => {
            await handleUpdateTask(selectedTask.id, updates);
            setSelectedTask(null);
          }}
          onDelete={async () => {
            await handleDeleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
          locale={locale}
        />
      )}
    </div>
    </ToastProvider>
  );
}

export default ProjectTasks;
