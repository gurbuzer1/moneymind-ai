import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import { v4 as uuid } from 'uuid';
import { Transaction, TransactionType } from '../types';
import * as queries from '../db/queries';
import { getCurrentMonth } from '../utils/formatting';

interface TransactionState {
  transactions: Transaction[];
  monthlyIncome: number;
  monthlyExpenses: number;
  categoryTotals: { category: string; total: number }[];
  currentMonth: string;
  loading: boolean;

  setMonth: (month: string) => void;
  loadTransactions: (db: SQLite.SQLiteDatabase) => Promise<void>;
  addTransaction: (
    db: SQLite.SQLiteDatabase,
    data: {
      type: TransactionType;
      amount: number;
      category: string;
      description: string;
      date: string;
      is_recurring: boolean;
    }
  ) => Promise<void>;
  updateTransaction: (db: SQLite.SQLiteDatabase, t: Transaction) => Promise<void>;
  deleteTransaction: (db: SQLite.SQLiteDatabase, id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  monthlyIncome: 0,
  monthlyExpenses: 0,
  categoryTotals: [],
  currentMonth: getCurrentMonth(),
  loading: false,

  setMonth: (month) => set({ currentMonth: month }),

  loadTransactions: async (db) => {
    set({ loading: true });
    const month = get().currentMonth;
    const [transactions, summary, categoryTotals] = await Promise.all([
      queries.getTransactionsByMonth(db, month),
      queries.getMonthlySummary(db, month),
      queries.getCategoryTotals(db, month),
    ]);
    set({
      transactions,
      monthlyIncome: summary.income,
      monthlyExpenses: summary.expenses,
      categoryTotals,
      loading: false,
    });
  },

  addTransaction: async (db, data) => {
    const t: Omit<Transaction, 'created_at'> = { id: uuid(), ...data };
    await queries.insertTransaction(db, t);
    await get().loadTransactions(db);
  },

  updateTransaction: async (db, t) => {
    await queries.updateTransaction(db, t);
    await get().loadTransactions(db);
  },

  deleteTransaction: async (db, id) => {
    await queries.deleteTransaction(db, id);
    await get().loadTransactions(db);
  },
}));
