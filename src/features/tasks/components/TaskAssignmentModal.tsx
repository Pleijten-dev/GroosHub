'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';

export interface TaskAssignmentModalProps {
  taskId: string;
  projectId: string;
  currentAssignees: Array<{ id: number; name: string; email: string }>;
  onClose: () => void;
  onUpdate: () => void;
  locale: string;
}

interface ProjectMember {
  user_id: number;
  user_name: string;
  user_email: string;
  role: string;
}

export function TaskAssignmentModal({
  taskId,
  projectId,
  currentAssignees,
  onClose,
  onUpdate,
  locale
}: TaskAssignmentModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>(
    currentAssignees.map(a => a.id)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const translations = {
    nl: {
      assignMembers: 'Leden Toewijzen',
      projectMembers: 'Projectleden',
      assigned: 'Toegewezen',
      notAssigned: 'Niet toegewezen',
      save: 'Opslaan',
      cancel: 'Annuleren',
      noMembers: 'Geen projectleden gevonden',
      loading: 'Laden...'
    },
    en: {
      assignMembers: 'Assign Members',
      projectMembers: 'Project Members',
      assigned: 'Assigned',
      notAssigned: 'Not assigned',
      save: 'Save',
      cancel: 'Cancel',
      noMembers: 'No project members found',
      loading: 'Loading...'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchProjectMembers();
  }, [projectId]);

  async function fetchProjectMembers() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleUser(userId: number) {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      // Get users to add and remove
      const currentIds = currentAssignees.map(a => a.id);
      const toAdd = selectedUsers.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedUsers.includes(id));

      // Add new assignments
      if (toAdd.length > 0) {
        await fetch(`/api/projects/${projectId}/tasks/${taskId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: toAdd })
        });
      }

      // Remove old assignments
      for (const userId of toRemove) {
        await fetch(`/api/projects/${projectId}/tasks/${taskId}/assign`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });
      }

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating assignments:', err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-content-area">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-full overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{t.assignMembers}</h2>
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
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">{t.loading}</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t.noMembers}</div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">{t.projectMembers}</p>
              {members.map(member => {
                const isAssigned = selectedUsers.includes(member.user_id);
                return (
                  <label
                    key={member.user_id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                      transition-colors
                      ${isAssigned
                        ? 'border-primary bg-primary bg-opacity-5'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => toggleUser(member.user_id)}
                      className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                          {member.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {member.user_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.user_email}
                          </p>
                        </div>
                      </div>
                    </div>
                    {isAssigned && (
                      <span className="text-xs text-primary font-medium">
                        {t.assigned}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isSaving}
          >
            {t.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? '...' : t.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TaskAssignmentModal;
