// Hook for managing chat history
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Chat } from '../types';
import { fetcher } from '../lib/utils';

export function useChatHistory() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetcher('/api/chat/history');
      setChats(data.chats);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
      });
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    } catch (err) {
      throw err;
    }
  }, []);

  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      await fetch(`/api/chat/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat))
      );
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    isLoading,
    error,
    refreshChats: fetchChats,
    deleteChat,
    updateChatTitle,
  };
}
