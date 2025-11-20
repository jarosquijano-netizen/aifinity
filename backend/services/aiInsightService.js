/**
 * AI Insight Service for Budget Categories
 * Smart two-tier system: Templates (70%) + AI (30%) for cost optimization
 */

import { getCategoryBenchmark, getBenchmark } from '../data/benchmarks.js';
import { getTemplateInsight } from './insightTemplates.js';
import pool from '../config/database.js';

class AIInsightService {
  constructor() {
    this.cache = new Map(); // Cache insights for 24 hours
  }

  /**
   * Generate insight for a category
   * @param {object} categoryData - Category spending data
   * @param {object} userProfile - User profile (familySize, monthlyIncome, location)
   * @param {boolean} useAI - Whether to use AI or templates
   * @returns {Promise<string>} Insight text
   */
  async generateInsight(categoryData, userProfile, useAI = true) {
    // Check cache first
    const cacheKey = `${categoryData.category}_${categoryData.spent}_${categoryData.budget}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let insight;

    // Decide: Use AI or template?
    if (useAI && this.shouldUseAI(categoryData)) {
      // Use Claude API for complex/important insights
      insight = await this.generateCategoryInsight(categoryData, userProfile);
    } else {
      // Use template for simple cases (saves costs)
      const status = this.getStatus(categoryData);
      const enrichedData = {
        ...categoryData,
        familySize: userProfile?.familySize || 1,
        monthlyIncome: userProfile?.monthlyIncome || 3000,
        ages: userProfile?.ages || [],
        averageTransaction: categoryData.spent / (categoryData.transactionCount || 1),
        remaining: (categoryData.budget || 0) - categoryData.spent
      };
      insight = getTemplateInsight(status, categoryData.category, enrichedData) || 
                this.getFallbackInsight(enrichedData);
    }

    // Cache the result (24 hours)
    this.cache.set(cacheKey, insight);
    setTimeout(() => this.cache.delete(cacheKey), 24 * 60 * 60 * 1000);

    return insight;
  }

  /**
   * Determine if AI should be used (vs template)
   */
  shouldUseAI(categoryData) {
    // Use AI for:
    // 1. Over budget categories (most important)
    // 2. High-value categories (>500€ spent)
    // 3. Categories with unusual patterns
    
    if (categoryData.percentage >= 100) return true;
    if (categoryData.spent > 500) return true;
    if (categoryData.transactionCount > 20) return true;
    
    return false;
  }

  /**
   * Generate insight using Claude API with retry logic for 529 errors
   */
  async generateCategoryInsight(categoryData, userProfile, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000; // Start with 1 second

    try {
      // Get user's Claude API key
      const userId = userProfile?.userId;
      const apiKey = await this.getClaudeAPIKey(userId);
      
      if (!apiKey) {
        // Fallback to template if no API key
        const status = this.getStatus(categoryData);
        const enrichedData = {
          ...categoryData,
          familySize: userProfile?.familySize || 1,
          monthlyIncome: userProfile?.monthlyIncome || 3000,
          averageTransaction: categoryData.spent / (categoryData.transactionCount || 1),
          remaining: (categoryData.budget || 0) - categoryData.spent
        };
        return getTemplateInsight(status, categoryData.category, enrichedData) || 
               this.getFallbackInsight(enrichedData);
      }

      const prompt = this.buildInsightPrompt(categoryData, userProfile);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Using Haiku for cost efficiency
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        // Retry logic for 529 (Overloaded) errors
        if (response.status === 529 && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff: 1s, 2s, 4s
          console.log(`⚠️ Claude API overloaded (529) for insight generation. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateCategoryInsight(categoryData, userProfile, retryCount + 1);
        }
        
        // For other errors, throw immediately
        if (response.status === 529) {
          throw new Error('Claude API is currently overloaded. Using template insight instead.');
        }
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text.trim();
    } catch (error) {
      // If it's a 529 error and we haven't exhausted retries, retry
      if (error.message.includes('529') && !error.message.includes('overloaded') && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`⚠️ Claude API overloaded (529) for insight generation. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateCategoryInsight(categoryData, userProfile, retryCount + 1);
      }
      
      console.error('Error generating AI insight:', error);
      // Fallback to template
      const status = this.getStatus(categoryData);
      const enrichedData = {
        ...categoryData,
        familySize: userProfile?.familySize || 1,
        monthlyIncome: userProfile?.monthlyIncome || 3000,
        averageTransaction: categoryData.spent / (categoryData.transactionCount || 1),
        remaining: (categoryData.budget || 0) - categoryData.spent
      };
      return getTemplateInsight(status, categoryData.category, enrichedData) || 
             this.getFallbackInsight(enrichedData);
    }
  }

  /**
   * Build prompt for Claude API
   */
  buildInsightPrompt(categoryData, userProfile) {
    const benchmark = getCategoryBenchmark(categoryData.category, userProfile);
    const ageContext = this.getAgeContext(userProfile?.ages || []);
    
    return `You are a financial advisor analyzing spending patterns. Provide a brief, actionable insight (2-3 sentences max) for this budget category.

CATEGORY: ${categoryData.category}
BUDGET: ${categoryData.budget || 0}€
SPENT: ${categoryData.spent}€
PERCENTAGE: ${categoryData.percentage?.toFixed(0) || 0}%
TRANSACTION COUNT: ${categoryData.transactionCount || 0}
AVERAGE TRANSACTION: ${(categoryData.spent / (categoryData.transactionCount || 1)).toFixed(2)}€

USER CONTEXT:
- Family size: ${userProfile?.familySize || 'Not specified'}
- Monthly income: ${userProfile?.monthlyIncome || 'Not specified'}€
- Location: ${userProfile?.location || 'Spain'}
- Previous month spending in this category: ${categoryData.previousMonth || 'N/A'}€
${ageContext}

INDUSTRY BENCHMARKS:
${benchmark}

Provide insight that:
1. Compares to benchmarks/averages
2. Identifies if this is normal, concerning, or excellent
3. Gives ONE specific, actionable recommendation
4. Considers their income/family context${ageContext ? ' AND ages (e.g., expenses for a 4-year-old vs 15-year-old differ significantly)' : ''}
${ageContext ? '5. Specifically consider age-related expenses (children\'s clothing, activities, education costs vary by age)' : ''}

Format: Direct, friendly tone. Max 150 characters for mobile display. Include emoji at start.`;
  }
  
  /**
   * Get age context string for prompt
   */
  getAgeContext(ages) {
    if (!ages || ages.length === 0) return '';
    
    const validAges = ages.filter(age => age !== null && age !== undefined);
    if (validAges.length === 0) return '';
    
    // Categorize ages
    const babies = validAges.filter(a => a < 3).length;
    const toddlers = validAges.filter(a => a >= 3 && a < 6).length;
    const children = validAges.filter(a => a >= 6 && a < 13).length;
    const teens = validAges.filter(a => a >= 13 && a < 18).length;
    const adults = validAges.filter(a => a >= 18).length;
    
    let context = '- Family ages: ';
    const parts = [];
    if (babies > 0) parts.push(`${babies} baby/babies (0-2)`);
    if (toddlers > 0) parts.push(`${toddlers} toddler(s) (3-5)`);
    if (children > 0) parts.push(`${children} child/children (6-12)`);
    if (teens > 0) parts.push(`${teens} teen(s) (13-17)`);
    if (adults > 0) parts.push(`${adults} adult(s) (18+)`);
    
    if (parts.length === 0) return '';
    
    context += parts.join(', ');
    context += `\n- Age breakdown matters: Expenses differ significantly by age (e.g., a 4-year-old needs different clothing/activities than a 15-year-old)`;
    
    return context;
  }

  /**
   * Get Claude API key for user
   */
  async getClaudeAPIKey(userId) {
    try {
      if (!userId) {
        // Try to get shared config
        const result = await pool.query(
          `SELECT api_key FROM ai_config 
           WHERE provider = 'claude' AND user_id IS NULL AND is_active = true 
           LIMIT 1`
        );
        return result.rows[0]?.api_key || null;
      }

      // Get user's config
      const result = await pool.query(
        `SELECT api_key FROM ai_config 
         WHERE provider = 'claude' AND user_id = $1 AND is_active = true 
         LIMIT 1`,
        [userId]
      );
      return result.rows[0]?.api_key || null;
    } catch (error) {
      console.error('Error getting Claude API key:', error);
      return null;
    }
  }

  /**
   * Get status for category
   */
  getStatus(categoryData) {
    if (!categoryData.budget || categoryData.budget === 0) return 'noBudget';
    if (categoryData.percentage >= 100) return 'overBudget';
    if (categoryData.percentage >= 90) return 'warning';
    if (categoryData.percentage >= 75) return 'caution';
    if (categoryData.percentage >= 50) return 'onTrack';
    return 'safe';
  }

  /**
   * Fallback insight if no template matches
   */
  getFallbackInsight(data) {
    if (!data.budget || data.budget === 0) {
      return `⚠️ No budget set but ${data.spent.toFixed(2)}€ spent. Set a budget to track spending.`;
    }
    
    if (data.percentage >= 100) {
      return `🔴 ${data.percentage.toFixed(0)}% over budget. Review transactions and identify areas to reduce spending.`;
    }
    
    if (data.percentage >= 90) {
      return `⚠️ ${data.percentage.toFixed(0)}% used - close to limit. Monitor spending carefully.`;
    }
    
    return `📊 ${data.percentage.toFixed(0)}% used. ${data.remaining >= 0 ? 'On track!' : 'Over budget'}`;
  }
}

export default new AIInsightService();

