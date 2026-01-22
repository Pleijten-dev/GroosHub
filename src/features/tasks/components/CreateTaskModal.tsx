'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import type { TaskGroup, CreateTaskInput } from '../types';

export interface CreateTaskModalProps {
  projectId: string;
  groups: TaskGroup[];
  onClose: () => void;
  onCreate: (task: CreateTaskInput) => Promise<void>;
  locale: string;
}

export function CreateTaskModal({
  projectId,
  groups,
  onClose,
  onCreate,
  locale
}: CreateTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'normal',
    deadline: '',
    tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const translations = {
    nl: {
      createTask: 'Nieuwe Taak',
      title: 'Titel',
      description: 'Beschrijving',
      status: 'Status',
      priority: 'Prioriteit',
      deadline: 'Deadline',
      group: 'Groep',
      tags: 'Tags',
      cancel: 'Annuleren',
      create: 'Aanmaken',
      titleRequired: 'Titel is verplicht',
      todo: 'Te doen',
      doing: 'Bezig',
      done: 'Klaar',
      low: 'Laag',
      normal: 'Normaal',
      high: 'Hoog',
      urgent: 'Urgent',
      none: 'Geen',
      optional: 'Optioneel'
    },
    en: {
      createTask: 'Create Task',
      title: 'Title',
      description: 'Description',
      status: 'Status',
      priority: 'Priority',
      deadline: 'Deadline',
      group: 'Group',
      tags: 'Tags',
      cancel: 'Cancel',
      create: 'Create',
      titleRequired: 'Title is required',
      todo: 'To Do',
      doing: 'Doing',
      done: 'Done',
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      urgent: 'Urgent',
      none: 'None',
      optional: 'Optional'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert(t.titleRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(formData);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-content-area">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-full overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900">{t.createTask}</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.title} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t.title}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.description} ({t.optional})
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder={t.description}
            />
          </div>

          {/* Row: Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.status}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="todo">{t.todo}</option>
                <option value="doing">{t.doing}</option>
                <option value="done">{t.done}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.priority}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="low">{t.low}</option>
                <option value="normal">{t.normal}</option>
                <option value="high">{t.high}</option>
                <option value="urgent">{t.urgent}</option>
              </select>
            </div>
          </div>

          {/* Row: Deadline + Group */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.deadline} ({t.optional})
              </label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {groups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.group} ({t.optional})
                </label>
                <select
                  value={formData.task_group_id || ''}
                  onChange={(e) => setFormData({ ...formData, task_group_id: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t.none}</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={isSubmitting}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '...' : t.create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;
