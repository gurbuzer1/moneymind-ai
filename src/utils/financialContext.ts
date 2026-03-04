import * as SQLite from 'expo-sqlite';
import { FinancialContext } from '../types';
import { getMonthlySummary, getCategoryTotals, getBudgets, getSavingsGoals } from '../db/queries';
import { getCurrentMonth } from './formatting';
import { format, subMonths } from 'date-fns';

export async function computeFinancialContext(
  db: SQLite.SQLiteDatabase
): Promise<FinancialContext> {
  const currentMonth = getCurrentMonth();
  const prevMonth = format(subMonths(new Date(), 1), 'yyyy-MM');

  const [summary, prevSummary, categoryTotals, budgets, goals] = await Promise.all([
    getMonthlySummary(db, currentMonth),
    getMonthlySummary(db, prevMonth),
    getCategoryTotals(db, currentMonth),
    getBudgets(db, currentMonth),
    getSavingsGoals(db),
  ]);

  const totalExpenses = summary.expenses;
  const topCategories = categoryTotals.map((c) => ({
    category: c.category,
    amount: c.total,
    percentage: totalExpenses > 0 ? c.total / totalExpenses : 0,
  }));

  const monthChange =
    prevSummary.expenses > 0
      ? (totalExpenses - prevSummary.expenses) / prevSummary.expenses
      : 0;

  const budgetAlerts = budgets
    .map((b) => {
      const spent = categoryTotals.find((c) => c.category === b.category)?.total ?? 0;
      return { category: b.category, spent, limit: b.monthly_limit };
    })
    .filter((a) => a.spent >= a.limit * 0.8);

  const savingsProgress = goals.map((g) => ({
    name: g.name,
    progress: g.target_amount > 0 ? g.current_amount / g.target_amount : 0,
  }));

  return {
    monthly_income: summary.income,
    monthly_expenses: totalExpenses,
    savings_rate: summary.income > 0 ? (summary.income - totalExpenses) / summary.income : 0,
    top_categories: topCategories,
    month_over_month_change: monthChange,
    budget_alerts: budgetAlerts,
    savings_goals: savingsProgress,
  };
}
