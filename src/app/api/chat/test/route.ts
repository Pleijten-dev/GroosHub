// Test endpoint to verify OpenAI API configuration
import { NextRequest } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function GET(req: NextRequest) {
  try {
    console.log('[Test] Testing OpenAI API...');
    console.log('[Test] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('[Test] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);

    // Try to call the OpenAI API with a simple message
    const result = await streamText({
      model: openai('gpt-4o-mini'), // Use a known working model
      messages: [
        { role: 'user', content: 'Say "Hello, World!"' }
      ],
    });

    // Collect the full response
    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    console.log('[Test] OpenAI response:', fullText);

    return Response.json({
      success: true,
      apiKeyExists: !!process.env.OPENAI_API_KEY,
      response: fullText,
      model: 'gpt-4o-mini',
    });
  } catch (error) {
    console.error('[Test] OpenAI API test failed:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
