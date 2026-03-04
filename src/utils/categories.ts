import { Category } from '../types';
import { colors } from '../theme';

export const categories: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: 'restaurant', color: colors.categoryColors[0] },
  { id: 'transport', name: 'Transportation', icon: 'directions-car', color: colors.categoryColors[1] },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: colors.categoryColors[2] },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie', color: colors.categoryColors[3] },
  { id: 'bills', name: 'Bills & Utilities', icon: 'receipt', color: colors.categoryColors[4] },
  { id: 'health', name: 'Health & Fitness', icon: 'fitness-center', color: colors.categoryColors[5] },
  { id: 'education', name: 'Education', icon: 'school', color: colors.categoryColors[6] },
  { id: 'groceries', name: 'Groceries', icon: 'local-grocery-store', color: colors.categoryColors[7] },
  { id: 'rent', name: 'Rent & Housing', icon: 'home', color: colors.categoryColors[8] },
  { id: 'insurance', name: 'Insurance', icon: 'security', color: colors.categoryColors[9] },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'subscriptions', color: colors.categoryColors[10] },
  { id: 'travel', name: 'Travel', icon: 'flight', color: colors.categoryColors[11] },
  { id: 'gifts', name: 'Gifts & Donations', icon: 'card-giftcard', color: colors.categoryColors[12] },
  { id: 'personal', name: 'Personal Care', icon: 'spa', color: colors.categoryColors[13] },
  { id: 'pets', name: 'Pets', icon: 'pets', color: colors.categoryColors[14] },
  { id: 'investments', name: 'Investments', icon: 'trending-up', color: colors.categoryColors[15] },
  { id: 'salary', name: 'Salary', icon: 'account-balance-wallet', color: colors.categoryColors[16] },
  { id: 'other', name: 'Other', icon: 'more-horiz', color: colors.categoryColors[17] },
];

export const getCategoryById = (id: string): Category =>
  categories.find((c) => c.id === id) ?? categories[categories.length - 1];

export const expenseCategories = categories.filter((c) => c.id !== 'salary');
export const incomeCategories = categories.filter((c) =>
  ['salary', 'investments', 'gifts', 'other'].includes(c.id)
);
