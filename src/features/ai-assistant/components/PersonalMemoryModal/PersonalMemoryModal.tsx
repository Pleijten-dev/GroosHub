'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { Input } from '@/shared/components/UI/Input/Input';
import { cn } from '@/shared/utils/cn';
import { useSidebar } from '@/shared/hooks/useSidebar';

interface UserIdentity {
  name?: string;
  position?: string;
}

interface LearnedPreference {
  id: string;
  key: string;
  value: string;
  confidence: number;
  reinforcements: number;
  contradictions: number;
  learnedFrom: string;
  learnedAt: string;
  lastReinforcedAt?: string;
}

interface PersonalMemoryData {
  identity: UserIdentity;
  preferences: LearnedPreference[];
  memoryContent: string;
  tokenEstimate: number;
  formattedText: string;
}

interface PersonalMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: 'nl' | 'en';
}

const translations = {
  nl: {
    title: 'Jouw AI Geheugen',
    subtitle: 'Dit is wat de AI over jou onthoudt. Je kunt alles bewerken of verwijderen.',
    profile: 'Profiel',
    name: 'Naam',
    role: 'Rol',
    preferences: 'Voorkeuren',
    learnedPatterns: 'Geleerde Patronen',
    addPreference: 'Voorkeur toevoegen',
    clearAll: 'Alles wissen',
    export: 'Exporteren als JSON',
    close: 'Sluiten',
    save: 'Opslaan',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    edit: 'Bewerken',
    loading: 'Laden...',
    error: 'Fout bij laden geheugen',
    noPreferences: 'Nog geen voorkeuren geleerd',
    confirmClear: 'Weet je zeker dat je al je AI geheugen wilt wissen? Dit kan niet ongedaan worden gemaakt.',
    key: 'Categorie',
    value: 'Waarde',
    confidence: 'Zekerheid',
    reinforcements: 'Bevestigingen',
    learnedFrom: 'Bron',
  },
  en: {
    title: 'Your AI Memory',
    subtitle: 'This is what the AI remembers about you. You can edit or remove anything here.',
    profile: 'Profile',
    name: 'Name',
    role: 'Role',
    preferences: 'Preferences',
    learnedPatterns: 'Learned Patterns',
    addPreference: 'Add Preference',
    clearAll: 'Clear All Memory',
    export: 'Export as JSON',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error loading memory',
    noPreferences: 'No preferences learned yet',
    confirmClear: 'Are you sure you want to clear all your AI memory? This cannot be undone.',
    key: 'Category',
    value: 'Value',
    confidence: 'Confidence',
    reinforcements: 'Reinforcements',
    learnedFrom: 'Source',
  },
};

export function PersonalMemoryModal({ isOpen, onClose, locale }: PersonalMemoryModalProps) {
  const t = translations[locale];
  const { isCollapsed } = useSidebar();

  // Sidebar dimensions (matching Sidebar component defaults)
  const sidebarWidth = isCollapsed ? 60 : 320;

  const [memory, setMemory] = useState<PersonalMemoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [identityForm, setIdentityForm] = useState<UserIdentity>({});
  const [editingPreferenceId, setEditingPreferenceId] = useState<string | null>(null);
  const [preferenceForm, setPreferenceForm] = useState({ value: '' });
  const [addingPreference, setAddingPreference] = useState(false);
  const [newPreferenceForm, setNewPreferenceForm] = useState({ key: '', value: '' });

  // Fetch memory on open
  useEffect(() => {
    if (isOpen) {
      fetchMemory();
    }
  }, [isOpen]);

  async function fetchMemory() {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/memory/personal');
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setMemory(data.data);
      setIdentityForm(data.data.identity || {});
    } catch (err) {
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveIdentity() {
    try {
      const res = await fetch('/api/memory/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: identityForm }),
      });

      if (res.ok) {
        const data = await res.json();
        setMemory(prev => prev ? { ...prev, identity: data.data.identity } : null);
        setEditingIdentity(false);
      }
    } catch (err) {
      console.error('Failed to save identity:', err);
    }
  }

  async function savePreference(preferenceId: string) {
    try {
      const res = await fetch('/api/memory/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preference: { id: preferenceId, value: preferenceForm.value },
        }),
      });

      if (res.ok) {
        await fetchMemory();
        setEditingPreferenceId(null);
      }
    } catch (err) {
      console.error('Failed to save preference:', err);
    }
  }

  async function addPreference() {
    if (!newPreferenceForm.key || !newPreferenceForm.value) return;

    try {
      const res = await fetch('/api/memory/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preference: { key: newPreferenceForm.key, value: newPreferenceForm.value },
        }),
      });

      if (res.ok) {
        await fetchMemory();
        setAddingPreference(false);
        setNewPreferenceForm({ key: '', value: '' });
      }
    } catch (err) {
      console.error('Failed to add preference:', err);
    }
  }

  async function deletePreference(preferenceId: string) {
    try {
      const res = await fetch(`/api/memory/personal?preferenceId=${preferenceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchMemory();
      }
    } catch (err) {
      console.error('Failed to delete preference:', err);
    }
  }

  async function clearAllMemory() {
    if (!confirm(t.confirmClear)) return;

    try {
      const res = await fetch('/api/memory/personal?clearAll=true', {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchMemory();
      }
    } catch (err) {
      console.error('Failed to clear memory:', err);
    }
  }

  function exportAsJSON() {
    if (!memory) return;

    const blob = new Blob([JSON.stringify(memory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'personal-ai-memory.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - respects sidebar, greys out main section */}
      <div
        className="fixed top-0 right-0 bottom-0 bg-black/40 z-40"
        style={{ left: `${sidebarWidth}px` }}
        onClick={onClose}
      />

      {/* Modal container - respects sidebar */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex items-center justify-center p-lg"
        style={{ left: `${sidebarWidth}px` }}
      >
        {/* Modal */}
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-base max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-lg pt-lg pb-base border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
                <p className="text-sm text-gray-500">{t.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-sm rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-lg space-y-lg">
          {isLoading ? (
            <div className="text-center py-xl text-gray-500">{t.loading}</div>
          ) : error ? (
            <div className="text-center py-xl text-red-500">{error}</div>
          ) : memory ? (
            <>
              {/* Profile Section */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-base">
                  {t.profile}
                </h3>
                <div className="bg-gray-50 rounded-lg p-base">
                  {editingIdentity ? (
                    <div className="space-y-sm">
                      <Input
                        label={t.name}
                        value={identityForm.name || ''}
                        onChange={e => setIdentityForm({ ...identityForm, name: e.target.value })}
                      />
                      <Input
                        label={t.role}
                        value={identityForm.position || ''}
                        onChange={e => setIdentityForm({ ...identityForm, position: e.target.value })}
                      />
                      <div className="flex gap-sm">
                        <Button size="sm" onClick={saveIdentity}>{t.save}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingIdentity(false)}>{t.cancel}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-sm">
                          <span className="text-gray-600">{t.name}:</span>
                          <span className="font-medium">{memory.identity?.name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-sm mt-xs">
                          <span className="text-gray-600">{t.role}:</span>
                          <span className="font-medium">{memory.identity?.position || '-'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingIdentity(true)}
                        className="p-xs text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Preferences Section */}
              <section>
                <div className="flex items-center justify-between mb-base">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {t.preferences}
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAddingPreference(true)}
                  >
                    + {t.addPreference}
                  </Button>
                </div>

                {/* Add New Preference Form */}
                {addingPreference && (
                  <div className="bg-blue-50 rounded-lg p-base mb-base border border-blue-200">
                    <div className="grid grid-cols-2 gap-sm mb-sm">
                      <Input
                        label={t.key}
                        placeholder="e.g., writing_style"
                        value={newPreferenceForm.key}
                        onChange={e => setNewPreferenceForm({ ...newPreferenceForm, key: e.target.value })}
                      />
                      <Input
                        label={t.value}
                        placeholder="e.g., concise"
                        value={newPreferenceForm.value}
                        onChange={e => setNewPreferenceForm({ ...newPreferenceForm, value: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-sm">
                      <Button size="sm" onClick={addPreference}>{t.save}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingPreference(false)}>{t.cancel}</Button>
                    </div>
                  </div>
                )}

                {/* Preferences List */}
                {memory.preferences.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">{t.noPreferences}</p>
                ) : (
                  <div className="space-y-sm">
                    {memory.preferences.map(pref => (
                      <div
                        key={pref.id}
                        className="bg-gray-50 rounded-lg p-base border border-gray-200"
                      >
                        {editingPreferenceId === pref.id ? (
                          <div className="space-y-sm">
                            <div className="text-sm font-medium text-gray-700">{pref.key}</div>
                            <Input
                              value={preferenceForm.value}
                              onChange={e => setPreferenceForm({ value: e.target.value })}
                            />
                            <div className="flex gap-sm">
                              <Button size="sm" onClick={() => savePreference(pref.id)}>{t.save}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingPreferenceId(null)}>{t.cancel}</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-sm mb-xs">
                                <span className="font-medium text-gray-900">{pref.key}</span>
                                <span className={cn(
                                  'px-xs py-0.5 rounded text-xs font-medium',
                                  getConfidenceColor(pref.confidence)
                                )}>
                                  {Math.round(pref.confidence * 100)}%
                                </span>
                              </div>
                              <div className="text-sm text-gray-700">{pref.value}</div>
                              <div className="text-xs text-gray-500 mt-xs">
                                {t.reinforcements}: {pref.reinforcements} | {t.learnedFrom}: {pref.learnedFrom}
                              </div>
                            </div>
                            <div className="flex gap-xs">
                              <button
                                onClick={() => {
                                  setEditingPreferenceId(pref.id);
                                  setPreferenceForm({ value: pref.value });
                                }}
                                className="p-xs text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => deletePreference(pref.id)}
                                className="p-xs text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-lg py-base border-t border-gray-200 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllMemory}
            className="text-red-600 hover:bg-red-50"
          >
            {t.clearAll}
          </Button>
          <div className="flex gap-sm">
            <Button variant="ghost" size="sm" onClick={exportAsJSON}>
              {t.export}
            </Button>
            <Button onClick={onClose}>
              {t.close}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default PersonalMemoryModal;
