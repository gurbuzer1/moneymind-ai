import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FINANCIAL_ADVISOR_PROMPT = `You are MoneyMind AI, a friendly and knowledgeable personal financial advisor. You help working professionals (ages 25-40) manage their money better.

Your capabilities:
- Analyze spending patterns and provide actionable insights
- Suggest budget optimizations based on actual spending data
- Provide personalized savings strategies
- Answer general financial literacy questions
- Help users set and track financial goals

Guidelines:
- Be concise but thorough. Use bullet points for actionable advice.
- Always consider the user's financial context when providing advice.
- Never recommend specific stocks or investments — suggest consulting a licensed advisor for that.
- Use encouraging language. Celebrate wins, gently highlight areas for improvement.
- If the user's spending exceeds income, flag it with concern but without judgment.
- Format currency amounts clearly. Use percentages to make data relatable.
- When you don't have enough data, ask clarifying questions.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FinancialContext {
  monthly_income: number;
  monthly_expenses: number;
  savings_rate: number;
  top_categories: { category: string; amount: number; percentage: number }[];
  month_over_month_change: number;
  budget_alerts: { category: string; spent: number; limit: number }[];
  savings_goals: { name: string; progress: number }[];
}

function buildContextBlock(context: FinancialContext): string {
  const lines = [
    `\n--- User's Financial Snapshot ---`,
    `Monthly Income: $${context.monthly_income.toFixed(2)}`,
    `Monthly Expenses: $${context.monthly_expenses.toFixed(2)}`,
    `Savings Rate: ${(context.savings_rate * 100).toFixed(1)}%`,
    `Month-over-Month Expense Change: ${(context.month_over_month_change * 100).toFixed(1)}%`,
  ];

  if (context.top_categories.length > 0) {
    lines.push(`\nTop Spending Categories:`);
    context.top_categories.forEach((c) => {
      lines.push(`  - ${c.category}: $${c.amount.toFixed(2)} (${(c.percentage * 100).toFixed(1)}%)`);
    });
  }

  if (context.budget_alerts.length > 0) {
    lines.push(`\nBudget Alerts (>80% used):`);
    context.budget_alerts.forEach((a) => {
      lines.push(`  - ${a.category}: $${a.spent.toFixed(2)} / $${a.limit.toFixed(2)}`);
    });
  }

  if (context.savings_goals.length > 0) {
    lines.push(`\nSavings Goals:`);
    context.savings_goals.forEach((g) => {
      lines.push(`  - ${g.name}: ${(g.progress * 100).toFixed(1)}% complete`);
    });
  }

  return lines.join('\n');
}

export async function chat(
  messages: ChatMessage[],
  context: FinancialContext
): Promise<string> {
  const contextBlock = buildContextBlock(context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    system: FINANCIAL_ADVISOR_PROMPT + contextBlock,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? 'I apologize, I was unable to generate a response.';
}

export async function analyze(context: FinancialContext): Promise<object> {
  const contextBlock = buildContextBlock(context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    system: `${FINANCIAL_ADVISOR_PROMPT}\n\nRespond ONLY with valid JSON containing: { "summary": string, "insights": string[], "warnings": string[], "tips": string[] }`,
    messages: [
      {
        role: 'user',
        content: `Analyze my financial data and provide insights.\n${contextBlock}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  try {
    return JSON.parse(textBlock?.text ?? '{}');
  } catch {
    return { summary: textBlock?.text ?? '', insights: [], warnings: [], tips: [] };
  }
}

export async function suggest(context: FinancialContext): Promise<string> {
  const contextBlock = buildContextBlock(context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 512,
    system: FINANCIAL_ADVISOR_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Based on my spending data, give me 3 specific, actionable savings tips.\n${contextBlock}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? 'Unable to generate suggestions.';
}
