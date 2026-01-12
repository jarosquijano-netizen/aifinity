/**
 * Debt Analysis Service
 * Analyzes debt, credit cards, and provides debt management insights
 */

export class DebtAnalysisService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all debt information for user
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} - Debt analysis data
   */
  async getDebtAnalysis(userId) {
    try {
      // Get credit card accounts
      let accountsResult;
      try {
        accountsResult = await this.db.query(
          `SELECT id, name, account_type, balance, credit_limit, exclude_from_stats
           FROM bank_accounts 
           WHERE (user_id = $1 OR user_id IS NULL)
           AND account_type = 'credit'
           AND (exclude_from_stats = false OR exclude_from_stats IS NULL)
           ORDER BY ABS(balance) DESC`,
          [userId]
        );
      } catch (error) {
        if (error.message.includes('does not exist')) {
          accountsResult = await this.db.query(
            `SELECT id, name, account_type, balance, credit_limit, exclude_from_stats
             FROM accounts 
             WHERE (user_id = $1 OR user_id IS NULL)
             AND account_type = 'credit'
             AND (exclude_from_stats = false OR exclude_from_stats IS NULL)
             ORDER BY ABS(balance) DESC`,
            [userId]
          );
        } else {
          throw error;
        }
      }

      const creditCards = accountsResult.rows.map(card => ({
        id: card.id,
        name: card.name,
        balance: parseFloat(card.balance || 0),
        debt: Math.abs(parseFloat(card.balance || 0)),
        creditLimit: parseFloat(card.credit_limit || 0),
        utilization: parseFloat(card.credit_limit || 0) > 0 
          ? (Math.abs(parseFloat(card.balance || 0)) / parseFloat(card.credit_limit || 0)) * 100 
          : 0
      }));

      // Calculate totals
      const totalDebt = creditCards.reduce((sum, card) => sum + card.debt, 0);
      const totalCreditLimit = creditCards.reduce((sum, card) => sum + card.creditLimit, 0);
      const totalAvailableCredit = totalCreditLimit - totalDebt;
      const overallUtilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit) * 100 : 0;

      // Estimate minimum payments (typically 2% of balance or €25 minimum)
      const minimumPayments = creditCards.reduce((sum, card) => {
        return sum + Math.max(card.debt * 0.02, 25);
      }, 0);

      // Estimate interest (assuming 18% APR average)
      const monthlyInterestRate = 0.18 / 12;
      const monthlyInterestCost = totalDebt * monthlyInterestRate;
      const annualInterestCost = totalDebt * 0.18;

      // Calculate payoff scenarios
      const payoffScenarios = this.calculatePayoffScenarios(totalDebt, minimumPayments);

      return {
        creditCards,
        totalDebt,
        totalCreditLimit,
        totalAvailableCredit,
        overallUtilization,
        minimumPayments,
        monthlyInterestCost,
        annualInterestCost,
        payoffScenarios,
        cardCount: creditCards.length,
        hasDebt: totalDebt > 0
      };
    } catch (error) {
      console.error('Error getting debt analysis:', error);
      return {
        creditCards: [],
        totalDebt: 0,
        totalCreditLimit: 0,
        totalAvailableCredit: 0,
        overallUtilization: 0,
        minimumPayments: 0,
        monthlyInterestCost: 0,
        annualInterestCost: 0,
        payoffScenarios: {},
        cardCount: 0,
        hasDebt: false
      };
    }
  }

  /**
   * Calculate debt payoff scenarios
   * @param {number} totalDebt - Total debt amount
   * @param {number} minimumPayment - Minimum monthly payment
   * @returns {Object} - Payoff scenarios
   */
  calculatePayoffScenarios(totalDebt, minimumPayment) {
    if (totalDebt <= 0) {
      return {
        minimumPayment: { months: 0, totalPaid: 0 },
        doubleMinimum: { months: 0, totalPaid: 0 },
        aggressive: { months: 0, totalPaid: 0 }
      };
    }

    const monthlyInterestRate = 0.18 / 12; // 18% APR

    // Scenario 1: Minimum payments only
    const minMonths = this.calculatePayoffMonths(totalDebt, minimumPayment, monthlyInterestRate);
    const minTotalPaid = this.calculateTotalPaid(totalDebt, minimumPayment, minMonths, monthlyInterestRate);

    // Scenario 2: Double minimum payments
    const doubleMin = minimumPayment * 2;
    const doubleMonths = this.calculatePayoffMonths(totalDebt, doubleMin, monthlyInterestRate);
    const doubleTotalPaid = this.calculateTotalPaid(totalDebt, doubleMin, doubleMonths, monthlyInterestRate);

    // Scenario 3: Aggressive (€500/month or 10% of debt, whichever is higher)
    const aggressivePayment = Math.max(500, totalDebt * 0.10);
    const aggressiveMonths = this.calculatePayoffMonths(totalDebt, aggressivePayment, monthlyInterestRate);
    const aggressiveTotalPaid = this.calculateTotalPaid(totalDebt, aggressivePayment, aggressiveMonths, monthlyInterestRate);

    return {
      minimumPayment: {
        months: Math.ceil(minMonths),
        totalPaid: minTotalPaid,
        monthlyPayment: minimumPayment
      },
      doubleMinimum: {
        months: Math.ceil(doubleMonths),
        totalPaid: doubleTotalPaid,
        monthlyPayment: doubleMin
      },
      aggressive: {
        months: Math.ceil(aggressiveMonths),
        totalPaid: aggressiveTotalPaid,
        monthlyPayment: aggressivePayment
      }
    };
  }

  /**
   * Calculate months to payoff debt
   * @param {number} principal - Initial debt
   * @param {number} monthlyPayment - Monthly payment amount
   * @param {number} monthlyRate - Monthly interest rate
   * @returns {number} - Months to payoff
   */
  calculatePayoffMonths(principal, monthlyPayment, monthlyRate) {
    if (monthlyPayment <= principal * monthlyRate) {
      // Payment doesn't cover interest, debt will grow
      return Infinity;
    }

    if (monthlyRate === 0) {
      return principal / monthlyPayment;
    }

    return -Math.log(1 - (principal * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
  }

  /**
   * Calculate total amount paid including interest
   * @param {number} principal - Initial debt
   * @param {number} monthlyPayment - Monthly payment amount
   * @param {number} months - Number of months
   * @param {number} monthlyRate - Monthly interest rate
   * @returns {number} - Total paid
   */
  calculateTotalPaid(principal, monthlyPayment, months, monthlyRate) {
    if (months === Infinity) {
      return Infinity;
    }

    return monthlyPayment * months;
  }

  /**
   * Get debt by category (if transactions have debt-related categories)
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} - Debt breakdown by category
   */
  async getDebtByCategory(userId) {
    try {
      const result = await this.db.query(
        `SELECT category, SUM(ABS(amount)) as total_debt, COUNT(*) as transaction_count
         FROM transactions
         WHERE (user_id IS NULL OR user_id = $1)
           AND account_id IN (
             SELECT id FROM bank_accounts WHERE account_type = 'credit'
             UNION
             SELECT id FROM accounts WHERE account_type = 'credit'
           )
           AND amount < 0
           AND computable = true
           AND date >= NOW() - INTERVAL '12 months'
         GROUP BY category
         ORDER BY total_debt DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        category: row.category || 'Uncategorized',
        totalDebt: parseFloat(row.total_debt || 0),
        transactionCount: parseInt(row.transaction_count || 0)
      }));
    } catch (error) {
      console.error('Error getting debt by category:', error);
      return [];
    }
  }
}

export default DebtAnalysisService;
