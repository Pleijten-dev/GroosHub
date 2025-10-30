// AI model definitions adapted from Vercel AI Chatbot
export const DEFAULT_CHAT_MODEL: string = "grok-2-vision-1212";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  provider: 'xai' | 'openai' | 'anthropic' | 'mistral' | 'google';
};

export const chatModels: ChatModel[] = [
  // xAI Models
  {
    id: "grok-2-vision-1212",
    name: "Grok 2 Vision",
    description: "Advanced multimodal model with vision and text capabilities",
    provider: 'xai',
  },
  {
    id: "grok-2-1212",
    name: "Grok 2",
    description: "Fast and powerful text generation model",
    provider: 'xai',
  },

  // Anthropic Claude Models
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    description: "Most capable Claude model for complex tasks",
    provider: 'anthropic',
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "Balanced Claude model for everyday tasks",
    provider: 'anthropic',
  },

  // OpenAI Models
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's multimodal flagship model",
    provider: 'openai',
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast and efficient GPT-4 model",
    provider: 'openai',
  },

  // Mistral Models
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    description: "Mistral's flagship large language model",
    provider: 'mistral',
  },
  {
    id: "mistral-medium-latest",
    name: "Mistral Medium",
    description: "Balanced Mistral model",
    provider: 'mistral',
  },

  // Google Gemini Models
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    description: "Fast experimental Gemini model",
    provider: 'google',
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Google's powerful Pro model",
    provider: 'google',
  },
];

export function getModelById(id: string): ChatModel | undefined {
  return chatModels.find((model) => model.id === id);
}
