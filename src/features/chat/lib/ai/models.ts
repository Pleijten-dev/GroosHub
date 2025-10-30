// AI model definitions
// Using working model IDs as of early 2025
export const DEFAULT_CHAT_MODEL: string = "gpt-4o-mini";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  provider: 'xai' | 'openai' | 'anthropic' | 'mistral' | 'google';
};

export const chatModels: ChatModel[] = [
  // OpenAI Models (VERIFIED WORKING)
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Most capable OpenAI model with vision and text",
    provider: 'openai',
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast and efficient GPT-4 level model",
    provider: 'openai',
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "High performance GPT-4 model",
    provider: 'openai',
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Fast and cost-effective model",
    provider: 'openai',
  },

  // Anthropic Claude Models (Update these if you have Claude API access)
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    description: "Most capable Claude model",
    provider: 'anthropic',
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    description: "Previous flagship Claude model",
    provider: 'anthropic',
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    description: "Fast Claude model for simple tasks",
    provider: 'anthropic',
  },

  // xAI Models (Requires XAI_API_KEY - currently not set)
  {
    id: "grok-beta",
    name: "Grok Beta",
    description: "xAI's conversational AI model",
    provider: 'xai',
  },

  // Google Gemini Models
  {
    id: "gemini-1.5-pro-latest",
    name: "Gemini 1.5 Pro",
    description: "Google's most capable model",
    provider: 'google',
  },
  {
    id: "gemini-1.5-flash-latest",
    name: "Gemini 1.5 Flash",
    description: "Fast and efficient Gemini model",
    provider: 'google',
  },

  // Mistral Models
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    description: "Mistral's flagship model",
    provider: 'mistral',
  },
  {
    id: "mistral-small-latest",
    name: "Mistral Small",
    description: "Fast Mistral model",
    provider: 'mistral',
  },
];

export function getModelById(id: string): ChatModel | undefined {
  return chatModels.find((model) => model.id === id);
}
