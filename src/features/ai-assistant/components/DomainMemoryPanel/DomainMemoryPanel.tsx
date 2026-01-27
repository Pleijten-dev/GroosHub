'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { Input } from '@/shared/components/UI/Input/Input';
import { Card } from '@/shared/components/UI/Card/Card';
import { cn } from '@/shared/utils/cn';

interface ExplicitKnowledge {
  id: string;
  category: string;
  title: string;
  content: string;
  addedBy: number;
  addedAt: string;
}

interface LearnedPattern {
  id: string;
  pattern: string;
  evidence: string;
  projectCount: number;
  confidence: number;
  learnedAt: string;
}

interface DomainMemoryData {
  orgId: string;
  explicitKnowledge: ExplicitKnowledge[];
  learnedPatterns: LearnedPattern[];
  tokenEstimate: number;
}

interface DomainMemoryPanelProps {
  locale: string;
}

const translations = {
  nl: {
    title: 'Domein AI Geheugen',
    subtitle: 'Organisatie-brede kennis voor alle projecten en gebruikers. Alleen beheerders kunnen dit aanpassen.',
    companyStandards: 'Bedrijfsstandaarden',
    regulatoryKnowledge: 'Regelgevingskennis',
    learnedPatterns: 'Geleerde Patronen',
    addKnowledge: 'Kennis toevoegen',
    category: 'Categorie',
    title_field: 'Titel',
    content: 'Inhoud',
    save: 'Opslaan',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    edit: 'Bewerken',
    loading: 'Laden...',
    error: 'Fout bij laden geheugen',
    noKnowledge: 'Nog geen kennis toegevoegd',
    noPatterns: 'Nog geen patronen geleerd',
    export: 'Exporteren',
    import: 'Importeren',
    pattern: 'Patroon',
    evidence: 'Bewijs',
    projectCount: 'Projecten',
    confidence: 'Zekerheid',
    patternNote: 'Deze patronen zijn automatisch geleerd uit projectgesprekken. Verwijder als ze niet van toepassing zijn.',
    categories: {
      regulation: 'Regelgeving',
      company_standard: 'Bedrijfsstandaard',
      supplier: 'Leverancier',
      best_practice: 'Best Practice',
      technical: 'Technisch',
      other: 'Overig',
    },
  },
  en: {
    title: 'Domain AI Memory',
    subtitle: 'Organization-wide knowledge shared across all projects and users. Only administrators can modify.',
    companyStandards: 'Company Standards',
    regulatoryKnowledge: 'Regulatory Knowledge',
    learnedPatterns: 'Learned Patterns',
    addKnowledge: 'Add Knowledge',
    category: 'Category',
    title_field: 'Title',
    content: 'Content',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error loading memory',
    noKnowledge: 'No knowledge added yet',
    noPatterns: 'No patterns learned yet',
    export: 'Export',
    import: 'Import',
    pattern: 'Pattern',
    evidence: 'Evidence',
    projectCount: 'Projects',
    confidence: 'Confidence',
    patternNote: 'These patterns were automatically learned from project conversations. Remove if not applicable.',
    categories: {
      regulation: 'Regulation',
      company_standard: 'Company Standard',
      supplier: 'Supplier',
      best_practice: 'Best Practice',
      technical: 'Technical',
      other: 'Other',
    },
  },
};

const knowledgeCategories = [
  { value: 'regulation', labelNl: 'Regelgeving', labelEn: 'Regulation' },
  { value: 'company_standard', labelNl: 'Bedrijfsstandaard', labelEn: 'Company Standard' },
  { value: 'supplier', labelNl: 'Leverancier', labelEn: 'Supplier' },
  { value: 'best_practice', labelNl: 'Best Practice', labelEn: 'Best Practice' },
  { value: 'technical', labelNl: 'Technisch', labelEn: 'Technical' },
  { value: 'other', labelNl: 'Overig', labelEn: 'Other' },
];

export function DomainMemoryPanel({ locale }: DomainMemoryPanelProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [memory, setMemory] = useState<DomainMemoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [addingKnowledge, setAddingKnowledge] = useState(false);
  const [newKnowledgeForm, setNewKnowledgeForm] = useState({
    category: 'company_standard',
    title: '',
    content: '',
  });
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [editKnowledgeForm, setEditKnowledgeForm] = useState({
    category: '',
    title: '',
    content: '',
  });

  useEffect(() => {
    fetchMemory();
  }, []);

  async function fetchMemory() {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/memory/domain');
      if (!res.ok) {
        if (res.status === 403) {
          setError('Admin access required');
          return;
        }
        throw new Error('Failed to fetch');
      }

      const data = await res.json();
      setMemory(data.data);
    } catch (err) {
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }

  async function addKnowledge() {
    if (!newKnowledgeForm.title.trim() || !newKnowledgeForm.content.trim()) return;

    try {
      const res = await fetch('/api/memory/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addKnowledge: {
            category: newKnowledgeForm.category,
            title: newKnowledgeForm.title,
            content: newKnowledgeForm.content,
          },
        }),
      });

      if (res.ok) {
        await fetchMemory();
        setAddingKnowledge(false);
        setNewKnowledgeForm({ category: 'company_standard', title: '', content: '' });
      }
    } catch (err) {
      console.error('Failed to add knowledge:', err);
    }
  }

  async function updateKnowledge(knowledgeId: string) {
    try {
      const res = await fetch('/api/memory/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateKnowledge: {
            knowledgeId,
            updates: {
              category: editKnowledgeForm.category,
              title: editKnowledgeForm.title,
              content: editKnowledgeForm.content,
            },
          },
        }),
      });

      if (res.ok) {
        await fetchMemory();
        setEditingKnowledgeId(null);
      }
    } catch (err) {
      console.error('Failed to update knowledge:', err);
    }
  }

  async function deleteKnowledge(knowledgeId: string) {
    try {
      const res = await fetch(`/api/memory/domain?knowledgeId=${knowledgeId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchMemory();
      }
    } catch (err) {
      console.error('Failed to delete knowledge:', err);
    }
  }

  async function deletePattern(patternId: string) {
    try {
      const res = await fetch(`/api/memory/domain?patternId=${patternId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchMemory();
      }
    } catch (err) {
      console.error('Failed to delete pattern:', err);
    }
  }

  function exportAsJSON() {
    if (!memory) return;

    const blob = new Blob([JSON.stringify(memory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'domain-ai-memory.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function getCategoryLabel(category: string): string {
    const cat = knowledgeCategories.find(c => c.value === category);
    if (!cat) return category;
    return locale === 'nl' ? cat.labelNl : cat.labelEn;
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  }

  // Group knowledge by category
  const groupedKnowledge = memory?.explicitKnowledge.reduce((acc, k) => {
    if (!acc[k.category]) acc[k.category] = [];
    acc[k.category].push(k);
    return acc;
  }, {} as Record<string, ExplicitKnowledge[]>) || {};

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
      <Card padding="lg">
        <div className="text-center py-lg">
          <p className="text-red-500">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchMemory} className="mt-base">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Header */}
      <Card padding="lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-sm">
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              {t.title}
            </h2>
            <p className="text-sm text-gray-500 mt-xs">{t.subtitle}</p>
          </div>
          <div className="flex gap-sm">
            <Button variant="ghost" size="sm" onClick={exportAsJSON}>
              {t.export}
            </Button>
            <Button onClick={() => setAddingKnowledge(true)}>
              + {t.addKnowledge}
            </Button>
          </div>
        </div>
      </Card>

      {/* Add Knowledge Form */}
      {addingKnowledge && (
        <Card padding="lg" className="border-2 border-primary/20">
          <h3 className="font-semibold text-gray-900 mb-base">{t.addKnowledge}</h3>
          <div className="space-y-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-xs">{t.category}</label>
              <select
                value={newKnowledgeForm.category}
                onChange={e => setNewKnowledgeForm({ ...newKnowledgeForm, category: e.target.value })}
                className="w-full px-sm py-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {knowledgeCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {locale === 'nl' ? cat.labelNl : cat.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t.title_field}
              value={newKnowledgeForm.title}
              onChange={e => setNewKnowledgeForm({ ...newKnowledgeForm, title: e.target.value })}
              placeholder={locale === 'nl' ? 'Bijv. MPG 2024 vereisten' : 'E.g. MPG 2024 requirements'}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-xs">{t.content}</label>
              <textarea
                value={newKnowledgeForm.content}
                onChange={e => setNewKnowledgeForm({ ...newKnowledgeForm, content: e.target.value })}
                className="w-full px-sm py-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={4}
                placeholder={locale === 'nl' ? 'Beschrijf de kennis...' : 'Describe the knowledge...'}
              />
            </div>
            <div className="flex gap-sm">
              <Button onClick={addKnowledge}>{t.save}</Button>
              <Button variant="ghost" onClick={() => setAddingKnowledge(false)}>{t.cancel}</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Explicit Knowledge Section */}
      <Card padding="lg">
        <h3 className="font-semibold text-gray-900 mb-base">{t.companyStandards}</h3>

        {Object.keys(groupedKnowledge).length === 0 ? (
          <p className="text-gray-500 text-sm italic">{t.noKnowledge}</p>
        ) : (
          <div className="space-y-lg">
            {Object.entries(groupedKnowledge).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-sm">
                  {getCategoryLabel(category)}
                </h4>
                <div className="space-y-sm">
                  {items.map(knowledge => (
                    <div
                      key={knowledge.id}
                      className="bg-gray-50 rounded-lg p-base border border-gray-200"
                    >
                      {editingKnowledgeId === knowledge.id ? (
                        <div className="space-y-sm">
                          <select
                            value={editKnowledgeForm.category}
                            onChange={e => setEditKnowledgeForm({ ...editKnowledgeForm, category: e.target.value })}
                            className="w-full px-sm py-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {knowledgeCategories.map(cat => (
                              <option key={cat.value} value={cat.value}>
                                {locale === 'nl' ? cat.labelNl : cat.labelEn}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={editKnowledgeForm.title}
                            onChange={e => setEditKnowledgeForm({ ...editKnowledgeForm, title: e.target.value })}
                          />
                          <textarea
                            value={editKnowledgeForm.content}
                            onChange={e => setEditKnowledgeForm({ ...editKnowledgeForm, content: e.target.value })}
                            className="w-full px-sm py-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            rows={3}
                          />
                          <div className="flex gap-sm">
                            <Button size="sm" onClick={() => updateKnowledge(knowledge.id)}>{t.save}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingKnowledgeId(null)}>{t.cancel}</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{knowledge.title}</h5>
                            <p className="text-sm text-gray-700 mt-xs">{knowledge.content}</p>
                            <p className="text-xs text-gray-500 mt-sm">
                              Added: {new Date(knowledge.addedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-xs ml-sm">
                            <button
                              onClick={() => {
                                setEditingKnowledgeId(knowledge.id);
                                setEditKnowledgeForm({
                                  category: knowledge.category,
                                  title: knowledge.title,
                                  content: knowledge.content,
                                });
                              }}
                              className="p-xs text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteKnowledge(knowledge.id)}
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
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Learned Patterns Section */}
      <Card padding="lg">
        <div className="mb-base">
          <h3 className="font-semibold text-gray-900">{t.learnedPatterns}</h3>
          <p className="text-xs text-gray-500 mt-xs">{t.patternNote}</p>
        </div>

        {memory?.learnedPatterns.length === 0 ? (
          <p className="text-gray-500 text-sm italic">{t.noPatterns}</p>
        ) : (
          <div className="space-y-sm">
            {memory?.learnedPatterns.map(pattern => (
              <div
                key={pattern.id}
                className="bg-amber-50 rounded-lg p-base border border-amber-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{pattern.pattern}</p>
                    <p className="text-sm text-gray-600 mt-xs">{pattern.evidence}</p>
                    <div className="flex items-center gap-sm mt-sm text-xs text-gray-500">
                      <span className={cn(
                        'px-xs py-0.5 rounded',
                        getConfidenceColor(pattern.confidence)
                      )}>
                        {Math.round(pattern.confidence * 100)}% {t.confidence}
                      </span>
                      <span>{t.projectCount}: {pattern.projectCount}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deletePattern(pattern.id)}
                    className="p-xs text-gray-400 hover:text-red-500 ml-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default DomainMemoryPanel;
