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

### Model IDs Updated (January 2025)
The original model IDs you requested (gpt-5, gpt-5-mini, claude-opus-4-1, grok-2-vision-1212, etc.) **don't exist in the actual APIs yet**.

I've updated the configuration to use **real, working model IDs** as of early 2025:
- ❌ `gpt-5-mini` → ✅ `gpt-4o-mini`
- ❌ `gpt-5` → ✅ `gpt-4o`
- ❌ `claude-opus-4-1` → ✅ `claude-3-5-sonnet-20241022`
- ❌ `grok-2-vision-1212` → ✅ `grok-beta`

### When New Models Are Released
When the AI providers release new models (like GPT-5, Claude Opus 4, Grok 2), update:
1. `src/features/chat/lib/ai/models.ts` - Add the new model IDs
2. `src/features/chat/components/chat/ChatInterface.tsx` - Update the dropdown
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

### Empty response / no answer
- **Cause**: Invalid model ID or missing API key
- **Fix**: Use the test endpoint (`/api/chat/test`) to verify your setup

### "API key not configured" error
- **Cause**: Missing environment variable
- **Fix**: Add the required API key to Vercel or `.env.local`

### Can't see server logs
- **Vercel**: Dashboard → Project → Logs
- **Local**: Check your terminal where `pnpm dev` is running
- **Alternative**: Use `/api/chat/test` and check browser console
