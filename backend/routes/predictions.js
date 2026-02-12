import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import spendingPredictionService from '../services/spendingPredictionService.js';

const router = express.Router();

/**
 * GET /api/predictions/spending
 * Get spending prediction for current month
 */
router.get('/spending', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;

    const prediction = await spendingPredictionService.generatePrediction(userId);

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Error generating spending prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate spending prediction',
      message: error.message
    });
  }
});

/**
 * GET /api/predictions/recurring
 * Get detected recurring expenses
 */
router.get('/recurring', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;

    const recurring = await spendingPredictionService.detectRecurringExpenses(userId);

    res.json({
      success: true,
      data: recurring
    });
  } catch (error) {
    console.error('Error detecting recurring expenses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect recurring expenses',
      message: error.message
    });
  }
});

/**
 * GET /api/predictions/pattern
 * Get spending pattern analysis
 */
router.get('/pattern', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const monthsBack = parseInt(req.query.months) || 3;

    const pattern = await spendingPredictionService.getSpendingPattern(userId, monthsBack);

    res.json({
      success: true,
      data: pattern
    });
  } catch (error) {
    console.error('Error analyzing spending pattern:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze spending pattern',
      message: error.message
    });
  }
});

export default router;
