/**
 * Chat Types
 * Type definitions for the chat feature
 */

import type { ModelId } from '@/lib/ai/models';
import type { Message as AIMessage } from 'ai';

/**
 * Extended message type with UI-specific properties
 */
export interface ChatMessage extends AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

/**
 * Chat configuration
 */
export interface ChatConfig {
  modelId: ModelId;
  temperature: number;
  maxTokens?: number;
}

/**
 * Chat UI state
 */
export interface ChatUIState {
  isLoading: boolean;
  error: Error | null;
  streamingMessage: string | null;
}
