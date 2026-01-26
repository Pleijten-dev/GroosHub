/**
 * AI Tools Test Page
 *
 * Admin page for testing AI tool prompts without making LLM API calls.
 * - Select a project and snapshot
 * - View all available AI tools
 * - See the complete prompt + context data for each tool
 */

'use client';

import { useState, useEffect, use } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';
import {
  AI_TOOLS,
  TOOL_TABS,
  buildToolPayload,
  getToolsByTab,
  hasRequiredData,
  type AITool,
  type AIToolTab,
  type AIToolPayload,
} from '@/features/ai-assistant/utils/aiToolsPayloadBuilder';
import type { CompactLocationExport } from '@/features/location/utils/jsonExportCompact';

interface Project {
  id: string;
  name: string;
}

interface LocationSnapshot {
  id: string;
  address: string;
  municipality_code: string;
  created_at: string;
  is_active: boolean;
  overall_score: number | null;
  demographics_data: unknown;
  health_data: unknown;
  safety_data: unknown;
  livability_data: unknown;
  amenities_data: unknown;
  housing_data: unknown;
  wms_grading_data: unknown;
}

export default function AIToolsTestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [snapshots, setSnapshots] = useState<LocationSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>('');
  const [snapshotData, setSnapshotData] = useState<CompactLocationExport | null>(null);
  const [selectedTab, setSelectedTab] = useState<AIToolTab>('doelgroepen');
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [toolPayload, setToolPayload] = useState<AIToolPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const isNl = locale === 'nl';

  const text = {
    title: isNl ? 'AI Tools Test' : 'AI Tools Test',
    subtitle: isNl
      ? 'Test AI tool prompts zonder API calls'
      : 'Test AI tool prompts without API calls',
    selectProject: isNl ? 'Selecteer Project' : 'Select Project',
    selectSnapshot: isNl ? 'Selecteer Locatie Snapshot' : 'Select Location Snapshot',
    loadProjects: isNl ? 'Projecten Laden' : 'Load Projects',
    noProjects: isNl ? 'Geen projecten gevonden' : 'No projects found',
    noSnapshots: isNl ? 'Geen snapshots gevonden' : 'No snapshots found',
    tools: isNl ? 'Beschikbare Tools' : 'Available Tools',
    prompt: isNl ? 'Volledige Prompt' : 'Full Prompt',
    systemPrompt: isNl ? 'Systeem Prompt' : 'System Prompt',
    userPrompt: isNl ? 'Gebruiker Prompt' : 'User Prompt',
    contextData: isNl ? 'Context Data' : 'Context Data',
    missingData: isNl ? 'Ontbrekende data' : 'Missing data',
    disabled: isNl ? 'Uitgeschakeld' : 'Disabled',
    agentic: isNl ? 'Interactief' : 'Interactive',
    primary: isNl ? 'Primair' : 'Primary',
    copyPrompt: isNl ? 'Kopieer Prompt' : 'Copy Prompt',
    copied: isNl ? 'Gekopieerd!' : 'Copied!',
    selectTool: isNl ? 'Selecteer een tool om de prompt te bekijken' : 'Select a tool to view its prompt',
    loading: isNl ? 'Laden...' : 'Loading...',
    snapshotInfo: isNl ? 'Snapshot Informatie' : 'Snapshot Information',
    address: isNl ? 'Adres' : 'Address',
    score: isNl ? 'Score' : 'Score',
    created: isNl ? 'Aangemaakt' : 'Created',
    dataAvailable: isNl ? 'Beschikbare Data' : 'Available Data',
  };

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load snapshots when project changes
  useEffect(() => {
    if (selectedProject) {
      loadSnapshots(selectedProject);
    } else {
      setSnapshots([]);
      setSelectedSnapshot('');
      setSnapshotData(null);
    }
  }, [selectedProject]);

  // Load snapshot data when snapshot changes
  useEffect(() => {
    if (selectedSnapshot) {
      loadSnapshotData(selectedSnapshot);
    } else {
      setSnapshotData(null);
    }
  }, [selectedSnapshot]);

  // Build payload when tool or data changes
  useEffect(() => {
    if (selectedTool && snapshotData) {
      const payload = buildToolPayload(selectedTool, snapshotData, locale as 'nl' | 'en');
      setToolPayload(payload);
    } else if (selectedTool) {
      const payload = buildToolPayload(selectedTool, null, locale as 'nl' | 'en');
      setToolPayload(payload);
    } else {
      setToolPayload(null);
    }
  }, [selectedTool, snapshotData, locale]);

  // Select first tool when tab changes
  useEffect(() => {
    const tabTools = getToolsByTab(selectedTab);
    if (tabTools.length > 0) {
      setSelectedTool(tabTools[0]);
    }
  }, [selectedTab]);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load projects');
        setProjects([]);
        return;
      }

      setProjects(data.data || []);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async (projectId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/location/snapshots?project_id=${projectId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load snapshots');
        setSnapshots([]);
        return;
      }

      setSnapshots(data.data || []);

      // Auto-select first snapshot or active one
      const active = data.data?.find((s: LocationSnapshot) => s.is_active);
      if (active) {
        setSelectedSnapshot(active.id);
      } else if (data.data?.length > 0) {
        setSelectedSnapshot(data.data[0].id);
      }
    } catch (err) {
      setError('Failed to load snapshots');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshotData = async (snapshotId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/location/snapshots/${snapshotId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load snapshot data');
        setSnapshotData(null);
        return;
      }

      // Transform snapshot data to CompactLocationExport format
      const snapshot = data.data;
      const compactData = transformSnapshotToCompact(snapshot);
      setSnapshotData(compactData);
    } catch (err) {
      setError('Failed to load snapshot data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Transform raw snapshot data to CompactLocationExport format
   */
  const transformSnapshotToCompact = (snapshot: LocationSnapshot): CompactLocationExport => {
    // Parse stored JSON data
    const demographics = snapshot.demographics_data as CompactLocationExport['demographics'] | null;
    const health = snapshot.health_data as CompactLocationExport['health'] | null;
    const safety = snapshot.safety_data as CompactLocationExport['safety'] | null;
    const livability = snapshot.livability_data as CompactLocationExport['livability'] | null;
    const amenities = snapshot.amenities_data as CompactLocationExport['amenities'] | null;
    const housingMarket = snapshot.housing_data as CompactLocationExport['housingMarket'] | null;
    const wmsLayers = snapshot.wms_grading_data as CompactLocationExport['wmsLayers'] | null;

    // Build compact export
    return {
      metadata: {
        location: snapshot.address,
        municipality: snapshot.municipality_code || 'Unknown',
        exportDate: new Date(snapshot.created_at).toISOString().split('T')[0],
      },
      allPersonas: [], // Will be loaded from JSON file
      demographics: demographics || {
        description: 'No demographics data available',
        age: [],
        status: [],
        immigration: [],
        familySize: { description: '', neighborhood: '-', municipality: '-' },
        familyType: [],
        income: { description: '', neighborhood: '-', municipality: '-' },
      },
      health: health || {
        description: 'No health data available',
        experiencedHealth: { description: '', neighborhood: '-', municipality: '-' },
        sports: { description: '', neighborhood: '-', municipality: '-' },
        weight: [],
        smoker: { description: '', neighborhood: '-', municipality: '-' },
        alcohol: [],
        limitedHealth: { description: '', neighborhood: '-', municipality: '-' },
        loneliness: [],
        emotionalSupport: { description: '', neighborhood: '-', municipality: '-' },
        psychologicalHealth: [],
      },
      safety: safety || {
        description: 'No safety data available',
        totalCrimes: { description: '', neighborhood: '-', municipality: '-' },
        burglary: { description: '', neighborhood: '-', municipality: '-' },
        pickpocketing: { description: '', neighborhood: '-', municipality: '-' },
        accidents: { description: '', neighborhood: '-', municipality: '-' },
        feelsUnsafe: { description: '', neighborhood: '-', municipality: '-' },
        streetLighting: { description: '', neighborhood: '-', municipality: '-' },
      },
      livability: livability || {
        description: 'No livability data available',
        maintenance: [],
        streetLighting: { description: '', neighborhood: '-', municipality: '-' },
        youthFacilities: [],
        contact: [],
        volunteers: { description: '', neighborhood: '-', municipality: '-' },
        socialCohesion: { description: '', neighborhood: '-', municipality: '-' },
        livabilityScore: { description: '', neighborhood: '-', municipality: '-' },
      },
      amenities: amenities || {
        description: 'No amenities data available',
        items: [],
      },
      housingMarket: housingMarket || undefined,
      wmsLayers: wmsLayers || undefined,
      targetGroups: {
        description: 'No target groups data available',
        rankedPersonas: [],
        recommendedScenarios: [],
      },
    };
  };

  const handleCopyPrompt = () => {
    if (toolPayload) {
      navigator.clipboard.writeText(toolPayload.fullPrompt);
      // Could add a toast notification here
    }
  };

  const getDataAvailability = () => {
    if (!snapshotData) return [];

    const checks = [
      { key: 'demographics', label: 'Demographics', has: !!snapshotData.demographics?.age?.length },
      { key: 'health', label: 'Health', has: !!snapshotData.health?.weight?.length },
      { key: 'safety', label: 'Safety', has: snapshotData.safety?.totalCrimes?.neighborhood !== '-' },
      { key: 'livability', label: 'Livability', has: !!snapshotData.livability?.maintenance?.length },
      { key: 'amenities', label: 'Amenities', has: !!snapshotData.amenities?.items?.length },
      { key: 'housingMarket', label: 'Housing', has: !!snapshotData.housingMarket },
      { key: 'wmsLayers', label: 'WMS Layers', has: !!snapshotData.wmsLayers?.layers?.length },
      { key: 'targetGroups', label: 'Target Groups', has: !!snapshotData.targetGroups?.rankedPersonas?.length },
      { key: 'pve', label: 'PVE', has: !!snapshotData.pve },
    ];

    return checks;
  };

  const tabTools = getToolsByTab(selectedTab);

  return (
    <div className="min-h-screen bg-gray-50 p-base">
      <div className="max-w-7xl mx-auto space-y-lg">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{text.title}</h1>
          <p className="text-lg text-gray-600 mt-sm">{text.subtitle}</p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="p-base bg-red-50 border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        {/* Project & Snapshot Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-base">
          {/* Project Selection */}
          <Card className="p-lg">
            <h2 className="text-xl font-semibold mb-base">{text.selectProject}</h2>
            <div className="flex gap-sm">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="flex-1 px-base py-sm border border-gray-300 rounded-base"
                disabled={loading}
              >
                <option value="">-- {text.selectProject} --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button onClick={loadProjects} disabled={loading} variant="secondary" size="sm">
                {loading ? text.loading : text.loadProjects}
              </Button>
            </div>
            {projects.length === 0 && !loading && (
              <p className="text-sm text-gray-500 mt-sm">{text.noProjects}</p>
            )}
          </Card>

          {/* Snapshot Selection */}
          <Card className="p-lg">
            <h2 className="text-xl font-semibold mb-base">{text.selectSnapshot}</h2>
            <select
              value={selectedSnapshot}
              onChange={(e) => setSelectedSnapshot(e.target.value)}
              className="w-full px-base py-sm border border-gray-300 rounded-base"
              disabled={loading || !selectedProject}
            >
              <option value="">-- {text.selectSnapshot} --</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.address} {s.is_active ? '(Active)' : ''} - {new Date(s.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            {snapshots.length === 0 && selectedProject && !loading && (
              <p className="text-sm text-gray-500 mt-sm">{text.noSnapshots}</p>
            )}
          </Card>
        </div>

        {/* Snapshot Info */}
        {snapshotData && (
          <Card className="p-lg">
            <h2 className="text-xl font-semibold mb-base">{text.snapshotInfo}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-base">
              <div>
                <p className="text-sm text-gray-500">{text.address}</p>
                <p className="font-medium">{snapshotData.metadata.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{text.created}</p>
                <p className="font-medium">{snapshotData.metadata.exportDate}</p>
              </div>
            </div>

            {/* Data Availability */}
            <div className="mt-base">
              <p className="text-sm text-gray-500 mb-sm">{text.dataAvailable}</p>
              <div className="flex flex-wrap gap-sm">
                {getDataAvailability().map((check) => (
                  <span
                    key={check.key}
                    className={`px-sm py-xs rounded text-xs font-medium ${
                      check.has
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {check.has ? '✓' : '✗'} {check.label}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Tools Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* Tab Navigation */}
          <Card className="p-lg lg:col-span-1">
            <h2 className="text-xl font-semibold mb-base">{text.tools}</h2>

            {/* Tab Pills */}
            <div className="flex flex-wrap gap-xs mb-base">
              {TOOL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`px-sm py-xs rounded text-xs font-medium transition-colors ${
                    selectedTab === tab.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isNl ? tab.labelNl : tab.label}
                </button>
              ))}
            </div>

            {/* Tool List */}
            <div className="space-y-sm">
              {tabTools.map((tool) => {
                const dataCheck = snapshotData
                  ? hasRequiredData(tool, snapshotData)
                  : { hasAll: false, missing: tool.requiresData as string[] };

                return (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool)}
                    disabled={tool.isDisabled}
                    className={`w-full text-left p-sm rounded border transition-colors ${
                      selectedTool?.id === tool.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${tool.isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {isNl ? tool.labelNl : tool.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-xs">
                          {isNl ? tool.descriptionNl : tool.description}
                        </p>
                      </div>
                      <div className="flex flex-col gap-xs items-end">
                        {tool.isPrimary && (
                          <span className="px-xs py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                            {text.primary}
                          </span>
                        )}
                        {tool.isAgentic && (
                          <span className="px-xs py-0.5 rounded bg-purple-100 text-purple-700 text-xs">
                            {text.agentic}
                          </span>
                        )}
                        {tool.isDisabled && (
                          <span className="px-xs py-0.5 rounded bg-gray-100 text-gray-500 text-xs">
                            {text.disabled}
                          </span>
                        )}
                        {!dataCheck.hasAll && !tool.isDisabled && (
                          <span
                            className="px-xs py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs"
                            title={`Missing: ${dataCheck.missing.join(', ')}`}
                          >
                            {dataCheck.missing.length} {text.missingData}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tool Count */}
            <p className="text-xs text-gray-500 mt-base">
              {AI_TOOLS.length} {isNl ? 'tools totaal' : 'tools total'} ({AI_TOOLS.filter(t => !t.isDisabled).length} {isNl ? 'beschikbaar' : 'available'})
            </p>
          </Card>

          {/* Prompt Display */}
          <Card className="p-lg lg:col-span-2">
            {toolPayload ? (
              <div className="space-y-base">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {isNl ? toolPayload.tool.labelNl : toolPayload.tool.label}
                    </h2>
                    <p className="text-sm text-gray-500 mt-xs">
                      {isNl ? toolPayload.tool.descriptionNl : toolPayload.tool.description}
                    </p>
                  </div>
                  <Button onClick={handleCopyPrompt} variant="secondary" size="sm">
                    {text.copyPrompt}
                  </Button>
                </div>

                {/* System Prompt */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-sm">{text.systemPrompt}</h3>
                  <pre className="p-sm bg-gray-50 rounded border border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {toolPayload.systemPrompt}
                  </pre>
                </div>

                {/* User Prompt */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-sm">{text.userPrompt}</h3>
                  <pre className="p-sm bg-blue-50 rounded border border-blue-200 text-xs font-mono whitespace-pre-wrap">
                    {toolPayload.userPrompt}
                  </pre>
                </div>

                {/* Context Data */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-sm">
                    {text.contextData}
                    <span className="text-xs text-gray-500 ml-sm">
                      ({Object.keys(toolPayload.contextData).length} {isNl ? 'velden' : 'fields'})
                    </span>
                  </h3>
                  <pre className="p-sm bg-gray-50 rounded border border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {JSON.stringify(toolPayload.contextData, null, 2)}
                  </pre>
                </div>

                {/* Required Data */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-sm">
                    {isNl ? 'Vereiste Data' : 'Required Data'}
                  </h3>
                  <div className="flex flex-wrap gap-xs">
                    {toolPayload.tool.requiresData.map((key) => {
                      const hasData = snapshotData
                        ? snapshotData[key] !== undefined && snapshotData[key] !== null
                        : false;

                      return (
                        <span
                          key={key}
                          className={`px-sm py-xs rounded text-xs font-medium ${
                            hasData
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {hasData ? '✓' : '✗'} {key}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                {text.selectTool}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
