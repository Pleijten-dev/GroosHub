/**
 * Automated Multimodal Testing Endpoint
 *
 * Tests Week 3 multimodal functionality end-to-end
 *
 * Usage:
 *   GET /api/test-multimodal
 *   GET /api/test-multimodal?cleanup=false  (skip cleanup)
 *
 * View logs in Vercel Dashboard → Functions → /api/test-multimodal
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { uploadFileToR2, getPresignedUrl, deleteFileFromR2, generateFileKey } from '@/lib/storage/r2-client';
import { createChat } from '@/lib/ai/chat-store';
import { MODEL_CAPABILITIES } from '@/lib/ai/models';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
  data?: Record<string, unknown>;
}

/**
 * Generate a minimal 1x1 PNG image for testing
 */
function generateTestImage(): Buffer {
  // 1x1 red pixel PNG (smallest valid PNG)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk (red pixel)
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
    0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  return pngData;
}

/**
 * Run a test and track timing
 */
async function runTest(
  name: string,
  testFn: () => Promise<{ status: 'pass' | 'fail' | 'skip'; message: string; data?: Record<string, unknown> }>
): Promise<TestResult> {
  const start = Date.now();
  console.log(`\n🧪 Running: ${name}`);

  try {
    const result = await testFn();
    const duration = Date.now() - start;

    const testResult: TestResult = {
      test: name,
      ...result,
      duration
    };

    if (result.status === 'pass') {
      console.log(`✅ PASS (${duration}ms): ${name} - ${result.message}`);
    } else if (result.status === 'fail') {
      console.error(`❌ FAIL (${duration}ms): ${name} - ${result.message}`);
    } else {
      console.log(`⏭️  SKIP: ${name} - ${result.message}`);
    }

    return testResult;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ ERROR (${duration}ms): ${name}`, error);

    return {
      test: name,
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration
    };
  }
}

/**
 * GET /api/test-multimodal
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: TestResult[] = [];

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const shouldCleanup = searchParams.get('cleanup') !== 'false';

  console.log('\n' + '='.repeat(80));
  console.log('🚀 MULTIMODAL TESTING SUITE - Week 3');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Cleanup: ${shouldCleanup ? 'Enabled' : 'Disabled'}`);

  let testChatId: string | undefined;
  let testFileId: string | undefined;
  let testStorageKey: string | undefined;
  let userId: number | undefined;

  try {
    // Test 1: Authentication
    results.push(await runTest('Authentication', async () => {
      const session = await auth();

      if (!session?.user?.id) {
        return {
          status: 'fail',
          message: 'No active session. Please log in first.'
        };
      }

      userId = session.user.id;
      return {
        status: 'pass',
        message: `Authenticated as user ${userId}`,
        data: { userId }
      };
    }));

    if (!userId) {
      throw new Error('Authentication required to proceed with tests');
    }

    // Test 2: Environment Variables
    results.push(await runTest('Environment Variables', async () => {
      const missing: string[] = [];

      if (!process.env.POSTGRES_URL) missing.push('POSTGRES_URL');
      if (!process.env.R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
      if (!process.env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
      if (!process.env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
      if (!process.env.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');

      if (missing.length > 0) {
        return {
          status: 'fail',
          message: `Missing: ${missing.join(', ')}`,
          data: { missing }
        };
      }

      return {
        status: 'pass',
        message: 'All required environment variables present',
        data: {
          bucket: process.env.R2_BUCKET_NAME,
          accountId: process.env.R2_ACCOUNT_ID
        }
      };
    }));

    // Test 3: Database Connection
    results.push(await runTest('Database Connection', async () => {
      const sql = neon(process.env.POSTGRES_URL!);
      const result = await sql`SELECT NOW() as time`;

      return {
        status: 'pass',
        message: 'Database connection successful',
        data: { serverTime: result[0].time }
      };
    }));

    // Test 4: Vision Models Check
    results.push(await runTest('Vision Models Available', async () => {
      const visionModels = Object.entries(MODEL_CAPABILITIES)
        .filter(([, info]) => info.supportsVision)
        .map(([id]) => id);

      return {
        status: 'pass',
        message: `${visionModels.length} vision-capable models found`,
        data: { count: visionModels.length, models: visionModels }
      };
    }));

    // Test 5: Create Test Chat
    results.push(await runTest('Create Test Chat', async () => {
      testChatId = await createChat({
        userId: userId!,
        title: `Multimodal Test - ${new Date().toISOString()}`,
        modelId: 'claude-sonnet-4.5',
        metadata: { test: true }
      });

      return {
        status: 'pass',
        message: `Created chat ${testChatId}`,
        data: { chatId: testChatId }
      };
    }));

    if (!testChatId) {
      throw new Error('Test chat creation failed');
    }

    // Test 6: Generate Test Image
    let testImageBuffer: Buffer;
    results.push(await runTest('Generate Test Image', async () => {
      testImageBuffer = generateTestImage();

      return {
        status: 'pass',
        message: `Generated ${testImageBuffer.length} byte PNG`,
        data: { size: testImageBuffer.length }
      };
    }));

    // Test 7: Upload to R2
    results.push(await runTest('Upload Image to R2', async () => {
      const filename = `test-${Date.now()}.png`;
      testStorageKey = generateFileKey(
        String(userId),
        testChatId!,
        'test-message-id',
        filename
      );

      await uploadFileToR2(testImageBuffer!, testStorageKey, 'image/png');

      return {
        status: 'pass',
        message: 'File uploaded to R2',
        data: { storageKey: testStorageKey, filename }
      };
    }));

    // Test 8: Save File Metadata to Database
    results.push(await runTest('Save File Metadata', async () => {
      const sql = neon(process.env.POSTGRES_URL!);

      const result = await sql`
        INSERT INTO chat_files (
          chat_id, user_id, storage_key, file_name, file_type, mime_type, file_size
        ) VALUES (
          ${testChatId},
          ${userId},
          ${testStorageKey},
          'test-image.png',
          'image',
          'image/png',
          ${testImageBuffer!.length}
        )
        RETURNING id;
      `;

      testFileId = result[0].id;

      return {
        status: 'pass',
        message: `Metadata saved with ID ${testFileId}`,
        data: { fileId: testFileId }
      };
    }));

    // Test 9: Generate Presigned URL
    let presignedUrl: string;
    results.push(await runTest('Generate Presigned URL', async () => {
      presignedUrl = await getPresignedUrl(testStorageKey!, 300); // 5 min expiration

      // Verify URL format
      if (!presignedUrl.includes('X-Amz-Algorithm')) {
        return {
          status: 'fail',
          message: 'Invalid presigned URL format'
        };
      }

      return {
        status: 'pass',
        message: 'Presigned URL generated',
        data: { urlLength: presignedUrl.length }
      };
    }));

    // Test 10: Verify File Access API
    results.push(await runTest('File Access API', async () => {
      const response = await fetch(
        `${request.nextUrl.origin}/api/files/${testFileId}`,
        {
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        }
      );

      if (!response.ok) {
        return {
          status: 'fail',
          message: `HTTP ${response.status}`
        };
      }

      const data = await response.json();

      if (!data.success || !data.url) {
        return {
          status: 'fail',
          message: 'Invalid response from file access API'
        };
      }

      return {
        status: 'pass',
        message: 'File access API working',
        data: { fileId: testFileId }
      };
    }));

    // Test 11: Verify R2 File Download
    results.push(await runTest('Download from R2', async () => {
      const response = await fetch(presignedUrl!);

      if (!response.ok) {
        return {
          status: 'fail',
          message: `HTTP ${response.status} - ${response.statusText}`
        };
      }

      const buffer = await response.arrayBuffer();

      if (buffer.byteLength !== testImageBuffer!.length) {
        return {
          status: 'fail',
          message: `Size mismatch: ${buffer.byteLength} vs ${testImageBuffer!.length}`
        };
      }

      return {
        status: 'pass',
        message: `Downloaded ${buffer.byteLength} bytes`,
        data: { size: buffer.byteLength }
      };
    }));

    // Test 12: Database Query Performance
    results.push(await runTest('Database Query Performance', async () => {
      const sql = neon(process.env.POSTGRES_URL!);

      const start = Date.now();
      const files = await sql`
        SELECT cf.*, c.user_id
        FROM chat_files cf
        JOIN chats c ON c.id = cf.chat_id
        WHERE cf.id = ${testFileId}
          AND c.user_id = ${userId};
      `;
      const queryTime = Date.now() - start;

      if (files.length === 0) {
        return {
          status: 'fail',
          message: 'File not found in database'
        };
      }

      return {
        status: 'pass',
        message: `Query completed in ${queryTime}ms`,
        data: { queryTime, rowCount: files.length }
      };
    }));

    // Test 13: Vision Model Validation
    results.push(await runTest('Vision Model Validation', async () => {
      const testModels = [
        { id: 'claude-sonnet-4.5', shouldSupport: true },
        { id: 'gpt-4o', shouldSupport: true },
        { id: 'gpt-3.5-turbo', shouldSupport: false }
      ];

      const results = testModels.map(({ id, shouldSupport }) => {
        const actualSupport = MODEL_CAPABILITIES[id]?.supportsVision || false;
        const correct = actualSupport === shouldSupport;
        return { id, expected: shouldSupport, actual: actualSupport, correct };
      });

      const allCorrect = results.every(r => r.correct);

      return {
        status: allCorrect ? 'pass' : 'fail',
        message: allCorrect
          ? 'Vision model detection working correctly'
          : 'Vision model detection mismatch',
        data: { results }
      };
    }));

    // Cleanup
    if (shouldCleanup) {
      results.push(await runTest('Cleanup: Delete File from Database', async () => {
        const sql = neon(process.env.POSTGRES_URL!);

        await sql`DELETE FROM chat_files WHERE id = ${testFileId}`;

        return {
          status: 'pass',
          message: 'File metadata deleted'
        };
      }));

      results.push(await runTest('Cleanup: Delete File from R2', async () => {
        await deleteFileFromR2(testStorageKey!);

        return {
          status: 'pass',
          message: 'File deleted from R2'
        };
      }));

      results.push(await runTest('Cleanup: Delete Test Chat', async () => {
        const sql = neon(process.env.POSTGRES_URL!);

        await sql`DELETE FROM chats WHERE id = ${testChatId}`;

        return {
          status: 'pass',
          message: 'Test chat deleted'
        };
      }));
    }

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
    results.push({
      test: 'Fatal Error',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Calculate summary
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const total = results.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

  const summary = {
    total,
    passed,
    failed,
    skipped,
    passRate: `${passRate}%`,
    duration: `${totalDuration}ms`,
    timestamp: new Date().toISOString()
  };

  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log(`Duration: ${totalDuration}ms`);
  console.log('='.repeat(80) + '\n');

  // Return detailed results
  return NextResponse.json({
    success: failed === 0,
    summary,
    results,
    testData: {
      chatId: testChatId,
      fileId: testFileId,
      storageKey: testStorageKey,
      userId
    }
  }, {
    status: failed === 0 ? 200 : 500,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
