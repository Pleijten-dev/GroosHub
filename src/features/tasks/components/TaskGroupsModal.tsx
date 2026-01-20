'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import type { TaskGroup } from '../types';

export interface TaskGroupsModalProps {
  projectId: string;
  onClose: () => void;
  onUpdate: () => void;
  locale: string;
}

export function TaskGroupsModal({
  projectId,
  onClose,
  onUpdate,
  locale
}: TaskGroupsModalProps) {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#477638'
  });

  const translations = {
    nl: {
      manageGroups: 'Taak Groepen Beheren',
      createGroup: 'Nieuwe Groep',
      groupName: 'Groepsnaam',
      description: 'Beschrijving',
      color: 'Kleur',
      taskCount: 'taken',
      save: 'Opslaan',
      cancel: 'Annuleren',
      edit: 'Bewerken',
      delete: 'Verwijderen',
      create: 'Aanmaken',
      noGroups: 'Geen groepen aangemaakt',
      loading: 'Laden...',
      deleteConfirm: 'Weet je zeker dat je deze groep wilt verwijderen? Taken blijven behouden.',
      close: 'Sluiten'
    },
    en: {
      manageGroups: 'Manage Task Groups',
      createGroup: 'New Group',
      groupName: 'Group Name',
      description: 'Description',
      color: 'Color',
      taskCount: 'tasks',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      create: 'Create',
      noGroups: 'No groups created',
      loading: 'Loading...',
      deleteConfirm: 'Are you sure you want to delete this group? Tasks will be preserved.',
      close: 'Close'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  const presetColors = [
    '#477638', // Primary olive green
    '#86a67d', // Secondary green
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#6b7280'  // Gray
  ];

  useEffect(() => {
    fetchGroups();
  }, [projectId]);

  async function fetchGroups() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/task-groups`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!formData.name.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/task-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchGroups();
        setFormData({ name: '', description: '', color: '#477638' });
        setIsCreating(false);
        onUpdate();
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
  }

  async function handleUpdate(groupId: string) {
    if (!formData.name.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/task-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchGroups();
        setEditingId(null);
        setFormData({ name: '', description: '', color: '#477638' });
        onUpdate();
      }
    } catch (err) {
      console.error('Error updating group:', err);
    }
  }

  async function handleDelete(groupId: string) {
    if (!confirm(t.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/task-groups/${groupId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchGroups();
        onUpdate();
      }
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  }

  function startEditing(group: TaskGroup) {
    setEditingId(group.id);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color || '#477638'
    });
    setIsCreating(false);
  }

  function cancelEditing() {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', color: '#477638' });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{t.manageGroups}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Create New Group Button */}
          {!isCreating && !editingId && (
            <Button
              onClick={() => setIsCreating(true)}
              variant="secondary"
              size="sm"
              className="mb-4"
            >
              + {t.createGroup}
            </Button>
          )}

          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.groupName}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t.groupName}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.description}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={2}
                    placeholder={t.description}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.color}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button onClick={cancelEditing} variant="secondary" size="sm">
                    {t.cancel}
                  </Button>
                  <Button
                    onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                    size="sm"
                    disabled={!formData.name.trim()}
                  >
                    {editingId ? t.save : t.create}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Groups List */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">{t.loading}</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t.noGroups}</div>
          ) : (
            <div className="space-y-2">
              {groups.map(group => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: group.color || '#477638' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {group.name}
                        </h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          {group.task_count || 0} {t.taskCount}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-sm text-gray-600 truncate">{group.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => startEditing(group)}
                      className="text-sm text-primary hover:text-primary-dark px-2 py-1"
                    >
                      {t.edit}
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-sm text-red-600 hover:text-red-700 px-2 py-1"
                    >
                      {t.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TaskGroupsModal;
