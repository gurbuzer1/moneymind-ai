export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO date string
  is_recurring: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  month: string; // YYYY-MM
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  conversation_id: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  currency: string;
  monthly_income: number;
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  subscription_tier: 'free' | 'premium';
  onboarding_completed: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface FinancialContext {
  monthly_income: number;
  monthly_expenses: number;
  savings_rate: number;
  top_categories: { category: string; amount: number; percentage: number }[];
  month_over_month_change: number;
  budget_alerts: { category: string; spent: number; limit: number }[];
  savings_goals: { name: string; progress: number }[];
}
