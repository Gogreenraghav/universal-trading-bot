/**
 * Risk Dashboard
 * Complete risk management and monitoring system
 */

class RiskDashboard {
  constructor(config) {
    this.config = {
      tradingIntegration: config.tradingIntegration,
      orderManagement: config.orderManagement,
      dashboard: config.dashboard,
      riskLimits: config.riskLimits || {
        dailyLossLimit: 0.10,    // 10% daily loss limit
        maxPositionSize: 0.02,   // 2% max per position
        maxPortfolioRisk: 0.20,  // 20% max portfolio risk
        maxLeverage: 3,          // 3x max leverage
        maxDrawdown: 0.25,       // 25% max drawdown
        minDiversification: 3,   // Min 3 different assets
        maxConcentration: 0.40   // 40% max in single asset
      },
      alertThresholds: config.alertThresholds || {
        dailyLossWarning: 0.07,  // 7% warning
        positionSizeWarning: 0.015, // 1.5% warning
        leverageWarning: 2.5,    // 2.5x warning
        drawdownWarning: 0.20,   // 20% warning
        concentrationWarning: 0.35 // 35% warning
      },
      ...config
    };
    
    // Risk metrics
    this.metrics = {
      portfolio: {
        totalRisk: 0,
        var95: 0,          // Value at Risk 95%
        cvar95: 0,         // Conditional VaR 95%
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        currentDrawdown: 0
      },
      positions: {
        count: 0,
        totalExposure: 0,
        weightedRisk: 0,
        concentration: 0
      },
      market: {
        volatility: 0,
        correlation: 0,
        fearGreedIndex: 0,
        marketStress: 0
      },
      limits: {
        dailyLossUsed: 0,
        positionSizeUsed: 0,
        leverageUsed: 0,
        drawdownUsed: 0,
        concentrationUsed: 0
      }
    };
    
    // Alerts
    this.alerts = {
      active: [],
      history: [],
      lastAlert: null
    };
    
    // State
    this.state = {
      initialized: false,
      lastCalculation: null,
      riskScore: 0, // 0-100, lower is better
      overallStatus: 'safe', // safe, warning, danger
      stats: {
        calculations: 0,
        alertsGenerated: 0,
        warningsIssued: 0,
        dangersDetected: 0
      }
    };
    
    console.log('🛡️ Risk Dashboard initialized');
  }
  
  /**
   * Initialize risk dashboard
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Risk Dashboard...');
      
      // Calculate initial risk metrics
      await this.calculateAllMetrics();
      
      // Start periodic risk monitoring
      this.startRiskMonitoring();
      
      this.state.initialized = true;
      this.state.lastCalculation = Date.now();
      
      console.log('✅ Risk Dashboard ready');
      console.log(`📊 Initial risk score: ${this.state.riskScore}/100`);
      console.log(`🛡️ Overall status: ${this.state.overallStatus}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize risk dashboard:', error);
      throw error;
    }
  }
  
  /**
   * Calculate all risk metrics
   */
  async calculateAllMetrics() {
    try {
      // Calculate portfolio risk
      await this.calculatePortfolioRisk();
      
      // Calculate position risk
      await this.calculatePositionRisk();
      
      // Calculate market risk
      await this.calculateMarketRisk();
      
      // Calculate limit usage
      await this.calculateLimitUsage();
      
      // Calculate overall risk score
      this.calculateRiskScore();
      
      // Check for alerts
      await this.checkAlerts();
      
      this.state.lastCalculation = Date.now();
      this.state.stats.calculations++;
      
      // Update dashboard
      if (this.config.dashboard) {
        this.config.dashboard.updateRiskData(this.getRiskSummary());
      }
      
      return this.metrics;
      
    } catch (error) {
      console.error('Failed to calculate risk metrics:', error.message);
      return this.metrics;
    }
  }
  
  /**
   * Calculate portfolio risk metrics
   */
  async calculatePortfolioRisk() {
    if (!this.config.orderManagement) {
      // Use mock data
      this.metrics.portfolio = this.getMockPortfolioRisk();
      return;
    }
    
    try {
      const performance = await this.config.orderManagement.getPerformanceReport();
      const closedOrders = await this.config.orderManagement.getClosedOrders(100);
      
      if (closedOrders.length === 0) {
        this.metrics.portfolio = this.getMockPortfolioRisk();
        return;
      }
      
      // Calculate Value at Risk (VaR) - simplified
      const returns = closedOrders.map(order => order.pnlPercent / 100);
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const stdDev = this.calculateStandardDeviation(returns);
      
      // VaR 95% (1.645 sigma)
      this.metrics.portfolio.var95 = avgReturn - 1.645 * stdDev;
      
      // Conditional VaR (CVaR) - average of worst 5%
      const sortedReturns = [...returns].sort((a, b) => a - b);
      const worst5Percent = Math.ceil(sortedReturns.length * 0.05);
      const worstReturns = sortedReturns.slice(0, worst5Percent);
      this.metrics.portfolio.cvar95 = worstReturns.reduce((sum, ret) => sum + ret, 0) / worstReturns.length;
      
      // Sharpe ratio (assuming risk-free rate = 0 for crypto)
      this.metrics.portfolio.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
      
      // Sortino ratio (downside deviation only)
      const downsideReturns = returns.filter(ret => ret < 0);
      const downsideStdDev = this.calculateStandardDeviation(downsideReturns);
      this.metrics.portfolio.sortinoRatio = downsideStdDev > 0 ? avgReturn / downsideStdDev : 0;
      
      // Max drawdown from performance report
      this.metrics.portfolio.maxDrawdown = performance.summary.maxDrawdown || 0;
      
      // Current drawdown (simplified)
      this.metrics.portfolio.currentDrawdown = this.calculateCurrentDrawdown(closedOrders);
      
      // Total risk score (0-1)
      this.metrics.portfolio.totalRisk = Math.min(1, Math.max(0, 
        (this.metrics.portfolio.var95 * -2) + // VaR contribution
        (this.metrics.portfolio.maxDrawdown * 2) + // Drawdown contribution
        (stdDev * 3) // Volatility contribution
      ));
      
    } catch (error) {
      console.error('Failed to calculate portfolio risk:', error.message);
      this.metrics.portfolio = this.getMockPortfolioRisk();
    }
  }
  
  /**
   * Calculate position risk metrics
   */
  async calculatePositionRisk() {
    if (!this.config.tradingIntegration) {
      // Use mock data
      this.metrics.positions = this.getMockPositionRisk();
      return;
    }
    
    try {
      const positions = await this.config.tradingIntegration.getPositions();
      const portfolio = this.config.tradingIntegration.getPaperPortfolio();
      
      this.metrics.positions.count = positions.length;
      this.metrics.positions.totalExposure = portfolio?.invested || 0;
      
      if (positions.length === 0) {
        this.metrics.positions.weightedRisk = 0;
        this.metrics.positions.concentration = 0;
        return;
      }
      
      // Calculate weighted risk based on position sizes
      let totalWeightedRisk = 0;
      let totalValue = 0;
      
      positions.forEach(position => {
        const positionValue = position.value || 0;
        const positionRisk = this.calculatePositionSpecificRisk(position);
        
        totalWeightedRisk += positionValue * positionRisk;
        totalValue += positionValue;
      });
      
      this.metrics.positions.weightedRisk = totalValue > 0 ? totalWeightedRisk / totalValue : 0;
      
      // Calculate concentration (max position / total portfolio)
      const maxPosition = Math.max(...positions.map(p => p.value || 0));
      const totalPortfolio = portfolio?.totalValue || 1;
      this.metrics.positions.concentration = maxPosition / totalPortfolio;
      
    } catch (error) {
      console.error('Failed to calculate position risk:', error.message);
      this.metrics.positions = this.getMockPositionRisk();
    }
  }
  
  /**
   * Calculate market risk metrics
   */
  async calculateMarketRisk() {
    // Mock market data - in production, would fetch from market data APIs
    this.metrics.market = {
      volatility: 0.05 + Math.random() * 0.10, // 5-15% volatility
      correlation: 0.6 + Math.random() * 0.3, // 60-90% correlation
      fearGreedIndex: 40 + Math.random() * 40, // 40-80 fear/greed
      marketStress: 0.2 + Math.random() * 0.3 // 20-50% stress
    };
  }
  
  /**
   * Calculate limit usage
   */
  async calculateLimitUsage() {
    if (!this.config.tradingIntegration || !this.config.orderManagement) {
      // Use mock data
      this.metrics.limits = this.getMockLimitUsage();
      return;
    }
    
    try {
      const portfolio = this.config.tradingIntegration.getPaperPortfolio();
      const performance = await this.config.orderManagement.getPerformanceReport();
      const positions = await this.config.tradingIntegration.getPositions();
      
      // Daily loss usage
      const dailyPnl = performance.daily?.pnl || 0;
      const dailyLossLimit = this.config.riskLimits.dailyLossLimit * (portfolio?.totalValue || 10000);
      this.metrics.limits.dailyLossUsed = Math.abs(Math.min(0, dailyPnl)) / dailyLossLimit;
      
      // Position size usage
      const maxPosition = Math.max(...positions.map(p => p.value || 0));
      const maxPositionLimit = this.config.riskLimits.maxPositionSize * (portfolio?.totalValue || 10000);
      this.metrics.limits.positionSizeUsed = maxPosition / maxPositionLimit;
      
      // Leverage usage (simplified)
      const totalExposure = portfolio?.invested || 0;
      const equity = portfolio?.totalValue || 10000;
      const leverage = totalExposure / equity;
      this.metrics.limits.leverageUsed = leverage / this.config.riskLimits.maxLeverage;
      
      // Drawdown usage
      const currentDrawdown = this.metrics.portfolio.currentDrawdown;
      this.metrics.limits.drawdownUsed = currentDrawdown / this.config.riskLimits.maxDrawdown;
      
      // Concentration usage
      const concentration = this.metrics.positions.concentration;
      this.metrics.limits.concentrationUsed = concentration / this.config.riskLimits.maxConcentration;
      
    } catch (error) {
      console.error('Failed to calculate limit usage:', error.message);
      this.metrics.limits = this.getMockLimitUsage();
    }
  }
  
  /**
   * Calculate position-specific risk
   */
  calculatePositionSpecificRisk(position) {
    // Simplified risk calculation
    const baseRisk = 0.3; // Base risk for crypto
    
    // Adjust based on position size
    const sizeRisk = Math.min(1, position.value / 10000) * 0.3;
    
    // Adjust based on asset volatility
    const volatilityRisk = this.getAssetVolatility(position.symbol) * 0.4;
    
    return Math.min(1, baseRisk + sizeRisk + volatilityRisk);
  }
  
  /**
   * Get asset volatility (mock)
   */
  getAssetVolatility(symbol) {
    const volatilities = {
      'BTCUSDT': 0.05,
      'ETHUSDT': 0.07,
      'BNBUSDT': 0.10,
      'SOLUSDT': 0.15,
      'XRPUSDT': 0.12,
      'ADAUSDT': 0.13,
      'DOTUSDT': 0.14,
      'DOGEUSDT': 0.18
    };
    
    return volatilities[symbol] || 0.10;
  }
  
  /**
   * Calculate current drawdown
   */
  calculateCurrentDrawdown(orders) {
    if (orders.length < 5) return 0;
    
    // Get last 10 orders
    const recentOrders = orders.slice(0, 10);
    const pnls = recentOrders.map(order => order.pnl);
    
    let peak = 0;
    let currentDrawdown = 0;
    let runningTotal = 0;
    
    pnls.forEach(pnl => {
      runningTotal += pnl;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      
      const drawdown = peak - runningTotal;
      if (drawdown > currentDrawdown) {
        currentDrawdown = drawdown;
      }
    });
    
    // Convert to percentage of average trade size
    const avgTradeSize = recentOrders.reduce((sum, order) => sum + (order.quantity * order.price), 0) / recentOrders.length;
    return avgTradeSize > 0 ? currentDrawdown / avgTradeSize : 0;
  }
  
  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate overall risk score (0-100)
   */
  calculateRiskScore() {
    // Portfolio risk component (40%)
    const portfolioScore = this.metrics.portfolio.totalRisk * 40;
    
    // Position risk component (30%)
    const positionScore = this.metrics.positions.weightedRisk * 30;
    
    // Market risk component (20%)
    const marketScore = this.metrics.market.marketStress * 20;
    
    // Limit usage component (10%)
    const maxLimitUsage = Math.max(
      this.metrics.limits.dailyLossUsed,
      this.metrics.limits.positionSizeUsed,
      this.metrics.limits.leverageUsed,
      this.metrics.limits.drawdownUsed,
      this.metrics.limits.concentrationUsed
    );
    const limitScore = maxLimitUsage * 10;
    
    // Total risk score
    this.state.riskScore = Math.min(100, Math.max(0, 
      portfolioScore + positionScore + marketScore + limitScore
    ));
    
    // Determine overall status
    if (this.state.riskScore >= 70) {
      this.state.overallStatus = 'danger';
    } else if (this.state.riskScore >= 40) {
      this.state.overallStatus = 'warning';
    } else {
      this.state.overallStatus = 'safe';
    }
  }
  
  /**
   * Check for risk alerts
   */
  async checkAlerts() {
    const newAlerts = [];
    
    // Check daily loss limit
    if (this.metrics.limits.dailyLossUsed >= 1) {
      newAlerts.push(this.createAlert(
        'daily_loss_limit_exceeded',
        'Daily loss limit exceeded',
        'danger',
        `Daily loss usage: ${(this.metrics.limits.dailyLossUsed * 100).toFixed(1)}%`
      ));
    } else if (this.metrics.limits.dailyLossUsed >= this.config.alertThresholds.dailyLossWarning) {
      newAlerts.push(this.createAlert(
        'daily_loss_warning',
        'Daily loss warning',
        'warning',
        `Daily loss usage: ${(this.metrics.limits.dailyLossUsed * 100).toFixed(1)}%`
      ));
    }
    
    // Check position size limit
    if (this.metrics.limits.positionSizeUsed >= 1) {
      newAlerts.push(this.createAlert(
        'position_size_limit_exceeded',
        'Position size limit exceeded',
        'danger',
        `Position size usage: ${(this.metrics.limits.positionSizeUsed * 100).toFixed(1)}%`
      ));
    } else if (this.metrics.limits.positionSizeUsed >= this.config.alertThresholds.positionSizeWarning) {
      newAlerts.push(this.createAlert(
        'position_size_warning',
        'Position size warning',
        'warning',
        `Position size usage: ${(this.metrics.limits.positionSizeUsed * 100).toFixed(1)}%`
      ));
    }
    
    // Check leverage limit
    if (this.metrics.limits.leverageUsed >= 1) {
      newAlerts.push(this.createAlert(
        'leverage_limit_exceeded',
        'Leverage limit exceeded',
        'danger',
        `Leverage usage: ${(this.metrics.limits.leverageUsed * 100).toFixed(1)}%`
      ));
    } else if (this.metrics.limits.leverageUsed >= this.config.alertThresholds.leverageWarning) {
      newAlerts.push(this.createAlert(
        'leverage_warning',
        'Leverage warning',
        'warning',
        `Leverage usage: ${(this.metrics.limits.leverageUsed * 100).toFixed(1)}%`
      ));
    }
    
    // Check drawdown limit
    if (this.metrics.limits.drawdownUsed >= 1) {
      newAlerts.push(this.createAlert(
        'drawdown_limit_exceeded',
        'Drawdown limit exceeded',
        'danger',
        `Drawdown usage: ${(this.metrics.limits.drawdownUsed * 100).toFixed(1)}%`
      ));
    } else if (this.metrics.limits.drawdownUsed >= this.config.alertThresholds.drawdownWarning) {
      newAlerts.push(this.createAlert(
        'drawdown_warning',
        'Drawdown warning',
        'warning',
        `Drawdown usage: ${(this.metrics.limits.drawdownUsed * 100).toFixed(1)}%`
      ));
    }
    
    // Check concentration limit
    if (this.metrics.limits.concentrationUsed >= 1) {
      newAlerts.push(this.createAlert(
        'concentration_limit_exceeded',
        'Concentration limit exceeded',
        'danger',
        `Concentration usage: ${(this.metrics.limits.concentrationUsed * 100).toFixed(1)}%`
      ));
    } else if (this.metrics.limits.concentrationUsed >= this.config.alertThresholds.concentrationWarning) {
      newAlerts.push(this.createAlert(
        'concentration_warning',
        'Concentration warning',
        'warning',
        `Concentration usage: ${(this.metrics.limits.concentrationUsed * 100).toFixed(1)}%`
      ));
    }
    
    // Check overall risk score
    if (this.state.riskScore >= 70) {
      newAlerts.push(this.createAlert(
        'high_risk_score',
        'High overall risk score',
        'danger',
        `Risk score: ${this.state.riskScore.toFixed(1)}/100`
      ));
    } else if (this.state.riskScore >= 40) {
      newAlerts.push(this.createAlert(
        'medium_risk_score',
        'Medium risk score',
        'warning',
        `Risk score: ${this.state.riskScore.toFixed(1)}/100`
      ));
    }
    
    // Check diversification
    if (this.metrics.positions.count < this.config.riskLimits.minDiversification) {
      newAlerts.push(this.createAlert(
        'low_diversification',
        'Low portfolio diversification',
        'warning',
        `Only ${this.metrics.positions.count} positions (min: ${this.config.riskLimits.minDiversification})`
      ));
    }
    
    // Add new alerts to active alerts
    newAlerts.forEach(alert => {
      this.alerts.active.push(alert);
      this.alerts.history.push(alert);
      this.alerts.lastAlert = alert;
      
      // Update statistics
      if (alert.severity === 'danger') {
        this.state.stats.dangersDetected++;
      } else if (alert.severity === 'warning') {
        this.state.stats.warningsIssued++;
      }
      
      this.state.stats.alertsGenerated++;
    });
    
    // Remove old alerts (keep last 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.alerts.active = this.alerts.active.filter(alert => alert.timestamp > cutoff);
    
    // Update dashboard with alerts
    if (this.config.dashboard && newAlerts.length > 0) {
      this.config.dashboard.updateRiskAlerts(newAlerts);
    }
    
    return newAlerts;
  }
  
  /**
   * Create an alert
   */
  createAlert(type, title, severity, message) {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      severity, // danger, warning, info
      message,
      timestamp: Date.now(),
      acknowledged: false,
      data: {
        riskScore: this.state.riskScore,
        metrics: { ...this.metrics },
        limits: { ...this.metrics.limits }
      }
    };
  }
  
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.active.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      
      // Remove from active if acknowledged
      this.alerts.active = this.alerts.active.filter(a => a.id !== alertId);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get mock portfolio risk data
   */
  getMockPortfolioRisk() {
    return {
      totalRisk: 0.35 + Math.random() * 0.20,
      var95: -0.08 - Math.random() * 0.04,
      cvar95: -0.12 - Math.random() * 0.06,
      sharpeRatio: 1.2 + Math.random() * 0.8,
      sortinoRatio: 1.5 + Math.random() * 1.0,
      maxDrawdown: 0.15 + Math.random() * 0.10,
      currentDrawdown: 0.05 + Math.random() * 0.08
    };
  }
  
  /**
   * Get mock position risk data
   */
  getMockPositionRisk() {
    return {
      count: 3 + Math.floor(Math.random() * 4),
      totalExposure: 5000 + Math.random() * 5000,
      weightedRisk: 0.4 + Math.random() * 0.3,
      concentration: 0.35 + Math.random() * 0.15
    };
  }
  
  /**
   * Get mock limit usage data
   */
  getMockLimitUsage() {
    return {
      dailyLossUsed: 0.3 + Math.random() * 0.4,
      positionSizeUsed: 0.5 + Math.random() * 0.3,
      leverageUsed: 0.4 + Math.random() * 0.4,
      drawdownUsed: 0.2 + Math.random() * 0.3,
      concentrationUsed: 0.6 + Math.random() * 0.2
    };
  }
  
  /**
   * Get risk summary for dashboard
   */
  getRiskSummary() {
    return {
      metrics: this.metrics,
      score: this.state.riskScore,
      status: this.state.overallStatus,
      alerts: {
        active: this.alerts.active,
        count: this.alerts.active.length,
        unacknowledged: this.alerts.active.filter(a => !a.acknowledged).length
      },
      limits: {
        ...this.config.riskLimits,
        usage: this.metrics.limits
      },
      lastUpdate: this.state.lastCalculation,
      statistics: this.state.stats
    };
  }
  
  /**
   * Get risk recommendations
   */
  getRiskRecommendations() {
    const recommendations = [];
    
    // Portfolio risk recommendations
    if (this.metrics.portfolio.totalRisk > 0.6) {
      recommendations.push({
        type: 'reduce_portfolio_risk',
        priority: 'high',
        action: 'Reduce overall portfolio risk',
        reason: `Portfolio risk score is ${(this.metrics.portfolio.totalRisk * 100).toFixed(1)}%`,
        details: 'Consider reducing position sizes or increasing diversification'
      });
    }
    
    // Position concentration recommendations
    if (this.metrics.positions.concentration > 0.5) {
      recommendations.push({
        type: 'reduce_concentration',
        priority: 'high',
        action: 'Reduce position concentration',
        reason: `Maximum position concentration is ${(this.metrics.positions.concentration * 100).toFixed(1)}%`,
        details: 'Consider diversifying into different assets'
      });
    }
    
    // Leverage recommendations
    if (this.metrics.limits.leverageUsed > 0.8) {
      recommendations.push({
        type: 'reduce_leverage',
        priority: 'medium',
        action: 'Reduce leverage usage',
        reason: `Leverage usage is ${(this.metrics.limits.leverageUsed * 100).toFixed(1)}% of limit`,
        details: 'Consider reducing position sizes to lower leverage'
      });
    }
    
    // Diversification recommendations
    if (this.metrics.positions.count < this.config.riskLimits.minDiversification) {
      recommendations.push({
        type: 'increase_diversification',
        priority: 'medium',
        action: 'Increase portfolio diversification',
        reason: `Only ${this.metrics.positions.count} positions (min: ${this.config.riskLimits.minDiversification})`,
        details: 'Consider adding positions in different assets or sectors'
      });
    }
    
    // Drawdown recommendations
    if (this.metrics.portfolio.currentDrawdown > 0.1) {
      recommendations.push({
        type: 'manage_drawdown',
        priority: 'medium',
        action: 'Manage current drawdown',
        reason: `Current drawdown is ${(this.metrics.portfolio.currentDrawdown * 100).toFixed(1)}%`,
        details: 'Consider implementing stop-losses or reducing risk exposure'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Start risk monitoring
   */
  startRiskMonitoring() {
    // Calculate risk every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.calculateAllMetrics().catch(error => {
        console.error('Risk monitoring failed:', error.message);
      });
    }, 300000); // 5 minutes
    
    // Clean up old alerts every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000); // 1 hour
    
    console.log('🔄 Risk monitoring started (updates every 5 minutes)');
  }
  
  /**
   * Clean up old alerts
   */
  cleanupOldAlerts() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    
    this.alerts.history = this.alerts.history.filter(alert => alert.timestamp > cutoff);
    
    console.log('🧹 Cleaned up old risk alerts');
  }
  
  /**
   * Get exposure report
   */
  getExposureReport() {
    return {
      totalExposure: this.metrics.positions.totalExposure,
      byAsset: this.getExposureByAsset(),
      byRiskLevel: this.getExposureByRiskLevel(),
      concentration: this.metrics.positions.concentration,
      leverage: this.calculateEffectiveLeverage(),
      correlation: this.metrics.market.correlation,
      lastUpdate: this.state.lastCalculation
    };
  }
  
  /**
   * Get exposure by asset (mock)
   */
  getExposureByAsset() {
    return {
      'BTC': { exposure: 3000, percentage: 0.30, risk: 0.4 },
      'ETH': { exposure: 2000, percentage: 0.20, risk: 0.5 },
      'BNB': { exposure: 1000, percentage: 0.10, risk: 0.6 },
      'SOL': { exposure: 1500, percentage: 0.15, risk: 0.7 },
      'USDT': { exposure: 2500, percentage: 0.25, risk: 0.1 }
    };
  }
  
  /**
   * Get exposure by risk level
   */
  getExposureByRiskLevel() {
    return {
      low: { exposure: 2500, percentage: 0.25 },
      medium: { exposure: 4500, percentage: 0.45 },
      high: { exposure: 3000, percentage: 0.30 }
    };
  }
  
  /**
   * Calculate effective leverage
   */
  calculateEffectiveLeverage() {
    const totalExposure = this.metrics.positions.totalExposure;
    const equity = 10000; // Mock equity
    
    return totalExposure / equity;
  }
  
  /**
   * Stop risk dashboard
   */
  async stop() {
    console.log('🛑 Stopping Risk Dashboard...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.state.initialized = false;
    
    console.log('✅ Risk Dashboard stopped');
  }
}

module.exports = RiskDashboard;
