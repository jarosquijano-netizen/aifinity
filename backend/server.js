import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import summaryRoutes from './routes/summary.js';
import trendsRoutes from './routes/trends.js';
import exportRoutes from './routes/export.js';
import accountRoutes from './routes/accounts.js';
import budgetRoutes from './routes/budget.js';
import aiRoutes from './routes/ai.js';
import settingsRoutes from './routes/settings.js';
import cleanupRoutes from './routes/cleanup.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Allow production domain
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://aifinity.app', 'https://www.aifinity.app'] 
    : '*',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'AiFinity.app API is running',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cleanup', cleanupRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Finova API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔒 JWT: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
});


