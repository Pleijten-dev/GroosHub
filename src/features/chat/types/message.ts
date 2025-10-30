// Chat message types adapted from Vercel AI Chatbot
export interface MessageMetadata {
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: MessageMetadata;
}

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
