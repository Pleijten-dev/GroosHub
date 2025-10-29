// AI model definitions adapted from Vercel AI Chatbot
export const DEFAULT_CHAT_MODEL: string = "grok-2-vision-1212";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  provider: 'xai' | 'openai' | 'anthropic';
};

export const chatModels: ChatModel[] = [
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
];

export function getModelById(id: string): ChatModel | undefined {
  return chatModels.find((model) => model.id === id);
}
