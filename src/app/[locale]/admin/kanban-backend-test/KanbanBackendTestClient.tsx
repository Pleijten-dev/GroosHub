'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';

interface KanbanBackendTestClientProps {
  locale: string;
  userId: number;
  userName: string;
}

interface Project {
  id: string;
  name: string;
}

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export function KanbanBackendTestClient({ locale, userId, userName }: KanbanBackendTestClientProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string>('');
  const [createdGroupId, setCreatedGroupId] = useState<string>('');

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedProjectId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  function addTestResult(result: Omit<TestResult, 'timestamp'>) {
    setTestResults(prev => [{
      ...result,
      timestamp: new Date().toISOString()
    }, ...prev]);
  }

  async function runTest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: any
  ) {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await res.json();

      addTestResult({
        endpoint,
        method,
        status: res.status,
        success: res.ok,
        data,
        error: res.ok ? undefined : data.error || 'Request failed'
      });

      return { ok: res.ok, data };
    } catch (error) {
      addTestResult({
        endpoint,
        method,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { ok: false, data: null };
    } finally {
      setIsLoading(false);
    }
  }

  // Test functions
  async function testGetTasks() {
    await runTest(`/api/projects/${selectedProjectId}/tasks`, 'GET');
  }

  async function testGetTasksWithFilters() {
    await runTest(
      `/api/projects/${selectedProjectId}/tasks?status=todo&sortBy=deadline&sortOrder=asc`,
      'GET'
    );
  }

  async function testCreateTask() {
    const result = await runTest(`/api/projects/${selectedProjectId}/tasks`, 'POST', {
      title: 'Test Task - ' + new Date().toLocaleTimeString(),
      description: 'This is a test task created from the backend test page',
      status: 'todo',
      priority: 'normal',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['test', 'backend-test']
    });

    if (result.ok && result.data?.data?.id) {
      setCreatedTaskId(result.data.data.id);
    }
  }

  async function testGetTaskDetails() {
    if (!createdTaskId) {
      alert('Please create a task first');
      return;
    }
    await runTest(`/api/projects/${selectedProjectId}/tasks/${createdTaskId}`, 'GET');
  }

  async function testUpdateTask() {
    if (!createdTaskId) {
      alert('Please create a task first');
      return;
    }
    await runTest(`/api/projects/${selectedProjectId}/tasks/${createdTaskId}`, 'PATCH', {
      status: 'doing',
      priority: 'high',
      description: 'Updated description at ' + new Date().toLocaleTimeString()
    });
  }

  async function testAssignTask() {
    if (!createdTaskId) {
      alert('Please create a task first');
      return;
    }
    await runTest(`/api/projects/${selectedProjectId}/tasks/${createdTaskId}/assign`, 'POST', {
      user_ids: [userId]
    });
  }

  async function testAddNote() {
    if (!createdTaskId) {
      alert('Please create a task first');
      return;
    }
    await runTest(`/api/projects/${selectedProjectId}/tasks/${createdTaskId}/notes`, 'POST', {
      content: 'This is a test note added at ' + new Date().toLocaleTimeString()
    });
  }

  async function testGetNotes() {
    if (!createdTaskId) {
      alert('Please create a task first');
      return;
    }
    await runTest(`/api/projects/${selectedProjectId}/tasks/${createdTaskId}/notes`, 'GET');
  }

  async function testCreateTaskGroup() {
    const result = await runTest(`/api/projects/${selectedProjectId}/task-groups`, 'POST', {
      name: 'Test Group - ' + new Date().toLocaleTimeString(),
      description: 'Test task group',
      color: '#4CAF50'
    });

    if (result.ok && result.data?.data?.id) {
      setCreatedGroupId(result.data.data.id);
    }
  }

  async function testGetTaskGroups() {
    await runTest(`/api/projects/${selectedProjectId}/task-groups`, 'GET');
  }

  async function testGetTaskStats() {
    await runTest(`/api/projects/${selectedProjectId}/tasks/stats`, 'GET');
  }

  async function testGetUserTasks() {
    await runTest('/api/tasks/user', 'GET');
  }

  async function testGetUserTasksFiltered() {
    await runTest('/api/tasks/user?status=todo&sortBy=deadline&sortOrder=asc', 'GET');
  }

  async function testDeleteTask() {
    if (!createdTaskId) {
      alert('Please create a task first');
      return;
    }
    await runTest(`/api/projects/${selectedProjectId}/tasks/${createdTaskId}`, 'DELETE');
    setCreatedTaskId('');
  }

  async function runAllTests() {
    if (!selectedProjectId) {
      alert('Please select a project first');
      return;
    }

    // Clear previous results
    setTestResults([]);

    // Run tests in sequence
    await testGetTasks();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGetTasksWithFilters();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testCreateTask();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGetTaskDetails();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testUpdateTask();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testAssignTask();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testAddNote();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGetNotes();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testCreateTaskGroup();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGetTaskGroups();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGetTaskStats();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGetUserTasks();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGetUserTasksFiltered();
  }

  function clearResults() {
    setTestResults([]);
    setCreatedTaskId('');
    setCreatedGroupId('');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Kanban Backend API Test Suite
          </h1>
          <p className="text-gray-600">
            Test all task management API endpoints • User: {userName} (ID: {userId})
          </p>
        </div>

        {/* Project Selection */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Project Selection</h2>
          <div className="flex gap-4 items-center">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <Button onClick={fetchProjects} variant="secondary">
              Refresh Projects
            </Button>
          </div>
          {selectedProjectId && (
            <p className="mt-2 text-sm text-gray-600">
              Selected Project ID: <code className="bg-gray-100 px-2 py-1 rounded">{selectedProjectId}</code>
            </p>
          )}
        </Card>

        {/* Test Controls */}
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">API Tests</h2>
            <div className="flex gap-2">
              <Button
                onClick={runAllTests}
                disabled={isLoading || !selectedProjectId}
                variant="primary"
              >
                {isLoading ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              <Button onClick={clearResults} variant="secondary">
                Clear Results
              </Button>
            </div>
          </div>

          {/* Individual Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={testGetTasks} disabled={isLoading || !selectedProjectId} size="sm">
              GET Tasks
            </Button>
            <Button onClick={testGetTasksWithFilters} disabled={isLoading || !selectedProjectId} size="sm">
              GET Tasks (Filtered)
            </Button>
            <Button onClick={testCreateTask} disabled={isLoading || !selectedProjectId} size="sm">
              POST Create Task
            </Button>
            <Button onClick={testGetTaskDetails} disabled={isLoading || !createdTaskId} size="sm">
              GET Task Details
            </Button>
            <Button onClick={testUpdateTask} disabled={isLoading || !createdTaskId} size="sm">
              PATCH Update Task
            </Button>
            <Button onClick={testAssignTask} disabled={isLoading || !createdTaskId} size="sm">
              POST Assign User
            </Button>
            <Button onClick={testAddNote} disabled={isLoading || !createdTaskId} size="sm">
              POST Add Note
            </Button>
            <Button onClick={testGetNotes} disabled={isLoading || !createdTaskId} size="sm">
              GET Task Notes
            </Button>
            <Button onClick={testCreateTaskGroup} disabled={isLoading || !selectedProjectId} size="sm">
              POST Create Group
            </Button>
            <Button onClick={testGetTaskGroups} disabled={isLoading || !selectedProjectId} size="sm">
              GET Task Groups
            </Button>
            <Button onClick={testGetTaskStats} disabled={isLoading || !selectedProjectId} size="sm">
              GET Task Stats
            </Button>
            <Button onClick={testGetUserTasks} disabled={isLoading} size="sm">
              GET User Tasks
            </Button>
            <Button onClick={testGetUserTasksFiltered} disabled={isLoading} size="sm">
              GET User Tasks (Filtered)
            </Button>
            <Button onClick={testDeleteTask} disabled={isLoading || !createdTaskId} size="sm" variant="secondary">
              DELETE Task
            </Button>
          </div>

          {/* Test Context Info */}
          {createdTaskId && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Created Task ID:</strong>{' '}
                <code className="bg-blue-100 px-2 py-1 rounded">{createdTaskId}</code>
              </p>
            </div>
          )}
          {createdGroupId && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900">
                <strong>Created Group ID:</strong>{' '}
                <code className="bg-green-100 px-2 py-1 rounded">{createdGroupId}</code>
              </p>
            </div>
          )}
        </Card>

        {/* Test Results */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">
            Test Results ({testResults.length})
          </h2>

          {testResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No test results yet. Run some tests to see results here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`border-l-4 p-4 rounded-lg ${
                    result.success
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          result.method === 'GET' ? 'bg-blue-200 text-blue-800' :
                          result.method === 'POST' ? 'bg-green-200 text-green-800' :
                          result.method === 'PATCH' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {result.method}
                        </span>
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {result.endpoint}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className={`font-semibold ${
                          result.success ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.status} {result.success ? 'SUCCESS' : 'FAILED'}
                        </span>
                        <span>•</span>
                        <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {result.error && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}

                  {result.data && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        View Response Data
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded overflow-x-auto text-xs">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* API Documentation */}
        <Card className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Available Endpoints</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Project Tasks</h3>
              <ul className="space-y-1 text-gray-600 ml-4">
                <li>• <code>GET /api/projects/[id]/tasks</code> - List all tasks</li>
                <li>• <code>POST /api/projects/[id]/tasks</code> - Create task</li>
                <li>• <code>GET /api/projects/[id]/tasks/[taskId]</code> - Get task details</li>
                <li>• <code>PATCH /api/projects/[id]/tasks/[taskId]</code> - Update task</li>
                <li>• <code>DELETE /api/projects/[id]/tasks/[taskId]</code> - Delete task</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Task Assignments</h3>
              <ul className="space-y-1 text-gray-600 ml-4">
                <li>• <code>POST /api/projects/[id]/tasks/[taskId]/assign</code> - Assign users</li>
                <li>• <code>DELETE /api/projects/[id]/tasks/[taskId]/assign</code> - Unassign user</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Task Notes</h3>
              <ul className="space-y-1 text-gray-600 ml-4">
                <li>• <code>GET /api/projects/[id]/tasks/[taskId]/notes</code> - Get notes</li>
                <li>• <code>POST /api/projects/[id]/tasks/[taskId]/notes</code> - Add note</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Task Groups</h3>
              <ul className="space-y-1 text-gray-600 ml-4">
                <li>• <code>GET /api/projects/[id]/task-groups</code> - List groups</li>
                <li>• <code>POST /api/projects/[id]/task-groups</code> - Create group</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Statistics & User Tasks</h3>
              <ul className="space-y-1 text-gray-600 ml-4">
                <li>• <code>GET /api/projects/[id]/tasks/stats</code> - Task statistics</li>
                <li>• <code>GET /api/tasks/user</code> - All user tasks across projects</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
