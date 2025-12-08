# AI Models & API Keys Configuration

This document lists all the AI models available in the chat and the exact environment variable names you need to set for each provider.

## ✅ Current Status

- **OpenAI**: ✅ CONFIGURED AND WORKING
- **xAI**: ❌ Not configured (API key not set)
- **Anthropic**: ❓ Not tested
- **Google**: ❓ Not tested
- **Mistral**: ❓ Not tested

## 📋 Required API Keys

Add these to your `.env.local` file or Vercel environment variables:

### **OpenAI (GPT Models)** ✅ WORKING
```bash
OPENAI_API_KEY=your_openai_api_key_here
```
- Get from: https://platform.openai.com/api-keys
- Used for: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo

### **Anthropic (Claude Models)**
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```
- Get from: https://console.anthropic.com
- Used for: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku

### **xAI (Grok Models)** ❌ NOT CONFIGURED
```bash
XAI_API_KEY=your_xai_api_key_here
```
- Get from: https://x.ai/api
- Used for: Grok Beta

### **Google (Gemini Models)**
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```
- Get from: https://makersuite.google.com/app/apikey
- Used for: Gemini 1.5 Pro, Gemini 1.5 Flash

### **Mistral AI**
```bash
MISTRAL_API_KEY=your_mistral_api_key_here
```
- Get from: https://console.mistral.ai
- Used for: Mistral Large, Mistral Small

## 🤖 Available Models

### OpenAI Models ✅ VERIFIED WORKING
| Model ID | Name | Description |
|----------|------|-------------|
| `gpt-4o` | GPT-4o | Most capable OpenAI model |
| `gpt-4o-mini` | GPT-4o Mini | **[DEFAULT]** Fast and efficient |
| `gpt-4-turbo` | GPT-4 Turbo | High performance |
| `gpt-3.5-turbo` | GPT-3.5 Turbo | Cost-effective |

### Anthropic Models
| Model ID | Name | Description |
|----------|------|-------------|
| `claude-3-5-sonnet-20241022` | Claude 3.5 Sonnet | Most capable Claude |
| `claude-3-opus-20240229` | Claude 3 Opus | Previous flagship |
| `claude-3-haiku-20240307` | Claude 3 Haiku | Fast for simple tasks |

### xAI Models ❌ API KEY NOT SET
| Model ID | Name | Description |
|----------|------|-------------|
| `grok-beta` | Grok Beta | xAI's conversational AI |

### Google Models
| Model ID | Name | Description |
|----------|------|-------------|
| `gemini-1.5-pro-latest` | Gemini 1.5 Pro | Google's most capable |
| `gemini-1.5-flash-latest` | Gemini 1.5 Flash | Fast and efficient |

### Mistral Models
| Model ID | Name | Description |
|----------|------|-------------|
| `mistral-large-latest` | Mistral Large | Flagship model |
| `mistral-small-latest` | Mistral Small | Fast model |

## 🧪 Testing Your Setup

Visit this URL to test which API keys are working:
```
https://your-vercel-app.vercel.app/api/chat/test
```

This will show:
- ✅ Which API keys are configured
- ✅ Which ones work
- ❌ Error messages if something is wrong

## 🔧 Setup Instructions

### For Vercel (Production)
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each API key you want to use
3. Redeploy your application

### For Local Development
1. Create/edit `.env.local` in the project root:
   ```bash
   # OpenAI (Currently configured)
   OPENAI_API_KEY=sk-xxx...

   # Add others as needed
   ANTHROPIC_API_KEY=sk-ant-xxx...
   XAI_API_KEY=xai-xxx...
   GOOGLE_GENERATIVE_AI_API_KEY=xxx...
   MISTRAL_API_KEY=xxx...
   ```
2. Restart your dev server: `pnpm dev`

## 🎯 Testing Models

1. Go to the AI Assistant page
2. Select a model from the dropdown
3. Send a test message
4. Check the browser console for detailed error messages

## 📝 Important Notes

### Model IDs (October 2025)
The application is configured with the following October 2025 model IDs:

**xAI Models:**
- `grok-2-vision-1212` (default)
- `grok-2-1212`

**Anthropic Claude Models:**
- `claude-opus-4-1`
- `claude-opus-4-0`
- `claude-sonnet-4-0`

**OpenAI Models:**
- `gpt-5`
- `gpt-5-mini`

**Mistral Models:**
- `mistral-large-latest`
- `mistral-medium-latest`

**Google Gemini Models:**
- `gemini-2.0-flash-exp`
- `gemini-1.5-pro`

These model IDs are passed directly to the AI SDK, which forwards them to the provider APIs.

**Note:** If you experience empty responses even when API keys are valid:
1. The AI SDK or provider API might not recognize these specific model IDs yet
2. Your API key might not have access to these models (some require waitlist approval)
3. Check the enhanced logging in browser console for specific error messages
4. Try the `/api/chat/test` endpoint to verify API connectivity

### When Models Change
To update available models:
1. `src/features/chat/lib/ai/models.ts` - Add/remove model IDs
2. `src/features/chat/components/chat/ChatInterface.tsx` - Update the dropdown (if needed)
3. This file - Update the documentation

## 🔒 Security

- Never share your API keys
- Don't commit `.env.local` to git (it's in `.gitignore`)
- Rotate keys regularly for security
- Use separate keys for development and production
- Monitor your API usage to detect unauthorized access

## 💰 Pricing

Each provider has different pricing:
- **OpenAI**: $0.15-$60 per million tokens (varies by model)
- **Anthropic**: $3-$75 per million tokens
- **xAI**: Check https://x.ai/api for pricing
- **Google**: Gemini has generous free tier
- **Mistral**: Check https://console.mistral.ai for pricing

## 🆘 Troubleshooting

### Empty response / no answer (even when user messages are saved)

**Symptoms:**
- User messages appear in postgres database ✅
- API returns 200 OK ✅
- But AI response is empty ❌
- `parts: []` array is empty
- No assistant messages saved to database

**New Enhanced Logging (Latest Update):**

The code now includes comprehensive logging to diagnose this issue. Check browser console for:

**Server-side logs** (look for these):
```
🚀 Attempting to call <provider> API with model: <model>
✅ streamText() initialized successfully
📊 Result type: object
📊 Result methods: [...]
✅ Returning streaming response
```

If stream fails:
```
❌ Stream error callback triggered: <error details>
❌ EMPTY AI RESPONSE!
Finish reason: <reason>
```

**Client-side logs** (look for these):
```
[Client] 📡 API response received
[Client] ✅ Response OK, inspecting stream...
[Client] Stream details: { hasBody: true, ... }
[Client] 📖 Reading first chunk...
[Client] First read result: { done: false, hasValue: true, valueLength: X }
[Client] 📨 First chunk content: <actual data>
```

If stream is empty:
```
[Client] ⚠️ First chunk is empty!
or
[Client] First read result: { done: true, hasValue: false, valueLength: 0 }
```

**Diagnostic Steps:**

1. **Check if API key works at all:**
   - Visit `/api/chat/test` to verify API keys
   - If OpenAI test passes, API key is valid ✅

2. **Check browser console for new detailed logs:**
   - Look for `🚀 Attempting to call...` - confirms API call started
   - Look for `✅ streamText() initialized` - confirms no immediate error
   - Look for `📊 Result methods` - shows what methods are available on the result
   - Look for `[Client] 📨 First chunk content` - shows actual stream data

3. **Check for stream errors:**
   - Look for `❌ Stream error callback triggered`
   - Look for `❌ EMPTY AI RESPONSE!` with finish reason

4. **Verify model ID is being sent correctly:**
   - Check `[Client] Sending request to API` log
   - Confirm `model` field matches what you selected

**Possible Causes:**

1. **Model ID not recognized by provider API:**
   - Even if model exists, AI SDK or provider might not recognize it yet
   - Error might be silently swallowed in stream
   - Check `onError` logs for API-level errors

2. **API key lacks permissions:**
   - Some models require special access/waitlist approval
   - Check provider's dashboard for access status

3. **Rate limiting:**
   - Too many requests to provider API
   - Check `finishReason` in logs for rate limit indicators

4. **Response format mismatch:**
   - Stream might be using wrong format (text vs data stream)
   - Check `X-Debug-Stream-Type` header in logs

### "API key not configured" error
- **Cause**: Missing environment variable
- **Fix**: Add the required API key to Vercel or `.env.local`

### Can't see server logs
- **Vercel**: Dashboard → Project → Logs
- **Local**: Check your terminal where `pnpm dev` is running
- **Browser Console**: Now includes detailed client-side AND server-side logs
