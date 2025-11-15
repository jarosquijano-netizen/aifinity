/**
 * AI-Powered Budget Suggestion Service
 * Advanced algorithm that analyzes historical spending patterns, family context,
 * location data, income, and seasonal trends to provide personalized budget recommendations
 */

import Anthropic from '@anthropic-ai/sdk';

class AIBudgetSuggestionService {
  constructor() {
    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }) : null;
  }

  /**
   * Main method to generate AI-powered budget suggestions
   * @param {Object} params - User context and historical data
   * @returns {Promise<Array>} - Array of category budget suggestions
   */
  async generateBudgetSuggestions({
    userId,
    familySize,
    monthlyIncome,
    location,
    historicalTransactions = [],
    currentMonth,
    userPreferences = {},
  }) {
    try {
      // Step 1: Analyze historical spending patterns
      const spendingAnalysis = this.analyzeHistoricalSpending(
        historicalTransactions,
        currentMonth
      );

      // Step 2: Get location-based benchmarks
      const locationBenchmarks = await this.getLocationBenchmarks(
        location,
        familySize,
        monthlyIncome
      );

      // Step 3: Calculate income-based allocations
      const incomeAllocations = this.calculateIncomeBasedAllocations(
        monthlyIncome,
        familySize
      );

      // Step 4: Detect spending patterns and trends
      const spendingPatterns = this.detectSpendingPatterns(historicalTransactions);

      // Step 5: Use Claude AI for intelligent analysis (if API key available)
      let aiRecommendations;
      if (this.anthropic) {
        try {
          aiRecommendations = await this.getAIRecommendations({
            spendingAnalysis,
            locationBenchmarks,
            incomeAllocations,
            spendingPatterns,
            familySize,
            monthlyIncome,
            location,
            userPreferences,
          });
        } catch (error) {
          console.error('AI recommendation failed, using fallback:', error);
          aiRecommendations = this.getDefaultRecommendations({
            familySize,
            monthlyIncome,
            location,
            spendingAnalysis,
          });
        }
      } else {
        // Use fallback if no API key
        aiRecommendations = this.getDefaultRecommendations({
          familySize,
          monthlyIncome,
          location,
          spendingAnalysis,
        });
      }

      // Step 6: Combine all factors and generate final suggestions
      const budgetSuggestions = this.synthesizeBudgetSuggestions({
        aiRecommendations,
        spendingAnalysis,
        locationBenchmarks,
        incomeAllocations,
        spendingPatterns,
      });

      return budgetSuggestions;
    } catch (error) {
      console.error('Error generating budget suggestions:', error);
      throw error;
    }
  }

  /**
   * Analyze historical spending patterns by category
   */
  analyzeHistoricalSpending(transactions, currentMonth) {
    const categoryStats = {};
    const monthlyTrends = {};

    // Group transactions by category
    transactions.forEach((transaction) => {
      const category = transaction.category || 'Uncategorized';
      const month = new Date(transaction.date).getMonth();
      const amount = Math.abs(transaction.amount);

      // Initialize category stats
      if (!categoryStats[category]) {
        categoryStats[category] = {
          total: 0,
          count: 0,
          amounts: [],
          months: {},
        };
      }

      categoryStats[category].total += amount;
      categoryStats[category].count += 1;
      categoryStats[category].amounts.push(amount);

      // Track monthly spending
      if (!categoryStats[category].months[month]) {
        categoryStats[category].months[month] = 0;
      }
      categoryStats[category].months[month] += amount;
    });

    // Calculate statistics for each category
    Object.keys(categoryStats).forEach((category) => {
      const stats = categoryStats[category];
      stats.average = stats.total / stats.count;
      stats.median = this.calculateMedian(stats.amounts);
      stats.stdDev = this.calculateStdDev(stats.amounts, stats.average);
      stats.last3MonthsAvg = this.calculateRecentAverage(stats.months, 3);
      stats.last6MonthsAvg = this.calculateRecentAverage(stats.months, 6);
      stats.trend = this.calculateTrend(stats.months);
      stats.seasonality = this.detectSeasonality(stats.months);
    });

    return categoryStats;
  }

  /**
   * Detect spending patterns (recurring, seasonal, anomalies)
   */
  detectSpendingPatterns(transactions) {
    const patterns = {
      recurring: [],
      seasonal: [],
      growing: [],
      declining: [],
      volatile: [],
    };

    // Group by merchant/description to find recurring patterns
    const merchantGroups = {};
    transactions.forEach((transaction) => {
      const key = transaction.description || transaction.merchant || 'Unknown';
      if (!merchantGroups[key]) {
        merchantGroups[key] = [];
      }
      merchantGroups[key].push(transaction);
    });

    // Analyze each merchant group
    Object.entries(merchantGroups).forEach(([merchant, txns]) => {
      if (txns.length >= 3) {
        const amounts = txns.map((t) => Math.abs(t.amount));
        const dates = txns.map((t) => new Date(t.date));
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const stdDev = this.calculateStdDev(amounts, avgAmount);
        const cvRatio = stdDev / avgAmount; // Coefficient of variation

        // Recurring: similar amounts, regular intervals
        if (cvRatio < 0.2 && txns.length >= 3) {
          patterns.recurring.push({
            merchant,
            category: txns[0].category,
            avgAmount,
            frequency: txns.length,
            consistency: 1 - cvRatio,
          });
        }

        // Volatile: highly variable amounts
        if (cvRatio > 0.5) {
          patterns.volatile.push({
            merchant,
            category: txns[0].category,
            avgAmount,
            volatility: cvRatio,
          });
        }
      }
    });

    return patterns;
  }

  /**
   * Get location-based spending benchmarks
   */
  async getLocationBenchmarks(location, familySize, income) {
    // In production, this would query a database of regional spending data
    // For now, we'll use Spain-specific benchmarks
    const benchmarks = {
      Spain: {
        groceries: {
          perPerson: 250, // Monthly per person
          baseMultiplier: 0.15, // 15% of income for family of 4
        },
        restaurants: {
          perPerson: 150,
          baseMultiplier: 0.08,
        },
        utilities: {
          baseCost: 150,
          perPerson: 30,
        },
        transportation: {
          perPerson: 100,
          baseMultiplier: 0.10,
        },
        healthcare: {
          perPerson: 80,
          baseMultiplier: 0.05,
        },
        entertainment: {
          perPerson: 100,
          baseMultiplier: 0.07,
        },
        clothing: {
          perPerson: 80,
          baseMultiplier: 0.05,
        },
        education: {
          perChild: 200,
          baseMultiplier: 0.10,
        },
        savings: {
          recommended: 0.20, // 20% of income
        },
      },
    };

    return benchmarks[location] || benchmarks['Spain'];
  }

  /**
   * Calculate income-based budget allocations using 50/30/20 rule
   * with adjustments for family size
   */
  calculateIncomeBasedAllocations(income, familySize) {
    const baseAllocations = {
      needs: income * 0.50, // 50% for necessities
      wants: income * 0.30, // 30% for wants
      savings: income * 0.20, // 20% for savings/debt
    };

    // Adjust for family size
    const familySizeAdjustment = 1 + ((familySize - 1) * 0.05);
    
    return {
      ...baseAllocations,
      adjustedNeeds: baseAllocations.needs * familySizeAdjustment,
      adjustedWants: baseAllocations.wants / familySizeAdjustment,
      familySizeAdjustment,
    };
  }

  /**
   * Use Claude AI for intelligent budget analysis and recommendations
   */
  async getAIRecommendations(analysisData) {
    const prompt = this.buildAIPrompt(analysisData);

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const response = message.content[0].text;
    
    // Parse the AI response (expecting JSON format)
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', response);
      // Fallback to default recommendations
      return this.getDefaultRecommendations(analysisData);
    }
  }

  /**
   * Determine income level classification for Spain
   */
  determineIncomeLevel(perPerson, location) {
    // Based on Spanish median income data
    if (perPerson <= 800) return "Very Low Income";
    if (perPerson <= 1200) return "Low Income";
    if (perPerson <= 1800) return "Lower-Middle Income";
    if (perPerson <= 2500) return "Middle Income";
    if (perPerson <= 3500) return "Upper-Middle Income";
    if (perPerson <= 5000) return "High Income";
    return "Very High Income";
  }

  /**
   * Get income-specific guidance for the prompt
   */
  getIncomeSpecificGuidance(level, income, familySize) {
    const guides = {
      "Very Low Income": `
**Income Context: Very Low (Bottom 20%)**
- PRIORITY: Essential needs only
- Savings: 5-10% if possible
- Focus: Survival budgeting with dignity
- Avoid: Suggesting expensive items or luxury categories
- Reality: Don't suggest >90% of income for basics`,

      "Low Income": `
**Income Context: Low (20-40% percentile)**
- PRIORITY: Essentials first, minimal discretionary
- Savings: 10-15% target
- Focus: High-impact cost savings
- Tone: Encouraging but realistic
- Reality: Don't suggest >80% for basics`,

      "Lower-Middle Income": `
**Income Context: Lower-Middle (40-55% percentile)**
- PRIORITY: Comfortable essentials + moderate discretionary
- Savings: 15-20% target (€${(income * 0.175).toFixed(0)})
- Focus: Building emergency fund
- Tone: Balanced savings + quality of life
- Reality: Sustainable balance`,

      "Middle Income": `
**Income Context: Middle (55-70% percentile)**
- PRIORITY: Quality living + wealth building
- Savings: 20-25% target (€${(income * 0.225).toFixed(0)})
- Budget: 50% needs / 30% wants / 20% savings
- Focus: 6-month emergency fund + retirement
- Quality: Can afford good groceries, regular dining out
- Tone: Growth mindset, financial planning
- Reality: Should live comfortably AND save significantly

**For €${income}/month:**
- Essentials budget: ~€${(income * 0.5).toFixed(0)} (quality options)
- Discretionary: ~€${(income * 0.3).toFixed(0)} (enjoy life!)
- Savings: ~€${(income * 0.2).toFixed(0)} (build wealth)`,

      "Upper-Middle Income": `
**Income Context: Upper-Middle (70-85% percentile)**
- PRIORITY: Quality lifestyle + aggressive saving
- Savings: 25-35% target (€${(income * 0.30).toFixed(0)})
- Focus: Max retirement, investments, education funds
- Quality: Premium options without guilt
- Reality: Should save 25%+ while living well`,

      "High Income": `
**Income Context: High (85-95% percentile)**
- PRIORITY: Premium living + wealth accumulation
- Savings: 35-45% target (€${(income * 0.40).toFixed(0)})
- Focus: Tax optimization, multiple income streams
- Quality: Premium/luxury appropriate
- Reality: Should save 35%+ easily`,

      "Very High Income": `
**Income Context: Very High (Top 5%)**
- PRIORITY: Luxury living + sophisticated wealth management
- Savings: 40-50% target (€${(income * 0.45).toFixed(0)})
- Focus: Portfolio diversification, legacy planning
- Quality: Unrestricted premium options
- Reality: Should save 40%+ with top-tier lifestyle`
    };

    return guides[level] || guides["Middle Income"];
  }

  /**
   * Build comprehensive income-adaptive prompt for Claude AI analysis
   */
  buildAIPrompt(data) {
    const {
      spendingAnalysis,
      locationBenchmarks,
      incomeAllocations,
      spendingPatterns,
      familySize,
      monthlyIncome,
      location,
      userPreferences,
    } = data;

    // Calculate income level
    const incomePerPerson = monthlyIncome / familySize;
    const incomeLevel = this.determineIncomeLevel(incomePerPerson, location);
    const incomeGuidance = this.getIncomeSpecificGuidance(incomeLevel, monthlyIncome, familySize);

    return `You are a financial advisor AI. Analyze the following data and provide personalized budget recommendations **specifically adapted to this user's ${incomeLevel} income level**.

**User Profile:**
- Family Size: ${familySize} people
- Monthly Income: €${monthlyIncome}
- Income Per Person: €${incomePerPerson.toFixed(0)}/month
- Income Level: ${incomeLevel}

${incomeGuidance}

**Historical Spending Analysis:**
${JSON.stringify(spendingAnalysis, null, 2)}

**Spending Patterns Detected:**
${JSON.stringify(spendingPatterns, null, 2)}

**Location Benchmarks (${location}):**
${JSON.stringify(locationBenchmarks, null, 2)}

**Income-Based Allocations:**
${JSON.stringify(incomeAllocations, null, 2)}

**User Preferences:**
${JSON.stringify(userPreferences, null, 2)}

---

**CRITICAL CONSTRAINTS:**
1. Budget recommendations MUST be appropriate for ${incomeLevel} (€${monthlyIncome}/month)
2. **TOTAL of all suggested budgets MUST NOT exceed €${monthlyIncome}**
3. Follow the 50/30/20 rule: ~50% needs, ~30% wants, ~20% savings
4. Total suggested budgets should be approximately €${(monthlyIncome * 0.8).toFixed(0)} (80% of income) to allow for savings

Consider:

1. **Historical Behavior**: User's actual spending patterns over time
2. **Trends**: Are they spending more or less in certain categories?
3. **Recurring Expenses**: Regular bills and subscriptions
4. **Seasonal Variations**: Monthly fluctuations in spending
5. **Location Context**: Cost of living in ${location}
6. **Family Size**: Appropriate budgets for ${familySize} people
7. **Income Level**: Reasonable allocations given €${monthlyIncome} income (${incomeLevel})
8. **Optimization Opportunities**: Where can they save or reallocate?
9. **Income-Appropriate Quality**: Recommendations should match ${incomeLevel} standards
10. **TOTAL BUDGET CONSTRAINT**: Ensure sum of all category budgets ≤ €${monthlyIncome}

Respond with a JSON object in this EXACT format (no markdown code blocks, just JSON):

{
  "categories": [
    {
      "name": "CategoryName",
      "suggestedBudget": 0,
      "rangeMin": 0,
      "rangeMax": 0,
      "reasoning": "Why this amount for ${incomeLevel}",
      "confidence": "high|medium|low",
      "insights": ["income-appropriate tip"],
      "comparison": {
        "historical": 0,
        "benchmark": 0,
        "variance": "above|below|on-track"
      }
    }
  ],
  "overallInsights": {
    "totalSuggested": 0,
    "savingsRate": 0,
    "topRecommendations": ["recommendation1", "recommendation2", "recommendation3"],
    "warnings": ["warning1 if any"],
    "strengths": ["strength1", "strength2"],
    "incomeSpecificAdvice": "Advice for ${incomeLevel}"
  }
}`;
  }

  /**
   * Synthesize all analysis into final budget suggestions
   */
  synthesizeBudgetSuggestions(data) {
    const {
      aiRecommendations,
      spendingAnalysis,
      locationBenchmarks,
      incomeAllocations,
      spendingPatterns,
      monthlyIncome,
    } = data;

    // Combine AI recommendations with statistical analysis
    let suggestions = aiRecommendations.categories.map((category) => {
      const historical = spendingAnalysis[category.name];
      const pattern = spendingPatterns.recurring.find(
        (p) => p.category === category.name
      );

      return {
        ...category,
        historical: historical
          ? {
              average: historical.average,
              median: historical.median,
              trend: historical.trend,
              last3MonthsAvg: historical.last3MonthsAvg,
            }
          : null,
        pattern: pattern
          ? {
              isRecurring: true,
              avgAmount: pattern.avgAmount,
              consistency: pattern.consistency,
            }
          : null,
        metadata: {
          dataQuality: historical ? 'high' : 'low',
          recommendationSource: 'ai_analysis',
          lastUpdated: new Date().toISOString(),
        },
      };
    });

    // CRITICAL: Ensure total suggested budgets don't exceed income
    const totalSuggested = suggestions.reduce((sum, cat) => sum + (cat.suggestedBudget || 0), 0);
    const maxAllowedBudget = monthlyIncome * 0.85; // 85% max to leave room for savings and unexpected expenses
    
    if (totalSuggested > maxAllowedBudget && monthlyIncome > 0) {
      // Scale down all suggestions proportionally to fit within income
      const scaleFactor = maxAllowedBudget / totalSuggested;
      console.log(`⚠️ Total suggested budget (€${totalSuggested.toFixed(2)}) exceeds income (€${monthlyIncome}). Scaling down by ${(scaleFactor * 100).toFixed(1)}%`);
      
      suggestions = suggestions.map(cat => ({
        ...cat,
        suggestedBudget: Math.round(cat.suggestedBudget * scaleFactor),
        rangeMin: Math.round((cat.rangeMin || 0) * scaleFactor),
        rangeMax: Math.round((cat.rangeMax || 0) * scaleFactor),
        reasoning: cat.reasoning ? `${cat.reasoning} (Scaled to fit within income constraints.)` : 'Scaled to fit within income constraints.',
        metadata: {
          ...cat.metadata,
          scaled: true,
          originalSuggestedBudget: cat.suggestedBudget,
          scaleFactor: scaleFactor
        }
      }));

      // Update overall insights to reflect the scaling
      if (aiRecommendations.overallInsights) {
        aiRecommendations.overallInsights.totalSuggested = Math.round(totalSuggested * scaleFactor);
        aiRecommendations.overallInsights.warnings = [
          ...(aiRecommendations.overallInsights.warnings || []),
          `Total suggested budgets were scaled down to fit within your €${monthlyIncome}/month income (85% max for expenses).`
        ];
      }
    }

    return {
      suggestions,
      overallInsights: aiRecommendations.overallInsights,
      metadata: {
        generatedAt: new Date().toISOString(),
        basedOnTransactions: Object.values(spendingAnalysis).reduce(
          (sum, cat) => sum + cat.count,
          0
        ),
        analysisDepth: 'comprehensive',
        totalSuggested: suggestions.reduce((sum, cat) => sum + (cat.suggestedBudget || 0), 0),
        maxAllowedBudget: maxAllowedBudget,
        income: monthlyIncome
      },
    };
  }

  /**
   * Fallback recommendations if AI call fails
   */
  getDefaultRecommendations(data) {
    const { familySize, monthlyIncome, location, spendingAnalysis } = data;
    
    // Basic categories with default allocations
    const defaultCategories = [
      { name: 'Alimentación > Supermercado', percentage: 0.15 },
      { name: 'Alimentación > Restaurante', percentage: 0.08 },
      { name: 'Transporte > Transportes', percentage: 0.10 },
      { name: 'Servicios > Otros servicios', percentage: 0.08 },
      { name: 'Ocio > Entretenimiento', percentage: 0.05 },
      { name: 'Salud > Médico', percentage: 0.05 },
      { name: 'Compras > Ropa', percentage: 0.04 },
    ];

    return {
      categories: defaultCategories.map((cat) => {
        const historical = spendingAnalysis[cat.name];
        const suggested = historical
          ? historical.last3MonthsAvg || historical.average
          : monthlyIncome * cat.percentage;

        return {
          name: cat.name,
          suggestedBudget: Math.round(suggested),
          rangeMin: Math.round(suggested * 0.7),
          rangeMax: Math.round(suggested * 1.3),
          reasoning: historical
            ? 'Based on your recent spending patterns'
            : 'Based on typical allocations for your income level',
          confidence: historical ? 'high' : 'medium',
          insights: [],
          comparison: {
            historical: historical ? historical.average : 0,
            benchmark: monthlyIncome * cat.percentage,
            variance: 'on-track',
          },
        };
      }),
      overallInsights: {
        totalSuggested: Math.round(monthlyIncome * 0.55),
        savingsRate: 0.20,
        topRecommendations: [
          'Track spending for 3 months for better personalization',
          'Aim to save 20% of income',
          'Review and adjust budgets monthly',
        ],
        warnings: [],
        strengths: [],
      },
    };
  }

  // ============== UTILITY METHODS ==============

  calculateMedian(numbers) {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  calculateStdDev(numbers, mean) {
    if (numbers.length === 0) return 0;
    const squareDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    return Math.sqrt(avgSquareDiff);
  }

  calculateRecentAverage(monthlyData, months) {
    const currentMonth = new Date().getMonth();
    let sum = 0;
    let count = 0;

    for (let i = 0; i < months; i++) {
      const month = (currentMonth - i + 12) % 12;
      if (monthlyData[month]) {
        sum += monthlyData[month];
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  calculateTrend(monthlyData) {
    const months = Object.keys(monthlyData).map(Number).sort((a, b) => a - b);
    if (months.length < 2) return 'stable';

    const recentMonths = months.slice(-3);
    const earlierMonths = months.slice(0, -3);

    if (earlierMonths.length === 0) return 'stable';

    const recentAvg =
      recentMonths.reduce((sum, m) => sum + monthlyData[m], 0) / recentMonths.length;
    const earlierAvg =
      earlierMonths.reduce((sum, m) => sum + monthlyData[m], 0) / earlierMonths.length;

    if (earlierAvg === 0) return 'stable';

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.15) return 'increasing';
    if (change < -0.15) return 'decreasing';
    return 'stable';
  }

  detectSeasonality(monthlyData) {
    // Simple seasonality detection
    const months = Object.keys(monthlyData).map(Number);
    if (months.length < 6) return 'insufficient_data';

    const values = months.map((m) => monthlyData[m]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (avg === 0) return 'stable';
    
    const maxVariation = Math.max(...values.map((v) => Math.abs(v - avg) / avg));

    return maxVariation > 0.3 ? 'seasonal' : 'stable';
  }
}

export default new AIBudgetSuggestionService();

