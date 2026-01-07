'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import type { Task, TaskGroup, TaskNote } from '../types';

export interface TaskDetailModalProps {
  task: Task;
  projectId: string;
  groups: TaskGroup[];
  onClose: () => void;
  onUpdate: (updates: any) => Promise<void>;
  onDelete: () => Promise<void>;
  locale: string;
}

export function TaskDetailModal({
  task,
  projectId,
  groups,
  onClose,
  onUpdate,
  onDelete,
  locale
}: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    deadline: task.deadline ? task.deadline.slice(0, 16) : '',
    task_group_id: task.task_group_id || ''
  });

  const translations = {
    nl: {
      taskDetails: 'Taak Details',
      edit: 'Bewerken',
      save: 'Opslaan',
      cancel: 'Annuleren',
      delete: 'Verwijderen',
      title: 'Titel',
      description: 'Beschrijving',
      status: 'Status',
      priority: 'Prioriteit',
      deadline: 'Deadline',
      group: 'Groep',
      assignedTo: 'Toegewezen aan',
      notes: 'Notities',
      addNote: 'Notitie toevoegen',
      noNotes: 'Geen notities',
      created: 'Aangemaakt',
      by: 'door',
      low: 'Laag',
      normal: 'Normaal',
      high: 'Hoog',
      urgent: 'Urgent',
      none: 'Geen',
      deleteConfirm: 'Weet je zeker dat je deze taak wilt verwijderen?'
    },
    en: {
      taskDetails: 'Task Details',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      title: 'Title',
      description: 'Description',
      status: 'Status',
      priority: 'Priority',
      deadline: 'Deadline',
      group: 'Group',
      assignedTo: 'Assigned to',
      notes: 'Notes',
      addNote: 'Add note',
      noNotes: 'No notes',
      created: 'Created',
      by: 'by',
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      urgent: 'Urgent',
      none: 'None',
      deleteConfirm: 'Are you sure you want to delete this task?'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchNotes();
  }, [task.id]);

  async function fetchNotes() {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  }

  async function handleSave() {
    await onUpdate({
      title: editData.title,
      description: editData.description,
      priority: editData.priority,
      deadline: editData.deadline || null,
      task_group_id: editData.task_group_id || null
    });
    setIsEditing(false);
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      });

      if (res.ok) {
        setNewNote('');
        await fetchNotes();
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  }

  async function handleDelete() {
    if (confirm(t.deleteConfirm)) {
      await onDelete();
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">{t.taskDetails}</h2>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm">
                    {t.edit}
                  </Button>
                  <Button onClick={handleDelete} variant="secondary" size="sm">
                    {t.delete}
                  </Button>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <Button onClick={handleSave} size="sm">
                    {t.save}
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="secondary" size="sm">
                    {t.cancel}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.title}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            ) : (
              <p className="text-lg font-medium">{task.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.description}
            </label>
            {isEditing ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={4}
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{task.description || '-'}</p>
            )}
          </div>

          {/* Row: Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.status}
              </label>
              <p className="text-gray-900 capitalize">{task.status}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.priority}
              </label>
              {isEditing ? (
                <select
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="low">{t.low}</option>
                  <option value="normal">{t.normal}</option>
                  <option value="high">{t.high}</option>
                  <option value="urgent">{t.urgent}</option>
                </select>
              ) : (
                <p className="text-gray-900 capitalize">{t[task.priority]}</p>
              )}
            </div>
          </div>

          {/* Row: Deadline + Group */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.deadline}
              </label>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={editData.deadline}
                  onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900">
                  {task.deadline ? new Date(task.deadline).toLocaleString(locale) : '-'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.group}
              </label>
              {isEditing ? (
                <select
                  value={editData.task_group_id}
                  onChange={(e) => setEditData({ ...editData, task_group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t.none}</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900">{task.group_name || '-'}</p>
              )}
            </div>
          </div>

          {/* Assigned Users */}
          {task.assigned_users && task.assigned_users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.assignedTo}
              </label>
              <div className="flex flex-wrap gap-2">
                {task.assigned_users.map(user => (
                  <div
                    key={user.id}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {user.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">{t.notes}</h3>

            {/* Add Note */}
            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t.addNote}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <Button onClick={handleAddNote} size="sm" disabled={!newNote.trim()}>
                  {t.addNote}
                </Button>
              </div>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t.noNotes}</p>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap mb-2">{note.content}</p>
                    <p className="text-xs text-gray-500">
                      {t.by} {note.user_name} • {new Date(note.created_at).toLocaleString(locale)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
            <p>{t.created}: {new Date(task.created_at).toLocaleString(locale)}</p>
            {task.created_by_name && <p>{t.by}: {task.created_by_name}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
