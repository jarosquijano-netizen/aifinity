/**
 * Pending Payments Service
 * Identifies recurring payments and calculates what's pending
 */

export class PendingPaymentsService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get current balance for user
   * @param {string|number} userId - User ID
   * @returns {Promise<number>} - Current balance
   */
  async getCurrentBalance(userId) {
    try {
      // Try bank_accounts first, fallback to accounts
      let result;
      try {
        result = await this.db.query(
          `SELECT 
            SUM(CASE WHEN account_type != 'credit' THEN balance ELSE 0 END) as total_balance,
            SUM(CASE WHEN account_type = 'credit' THEN ABS(balance) ELSE 0 END) as credit_debt
          FROM bank_accounts 
          WHERE (user_id = $1 OR user_id IS NULL)
          AND (exclude_from_stats = false OR exclude_from_stats IS NULL)`,
          [userId]
        );
      } catch (error) {
        if (error.message.includes('does not exist')) {
          // Fallback to accounts table
          result = await this.db.query(
            `SELECT 
              SUM(CASE WHEN account_type != 'credit' THEN balance ELSE 0 END) as total_balance,
              SUM(CASE WHEN account_type = 'credit' THEN ABS(balance) ELSE 0 END) as credit_debt
            FROM accounts 
            WHERE (user_id = $1 OR user_id IS NULL)
            AND (exclude_from_stats = false OR exclude_from_stats IS NULL)`,
            [userId]
          );
        } else {
          throw error;
        }
      }

      const totalBalance = parseFloat(result.rows[0]?.total_balance || 0);
      const creditDebt = parseFloat(result.rows[0]?.credit_debt || 0);
      
      return totalBalance - creditDebt;
    } catch (error) {
      console.error('Error getting current balance:', error);
      return 0;
    }
  }

  /**
   * Identify recurring payments based on transaction history
   * @param {string|number} userId - User ID
   * @returns {Promise<Array>} - Array of recurring payment patterns
   */
  async identifyRecurringPayments(userId) {
    try {
      const query = `
        SELECT 
          description,
          category,
          AVG(ABS(amount)) as avg_amount,
          EXTRACT(DAY FROM date)::INTEGER as typical_day,
          COUNT(*) as frequency,
          MAX(date) as last_payment,
          MIN(date) as first_payment
        FROM transactions
        WHERE (user_id IS NULL OR user_id = $1)
          AND amount < 0
          AND computable = true
          AND date >= NOW() - INTERVAL '6 months'
        GROUP BY description, category, EXTRACT(DAY FROM date)
        HAVING COUNT(*) >= 3  -- Al menos 3 veces en 6 meses
        ORDER BY typical_day ASC
      `;
      
      const result = await this.db.query(query, [userId]);
      return result.rows.map(row => ({
        description: row.description,
        category: row.category || 'Uncategorized',
        avgAmount: parseFloat(row.avg_amount || 0),
        typicalDay: parseInt(row.typical_day || 0),
        frequency: parseInt(row.frequency || 0),
        lastPayment: row.last_payment,
        firstPayment: row.first_payment
      }));
    } catch (error) {
      console.error('Error identifying recurring payments:', error);
      return [];
    }
  }

  /**
   * Get pending payments for current month
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} - Pending payments data
   */
  async getPendingPayments(userId) {
    try {
      const recurringPayments = await this.identifyRecurringPayments(userId);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      const currentYear = currentDate.getFullYear();
      const currentDay = currentDate.getDate();

      // Get payments already made this month
      const paidThisMonth = await this.db.query(
        `SELECT DISTINCT description, SUM(ABS(amount)) as total_paid
        FROM transactions
        WHERE (user_id IS NULL OR user_id = $1)
          AND EXTRACT(MONTH FROM date) = $2
          AND EXTRACT(YEAR FROM date) = $3
          AND amount < 0
          AND computable = true
        GROUP BY description`,
        [userId, currentMonth, currentYear]
      );

      const paidDescriptions = new Set(
        paidThisMonth.rows.map(r => r.description.toLowerCase().trim())
      );

      // Filter pending payments
      // A payment is pending if:
      // 1. It hasn't been paid this month, OR
      // 2. It's typically paid on a day that hasn't arrived yet this month
      const pending = recurringPayments.filter(payment => {
        const descriptionLower = payment.description.toLowerCase().trim();
        const alreadyPaid = paidDescriptions.has(descriptionLower);
        
        // If already paid this month, not pending
        if (alreadyPaid) {
          return false;
        }
        
        // If typical day hasn't passed yet, it's pending
        // Also include if it's typically paid around this time (within 5 days)
        const daysUntilTypical = payment.typicalDay - currentDay;
        return daysUntilTypical >= -5; // Include payments due within 5 days
      });

      // Sort by typical day
      pending.sort((a, b) => a.typicalDay - b.typicalDay);

      const totalAmount = pending.reduce((sum, p) => sum + p.avgAmount, 0);

      return {
        pending: pending.map(p => ({
          description: p.description,
          category: p.category,
          amount: p.avgAmount,
          typicalDay: p.typicalDay,
          daysUntil: p.typicalDay - currentDay,
          frequency: p.frequency
        })),
        totalAmount,
        count: pending.length,
        currentDay,
        currentMonth,
        currentYear
      };
    } catch (error) {
      console.error('Error getting pending payments:', error);
      return {
        pending: [],
        totalAmount: 0,
        count: 0,
        currentDay: new Date().getDate(),
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear()
      };
    }
  }

  /**
   * Calculate available to spend TODAY
   * @param {string|number} userId - User ID
   * @param {number} safetyBufferPercent - Safety buffer percentage (default 10%)
   * @returns {Promise<Object>} - Available spending data
   */
  async getAvailableToSpend(userId, safetyBufferPercent = 10) {
    try {
      // Get current balance
      const balance = await this.getCurrentBalance(userId);

      // Get pending payments
      const { totalAmount: pendingPayments, count: pendingCount } = 
        await this.getPendingPayments(userId);

      // Calculate safety buffer
      const safetyBuffer = balance * (safetyBufferPercent / 100);

      // Calculate days remaining in month
      const today = new Date();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const daysRemaining = lastDay.getDate() - today.getDate();

      // Calculate available amount
      const available = balance - pendingPayments - safetyBuffer;
      const dailyBudget = daysRemaining > 0 ? available / daysRemaining : available;

      return {
        totalAvailable: Math.max(0, available),
        dailyRecommended: Math.max(0, dailyBudget),
        currentBalance: balance,
        pendingPayments,
        pendingCount,
        safetyBuffer,
        daysRemaining,
        safetyBufferPercent
      };
    } catch (error) {
      console.error('Error calculating available to spend:', error);
      return {
        totalAvailable: 0,
        dailyRecommended: 0,
        currentBalance: 0,
        pendingPayments: 0,
        pendingCount: 0,
        safetyBuffer: 0,
        daysRemaining: 0,
        safetyBufferPercent
      };
    }
  }

  /**
   * Check if user can afford a specific amount
   * @param {string|number} userId - User ID
   * @param {number} amount - Amount to check
   * @returns {Promise<Object>} - Affordability analysis
   */
  async checkAffordability(userId, amount) {
    try {
      const availableData = await this.getAvailableToSpend(userId);
      const canAfford = availableData.totalAvailable >= amount;
      const remainingAfter = availableData.totalAvailable - amount;

      return {
        canAfford,
        requestedAmount: amount,
        available: availableData.totalAvailable,
        remainingAfter: Math.max(0, remainingAfter),
        impact: canAfford 
          ? `Puedes permitírtelo. Te quedarían €${remainingAfter.toFixed(2)} disponibles.`
          : `No puedes permitírtelo. Te faltan €${Math.abs(remainingAfter).toFixed(2)}.`,
        dailyBudgetAfter: availableData.daysRemaining > 0 
          ? Math.max(0, remainingAfter / availableData.daysRemaining)
          : 0,
        ...availableData
      };
    } catch (error) {
      console.error('Error checking affordability:', error);
      return {
        canAfford: false,
        requestedAmount: amount,
        available: 0,
        remainingAfter: -amount,
        impact: 'Error al calcular disponibilidad.',
        error: error.message
      };
    }
  }
}

export default PendingPaymentsService;
