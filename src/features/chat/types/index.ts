/**
 * Chat Types
 * Type definitions for the chat feature
 */

import type { ModelId } from '@/lib/ai/models';

/**
 * Chat message
 */
export interface ChatMessage {
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
}

/**
 * Chat UI state
 */
export interface ChatUIState {
  isLoading: boolean;
  error: Error | null;
  streamingMessage: string | null;
}
