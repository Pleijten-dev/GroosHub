'use client';

import React, { useState } from 'react';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import type { Task, TaskGroup, TaskStatus } from '../types';

export interface KanbanBoardProps {
  tasks: Task[];
  groups: TaskGroup[];
  onUpdateTask: (taskId: string, updates: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  locale: string;
  projectId: string;
}

export function KanbanBoard({
  tasks,
  groups,
  onUpdateTask,
  onDeleteTask,
  locale,
  projectId
}: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const translations = {
    nl: {
      todo: 'Te doen',
      doing: 'Bezig',
      done: 'Klaar',
      noTasks: 'Geen taken'
    },
    en: {
      todo: 'To Do',
      doing: 'Doing',
      done: 'Done',
      noTasks: 'No tasks'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'todo', title: t.todo },
    { id: 'doing', title: t.doing },
    { id: 'done', title: t.done }
  ];

  function getTasksByStatus(status: TaskStatus): Task[] {
    return tasks
      .filter(task => task.status === status)
      .sort((a, b) => a.position - b.position);
  }

  function handleDragStart(task: Task) {
    setDraggedTask(task);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(e: React.DragEvent, newStatus: TaskStatus) {
    e.preventDefault();

    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Update task status
    await onUpdateTask(draggedTask.id, { status: newStatus });
    setDraggedTask(null);
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="flex flex-col"
            >
              {/* Column Header */}
              <div className="mb-3 pb-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Column Tasks */}
              <div className="flex-1 space-y-3 min-h-[400px]">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {t.noTasks}
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart}
                      onClick={() => setSelectedTask(task)}
                      locale={locale}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          groups={groups}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (updates) => {
            await onUpdateTask(selectedTask.id, updates);
            setSelectedTask(null);
          }}
          onDelete={async () => {
            await onDeleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
          locale={locale}
        />
      )}
    </>
  );
}

export default KanbanBoard;
