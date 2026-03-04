import { Router, Request, Response } from 'express';
import { chat, analyze, suggest } from '../services/claude';

export const aiRoutes = Router();

aiRoutes.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }
    const reply = await chat(messages, context ?? {});
    res.json({ message: reply });
  } catch (error: any) {
    console.error('AI chat error:', error.message);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

aiRoutes.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    if (!context) {
      res.status(400).json({ error: 'context is required' });
      return;
    }
    const insights = await analyze(context);
    res.json(insights);
  } catch (error: any) {
    console.error('AI analyze error:', error.message);
    res.status(500).json({ error: 'Failed to analyze' });
  }
});

aiRoutes.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    const suggestions = await suggest(context ?? {});
    res.json({ suggestions });
  } catch (error: any) {
    console.error('AI suggest error:', error.message);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});
