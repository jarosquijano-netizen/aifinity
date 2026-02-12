import pool from '../config/database.js';

class SpendingPredictionService {

  /**
   * Get available balance from accounts NOT excluded from statistics
   */
  async getAvailableBalance(userId) {
    const query = `
      SELECT COALESCE(SUM(balance), 0) as available_balance
      FROM bank_accounts
      WHERE (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
      AND (exclude_from_stats = false OR exclude_from_stats IS NULL)
    `;
    const result = await pool.query(query, [userId]);
    return parseFloat(result.rows[0]?.available_balance || 0);
  }

  /**
   * Get total spending for current month
   */
  async getMonthSpending(userId) {
    const query = `
      SELECT COALESCE(SUM(t.amount), 0) as total_spent
      FROM transactions t
      LEFT JOIN bank_accounts a ON t.account_id = a.id
      WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
      AND t.type = 'expense'
      AND t.computable = true
      AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
      AND (t.account_id IS NULL OR a.exclude_from_stats = false OR a.exclude_from_stats IS NULL)
    `;
    const result = await pool.query(query, [userId]);
    return parseFloat(result.rows[0]?.total_spent || 0);
  }

  /**
   * Analyze spending pattern by period (early/mid/late month) over last N months
   */
  async getSpendingPattern(userId, monthsBack = 3) {
    const query = `
      SELECT
        CASE
          WHEN EXTRACT(DAY FROM t.date) BETWEEN 1 AND 10 THEN 'early'
          WHEN EXTRACT(DAY FROM t.date) BETWEEN 11 AND 20 THEN 'mid'
          ELSE 'late'
        END as period,
        TO_CHAR(t.date, 'YYYY-MM') as month,
        SUM(t.amount) as total,
        COUNT(*) as num_transactions,
        AVG(t.amount) as avg_transaction
      FROM transactions t
      LEFT JOIN bank_accounts a ON t.account_id = a.id
      WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
        AND t.type = 'expense'
        AND t.computable = true
        AND t.date >= CURRENT_DATE - INTERVAL '${monthsBack} months'
        AND DATE_TRUNC('month', t.date) < DATE_TRUNC('month', CURRENT_DATE)
        AND (t.account_id IS NULL OR a.exclude_from_stats = false OR a.exclude_from_stats IS NULL)
      GROUP BY period, month
      ORDER BY month, period
    `;
    const result = await pool.query(query, [userId]);

    // Calculate averages per period
    const periodStats = { early: [], mid: [], late: [] };
    result.rows.forEach(row => {
      if (periodStats[row.period]) {
        periodStats[row.period].push(parseFloat(row.total));
      }
    });

    return {
      early: {
        avg: periodStats.early.length > 0 ? periodStats.early.reduce((a, b) => a + b, 0) / periodStats.early.length : 0,
        values: periodStats.early
      },
      mid: {
        avg: periodStats.mid.length > 0 ? periodStats.mid.reduce((a, b) => a + b, 0) / periodStats.mid.length : 0,
        values: periodStats.mid
      },
      late: {
        avg: periodStats.late.length > 0 ? periodStats.late.reduce((a, b) => a + b, 0) / periodStats.late.length : 0,
        values: periodStats.late
      },
      raw: result.rows
    };
  }

  /**
   * Detect recurring expenses by analyzing patterns in description, amount, and day
   */
  async detectRecurringExpenses(userId) {
    const query = `
      WITH monthly_expenses AS (
        SELECT
          t.description,
          t.amount,
          EXTRACT(DAY FROM t.date) as day_of_month,
          TO_CHAR(t.date, 'YYYY-MM') as month,
          t.category
        FROM transactions t
        LEFT JOIN bank_accounts a ON t.account_id = a.id
        WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
          AND t.type = 'expense'
          AND t.computable = true
          AND t.date >= CURRENT_DATE - INTERVAL '4 months'
          AND (t.account_id IS NULL OR a.exclude_from_stats = false OR a.exclude_from_stats IS NULL)
      ),
      recurring_candidates AS (
        SELECT
          description,
          category,
          COUNT(DISTINCT month) as months_appeared,
          AVG(amount) as avg_amount,
          STDDEV(amount) as amount_stddev,
          AVG(day_of_month) as avg_day,
          STDDEV(day_of_month) as day_stddev,
          MAX(month) as last_seen
        FROM monthly_expenses
        GROUP BY description, category
        HAVING COUNT(DISTINCT month) >= 2
      )
      SELECT
        description,
        category,
        months_appeared,
        ROUND(avg_amount::numeric, 2) as estimated_amount,
        ROUND(avg_day) as expected_day,
        COALESCE(amount_stddev, 0) as amount_stddev,
        COALESCE(day_stddev, 0) as day_stddev,
        last_seen,
        ROUND(
          LEAST(100, months_appeared * 25 +
          CASE WHEN COALESCE(amount_stddev, 0) < avg_amount * 0.1 THEN 20 ELSE 0 END +
          CASE WHEN COALESCE(day_stddev, 0) < 3 THEN 15 ELSE 0 END)
        ) as confidence_pct
      FROM recurring_candidates
      ORDER BY avg_day
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => ({
      description: row.description,
      category: row.category,
      estimatedAmount: parseFloat(row.estimated_amount),
      expectedDay: parseInt(row.expected_day),
      confidence: parseInt(row.confidence_pct),
      monthsAppeared: parseInt(row.months_appeared)
    }));
  }

  /**
   * Get pending recurring expenses (those expected after today)
   */
  async getPendingRecurringExpenses(userId, currentDay) {
    const allRecurring = await this.detectRecurringExpenses(userId);
    const pending = allRecurring.filter(expense => expense.expectedDay > currentDay);
    const total = pending.reduce((sum, exp) => sum + exp.estimatedAmount, 0);

    return {
      items: pending,
      total: total
    };
  }

  /**
   * Estimate variable spending for remaining days based on historical patterns
   */
  async estimateVariableSpending(userId, currentDay, daysRemaining) {
    // Get average daily spending for the remaining period from historical data
    const query = `
      SELECT
        AVG(daily_spend) as avg_daily
      FROM (
        SELECT
          DATE(t.date) as spend_date,
          SUM(t.amount) as daily_spend
        FROM transactions t
        LEFT JOIN bank_accounts a ON t.account_id = a.id
        WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
          AND t.type = 'expense'
          AND t.computable = true
          AND t.date >= CURRENT_DATE - INTERVAL '3 months'
          AND DATE_TRUNC('month', t.date) < DATE_TRUNC('month', CURRENT_DATE)
          AND EXTRACT(DAY FROM t.date) > $2
          AND (t.account_id IS NULL OR a.exclude_from_stats = false OR a.exclude_from_stats IS NULL)
        GROUP BY DATE(t.date)
      ) daily_totals
    `;
    const result = await pool.query(query, [userId, currentDay]);
    const avgDaily = parseFloat(result.rows[0]?.avg_daily || 0);

    return avgDaily * daysRemaining;
  }

  /**
   * Get monthly budget total
   */
  async getMonthlyBudget(userId) {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total_budget
      FROM budgets
      WHERE (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
    `;
    const result = await pool.query(query, [userId]);
    return parseFloat(result.rows[0]?.total_budget || 0);
  }

  /**
   * Get daily cumulative spending for current month (actual data)
   */
  async getDailyActualSpending(userId) {
    const query = `
      SELECT
        EXTRACT(DAY FROM t.date)::int as day,
        SUM(t.amount) as daily_total
      FROM transactions t
      LEFT JOIN bank_accounts a ON t.account_id = a.id
      WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
        AND t.type = 'expense'
        AND t.computable = true
        AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
        AND (t.account_id IS NULL OR a.exclude_from_stats = false OR a.exclude_from_stats IS NULL)
      GROUP BY EXTRACT(DAY FROM t.date)
      ORDER BY day
    `;
    const result = await pool.query(query, [userId]);

    // Build cumulative array
    const dailyData = {};
    let cumulative = 0;
    result.rows.forEach(row => {
      cumulative += parseFloat(row.daily_total);
      dailyData[row.day] = cumulative;
    });

    return dailyData;
  }

  /**
   * Get historical monthly spending curves for comparison
   */
  async getHistoricalComparison(userId, monthsBack = 3) {
    const query = `
      SELECT
        TO_CHAR(t.date, 'YYYY-MM') as month,
        EXTRACT(DAY FROM t.date)::int as day,
        SUM(t.amount) as daily_total
      FROM transactions t
      LEFT JOIN bank_accounts a ON t.account_id = a.id
      WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
        AND t.type = 'expense'
        AND t.computable = true
        AND t.date >= CURRENT_DATE - INTERVAL '${monthsBack} months'
        AND DATE_TRUNC('month', t.date) < DATE_TRUNC('month', CURRENT_DATE)
        AND (t.account_id IS NULL OR a.exclude_from_stats = false OR a.exclude_from_stats IS NULL)
      GROUP BY TO_CHAR(t.date, 'YYYY-MM'), EXTRACT(DAY FROM t.date)
      ORDER BY month, day
    `;
    const result = await pool.query(query, [userId]);

    // Organize by month with cumulative values
    const monthlyData = {};
    result.rows.forEach(row => {
      if (!monthlyData[row.month]) {
        monthlyData[row.month] = { cumulative: 0, days: {} };
      }
      monthlyData[row.month].cumulative += parseFloat(row.daily_total);
      monthlyData[row.month].days[row.day] = monthlyData[row.month].cumulative;
    });

    return monthlyData;
  }

  /**
   * Calculate confidence level based on data availability
   */
  calculateConfidence(monthsOfData, recurringExpensesCount) {
    let confidence = 0;

    // More months = higher confidence
    confidence += Math.min(40, monthsOfData * 15);

    // More recurring patterns detected = higher confidence
    confidence += Math.min(30, recurringExpensesCount * 5);

    // Base confidence
    confidence += 20;

    return Math.min(100, confidence);
  }

  /**
   * Generate daily projection data for chart
   */
  async getDailyProjection(userId, currentDay, daysInMonth, pendingRecurring, estimatedVariable) {
    const actualSpending = await this.getDailyActualSpending(userId);
    const historicalData = await this.getHistoricalComparison(userId, 2);

    const projection = [];
    let lastActual = 0;

    // Get previous months for comparison
    const prevMonths = Object.keys(historicalData).sort().slice(-2);

    for (let day = 1; day <= daysInMonth; day++) {
      const dataPoint = { day };

      if (day <= currentDay) {
        // Actual data
        const actual = actualSpending[day] || lastActual;
        dataPoint.actual = actual;
        dataPoint.predicted = null;
        lastActual = actual;
      } else {
        // Predicted data
        dataPoint.actual = null;

        // Calculate predicted spending for this day
        const daysFromNow = day - currentDay;
        const dailyRate = estimatedVariable / (daysInMonth - currentDay);

        // Add any recurring payments expected on this day
        const recurringOnDay = pendingRecurring.items
          .filter(r => r.expectedDay === day)
          .reduce((sum, r) => sum + r.estimatedAmount, 0);

        const predictedIncrement = dailyRate + recurringOnDay;
        const predicted = lastActual + (daysFromNow * dailyRate) +
          pendingRecurring.items
            .filter(r => r.expectedDay > currentDay && r.expectedDay <= day)
            .reduce((sum, r) => sum + r.estimatedAmount, 0);

        dataPoint.predicted = Math.round(predicted * 100) / 100;

        // Confidence band (±15%)
        dataPoint.predictedHigh = Math.round(predicted * 1.15 * 100) / 100;
        dataPoint.predictedLow = Math.round(predicted * 0.85 * 100) / 100;
      }

      // Add historical comparison
      prevMonths.forEach((month, idx) => {
        const monthData = historicalData[month];
        if (monthData && monthData.days[day]) {
          dataPoint[`prevMonth${idx + 1}`] = monthData.days[day];
        }
      });

      projection.push(dataPoint);
    }

    return projection;
  }

  /**
   * Main prediction generation method
   */
  async generatePrediction(userId) {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;

    // Get all the data
    const [
      availableBalance,
      spentThisMonth,
      pendingRecurring,
      estimatedVariable,
      monthlyBudget,
      allRecurring,
      spendingPattern
    ] = await Promise.all([
      this.getAvailableBalance(userId),
      this.getMonthSpending(userId),
      this.getPendingRecurringExpenses(userId, dayOfMonth),
      this.estimateVariableSpending(userId, dayOfMonth, daysRemaining),
      this.getMonthlyBudget(userId),
      this.detectRecurringExpenses(userId),
      this.getSpendingPattern(userId, 3)
    ]);

    // Calculate totals
    const totalPredictedRemaining = pendingRecurring.total + estimatedVariable;
    const projectedEndBalance = availableBalance - totalPredictedRemaining;
    const freeToSpend = Math.max(0, availableBalance - pendingRecurring.total - (estimatedVariable * 0.5));

    // Budget comparison
    const projectedTotalSpend = spentThisMonth + totalPredictedRemaining;
    const projectedOverspend = Math.max(0, projectedTotalSpend - monthlyBudget);

    // Get projection data for chart
    const dailyProjection = await this.getDailyProjection(
      userId, dayOfMonth, daysInMonth, pendingRecurring, estimatedVariable
    );

    // Historical comparison
    const historicalComparison = await this.getHistoricalComparison(userId, 3);

    // Calculate confidence
    const monthsOfData = Object.keys(historicalComparison).length;
    const confidence = this.calculateConfidence(monthsOfData, allRecurring.length);

    return {
      // Current state
      currentBalance: availableBalance,
      spentSoFar: spentThisMonth,
      daysRemaining,
      dayOfMonth,
      daysInMonth,

      // Predictions
      pendingRecurring: pendingRecurring.items,
      pendingRecurringTotal: pendingRecurring.total,
      estimatedVariableSpending: Math.round(estimatedVariable * 100) / 100,
      totalPredictedRemaining: Math.round(totalPredictedRemaining * 100) / 100,

      // Results
      projectedEndOfMonthBalance: Math.round(projectedEndBalance * 100) / 100,
      freeToSpend: Math.round(freeToSpend * 100) / 100,

      // Budget
      monthlyBudget,
      projectedTotalSpend: Math.round(projectedTotalSpend * 100) / 100,
      projectedOverspend: Math.round(projectedOverspend * 100) / 100,
      willExceedBudget: monthlyBudget > 0 && projectedOverspend > 0,
      budgetProgress: monthlyBudget > 0 ? Math.round((projectedTotalSpend / monthlyBudget) * 100) : 0,

      // Confidence
      confidence,
      monthsOfData,

      // Chart data
      dailyProjection,
      historicalMonths: Object.keys(historicalComparison).sort(),

      // Spending pattern
      spendingPattern
    };
  }
}

export default new SpendingPredictionService();
