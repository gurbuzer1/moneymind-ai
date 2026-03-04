import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { UserProfile } from '../types';
import * as queries from '../db/queries';

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  loadProfile: (db: SQLite.SQLiteDatabase) => Promise<void>;
  updateProfile: (db: SQLite.SQLiteDatabase, updates: Partial<UserProfile>) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  loading: false,

  loadProfile: async (db) => {
    set({ loading: true });
    const profile = await queries.getOrCreateProfile(db);
    set({ profile, loading: false });
  },

  updateProfile: async (db, updates) => {
    await queries.updateProfile(db, updates);
    const profile = await queries.getOrCreateProfile(db);
    set({ profile });
  },
}));
