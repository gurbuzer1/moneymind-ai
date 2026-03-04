import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { v4 as uuid } from 'uuid';
import { ChatMessage, FinancialContext } from '../types';
import * as queries from '../db/queries';
import { apiClient } from '../services/api';

interface ChatState {
  messages: ChatMessage[];
  conversationId: string;
  loading: boolean;
  sending: boolean;
  chatCount: number;

  loadMessages: (db: SQLite.SQLiteDatabase) => Promise<void>;
  sendMessage: (
    db: SQLite.SQLiteDatabase,
    content: string,
    context: FinancialContext
  ) => Promise<void>;
  clearChat: (db: SQLite.SQLiteDatabase) => Promise<void>;
  newConversation: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversationId: uuid(),
  loading: false,
  sending: false,
  chatCount: 0,

  loadMessages: async (db) => {
    set({ loading: true });
    const messages = await queries.getChatMessages(db, get().conversationId);
    set({ messages, loading: false });
  },

  sendMessage: async (db, content, context) => {
    const { conversationId } = get();

    const userMsg: ChatMessage = {
      id: uuid(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      conversation_id: conversationId,
    };
    await queries.insertChatMessage(db, userMsg);
    set((s) => ({ messages: [...s.messages, userMsg], sending: true }));

    try {
      const recentMessages = get().messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await apiClient.post('/ai/chat', {
        messages: recentMessages,
        context,
      });

      const assistantMsg: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
      };
      await queries.insertChatMessage(db, assistantMsg);
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        sending: false,
        chatCount: s.chatCount + 1,
      }));
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
      };
      await queries.insertChatMessage(db, errorMsg);
      set((s) => ({ messages: [...s.messages, errorMsg], sending: false }));
    }
  },

  clearChat: async (db) => {
    await queries.clearChat(db, get().conversationId);
    set({ messages: [] });
  },

  newConversation: () => set({ messages: [], conversationId: uuid() }),
}));
