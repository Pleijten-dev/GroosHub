'use client';

import { useState } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: unknown;
  duration?: number;
}

interface TestSection {
  title: string;
  tests: TestResult[];
}

export default function DatabaseTestPage() {
  const [sections, setSections] = useState<TestSection[]>([
    { title: '1. Organizations', tests: [] },
    { title: '2. Users', tests: [] },
    { title: '3. Projects', tests: [] },
    { title: '4. Project Members', tests: [] },
    { title: '5. Chats', tests: [] },
    { title: '6. Chat Messages', tests: [] },
    { title: '7. Location Snapshots', tests: [] },
    { title: '8. LCA Snapshots', tests: [] },
    { title: '9. File Uploads', tests: [] },
    { title: '10. Location Page Integration', tests: [] },
    { title: '11. LCA Page Integration', tests: [] },
    { title: '12. AI Assistant Integration', tests: [] },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const updateTest = (sectionIndex: number, testName: string, update: Partial<TestResult>) => {
    setSections(prev => {
      const newSections = [...prev];
      const section = newSections[sectionIndex];
      const testIndex = section.tests.findIndex(t => t.name === testName);

      if (testIndex >= 0) {
        section.tests[testIndex] = { ...section.tests[testIndex], ...update };
      } else {
        section.tests.push({
          name: testName,
          status: 'pending',
          ...update
        });
      }

      return newSections;
    });
  };

  const runTest = async (
    sectionIndex: number,
    testName: string,
    testFn: () => Promise<unknown>
  ) => {
    const startTime = Date.now();
    updateTest(sectionIndex, testName, { status: 'running' });

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      updateTest(sectionIndex, testName, {
        status: 'success',
        data: result,
        duration,
        message: `✓ Completed in ${duration}ms`
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateTest(sectionIndex, testName, {
        status: 'error',
        message: errorMessage,
        duration
      });
    }
  };

  // Test Organizations
  const testOrganizations = async () => {
    await runTest(0, 'GET /api/admin/organizations', async () => {
      const res = await fetch('/api/admin/organizations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(0, 'GET GROOSMAN organization', async () => {
      const res = await fetch('/api/admin/organizations?slug=groosman');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test Users
  const testUsers = async () => {
    await runTest(1, 'GET /api/admin/users', async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(1, 'GET current user stats', async () => {
      const res = await fetch('/api/admin/users?stats=true');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test Projects
  const testProjects = async () => {
    await runTest(2, 'GET /api/projects', async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(2, 'CREATE test project', async () => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test Project ${Date.now()}`,
          description: 'Database test project',
          project_number: `TEST-${Date.now()}`
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(2, 'GET project statistics', async () => {
      const projectsRes = await fetch('/api/projects');
      if (!projectsRes.ok) throw new Error(`HTTP ${projectsRes.status}`);
      const projectsData = await projectsRes.json();
      const projects = projectsData.data || projectsData.projects || [];

      if (projects.length === 0) {
        return { message: 'No projects to test' };
      }

      const projectId = projects[0].id;
      const res = await fetch(`/api/projects/${projectId}/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test Project Members
  const testProjectMembers = async () => {
    const projectsRes = await fetch('/api/projects');
    if (!projectsRes.ok) throw new Error('Cannot fetch projects');
    const projectsData = await projectsRes.json();
    const projects = projectsData.data || projectsData.projects || [];

    if (projects.length === 0) {
      updateTest(3, 'Project Members', {
        status: 'error',
        message: 'No projects available to test members'
      });
      return;
    }

    const projectId = projects[0].id;

    await runTest(3, 'GET project members', async () => {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test Chats
  const testChats = async () => {
    await runTest(4, 'GET /api/chat/conversations', async () => {
      const res = await fetch('/api/chat/conversations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(4, 'CREATE test chat', async () => {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Test Chat ${Date.now()}`,
          model_id: 'claude-sonnet-4.5'
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test Chat Messages
  const testChatMessages = async () => {
    const chatsRes = await fetch('/api/chat/conversations');
    if (!chatsRes.ok) throw new Error('Cannot fetch chats');
    const chatsData = await chatsRes.json();
    const conversations = chatsData.data || chatsData.conversations || [];

    if (conversations.length === 0) {
      updateTest(5, 'Chat Messages', {
        status: 'error',
        message: 'No chats available to test messages'
      });
      return;
    }

    const chatId = conversations[0].id;

    await runTest(5, 'GET chat messages', async () => {
      const res = await fetch(`/api/chat/${chatId}/messages`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test Location Snapshots
  const testLocationSnapshots = async () => {
    const projectsRes = await fetch('/api/projects');
    if (!projectsRes.ok) throw new Error('Cannot fetch projects');
    const projectsData = await projectsRes.json();
    const projects = projectsData.data || projectsData.projects || [];

    if (projects.length === 0) {
      updateTest(6, 'Location Snapshots', {
        status: 'error',
        message: 'No projects available to test location snapshots'
      });
      return;
    }

    const projectId = projects[0].id;

    await runTest(6, 'GET location snapshots', async () => {
      const res = await fetch(`/api/projects/${projectId}/locations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(6, 'CREATE location snapshot', async () => {
      const res = await fetch(`/api/projects/${projectId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'Test Address, Amsterdam',
          latitude: 52.3676,
          longitude: 4.9041,
          demographics_data: { test: true },
          health_data: { test: true },
          safety_data: { test: true }
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test LCA Snapshots
  const testLCASnapshots = async () => {
    const projectsRes = await fetch('/api/projects');
    if (!projectsRes.ok) throw new Error('Cannot fetch projects');
    const projectsData = await projectsRes.json();
    const projects = projectsData.data || projectsData.projects || [];

    if (projects.length === 0) {
      updateTest(7, 'LCA Snapshots', {
        status: 'error',
        message: 'No projects available to test LCA snapshots'
      });
      return;
    }

    const projectId = projects[0].id;

    await runTest(7, 'GET LCA snapshots', async () => {
      const res = await fetch(`/api/projects/${projectId}/lca`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(7, 'CREATE LCA snapshot', async () => {
      const res = await fetch(`/api/projects/${projectId}/lca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: `Test LCA ${Date.now()}`,
          project_description: 'Test LCA project',
          functional_unit: '100 m² GFA over 75 years',
          processes: [],
          results: { test: true }
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test File Uploads
  const testFileUploads = async () => {
    const projectsRes = await fetch('/api/projects');
    if (!projectsRes.ok) throw new Error('Cannot fetch projects');
    const projectsData = await projectsRes.json();
    const projects = projectsData.data || projectsData.projects || [];

    if (projects.length === 0) {
      updateTest(8, 'File Uploads', {
        status: 'error',
        message: 'No projects available to test file uploads'
      });
      return;
    }

    const projectId = projects[0].id;

    await runTest(8, 'GET project files', async () => {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test Location Page Integration
  const testLocationPageIntegration = async () => {
    await runTest(9, 'GET geocode address (Amsterdam)', async () => {
      const res = await fetch('/api/location/geocode?address=Dam 1, Amsterdam');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.latitude || !data.longitude) {
        throw new Error('Missing coordinates in response');
      }
      return data;
    });

    await runTest(9, 'GET demographics data', async () => {
      const res = await fetch('/api/location/demographics?lat=52.3676&lng=4.9041');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(9, 'GET health data', async () => {
      const res = await fetch('/api/location/health?lat=52.3676&lng=4.9041');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(9, 'GET safety data', async () => {
      const res = await fetch('/api/location/safety?lat=52.3676&lng=4.9041');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(9, 'GET livability data', async () => {
      const res = await fetch('/api/location/livability?lat=52.3676&lng=4.9041');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(9, 'GET amenities (Google Places)', async () => {
      const res = await fetch('/api/location/amenities?lat=52.3676&lng=4.9041&category=restaurant');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(9, 'Save location', async () => {
      const res = await fetch('/api/location/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'Test Location Integration',
          coordinates: { lat: 52.3676, lng: 4.9041 },
          location_data: { test: true }
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(9, 'GET saved locations', async () => {
      const res = await fetch('/api/location/saved');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test LCA Page Integration
  const testLCAPageIntegration = async () => {
    await runTest(10, 'GET LCA materials database', async () => {
      const res = await fetch('/api/lca/materials?search=concrete');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.materials || !Array.isArray(data.materials)) {
        throw new Error('Invalid materials response format');
      }
      return data;
    });

    await runTest(10, 'POST calculate LCA impacts', async () => {
      const res = await fetch('/api/lca/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: 'Test LCA Integration',
          materials: [
            { name: 'Concrete', amount: 100, unit: 'm3' }
          ]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });

    await runTest(10, 'GET LCA projects', async () => {
      const res = await fetch('/api/lca/projects');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  // Test AI Assistant Integration
  const testAIAssistantIntegration = async () => {
    await runTest(11, 'GET AI models list', async () => {
      const res = await fetch('/api/chat/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid models response format');
      }
      return data;
    });

    let testConversationId: string | null = null;

    await runTest(11, 'POST create AI conversation', async () => {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test AI Integration',
          model_id: 'claude-sonnet-4.5'
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      testConversationId = data.conversation?.id || data.id;
      return data;
    });

    await runTest(11, 'GET conversation history', async () => {
      const res = await fetch('/api/chat/conversations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const conversations = data.data || data.conversations || [];
      if (conversations.length === 0) {
        throw new Error('No conversations found');
      }
      return data;
    });

    if (testConversationId) {
      await runTest(11, 'GET conversation messages', async () => {
        const res = await fetch(`/api/chat/${testConversationId}/messages`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      });
    }

    await runTest(11, 'GET chat memory/context', async () => {
      const res = await fetch('/api/memory');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);

    try {
      await testOrganizations();
      await testUsers();
      await testProjects();
      await testProjectMembers();
      await testChats();
      await testChatMessages();
      await testLocationSnapshots();
      await testLCASnapshots();
      await testFileUploads();
      await testLocationPageIntegration();
      await testLCAPageIntegration();
      await testAIAssistantIntegration();
    } catch (error) {
      console.error('Test suite error:', error);
    }

    setIsRunning(false);
  };

  const clearResults = () => {
    setSections(prev => prev.map(section => ({ ...section, tests: [] })));
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return '⏳';
      case 'success': return '✓';
      case 'error': return '✗';
      default: return '○';
    }
  };

  const getSectionStats = (section: TestSection) => {
    const total = section.tests.length;
    const success = section.tests.filter(t => t.status === 'success').length;
    const error = section.tests.filter(t => t.status === 'error').length;
    const running = section.tests.filter(t => t.status === 'running').length;

    return { total, success, error, running };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-base">
      <div className="max-w-7xl mx-auto">
        <div className="mb-lg">
          <h1 className="text-4xl font-bold text-gray-900 mb-sm">
            Database API Test Suite
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive testing for all database operations
          </p>
        </div>

        {/* Control Panel */}
        <Card className="mb-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-xs">Test Controls</h2>
              <p className="text-sm text-gray-600">
                Run all tests or individual sections
              </p>
            </div>
            <div className="flex gap-sm">
              <Button
                onClick={clearResults}
                variant="secondary"
                disabled={isRunning}
              >
                Clear Results
              </Button>
              <Button
                onClick={runAllTests}
                disabled={isRunning}
              >
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Test Sections */}
        <div className="space-y-base">
          {sections.map((section, sectionIndex) => {
            const stats = getSectionStats(section);
            const isExpanded = expandedSections.has(sectionIndex);

            return (
              <Card key={sectionIndex}>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection(sectionIndex)}
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    {stats.total > 0 && (
                      <div className="flex gap-md mt-xs text-sm">
                        <span className="text-gray-600">
                          Total: {stats.total}
                        </span>
                        {stats.success > 0 && (
                          <span className="text-green-600">
                            ✓ {stats.success}
                          </span>
                        )}
                        {stats.error > 0 && (
                          <span className="text-red-600">
                            ✗ {stats.error}
                          </span>
                        )}
                        {stats.running > 0 && (
                          <span className="text-blue-600">
                            ⏳ {stats.running}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-md">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        const testFunctions = [
                          testOrganizations,
                          testUsers,
                          testProjects,
                          testProjectMembers,
                          testChats,
                          testChatMessages,
                          testLocationSnapshots,
                          testLCASnapshots,
                          testFileUploads,
                          testLocationPageIntegration,
                          testLCAPageIntegration,
                          testAIAssistantIntegration
                        ];
                        testFunctions[sectionIndex]();
                      }}
                      size="sm"
                      disabled={isRunning}
                    >
                      Run Section
                    </Button>
                    <span className="text-2xl">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {isExpanded && section.tests.length > 0 && (
                  <div className="mt-base pt-base border-t border-gray-200">
                    <div className="space-y-sm">
                      {section.tests.map((test, testIndex) => (
                        <div
                          key={testIndex}
                          className="p-sm bg-gray-50 rounded-md"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-sm">
                                <span className={`text-lg ${getStatusColor(test.status)}`}>
                                  {getStatusIcon(test.status)}
                                </span>
                                <span className="font-medium text-gray-900">
                                  {test.name}
                                </span>
                              </div>
                              {test.message && (
                                <p className={`mt-xs text-sm ${getStatusColor(test.status)}`}>
                                  {test.message}
                                </p>
                              )}
                              {test.data !== undefined && (
                                <details className="mt-sm">
                                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                                    View response data
                                  </summary>
                                  <pre className="mt-xs p-sm bg-white rounded text-xs overflow-auto max-h-64">
                                    {JSON.stringify(test.data, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                            {test.duration && (
                              <span className="text-xs text-gray-500">
                                {test.duration}ms
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
