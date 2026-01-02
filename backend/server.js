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
import adminRoutes from './routes/admin.js';
import diagnosticRoutes from './routes/diagnostic.js';
import fixNominaRoutes from './routes/fix-nomina.js';
import fixRemesasTraspasosRoutes from './routes/fix-remesas-traspasos.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Allow production domain and localhost
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://aifinity.app', 'https://www.aifinity.app', 'http://localhost:5173', 'http://localhost:3000'] 
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
    version: '2.0.0-userId-fix-detailed-errors',
    buildTime: '2024-10-30T20:00:00Z',
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
app.use('/api/admin', adminRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/fix-nomina', fixNominaRoutes);
app.use('/api/fix-remesas-traspasos', fixRemesasTraspasosRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server - bind to 0.0.0.0 for Railway/Docker
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AiFinity.app API server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔒 JWT: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});


