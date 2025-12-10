'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { Card } from '@/shared/components/UI/Card/Card';
import { cn } from '@/shared/utils/cn';

interface OrganizationUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface AddMemberModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded?: () => void;
  locale: 'nl' | 'en';
}

export function AddMemberModal({
  projectId,
  isOpen,
  onClose,
  onMemberAdded,
  locale
}: AddMemberModalProps) {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translations = {
    nl: {
      title: 'Lid Toevoegen',
      subtitle: 'Selecteer een gebruiker uit je organisatie',
      search: 'Zoek gebruiker...',
      noUsers: 'Geen gebruikers gevonden',
      loading: 'Laden...',
      role: 'Rol',
      member: 'Lid',
      admin: 'Admin',
      viewer: 'Kijker',
      cancel: 'Annuleren',
      add: 'Toevoegen',
      adding: 'Toevoegen...',
      success: 'Lid succesvol toegevoegd',
      error: 'Fout bij toevoegen lid',
      roleDescriptions: {
        member: 'Kan het project bewerken en bestanden beheren',
        admin: 'Kan leden beheren en alle permissies',
        viewer: 'Kan alleen het project bekijken'
      }
    },
    en: {
      title: 'Add Member',
      subtitle: 'Select a user from your organization',
      search: 'Search user...',
      noUsers: 'No users found',
      loading: 'Loading...',
      role: 'Role',
      member: 'Member',
      admin: 'Admin',
      viewer: 'Viewer',
      cancel: 'Cancel',
      add: 'Add',
      adding: 'Adding...',
      success: 'Member added successfully',
      error: 'Error adding member',
      roleDescriptions: {
        member: 'Can edit project and manage files',
        admin: 'Can manage members and has all permissions',
        viewer: 'Can only view the project'
      }
    }
  };

  const t = translations[locale];

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSearchQuery('');
      setSelectedUserId(null);
      setSelectedRole('member');
      setError(null);
    }
  }, [isOpen, projectId]);

  async function fetchUsers() {
    try {
      setIsLoading(true);
      const url = `/api/organization/users?exclude_project_id=${projectId}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      const debounce = setTimeout(() => {
        fetchUsers();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery]);

  async function handleAddMember() {
    if (!selectedUserId) return;

    try {
      setIsAdding(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          role: selectedRole
        })
      });

      const data = await res.json();

      if (data.success) {
        onMemberAdded?.();
        onClose();
      } else {
        setError(data.error || t.error);
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      setError(t.error);
    } finally {
      setIsAdding(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-base">
        <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-base pb-base border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-semibold text-text-primary">{t.title}</h2>
              <p className="text-sm text-gray-600 mt-xs">{t.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-sm rounded hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mb-base">
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto mb-base">
            {isLoading ? (
              <div className="text-center py-lg text-gray-500">{t.loading}</div>
            ) : users.length === 0 ? (
              <div className="text-center py-lg text-gray-500">{t.noUsers}</div>
            ) : (
              <div className="space-y-xs">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      'flex items-center gap-base p-base rounded-base cursor-pointer transition-colors',
                      selectedUserId === user.id
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    )}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">{user.name}</div>
                      <div className="text-sm text-gray-600 truncate">{user.email}</div>
                    </div>

                    {/* Selection Indicator */}
                    {selectedUserId === user.id && (
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role Selection */}
          {selectedUserId && (
            <div className="mb-base p-base bg-gray-50 rounded-base">
              <label className="block text-sm font-medium text-gray-700 mb-sm">{t.role}</label>
              <div className="grid grid-cols-3 gap-sm">
                {(['member', 'admin', 'viewer'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      'px-base py-sm rounded-base text-sm font-medium transition-colors',
                      selectedRole === role
                        ? 'bg-primary text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    {t[role]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-sm">
                {t.roleDescriptions[selectedRole]}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-base p-base bg-red-50 border border-red-200 rounded-base text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-sm pt-base border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isAdding}
            >
              {t.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleAddMember}
              disabled={!selectedUserId || isAdding}
            >
              {isAdding ? t.adding : t.add}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
