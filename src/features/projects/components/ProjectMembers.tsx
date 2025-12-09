'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';
import { AddMemberModal } from './AddMemberModal';

interface ProjectMembersProps {
  projectId: string;
  locale: string;
  canManageMembers: boolean;
}

interface Member {
  id: string;
  user_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  permissions: {
    can_edit: boolean;
    can_delete: boolean;
    can_manage_members: boolean;
    can_manage_files: boolean;
    can_view_analytics: boolean;
  };
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function ProjectMembers({ projectId, locale, canManageMembers }: ProjectMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translations = {
    nl: {
      members: 'Leden',
      invitations: 'Uitnodigingen',
      inviteMember: 'Lid Uitnodigen',
      addMember: 'Lid Toevoegen',
      email: 'E-mail',
      role: 'Rol',
      message: 'Bericht (optioneel)',
      memberRole: 'Lid',
      adminRole: 'Beheerder',
      viewerRole: 'Kijker',
      creatorRole: 'Eigenaar',
      joined: 'Toegetreden',
      pending: 'In behandeling',
      expires: 'Verloopt',
      cancel: 'Annuleren',
      send: 'Verzenden',
      sending: 'Verzenden...',
      remove: 'Verwijderen',
      noMembers: 'Nog geen leden',
      noPendingInvitations: 'Geen openstaande uitnodigingen',
      emailPlaceholder: 'Voer e-mailadres in',
      messagePlaceholder: 'Optioneel bericht voor de genodigde',
      inviteSent: 'Uitnodiging verzonden!',
      errorSending: 'Fout bij verzenden uitnodiging',
      errorLoading: 'Fout bij laden leden',
      confirmRemove: 'Weet je zeker dat je dit lid wilt verwijderen?',
      loading: 'Laden...'
    },
    en: {
      members: 'Members',
      invitations: 'Invitations',
      inviteMember: 'Invite Member',
      addMember: 'Add Member',
      email: 'Email',
      role: 'Role',
      message: 'Message (optional)',
      memberRole: 'Member',
      adminRole: 'Admin',
      viewerRole: 'Viewer',
      creatorRole: 'Creator',
      joined: 'Joined',
      pending: 'Pending',
      expires: 'Expires',
      cancel: 'Cancel',
      send: 'Send',
      sending: 'Sending...',
      remove: 'Remove',
      noMembers: 'No members yet',
      noPendingInvitations: 'No pending invitations',
      emailPlaceholder: 'Enter email address',
      messagePlaceholder: 'Optional message for the invitee',
      inviteSent: 'Invitation sent!',
      errorSending: 'Error sending invitation',
      errorLoading: 'Error loading members',
      confirmRemove: 'Are you sure you want to remove this member?',
      loading: 'Loading...'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchMembers();
    if (canManageMembers) {
      fetchInvitations();
    }
  }, [projectId]);

  async function fetchMembers() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        // API returns data.data with fields: user_name, user_email, user_avatar
        // Map to component's expected format
        const mappedMembers = (data.data || []).map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          name: m.user_name,
          email: m.user_email,
          avatar_url: m.user_avatar,
          role: m.role,
          permissions: m.permissions,
          joined_at: m.joined_at
        }));
        setMembers(mappedMembers);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setError(t.errorLoading);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchInvitations() {
    try {
      const res = await fetch(`/api/projects/${projectId}/invitations`);
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations?.filter((inv: Invitation) => inv.status === 'pending') || []);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  }

  async function handleSendInvitation() {
    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          message: inviteMessage.trim() || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.errorSending);
      }

      // Success - refresh invitations and close modal
      await fetchInvitations();
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      setInviteMessage('');
    } catch (err) {
      console.error('Failed to send invitation:', err);
      setError(err instanceof Error ? err.message : t.errorSending);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!confirm(t.confirmRemove)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchMembers();
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-600 mt-sm">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t.members}</h2>
        {canManageMembers && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddMemberModal(true)}
          >
            {t.addMember}
          </Button>
        )}
      </div>

      {/* Members List */}
      <div className="space-y-sm">
        {members.length === 0 ? (
          <div className="text-center py-lg text-gray-500">{t.noMembers}</div>
        ) : (
          members.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between p-base bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-base flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold flex-shrink-0">
                  {member.name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{member.name || member.email}</p>
                  <p className="text-sm text-gray-600 truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-base">
                <div className="text-right">
                  <p className="text-sm font-medium capitalize text-gray-900">{member.role}</p>
                  <p className="text-xs text-gray-500">
                    {t.joined} {new Date(member.joined_at).toLocaleDateString(locale)}
                  </p>
                </div>

                {canManageMembers && member.role !== 'creator' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {t.remove}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pending Invitations */}
      {canManageMembers && invitations.length > 0 && (
        <div className="mt-lg">
          <h3 className="text-lg font-semibold mb-base">{t.invitations}</h3>
          <div className="space-y-sm">
            {invitations.map(invitation => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-base bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{invitation.email}</p>
                  <p className="text-sm text-gray-600">
                    {t.pending} • {t.expires} {new Date(invitation.expires_at).toLocaleDateString(locale)}
                  </p>
                </div>
                <div className="text-sm font-medium capitalize text-gray-700">
                  {invitation.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-base">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-lg">
            <h2 className="text-xl font-semibold mb-base">{t.inviteMember}</h2>

            <div className="space-y-base">
              {/* Email Input */}
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-xs">
                  {t.email} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="invite-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-base py-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Role Select */}
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-xs">
                  {t.role}
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin' | 'viewer')}
                  className="w-full px-base py-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="viewer">{t.viewerRole}</option>
                  <option value="member">{t.memberRole}</option>
                  <option value="admin">{t.adminRole}</option>
                </select>
              </div>

              {/* Message Textarea */}
              <div>
                <label htmlFor="invite-message" className="block text-sm font-medium text-gray-700 mb-xs">
                  {t.message}
                </label>
                <textarea
                  id="invite-message"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={t.messagePlaceholder}
                  rows={3}
                  className="w-full px-base py-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-base py-sm rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-base justify-end pt-base border-t border-gray-200">
                <Button
                  variant="secondary"
                  size="base"
                  onClick={() => {
                    setShowInviteModal(false);
                    setError(null);
                    setInviteEmail('');
                    setInviteMessage('');
                  }}
                  disabled={isSubmitting}
                >
                  {t.cancel}
                </Button>
                <Button
                  variant="primary"
                  size="base"
                  onClick={handleSendInvitation}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t.sending : t.send}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal (from organization users) */}
      <AddMemberModal
        projectId={projectId}
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onMemberAdded={fetchMembers}
        locale={locale as 'nl' | 'en'}
      />
    </div>
  );
}

export default ProjectMembers;
