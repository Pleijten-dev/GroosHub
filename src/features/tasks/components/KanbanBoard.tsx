'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { useToast } from '@/shared/components/UI/Toast';
import type { Task, TaskGroup, TaskStatus } from '../types';

export interface KanbanBoardProps {
  tasks: Task[];
  groups: TaskGroup[];
  onUpdateTask: (taskId: string, updates: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  locale: string;
  projectId: string;
  onCreateTask?: (data: { title: string; status: TaskStatus }) => Promise<void>;
}

export function KanbanBoard({
  tasks,
  groups,
  onUpdateTask,
  onDeleteTask,
  locale,
  projectId,
  onCreateTask
}: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const [creatingInColumn, setCreatingInColumn] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const translations = {
    nl: {
      todo: 'Te doen',
      doing: 'Bezig',
      done: 'Klaar',
      noTasks: 'Geen taken',
      createTask: 'Taak toevoegen...',
      emptyTitle: 'Begin met je eerste taak',
      emptyDescription: 'Druk op "C" of klik hieronder om een taak toe te voegen',
      dragHere: 'Sleep hier',
      moveFailed: 'Taak verplaatsen mislukt. Probeer opnieuw?',
      retry: 'Opnieuw'
    },
    en: {
      todo: 'To Do',
      doing: 'Doing',
      done: 'Done',
      noTasks: 'No tasks',
      createTask: 'Add task...',
      emptyTitle: 'Start your first task',
      emptyDescription: 'Press "C" or click below to create a task',
      dragHere: 'Drop here',
      moveFailed: 'Failed to move task. Try again?',
      retry: 'Retry'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'todo', title: t.todo },
    { id: 'doing', title: t.doing },
    { id: 'done', title: t.done }
  ];

  // Sync local tasks with props
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Focus input when creating
  useEffect(() => {
    if (creatingInColumn && newTaskInputRef.current) {
      newTaskInputRef.current.focus();
    }
  }, [creatingInColumn]);

  // Keyboard shortcut: C to create task
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !isInputFocused()) {
        e.preventDefault();
        setCreatingInColumn('todo');
      }
      if (e.key === 'Escape') {
        setCreatingInColumn(null);
        setNewTaskTitle('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement?.tagName === 'INPUT' ||
           activeElement?.tagName === 'TEXTAREA' ||
           activeElement?.getAttribute('contenteditable') === 'true';
  }

  function getTasksByStatus(status: TaskStatus): Task[] {
    return localTasks
      .filter(task => task.status === status)
      .sort((a, b) => a.position - b.position);
  }

  function handleDragStart(task: Task) {
    setDraggedTask(task);
  }

  function handleDragOver(e: React.DragEvent, column: TaskStatus) {
    e.preventDefault();
    setDragOverColumn(column);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e: React.DragEvent, newStatus: TaskStatus) {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // 1. Store original state for rollback
    const originalTask = { ...draggedTask };

    // 2. Optimistic update - immediately update UI
    setLocalTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === draggedTask.id
          ? { ...task, status: newStatus }
          : task
      )
    );

    // 3. Show loading state
    setLoadingTasks(prev => new Set(prev).add(draggedTask.id));

    try {
      // 4. Send to server in background
      await onUpdateTask(draggedTask.id, { status: newStatus });

      // 5. Success - remove loading
      setLoadingTasks(prev => {
        const next = new Set(prev);
        next.delete(draggedTask.id);
        return next;
      });

    } catch (error) {
      // 6. Failed - rollback with animation
      setLocalTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === draggedTask.id ? originalTask : task
        )
      );

      setLoadingTasks(prev => {
        const next = new Set(prev);
        next.delete(draggedTask.id);
        return next;
      });

      // 7. Show error with retry option
      showToast(t.moveFailed, {
        duration: 5000,
        type: 'error',
        action: t.retry,
        onAction: () => handleDrop(e, newStatus)
      });
    }

    setDraggedTask(null);
  }

  async function handleCreateTask(status: TaskStatus) {
    if (!newTaskTitle.trim() || !onCreateTask) return;

    try {
      await onCreateTask({
        title: newTaskTitle.trim(),
        status
      });

      setNewTaskTitle('');
      setCreatingInColumn(null);

      showToast('Task created', { duration: 2000, type: 'success' });
    } catch (error) {
      showToast('Failed to create task', { duration: 3000, type: 'error' });
    }
  }

  function handleTaskKeyDown(e: React.KeyboardEvent, status: TaskStatus) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTask(status);
    } else if (e.key === 'Escape') {
      setCreatingInColumn(null);
      setNewTaskTitle('');
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.id);
          const isCreating = creatingInColumn === column.id;
          const isDragOver = dragOverColumn === column.id && draggedTask?.status !== column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex flex-col transition-all duration-200 ${
                isDragOver
                  ? 'ring-2 ring-primary ring-opacity-50 bg-primary/25 rounded-lg'
                  : ''
              }`}
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

              {/* Quick Create Button */}
              {!isCreating && (
                <button
                  onClick={() => setCreatingInColumn(column.id)}
                  className="mb-3 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-all"
                >
                  + {t.createTask}
                </button>
              )}

              {/* Inline Create Input */}
              {isCreating && (
                <div className="mb-3 p-3 bg-white border-2 border-primary rounded-lg shadow-sm">
                  <input
                    ref={newTaskInputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => handleTaskKeyDown(e, column.id)}
                    onBlur={() => {
                      if (!newTaskTitle.trim()) {
                        setCreatingInColumn(null);
                      }
                    }}
                    placeholder={t.createTask}
                    className="w-full text-sm focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span>Enter to save</span>
                    <span>•</span>
                    <span>Esc to cancel</span>
                  </div>
                </div>
              )}

              {/* Column Tasks */}
              <div className={`flex-1 space-y-3 min-h-[400px] ${
                isDragOver ? 'p-2 rounded-lg' : ''
              }`}>
                {columnTasks.length === 0 && !isDragOver ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {t.emptyTitle}
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      {t.emptyDescription}
                    </p>
                    <button
                      onClick={() => setCreatingInColumn(column.id)}
                      className="text-sm text-primary hover:text-primary-dark font-medium"
                    >
                      + {t.createTask}
                    </button>
                  </div>
                ) : isDragOver && columnTasks.length === 0 ? (
                  <div className="text-center py-12 text-primary font-medium">
                    {t.dragHere}
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart}
                      onClick={() => setSelectedTask(task)}
                      locale={locale}
                      isLoading={loadingTasks.has(task.id)}
                      isDragging={draggedTask?.id === task.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal - KEEP OPEN ON UPDATE */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          groups={groups}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (updates) => {
            // Don't close modal - just update the task
            await onUpdateTask(selectedTask.id, updates);
            // Refresh the selected task to show updated data
            const updatedTask = localTasks.find(t => t.id === selectedTask.id);
            if (updatedTask) {
              setSelectedTask({ ...updatedTask, ...updates });
            }
          }}
          onDelete={async () => {
            await onDeleteTask(selectedTask.id);
            setSelectedTask(null); // Only close on delete
          }}
          locale={locale}
        />
      )}
    </>
  );
}

export default KanbanBoard;
