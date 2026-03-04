import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { aiRoutes } from './routes/ai';
import { authRoutes } from './routes/auth';
import { rateLimiter } from './middleware/rateLimit';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/ai', rateLimiter, aiRoutes);

app.listen(PORT, () => {
  console.log(`MoneyMind API server running on port ${PORT}`);
});
