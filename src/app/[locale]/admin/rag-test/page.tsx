/**
 * RAG System Test Page
 *
 * Interactive testing interface for the RAG system.
 * Admin-only page for testing and debugging.
 */

'use client';

import { useState, use } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';

interface Project {
  id: string;
  name: string;
}

interface TestFile {
  id: string;
  filename: string;
  mimeType: string;
  embeddingStatus: string;
  chunkCount: number | null;
}

interface RetrievalResult {
  id: string;
  sourceFile: string;
  chunkText: string;
  similarity: number;
  chunkIndex: number;
}

export default function RAGTestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<TestFile[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.7);
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const t = {
    nl: {
      title: 'RAG Systeem Test',
      subtitle: 'Test document upload, verwerking en ophalen',
      selectProject: 'Selecteer Project',
      uploadFile: 'Bestand Uploaden',
      uploadBtn: 'Upload',
      processing: 'Verwerken...',
      testRetrieval: 'Test Ophalen',
      query: 'Vraag',
      queryPlaceholder: 'bijv. "Wat is GroosHub?"',
      topK: 'Top K Resultaten',
      threshold: 'Drempelwaarde Gelijkenis',
      searchBtn: 'Zoeken',
      results: 'Resultaten',
      noResults: 'Geen resultaten gevonden',
      similarity: 'Gelijkenis',
      source: 'Bron',
      chunk: 'Stuk',
      files: 'Bestanden in Project',
      status: 'Status',
      chunks: 'Stukken',
      actions: 'Acties',
      process: 'Verwerken',
      refresh: 'Vernieuwen',
      loadProjects: 'Projecten Laden',
      projectStats: 'Project Statistieken',
      totalChunks: 'Totaal Stukken',
      totalFiles: 'Totaal Bestanden',
      success: 'Succes',
      failed: 'Mislukt'
    },
    en: {
      title: 'RAG System Test',
      subtitle: 'Test document upload, processing, and retrieval',
      selectProject: 'Select Project',
      uploadFile: 'Upload File',
      uploadBtn: 'Upload',
      processing: 'Processing...',
      testRetrieval: 'Test Retrieval',
      query: 'Query',
      queryPlaceholder: 'e.g. "What is GroosHub?"',
      topK: 'Top K Results',
      threshold: 'Similarity Threshold',
      searchBtn: 'Search',
      results: 'Results',
      noResults: 'No results found',
      similarity: 'Similarity',
      source: 'Source',
      chunk: 'Chunk',
      files: 'Files in Project',
      status: 'Status',
      chunks: 'Chunks',
      actions: 'Actions',
      process: 'Process',
      refresh: 'Refresh',
      loadProjects: 'Load Projects',
      projectStats: 'Project Statistics',
      totalChunks: 'Total Chunks',
      totalFiles: 'Total Files',
      success: 'Success',
      failed: 'Failed'
    }
  };

  const text = t[locale as keyof typeof t] || t.en;

  // Load user's projects
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
      setStatus(`Loaded ${data.data?.length || 0} projects`);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load files for selected project
  const loadFiles = async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      const data = await res.json();
      setFiles(data.files || []);
      setStatus(`Loaded ${data.files?.length || 0} files`);
    } catch (err) {
      setError('Failed to load files');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Upload file using presigned URL (bypasses Vercel 4.5MB limit)
  const handleUpload = async () => {
    if (!uploadFile || !selectedProject) {
      setError('Select a project and file first');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('Requesting upload URL...');

    try {
      // Step 1: Request presigned upload URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.name,
          contentType: uploadFile.type,
          projectId: selectedProject
        })
      });

      const presignedData = await presignedRes.json();

      if (!presignedData.success) {
        setError(`Failed to get upload URL: ${presignedData.error}`);
        return;
      }

      const { uploadUrl, fileKey, maxSize } = presignedData;

      // Check file size
      if (uploadFile.size > maxSize) {
        setError(`File too large (${(uploadFile.size / 1024 / 1024).toFixed(2)}MB). Max: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
        return;
      }

      // Step 2: Upload file directly to R2
      setStatus(`Uploading ${(uploadFile.size / 1024 / 1024).toFixed(2)}MB to R2...`);

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': uploadFile.type,
        },
        body: uploadFile
      });

      if (!uploadRes.ok) {
        setError(`Upload to R2 failed: ${uploadRes.status} ${uploadRes.statusText}`);
        return;
      }

      // Step 3: Notify backend that upload is complete
      setStatus('Processing document...');

      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey,
          projectId: selectedProject,
          filename: uploadFile.name
        })
      });

      const completeData = await completeRes.json();

      if (completeData.success) {
        const chunks = completeData.rag?.chunks?.length || 0;
        setStatus(`✅ Uploaded and processed! ${chunks} chunks created.`);
        setUploadFile(null);

        // Refresh files after short delay
        setTimeout(() => loadFiles(selectedProject), 2000);
      } else {
        setError(`Processing failed: ${completeData.error}`);
      }
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Manually trigger processing
  const handleProcess = async (fileId: string) => {
    if (!selectedProject) return;

    setLoading(true);
    setError('');
    setStatus(`Processing file ${fileId}...`);

    try {
      const res = await fetch(`/api/projects/${selectedProject}/files/${fileId}/process`, {
        method: 'POST'
      });

      const data = await res.json();

      if (data.success) {
        setStatus(`✅ Processed! ${data.chunkCount} chunks, ${data.totalTokens} tokens`);
        loadFiles(selectedProject);
      } else {
        setError(`Processing failed: ${data.error}`);
      }
    } catch (err) {
      setError('Processing failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Force reprocess a file (even if completed)
  const handleForceReprocess = async (fileId: string) => {
    if (!selectedProject) return;

    const confirmed = confirm('Force reprocess this file? This will delete existing embeddings and regenerate them.');
    if (!confirmed) return;

    setLoading(true);
    setError('');
    setStatus(`Force reprocessing file ${fileId}...`);

    try {
      const res = await fetch(`/api/projects/${selectedProject}/files/${fileId}/process?force=true`, {
        method: 'POST'
      });

      const data = await res.json();

      if (data.success) {
        setStatus(`✅ Reprocessed! ${data.chunkCount} chunks, ${data.totalTokens} tokens`);
        loadFiles(selectedProject);
      } else {
        setError(`Reprocessing failed: ${data.error}`);
      }
    } catch (err) {
      setError('Reprocessing failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Test retrieval
  const handleSearch = async () => {
    if (!query || !selectedProject) {
      setError('Enter a query and select a project');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('Searching...');
    setResults([]);

    try {
      const res = await fetch(`/api/projects/${selectedProject}/rag/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topK,
          similarityThreshold: threshold,
          useHybridSearch: true
        })
      });

      const data = await res.json();

      if (data.success) {
        setResults(data.chunks || []);
        setStatus(`✅ Found ${data.totalChunks} chunks in ${data.retrievalTimeMs}ms`);
      } else {
        setError(`Search failed: ${data.error}`);
      }
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get project stats
  const handleGetStats = async () => {
    if (!selectedProject) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${selectedProject}/rag/retrieve`);
      const data = await res.json();

      if (data.success) {
        const stats = data.statistics;
        setStatus(
          `📊 Project Stats: ${stats.totalChunks} chunks, ` +
          `${stats.totalTokens} tokens, ${stats.embeddedFiles} files`
        );
      } else {
        setError(`Failed to get stats: ${data.error}`);
      }
    } catch (err) {
      setError('Failed to get stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-base">
      <div className="max-w-7xl mx-auto space-y-lg">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{text.title}</h1>
          <p className="text-lg text-gray-600 mt-sm">{text.subtitle}</p>
        </div>

        {/* Status Bar */}
        {(status || error) && (
          <Card className="p-base">
            {status && <p className="text-sm text-blue-600">ℹ️ {status}</p>}
            {error && <p className="text-sm text-red-600">❌ {error}</p>}
          </Card>
        )}

        {/* Project Selection */}
        <Card className="p-lg">
          <h2 className="text-2xl font-semibold mb-base">{text.selectProject}</h2>

          <div className="flex gap-base items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-sm">
                {text.selectProject}
              </label>
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  loadFiles(e.target.value);
                }}
                className="w-full px-base py-sm border border-gray-300 rounded-base"
                disabled={loading}
              >
                <option value="">-- {text.selectProject} --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <Button onClick={loadProjects} disabled={loading}>
              {text.loadProjects}
            </Button>

            {selectedProject && (
              <Button onClick={handleGetStats} disabled={loading} variant="secondary">
                {text.projectStats}
              </Button>
            )}
          </div>
        </Card>

        {/* File Upload */}
        {selectedProject && (
          <Card className="p-lg">
            <h2 className="text-2xl font-semibold mb-base">{text.uploadFile}</h2>

            <div className="flex gap-base items-end">
              <div className="flex-1">
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.xml"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-base py-sm border border-gray-300 rounded-base"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-sm">
                  Supported: TXT, MD, PDF (50MB), XML (50MB) - Direct R2 upload (bypasses Vercel limits)
                </p>
              </div>

              <Button onClick={handleUpload} disabled={loading || !uploadFile}>
                {loading ? text.processing : text.uploadBtn}
              </Button>
            </div>
          </Card>
        )}

        {/* Files List */}
        {selectedProject && files.length > 0 && (
          <Card className="p-lg">
            <div className="flex justify-between items-center mb-base">
              <h2 className="text-2xl font-semibold">{text.files}</h2>
              <Button onClick={() => loadFiles(selectedProject)} variant="secondary" size="sm">
                {text.refresh}
              </Button>
            </div>

            <div className="space-y-sm">
              {files.map(file => (
                <div key={file.id} className="flex items-center justify-between p-base border border-gray-200 rounded-base bg-white">
                  <div className="flex-1">
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-xs text-gray-500">{file.mimeType}</p>
                  </div>

                  <div className="flex items-center gap-base">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {text.status}:{' '}
                        <span className={
                          file.embeddingStatus === 'completed' ? 'text-green-600' :
                          file.embeddingStatus === 'processing' ? 'text-blue-600' :
                          file.embeddingStatus === 'failed' ? 'text-red-600' :
                          'text-gray-600'
                        }>
                          {file.embeddingStatus}
                        </span>
                      </p>
                      {file.chunkCount && (
                        <p className="text-xs text-gray-500">
                          {file.chunkCount} {text.chunks}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-sm">
                      {file.embeddingStatus !== 'completed' && file.embeddingStatus !== 'processing' && (
                        <Button
                          onClick={() => handleProcess(file.id)}
                          disabled={loading}
                          size="sm"
                        >
                          {text.process}
                        </Button>
                      )}
                      {file.embeddingStatus === 'completed' && (
                        <Button
                          onClick={() => handleForceReprocess(file.id)}
                          disabled={loading}
                          size="sm"
                          variant="secondary"
                        >
                          Force Reprocess
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Retrieval Test */}
        {selectedProject && (
          <Card className="p-lg">
            <h2 className="text-2xl font-semibold mb-base">{text.testRetrieval}</h2>

            <div className="space-y-base">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-sm">
                  {text.query}
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={text.queryPlaceholder}
                  className="w-full px-base py-sm border border-gray-300 rounded-base"
                  disabled={loading}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="grid grid-cols-2 gap-base">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-sm">
                    {text.topK}
                  </label>
                  <input
                    type="number"
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value))}
                    min="1"
                    max="20"
                    className="w-full px-base py-sm border border-gray-300 rounded-base"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-sm">
                    {text.threshold} (0-1)
                  </label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full px-base py-sm border border-gray-300 rounded-base"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button onClick={handleSearch} disabled={loading || !query} className="w-full">
                {loading ? text.processing : text.searchBtn}
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card className="p-lg">
            <h2 className="text-2xl font-semibold mb-base">
              {text.results} ({results.length})
            </h2>

            <div className="space-y-base">
              {results.map((result, i) => (
                <div key={result.id} className="p-base border border-gray-200 rounded-base bg-white">
                  <div className="flex justify-between items-start mb-sm">
                    <div>
                      <p className="font-medium">#{i + 1} - {result.sourceFile}</p>
                      <p className="text-xs text-gray-500">
                        {text.chunk} {result.chunkIndex}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {text.similarity}: {(result.similarity * 100).toFixed(1)}%
                      </p>
                      <p className={`text-xs ${
                        result.similarity >= 0.8 ? 'text-green-600' :
                        result.similarity >= 0.6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {result.similarity >= 0.8 ? 'Excellent' :
                         result.similarity >= 0.6 ? 'Good' :
                         'Weak'}
                      </p>
                    </div>
                  </div>

                  <div className="p-sm bg-gray-50 rounded border border-gray-200 text-sm font-mono whitespace-pre-wrap">
                    {result.chunkText}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {results.length === 0 && query && !loading && (
          <Card className="p-lg text-center text-gray-500">
            {text.noResults}
          </Card>
        )}
      </div>
    </div>
  );
}
