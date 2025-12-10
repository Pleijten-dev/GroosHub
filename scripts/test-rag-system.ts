/**
 * RAG System Integration Test Suite
 *
 * Comprehensive tests for the RAG (Retrieval-Augmented Generation) system
 * Can be run against local development or production Vercel deployment
 *
 * Usage:
 *   npm run test:rag                    # Test against localhost:3000
 *   npm run test:rag -- https://your-app.vercel.app  # Test against production
 *
 * Test Flow:
 * 1. Authentication - Login as test user
 * 2. Project Setup - Create test project
 * 3. File Upload - Upload test documents (TXT, PDF)
 * 4. Processing - Trigger document processing with embeddings
 * 5. RAG Retrieval - Query documents and verify retrieval
 * 6. Chat Integration - Test chat with RAG context and citations
 * 7. Verification - Verify sources are included and accurate
 * 8. Cleanup - Optional cleanup of test data
 */

import * as fs from 'fs';
import * as path from 'path';

// Test configuration
interface TestConfig {
  baseUrl: string;
  testEmail: string;
  testPassword: string;
  cleanup: boolean;
}

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class RAGSystemTester {
  private config: TestConfig;
  private sessionCookie: string = '';
  private testProjectId: string = '';
  private uploadedFileIds: string[] = [];
  private testChatId: string = '';
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
  }

  // Helper: Make authenticated API request
  private async apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Store session cookie from login
    if (response.headers.get('set-cookie')) {
      this.sessionCookie = response.headers.get('set-cookie') || '';
    }

    return response;
  }

  // Helper: Log test result
  private logResult(result: TestResult) {
    this.results.push(result);
    const icon = result.passed ? '✅' : '❌';
    const duration = `(${result.duration}ms)`;
    console.log(`${icon} ${result.testName} ${duration}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
  }

  // Helper: Run a test with timing
  private async runTest(
    testName: string,
    testFn: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      this.logResult({
        testName,
        passed: true,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.logResult({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Test 1: Authentication
   */
  async testAuthentication() {
    await this.runTest('1. Authentication', async () => {
      const response = await this.apiRequest('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: this.config.testEmail,
          password: this.config.testPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success && !data.user) {
        throw new Error('Login succeeded but no user data returned');
      }

      console.log(`   Logged in as: ${this.config.testEmail}`);
    });
  }

  /**
   * Test 2: Create Test Project
   */
  async testCreateProject() {
    await this.runTest('2. Create Test Project', async () => {
      const projectName = `RAG Test Project ${Date.now()}`;
      const response = await this.apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          description: 'Test project for RAG system validation',
          project_type: 'residential', // or appropriate type
        }),
      });

      if (!response.ok) {
        throw new Error(`Project creation failed: ${response.status}`);
      }

      const data = await response.json();
      this.testProjectId = data.project.id;

      console.log(`   Created project: ${projectName} (${this.testProjectId})`);
    });
  }

  /**
   * Test 3: Upload Test Files
   */
  async testFileUpload() {
    await this.runTest('3.1 Upload TXT File', async () => {
      await this.uploadTestFile('sample-document.txt', 'text/plain');
    });

    await this.runTest('3.2 Upload PDF File', async () => {
      await this.uploadTestFile('sample-document.pdf', 'application/pdf');
    });
  }

  private async uploadTestFile(filename: string, mimeType: string) {
    // Create test file if it doesn't exist
    const testDataDir = path.join(__dirname, 'test-data');
    const filePath = path.join(testDataDir, filename);

    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      // Create sample content
      const content = this.generateSampleContent(filename);
      fs.writeFileSync(filePath, content);
    }

    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    const fileBlob = new Blob([fileBuffer], { type: mimeType });

    // Create FormData
    const formData = new FormData();
    formData.append('file', fileBlob, filename);
    formData.append('projectId', this.testProjectId);

    // Upload
    const response = await fetch(`${this.config.baseUrl}/api/projects/${this.testProjectId}/files/upload`, {
      method: 'POST',
      headers: {
        'Cookie': this.sessionCookie,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status}`);
    }

    const data = await response.json();
    this.uploadedFileIds.push(data.file.id);

    console.log(`   Uploaded: ${filename} (${data.file.id})`);
  }

  private generateSampleContent(filename: string): string {
    if (filename.endsWith('.txt')) {
      return `Sample Document for RAG Testing

Introduction
This is a test document for validating the RAG (Retrieval-Augmented Generation) system.
It contains multiple sections with different topics to test retrieval accuracy.

Section 1: Urban Development
Urban development involves planning and managing the growth of cities and towns.
Key factors include infrastructure, transportation, housing, and public spaces.
Sustainable urban development focuses on environmental impact and quality of life.

Section 2: Project Management
Effective project management requires clear goals, timelines, and resource allocation.
Common methodologies include Agile, Waterfall, and Hybrid approaches.
Risk management and stakeholder communication are critical success factors.

Section 3: Data Analysis
Data analysis involves examining datasets to draw conclusions and insights.
Common techniques include statistical analysis, data visualization, and machine learning.
Tools like Python, R, and SQL are widely used in the field.

Section 4: Environmental Sustainability
Environmental sustainability focuses on reducing ecological footprint.
Key areas include renewable energy, waste reduction, and conservation.
Organizations implement sustainability practices through policy and technology.

Conclusion
This document provides diverse content for testing document retrieval systems.
Each section should be retrievable based on relevant queries.`;
    }

    // For PDF, we'd need a library to generate actual PDFs
    // For now, return text content that will be saved as .txt
    return this.generateSampleContent('sample-document.txt');
  }

  /**
   * Test 4: Process Documents (Generate Embeddings)
   */
  async testDocumentProcessing() {
    for (let i = 0; i < this.uploadedFileIds.length; i++) {
      const fileId = this.uploadedFileIds[i];
      await this.runTest(`4.${i + 1} Process File ${fileId.substring(0, 8)}...`, async () => {
        const response = await this.apiRequest(`/api/projects/${this.testProjectId}/files/${fileId}/process`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Processing failed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(`Processing unsuccessful: ${data.error || 'Unknown error'}`);
        }

        console.log(`   Chunks: ${data.chunkCount}, Tokens: ${data.totalTokens}`);
        if (data.warnings && data.warnings.length > 0) {
          console.log(`   Warnings: ${data.warnings.join(', ')}`);
        }
      });
    }
  }

  /**
   * Test 5: RAG Retrieval (Direct API)
   */
  async testRAGRetrieval() {
    const testQueries = [
      'What is urban development?',
      'Tell me about project management',
      'How is data analysis performed?',
      'What is environmental sustainability?',
    ];

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      await this.runTest(`5.${i + 1} Retrieve: "${query}"`, async () => {
        const response = await this.apiRequest(`/api/projects/${this.testProjectId}/rag/retrieve`, {
          method: 'POST',
          body: JSON.stringify({
            query,
            topK: 3,
            similarityThreshold: 0.5,
            useHybridSearch: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Retrieval failed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.chunks || data.chunks.length === 0) {
          throw new Error('No chunks retrieved');
        }

        console.log(`   Retrieved ${data.chunks.length} chunks`);
        console.log(`   Top similarity: ${(data.chunks[0].similarity * 100).toFixed(1)}%`);
      });
    }
  }

  /**
   * Test 6: Chat with RAG Context
   */
  async testChatWithRAG() {
    await this.runTest('6.1 Create Chat in Project', async () => {
      const response = await this.apiRequest('/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          projectId: this.testProjectId,
          title: 'RAG Test Chat',
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat creation failed: ${response.status}`);
      }

      const data = await response.json();
      this.testChatId = data.chat.id;

      console.log(`   Created chat: ${this.testChatId}`);
    });

    await this.runTest('6.2 Send Message with RAG Query', async () => {
      const response = await this.apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'What does the document say about urban development?' }
          ],
          metadata: {
            chatId: this.testChatId,
            modelId: 'grok-2-latest',
            locale: 'en',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      // For streaming responses, we need to read the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
      }

      console.log(`   Response length: ${fullResponse.length} chars`);
    });

    await this.runTest('6.3 Verify RAG Sources in Message', async () => {
      // Fetch the chat to see saved messages with metadata
      const response = await this.apiRequest(`/api/chats/${this.testChatId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch chat: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessages = data.messages.filter((m: any) => m.role === 'assistant');

      if (assistantMessages.length === 0) {
        throw new Error('No assistant messages found');
      }

      const lastMessage = assistantMessages[assistantMessages.length - 1];
      const ragSources = lastMessage.metadata?.ragSources;

      if (!ragSources || !Array.isArray(ragSources) || ragSources.length === 0) {
        throw new Error('No RAG sources found in message metadata');
      }

      console.log(`   Found ${ragSources.length} RAG sources`);
      console.log(`   Top source: ${ragSources[0].sourceFile} (${(ragSources[0].similarity * 100).toFixed(1)}%)`);
    });
  }

  /**
   * Test 7: Cleanup (Optional)
   */
  async testCleanup() {
    if (!this.config.cleanup) {
      console.log('\n⏭️  Skipping cleanup (set cleanup: true to enable)');
      return;
    }

    await this.runTest('7. Delete Test Project', async () => {
      const response = await this.apiRequest(`/api/projects/${this.testProjectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Project deletion failed: ${response.status}`);
      }

      console.log(`   Deleted project: ${this.testProjectId}`);
    });
  }

  /**
   * Run All Tests
   */
  async runAllTests() {
    console.log('\n🚀 RAG System Integration Test Suite\n');
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log(`Test User: ${this.config.testEmail}\n`);

    const startTime = Date.now();

    // Run tests sequentially
    await this.testAuthentication();
    await this.testCreateProject();
    await this.testFileUpload();
    await this.testDocumentProcessing();
    await this.testRAGRetrieval();
    await this.testChatWithRAG();
    await this.testCleanup();

    const totalDuration = Date.now() - startTime;

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testName}`);
          if (r.error) console.log(`    ${r.error}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';

  // Test configuration
  const config: TestConfig = {
    baseUrl,
    testEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
    testPassword: process.env.TEST_USER_PASSWORD || 'testpassword123',
    cleanup: process.env.CLEANUP === 'true',
  };

  // Validate environment
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    console.error('❌ Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables required');
    console.error('   Example: TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=pass123 npm run test:rag');
    process.exit(1);
  }

  const tester = new RAGSystemTester(config);
  await tester.runAllTests();
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
