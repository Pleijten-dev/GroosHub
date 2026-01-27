'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { Input } from '@/shared/components/UI/Input/Input';
import { cn } from '@/shared/utils/cn';

interface ProjectHardValues {
  bvo?: number;
  go?: number;
  units?: number;
  targetGroups?: string[];
  phase?: string;
  location?: {
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  mpgTarget?: number;
  budget?: number;
  buildingType?: string;
  [key: string]: unknown;
}

interface SoftContext {
  id: string;
  category: string;
  content: string;
  source: string;
  confidence: number;
  learnedAt: string;
}

interface ProjectMemoryData {
  projectId: string;
  hardValues: ProjectHardValues;
  softContext: SoftContext[];
  summary: string | null;
  tokenEstimate: number;
}

interface ProjectMemoryProps {
  projectId: string;
  locale: string;
  canEdit: boolean;
}

const translations = {
  nl: {
    title: 'Project AI Geheugen',
    subtitle: 'Gedeelde context voor AI interacties in dit project. Alle teamleden kunnen bekijken; editors kunnen aanpassen.',
    projectGoals: 'Projectdoelen',
    constraints: 'Beperkingen',
    keyDecisions: 'Belangrijke Beslissingen',
    clientPreferences: 'Klantvoorkeuren',
    hardValues: 'Projectgegevens',
    softContext: 'Geleerde Context',
    summary: 'AI Samenvatting',
    addGoal: 'Doel toevoegen',
    addConstraint: 'Beperking toevoegen',
    addDecision: 'Beslissing toevoegen',
    addPreference: 'Voorkeur toevoegen',
    save: 'Opslaan',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    edit: 'Bewerken',
    loading: 'Laden...',
    error: 'Fout bij laden geheugen',
    noContext: 'Nog geen geleerde context',
    category: 'Categorie',
    content: 'Inhoud',
    confidence: 'Zekerheid',
    learnedFrom: 'Bron',
    clearAll: 'Alles wissen',
    export: 'Exporteren',
    confirmClear: 'Weet je zeker dat je alle projectgeheugen wilt wissen?',
    bvo: 'BVO (m²)',
    go: 'GO (m²)',
    units: 'Wooneenheden',
    phase: 'Fase',
    mpgTarget: 'MPG Doel',
    budget: 'Budget (€)',
    buildingType: 'Gebouwtype',
    viewOnly: 'Je hebt alleen leesrechten voor dit project',
  },
  en: {
    title: 'Project AI Memory',
    subtitle: 'Shared context for AI interactions in this project. All team members can view; editors can modify.',
    projectGoals: 'Project Goals',
    constraints: 'Constraints',
    keyDecisions: 'Key Decisions',
    clientPreferences: 'Client Preferences',
    hardValues: 'Project Data',
    softContext: 'Learned Context',
    summary: 'AI Summary',
    addGoal: 'Add Goal',
    addConstraint: 'Add Constraint',
    addDecision: 'Add Decision',
    addPreference: 'Add Preference',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error loading memory',
    noContext: 'No learned context yet',
    category: 'Category',
    content: 'Content',
    confidence: 'Confidence',
    learnedFrom: 'Source',
    clearAll: 'Clear All',
    export: 'Export',
    confirmClear: 'Are you sure you want to clear all project memory?',
    bvo: 'GFA (m²)',
    go: 'NFA (m²)',
    units: 'Units',
    phase: 'Phase',
    mpgTarget: 'MPG Target',
    budget: 'Budget (€)',
    buildingType: 'Building Type',
    viewOnly: 'You have read-only access to this project',
  },
};

const contextCategories = [
  { value: 'goal', labelNl: 'Projectdoel', labelEn: 'Project Goal' },
  { value: 'constraint', labelNl: 'Beperking', labelEn: 'Constraint' },
  { value: 'decision', labelNl: 'Beslissing', labelEn: 'Decision' },
  { value: 'client_preference', labelNl: 'Klantvoorkeur', labelEn: 'Client Preference' },
  { value: 'design_language', labelNl: 'Ontwerptaal', labelEn: 'Design Language' },
  { value: 'technical', labelNl: 'Technisch', labelEn: 'Technical' },
  { value: 'other', labelNl: 'Overig', labelEn: 'Other' },
];

export function ProjectMemory({ projectId, locale, canEdit }: ProjectMemoryProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [memory, setMemory] = useState<ProjectMemoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [editingHardValues, setEditingHardValues] = useState(false);
  const [hardValuesForm, setHardValuesForm] = useState<ProjectHardValues>({});
  const [addingContext, setAddingContext] = useState(false);
  const [newContextForm, setNewContextForm] = useState({ category: 'goal', content: '' });
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [editContextForm, setEditContextForm] = useState({ content: '' });

  // Fetch memory on mount
  useEffect(() => {
    fetchMemory();
  }, [projectId]);

  async function fetchMemory() {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/memory/project/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setMemory(data.data);
      setHardValuesForm(data.data.hardValues || {});
    } catch (err) {
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveHardValues() {
    try {
      const res = await fetch(`/api/memory/project/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hardValues: hardValuesForm }),
      });

      if (res.ok) {
        await fetchMemory();
        setEditingHardValues(false);
      }
    } catch (err) {
      console.error('Failed to save hard values:', err);
    }
  }

  async function addContext() {
    if (!newContextForm.content.trim()) return;

    try {
      const res = await fetch(`/api/memory/project/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addContext: {
            category: newContextForm.category,
            content: newContextForm.content,
          },
        }),
      });

      if (res.ok) {
        await fetchMemory();
        setAddingContext(false);
        setNewContextForm({ category: 'goal', content: '' });
      }
    } catch (err) {
      console.error('Failed to add context:', err);
    }
  }

  async function updateContext(contextId: string) {
    try {
      const res = await fetch(`/api/memory/project/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateContext: {
            contextId,
            content: editContextForm.content,
          },
        }),
      });

      if (res.ok) {
        await fetchMemory();
        setEditingContextId(null);
      }
    } catch (err) {
      console.error('Failed to update context:', err);
    }
  }

  async function deleteContext(contextId: string) {
    try {
      const res = await fetch(`/api/memory/project/${projectId}?contextId=${contextId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchMemory();
      }
    } catch (err) {
      console.error('Failed to delete context:', err);
    }
  }

  async function clearAllMemory() {
    if (!confirm(t.confirmClear)) return;

    try {
      const res = await fetch(`/api/memory/project/${projectId}?clearAll=true`, {
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
    a.download = `project-${projectId}-memory.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getCategoryLabel(category: string): string {
    const cat = contextCategories.find(c => c.value === category);
    if (!cat) return category;
    return locale === 'nl' ? cat.labelNl : cat.labelEn;
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  }

  // Group soft context by category
  const groupedContext = memory?.softContext.reduce((acc, ctx) => {
    if (!acc[ctx.category]) acc[ctx.category] = [];
    acc[ctx.category].push(ctx);
    return acc;
  }, {} as Record<string, SoftContext[]>) || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-base"></div>
          <p className="text-gray-500">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-xl">
        <p className="text-red-500">{error}</p>
        <Button variant="ghost" size="sm" onClick={fetchMemory} className="mt-base">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-500 mt-xs">{t.subtitle}</p>
          {!canEdit && (
            <p className="text-sm text-amber-600 mt-xs italic">{t.viewOnly}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-sm">
            <Button variant="ghost" size="sm" onClick={exportAsJSON}>
              {t.export}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllMemory}
              className="text-red-600 hover:bg-red-50"
            >
              {t.clearAll}
            </Button>
          </div>
        )}
      </div>

      {/* Hard Values Section */}
      <section className="bg-gray-50 rounded-lg p-base">
        <div className="flex items-center justify-between mb-base">
          <h3 className="font-medium text-gray-900">{t.hardValues}</h3>
          {canEdit && !editingHardValues && (
            <Button variant="ghost" size="sm" onClick={() => setEditingHardValues(true)}>
              {t.edit}
            </Button>
          )}
        </div>

        {editingHardValues ? (
          <div className="space-y-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
              <Input
                label={t.bvo}
                type="number"
                value={hardValuesForm.bvo || ''}
                onChange={e => setHardValuesForm({ ...hardValuesForm, bvo: Number(e.target.value) || undefined })}
              />
              <Input
                label={t.go}
                type="number"
                value={hardValuesForm.go || ''}
                onChange={e => setHardValuesForm({ ...hardValuesForm, go: Number(e.target.value) || undefined })}
              />
              <Input
                label={t.units}
                type="number"
                value={hardValuesForm.units || ''}
                onChange={e => setHardValuesForm({ ...hardValuesForm, units: Number(e.target.value) || undefined })}
              />
              <Input
                label={t.phase}
                value={hardValuesForm.phase || ''}
                onChange={e => setHardValuesForm({ ...hardValuesForm, phase: e.target.value })}
              />
              <Input
                label={t.mpgTarget}
                type="number"
                step="0.01"
                value={hardValuesForm.mpgTarget || ''}
                onChange={e => setHardValuesForm({ ...hardValuesForm, mpgTarget: Number(e.target.value) || undefined })}
              />
              <Input
                label={t.budget}
                type="number"
                value={hardValuesForm.budget || ''}
                onChange={e => setHardValuesForm({ ...hardValuesForm, budget: Number(e.target.value) || undefined })}
              />
              <Input
                label={t.buildingType}
                value={hardValuesForm.buildingType || ''}
                onChange={e => setHardValuesForm({ ...hardValuesForm, buildingType: e.target.value })}
              />
            </div>
            <div className="flex gap-sm mt-base">
              <Button size="sm" onClick={saveHardValues}>{t.save}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingHardValues(false)}>{t.cancel}</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-base">
            {memory?.hardValues.bvo && (
              <div>
                <span className="text-xs text-gray-500 uppercase">{t.bvo}</span>
                <p className="font-medium">{memory.hardValues.bvo.toLocaleString()}</p>
              </div>
            )}
            {memory?.hardValues.go && (
              <div>
                <span className="text-xs text-gray-500 uppercase">{t.go}</span>
                <p className="font-medium">{memory.hardValues.go.toLocaleString()}</p>
              </div>
            )}
            {memory?.hardValues.units && (
              <div>
                <span className="text-xs text-gray-500 uppercase">{t.units}</span>
                <p className="font-medium">{memory.hardValues.units}</p>
              </div>
            )}
            {memory?.hardValues.phase && (
              <div>
                <span className="text-xs text-gray-500 uppercase">{t.phase}</span>
                <p className="font-medium">{memory.hardValues.phase}</p>
              </div>
            )}
            {memory?.hardValues.mpgTarget && (
              <div>
                <span className="text-xs text-gray-500 uppercase">{t.mpgTarget}</span>
                <p className="font-medium">{memory.hardValues.mpgTarget}</p>
              </div>
            )}
            {memory?.hardValues.budget && (
              <div>
                <span className="text-xs text-gray-500 uppercase">{t.budget}</span>
                <p className="font-medium">€{memory.hardValues.budget.toLocaleString()}</p>
              </div>
            )}
            {memory?.hardValues.buildingType && (
              <div>
                <span className="text-xs text-gray-500 uppercase">{t.buildingType}</span>
                <p className="font-medium">{memory.hardValues.buildingType}</p>
              </div>
            )}
            {Object.keys(memory?.hardValues || {}).length === 0 && (
              <p className="text-gray-500 text-sm italic col-span-full">-</p>
            )}
          </div>
        )}
      </section>

      {/* Soft Context Section */}
      <section>
        <div className="flex items-center justify-between mb-base">
          <h3 className="font-medium text-gray-900">{t.softContext}</h3>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setAddingContext(true)}>
              + {t.addGoal}
            </Button>
          )}
        </div>

        {/* Add Context Form */}
        {addingContext && canEdit && (
          <div className="bg-blue-50 rounded-lg p-base mb-base border border-blue-200">
            <div className="space-y-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-xs">{t.category}</label>
                <select
                  value={newContextForm.category}
                  onChange={e => setNewContextForm({ ...newContextForm, category: e.target.value })}
                  className="w-full px-sm py-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {contextCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {locale === 'nl' ? cat.labelNl : cat.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-xs">{t.content}</label>
                <textarea
                  value={newContextForm.content}
                  onChange={e => setNewContextForm({ ...newContextForm, content: e.target.value })}
                  className="w-full px-sm py-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder={locale === 'nl' ? 'Beschrijf het doel, beperking of beslissing...' : 'Describe the goal, constraint or decision...'}
                />
              </div>
              <div className="flex gap-sm">
                <Button size="sm" onClick={addContext}>{t.save}</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingContext(false)}>{t.cancel}</Button>
              </div>
            </div>
          </div>
        )}

        {/* Context List by Category */}
        {Object.keys(groupedContext).length === 0 ? (
          <p className="text-gray-500 text-sm italic">{t.noContext}</p>
        ) : (
          <div className="space-y-base">
            {Object.entries(groupedContext).map(([category, contexts]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-700 mb-sm uppercase tracking-wide">
                  {getCategoryLabel(category)}
                </h4>
                <div className="space-y-sm">
                  {contexts.map(ctx => (
                    <div
                      key={ctx.id}
                      className="bg-white rounded-lg p-base border border-gray-200 shadow-sm"
                    >
                      {editingContextId === ctx.id ? (
                        <div className="space-y-sm">
                          <textarea
                            value={editContextForm.content}
                            onChange={e => setEditContextForm({ content: e.target.value })}
                            className="w-full px-sm py-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            rows={3}
                          />
                          <div className="flex gap-sm">
                            <Button size="sm" onClick={() => updateContext(ctx.id)}>{t.save}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingContextId(null)}>{t.cancel}</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-900">{ctx.content}</p>
                            <div className="flex items-center gap-sm mt-xs text-xs text-gray-500">
                              <span className={cn(
                                'px-xs py-0.5 rounded',
                                getConfidenceColor(ctx.confidence)
                              )}>
                                {Math.round(ctx.confidence * 100)}% {t.confidence}
                              </span>
                              <span>{t.learnedFrom}: {ctx.source}</span>
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex gap-xs ml-sm">
                              <button
                                onClick={() => {
                                  setEditingContextId(ctx.id);
                                  setEditContextForm({ content: ctx.content });
                                }}
                                className="p-xs text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteContext(ctx.id)}
                                className="p-xs text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Summary Section */}
      {memory?.summary && (
        <section className="bg-primary/5 rounded-lg p-base border border-primary/20">
          <h3 className="font-medium text-gray-900 mb-sm">{t.summary}</h3>
          <p className="text-gray-700 text-sm">{memory.summary}</p>
        </section>
      )}
    </div>
  );
}

export default ProjectMemory;
