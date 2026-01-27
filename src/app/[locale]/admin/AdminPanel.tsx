'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/shared/components/UI/Input/Input';
import { Button } from '@/shared/components/UI/Button/Button';
import { Card } from '@/shared/components/UI/Card/Card';
import { DomainMemoryPanel } from '@/features/ai-assistant/components/DomainMemoryPanel/DomainMemoryPanel';
import { cn } from '@/shared/utils/cn';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface AdminPanelProps {
  translations: {
    title: string;
    userManagement: string;
    createUser: string;
    editUser: string;
    deleteUser: string;
    confirmDelete: string;
    name: string;
    email: string;
    role: string;
    password: string;
    userRole: string;
    adminRole: string;
    actions: string;
    noUsers: string;
    userCreated: string;
    userUpdated: string;
    userDeleted: string;
  };
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    error: string;
  };
  locale: string;
}

type AdminTab = 'users' | 'ai-memory';

export function AdminPanel({ translations, common, locale }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setError(common.error);
      }
    } catch (err) {
      setError(common.error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'user' });
    setIsFormOpen(true);
    setError('');
    setSuccessMessage('');
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role as 'user' | 'admin',
    });
    setIsFormOpen(true);
    setError('');
    setSuccessMessage('');
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm(translations.confirmDelete)) return;

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccessMessage(translations.userDeleted);
        fetchUsers();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || common.error);
      }
    } catch (err) {
      setError(common.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? { id: editingUser.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSuccessMessage(
          editingUser ? translations.userUpdated : translations.userCreated
        );
        setIsFormOpen(false);
        fetchUsers();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || common.error);
      }
    } catch (err) {
      setError(common.error);
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'user' });
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    );
  }

  const tabLabels = {
    users: locale === 'nl' ? 'Gebruikers' : 'Users',
    'ai-memory': locale === 'nl' ? 'AI Geheugen' : 'AI Memory',
  };

  return (
    <div className="min-h-screen bg-background-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary mb-4">
            {translations.title}
          </h1>

          {/* Admin Tabs */}
          <div className="flex gap-base border-b border-gray-200">
            {(['users', 'ai-memory'] as AdminTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'pb-sm px-xs whitespace-nowrap transition-colors relative',
                  activeTab === tab
                    ? 'text-primary font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <span>{tabLabels[tab]}</span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <>
            <div className="mb-4 flex justify-end">
              <Button onClick={handleCreateUser} variant="primary">
                {translations.createUser}
              </Button>
            </div>

            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-error-light text-error rounded-lg">
                {error}
              </div>
            )}

            {/* User Form Modal */}
        {isFormOpen && (
          <Card className="mb-6" padding="lg">
            <h2 className="text-xl font-bold text-text-primary mb-4">
              {editingUser ? translations.editUser : translations.createUser}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={translations.name}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
              <Input
                type="email"
                label={translations.email}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
              <Input
                type="password"
                label={translations.password}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required={!editingUser}
                helperText={
                  editingUser ? 'Leave blank to keep current password' : ''
                }
              />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {translations.role}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'user' | 'admin',
                    })
                  }
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value="user">{translations.userRole}</option>
                  <option value="admin">{translations.adminRole}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary">
                  {common.save}
                </Button>
                <Button type="button" variant="ghost" onClick={handleCancel}>
                  {common.cancel}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Users Table */}
        <Card padding="lg">
          <h2 className="text-xl font-bold text-text-primary mb-4">
            {translations.userManagement}
          </h2>
          {users.length === 0 ? (
            <p className="text-text-muted">{translations.noUsers}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-text-primary font-medium">
                      {translations.name}
                    </th>
                    <th className="text-left py-3 px-4 text-text-primary font-medium">
                      {translations.email}
                    </th>
                    <th className="text-left py-3 px-4 text-text-primary font-medium">
                      {translations.role}
                    </th>
                    <th className="text-left py-3 px-4 text-text-primary font-medium">
                      {translations.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border">
                      <td className="py-3 px-4 text-text-primary">
                        {user.name}
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            user.role === 'admin'
                              ? 'bg-primary-light text-primary'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {user.role === 'admin'
                            ? translations.adminRole
                            : translations.userRole}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditUser(user)}
                          >
                            {common.edit}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-error hover:bg-error-light"
                          >
                            {common.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
          </>
        )}

        {/* AI Memory Tab */}
        {activeTab === 'ai-memory' && (
          <DomainMemoryPanel locale={locale} />
        )}
      </div>
    </div>
  );
}
