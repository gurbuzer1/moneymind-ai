import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { v4 as uuid } from 'uuid';
import { Budget } from '../types';
import * as queries from '../db/queries';
import { getCurrentMonth } from '../utils/formatting';

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  loadBudgets: (db: SQLite.SQLiteDatabase, month?: string) => Promise<void>;
  setBudget: (
    db: SQLite.SQLiteDatabase,
    category: string,
    monthlyLimit: number,
    month?: string
  ) => Promise<void>;
  deleteBudget: (db: SQLite.SQLiteDatabase, id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  loading: false,

  loadBudgets: async (db, month) => {
    set({ loading: true });
    const budgets = await queries.getBudgets(db, month ?? getCurrentMonth());
    set({ budgets, loading: false });
  },

  setBudget: async (db, category, monthlyLimit, month) => {
    const m = month ?? getCurrentMonth();
    const existing = get().budgets.find((b) => b.category === category && b.month === m);
    await queries.upsertBudget(db, {
      id: existing?.id ?? uuid(),
      category,
      monthly_limit: monthlyLimit,
      month: m,
    });
    await get().loadBudgets(db, m);
  },

  deleteBudget: async (db, id) => {
    await queries.deleteBudget(db, id);
    await get().loadBudgets(db);
  },
}));
