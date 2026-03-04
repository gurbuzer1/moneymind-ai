import * as SQLite from 'expo-sqlite';
import { Transaction, Budget, SavingsGoal, ChatMessage, UserProfile } from '../types';

// ---- Transactions ----

export async function insertTransaction(
  db: SQLite.SQLiteDatabase,
  t: Omit<Transaction, 'created_at'>
): Promise<void> {
  await db.runAsync(
    `INSERT INTO transactions (id, type, amount, category, description, date, is_recurring)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [t.id, t.type, t.amount, t.category, t.description, t.date, t.is_recurring ? 1 : 0]
  );
}

export async function updateTransaction(
  db: SQLite.SQLiteDatabase,
  t: Omit<Transaction, 'created_at'>
): Promise<void> {
  await db.runAsync(
    `UPDATE transactions SET type=?, amount=?, category=?, description=?, date=?, is_recurring=?
     WHERE id=?`,
    [t.type, t.amount, t.category, t.description, t.date, t.is_recurring ? 1 : 0, t.id]
  );
}

export async function deleteTransaction(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id=?', [id]);
}

export async function getTransactions(
  db: SQLite.SQLiteDatabase,
  limit = 50,
  offset = 0
): Promise<Transaction[]> {
  const rows = await db.getAllAsync<Omit<Transaction, 'is_recurring'> & { is_recurring: number }>(
    'SELECT * FROM transactions ORDER BY date DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows.map((r) => ({ ...r, is_recurring: Boolean(r.is_recurring) }));
}

export async function getTransactionsByMonth(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<Transaction[]> {
  const rows = await db.getAllAsync<Omit<Transaction, 'is_recurring'> & { is_recurring: number }>(
    `SELECT * FROM transactions WHERE date LIKE ? || '%' ORDER BY date DESC`,
    [month]
  );
  return rows.map((r) => ({ ...r, is_recurring: Boolean(r.is_recurring) }));
}

export async function getMonthlySummary(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<{ income: number; expenses: number }> {
  const result = await db.getFirstAsync<{ income: number; expenses: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expenses
     FROM transactions WHERE date LIKE ? || '%'`,
    [month]
  );
  return result ?? { income: 0, expenses: 0 };
}

export async function getCategoryTotals(
  db: SQLite.SQLiteDatabase,
  month: string,
  type: 'income' | 'expense' = 'expense'
): Promise<{ category: string; total: number }[]> {
  return db.getAllAsync(
    `SELECT category, SUM(amount) as total
     FROM transactions WHERE date LIKE ? || '%' AND type = ?
     GROUP BY category ORDER BY total DESC`,
    [month, type]
  );
}

// ---- Budgets ----

export async function upsertBudget(db: SQLite.SQLiteDatabase, b: Budget): Promise<void> {
  await db.runAsync(
    `INSERT INTO budgets (id, category, monthly_limit, month)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(category, month) DO UPDATE SET monthly_limit=excluded.monthly_limit`,
    [b.id, b.category, b.monthly_limit, b.month]
  );
}

export async function getBudgets(db: SQLite.SQLiteDatabase, month: string): Promise<Budget[]> {
  return db.getAllAsync('SELECT * FROM budgets WHERE month=?', [month]);
}

export async function deleteBudget(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE id=?', [id]);
}

// ---- Savings Goals ----

export async function insertSavingsGoal(
  db: SQLite.SQLiteDatabase,
  g: SavingsGoal
): Promise<void> {
  await db.runAsync(
    `INSERT INTO savings_goals (id, name, target_amount, current_amount, target_date)
     VALUES (?, ?, ?, ?, ?)`,
    [g.id, g.name, g.target_amount, g.current_amount, g.target_date]
  );
}

export async function updateSavingsGoal(
  db: SQLite.SQLiteDatabase,
  g: SavingsGoal
): Promise<void> {
  await db.runAsync(
    `UPDATE savings_goals SET name=?, target_amount=?, current_amount=?, target_date=? WHERE id=?`,
    [g.name, g.target_amount, g.current_amount, g.target_date, g.id]
  );
}

export async function getSavingsGoals(db: SQLite.SQLiteDatabase): Promise<SavingsGoal[]> {
  return db.getAllAsync('SELECT * FROM savings_goals ORDER BY target_date ASC');
}

export async function deleteSavingsGoal(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM savings_goals WHERE id=?', [id]);
}

// ---- Chat Messages ----

export async function insertChatMessage(
  db: SQLite.SQLiteDatabase,
  msg: ChatMessage
): Promise<void> {
  await db.runAsync(
    `INSERT INTO chat_messages (id, role, content, timestamp, conversation_id)
     VALUES (?, ?, ?, ?, ?)`,
    [msg.id, msg.role, msg.content, msg.timestamp, msg.conversation_id]
  );
}

export async function getChatMessages(
  db: SQLite.SQLiteDatabase,
  conversationId: string
): Promise<ChatMessage[]> {
  return db.getAllAsync(
    'SELECT * FROM chat_messages WHERE conversation_id=? ORDER BY timestamp ASC',
    [conversationId]
  );
}

export async function clearChat(db: SQLite.SQLiteDatabase, conversationId: string): Promise<void> {
  await db.runAsync('DELETE FROM chat_messages WHERE conversation_id=?', [conversationId]);
}

// ---- User Profile ----

export async function getOrCreateProfile(db: SQLite.SQLiteDatabase): Promise<UserProfile> {
  let profile = await db.getFirstAsync<Omit<UserProfile, 'onboarding_completed'> & { onboarding_completed: number }>(
    'SELECT * FROM user_profile LIMIT 1'
  );
  if (!profile) {
    const id = 'default';
    await db.runAsync(
      `INSERT INTO user_profile (id) VALUES (?)`,
      [id]
    );
    profile = await db.getFirstAsync<Omit<UserProfile, 'onboarding_completed'> & { onboarding_completed: number }>(
      'SELECT * FROM user_profile WHERE id=?',
      [id]
    );
  }
  return { ...profile!, onboarding_completed: Boolean(profile!.onboarding_completed) };
}

export async function updateProfile(
  db: SQLite.SQLiteDatabase,
  updates: Partial<UserProfile>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue;
    fields.push(`${key}=?`);
    values.push(key === 'onboarding_completed' ? (value ? 1 : 0) : value);
  }
  if (fields.length === 0) return;
  values.push('default');
  await db.runAsync(
    `UPDATE user_profile SET ${fields.join(', ')}, updated_at=datetime('now') WHERE id=?`,
    values
  );
}
