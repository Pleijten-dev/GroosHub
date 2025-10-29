// Chat message types adapted from Vercel AI Chatbot
import type { Message } from 'ai';

export interface MessageMetadata {
  createdAt: string;
}

export interface ChatMessage extends Message {
  metadata?: MessageMetadata;
}

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
