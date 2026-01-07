'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';
import { KanbanBoard } from './KanbanBoard';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskGroupsModal } from './TaskGroupsModal';
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
  const [filters, setFilters] = useState<TaskFilters>({
    sortBy: 'position',
    sortOrder: 'asc'
  });

  const translations = {
    nl: {
      tasks: 'Taken',
      newTask: 'Nieuwe Taak',
      manageGroups: 'Groepen Beheren',
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
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{t.tasks}</h2>

          {/* Sort selector */}
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

      {/* Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        groups={groups}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        locale={locale}
        projectId={projectId}
      />

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
    </div>
  );
}

export default ProjectTasks;
