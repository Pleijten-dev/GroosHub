// Test endpoint to verify AI API configuration
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { streamText } from 'ai';

export async function GET() {
  const results = {
    openai: { tested: false, success: false, response: '', error: '', apiKeyExists: false },
    xai: { tested: false, success: false, response: '', error: '', apiKeyExists: false },
  };

  // Test OpenAI
  results.openai.apiKeyExists = !!process.env.OPENAI_API_KEY;
  if (process.env.OPENAI_API_KEY) {
    results.openai.tested = true;
    try {
      const result = await streamText({
        model: openai('gpt-4o-mini'),
        messages: [{ role: 'user', content: 'Say "Hello"' }],
      });

      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      results.openai.success = true;
      results.openai.response = fullText;
    } catch (error) {
      results.openai.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Test xAI (Grok)
  results.xai.apiKeyExists = !!process.env.XAI_API_KEY;
  if (process.env.XAI_API_KEY) {
    results.xai.tested = true;
    try {
      const result = await streamText({
        model: xai('grok-2-1212'),
        messages: [{ role: 'user', content: 'Say "Hello"' }],
      });

      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      results.xai.success = true;
      results.xai.response = fullText;
    } catch (error) {
      results.xai.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI API Test Results</title>
      <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
        .test { margin: 20px 0; padding: 15px; border: 1px solid #333; border-radius: 5px; }
        .success { border-color: #0f0; }
        .error { border-color: #f00; }
        .warning { border-color: #ff0; }
        h2 { margin-top: 0; }
        pre { background: #000; padding: 10px; overflow-x: auto; }
        .status { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>AI API Test Results</h1>

      <div class="test ${results.openai.success ? 'success' : results.openai.tested ? 'error' : 'warning'}">
        <h2>OpenAI (GPT)</h2>
        <p><strong>API Key:</strong> ${results.openai.apiKeyExists ? '✅ Set' : '❌ Not Set'}</p>
        ${results.openai.tested ? `
          <p class="status">${results.openai.success ? '✅ SUCCESS' : '❌ FAILED'}</p>
          ${results.openai.success ? `
            <p><strong>Response:</strong></p>
            <pre>${results.openai.response}</pre>
          ` : `
            <p><strong>Error:</strong></p>
            <pre>${results.openai.error}</pre>
          `}
        ` : '<p>⚠️ Not tested (API key not set)</p>'}
      </div>

      <div class="test ${results.xai.success ? 'success' : results.xai.tested ? 'error' : 'warning'}">
        <h2>xAI (Grok)</h2>
        <p><strong>API Key:</strong> ${results.xai.apiKeyExists ? '✅ Set' : '❌ Not Set'}</p>
        ${results.xai.tested ? `
          <p class="status">${results.xai.success ? '✅ SUCCESS' : '❌ FAILED'}</p>
          ${results.xai.success ? `
            <p><strong>Response:</strong></p>
            <pre>${results.xai.response}</pre>
          ` : `
            <p><strong>Error:</strong></p>
            <pre>${results.xai.error}</pre>
          `}
        ` : '<p>⚠️ Not tested (API key not set)</p>'}
      </div>

      <h2>Raw JSON Results</h2>
      <pre>${JSON.stringify(results, null, 2)}</pre>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
