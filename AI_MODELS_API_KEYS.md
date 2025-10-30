# AI Models & API Keys Configuration

This document lists all the AI models available in the chat and the exact environment variable names you need to set for each provider.

## 📋 Required API Keys

Add these to your `.env.local` file or Vercel environment variables:

### **xAI (Grok Models)** - Already configured
```bash
XAI_API_KEY=your_xai_api_key_here
```
- Get from: https://console.x.ai
- Used for: Grok 2 Vision, Grok 2

### **Anthropic (Claude Models)**
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```
- Get from: https://console.anthropic.com
- Used for: Claude Opus 4, Claude Sonnet 4

### **OpenAI (GPT Models)**
```bash
OPENAI_API_KEY=your_openai_api_key_here
```
- Get from: https://platform.openai.com
- Used for: GPT-4o, GPT-4o Mini

### **Mistral AI**
```bash
MISTRAL_API_KEY=your_mistral_api_key_here
```
- Get from: https://console.mistral.ai
- Used for: Mistral Large, Mistral Medium

### **Google (Gemini Models)**
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```
- Get from: https://makersuite.google.com/app/apikey
- Used for: Gemini 2.0 Flash, Gemini 1.5 Pro

## 🤖 Available Models

### xAI Models
| Model ID | Name | Description |
|----------|------|-------------|
| `grok-2-vision-1212` | Grok 2 Vision | Multimodal model with vision capabilities |
| `grok-2-1212` | Grok 2 | Fast text-only model |

### Anthropic Models
| Model ID | Name | Description |
|----------|------|-------------|
| `claude-opus-4-20250514` | Claude Opus 4 | Most capable Claude model |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 | Balanced model for everyday tasks |

### OpenAI Models
| Model ID | Name | Description |
|----------|------|-------------|
| `gpt-4o` | GPT-4o | Multimodal flagship model |
| `gpt-4o-mini` | GPT-4o Mini | Fast and efficient variant |

### Mistral Models
| Model ID | Name | Description |
|----------|------|-------------|
| `mistral-large-latest` | Mistral Large | Flagship large language model |
| `mistral-medium-latest` | Mistral Medium | Balanced model |

### Google Models
| Model ID | Name | Description |
|----------|------|-------------|
| `gemini-2.0-flash-exp` | Gemini 2.0 Flash | Fast experimental model |
| `gemini-1.5-pro` | Gemini 1.5 Pro | Powerful Pro model |

## 🔧 Setup Instructions

1. **Add API Keys to Environment**
   ```bash
   # Edit your .env.local file
   nano .env.local
   ```

2. **Paste the API Keys**
   ```bash
   # xAI (Required - default model)
   XAI_API_KEY=xai-xxx...

   # Anthropic (Optional)
   ANTHROPIC_API_KEY=sk-ant-xxx...

   # OpenAI (Optional)
   OPENAI_API_KEY=sk-xxx...

   # Mistral (Optional)
   MISTRAL_API_KEY=xxx...

   # Google (Optional)
   GOOGLE_GENERATIVE_AI_API_KEY=xxx...
   ```

3. **Restart Development Server**
   ```bash
   pnpm dev
   ```

4. **Deploy to Vercel**
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add each API key
   - Redeploy your application

## 🎯 Testing Models

To test if a model works:
1. Go to the AI Assistant page
2. Select a model from the dropdown
3. Send a test message
4. If you get an API key error, check that the corresponding environment variable is set

## 📝 Notes

- **You only need API keys for the models you want to use**
- The default model is `grok-2-vision-1212` (requires `XAI_API_KEY`)
- Models will appear in the dropdown even if you haven't set their API keys
- You'll get an error when trying to use a model without its API key set
- All API keys should be kept secret and never committed to version control

## 🔒 Security

- Never share your API keys
- Don't commit `.env.local` to git (it's in `.gitignore`)
- Rotate keys regularly for security
- Use separate keys for development and production
- Monitor your API usage to detect unauthorized access

## 💰 Pricing

Each provider has different pricing:
- **xAI**: Pay-per-token pricing
- **Anthropic**: Claude models have tiered pricing
- **OpenAI**: GPT models billed per token
- **Mistral**: Pay-per-token
- **Google**: Gemini has free tier with limits

Check each provider's pricing page for current rates.
