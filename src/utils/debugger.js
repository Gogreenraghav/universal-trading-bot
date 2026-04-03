/**
 * Universal Trading Bot - Debugger
 * Performance monitoring and bug detection
 */

class TradingBotDebugger {
  constructor(config) {
    this.config = {
      logLevel: config.logLevel || 'info',
      performanceThreshold: config.performanceThreshold || 1000, // ms
      memoryThreshold: config.memoryThreshold || 0.8, // 80% memory usage
      enableProfiling: config.enableProfiling || false,
      ...config
    };
    
    this.metrics = {
      apiCalls: {
        total: 0,
        failed: 0,
        successRate: 1.0,
        responseTimes: []
      },
      trades: {
        total: 0,
        successful: 0,
        failed: 0,
        profitLoss: 0
      },
      performance: {
        memoryUsage: [],
        cpuUsage: [],
        responseTimes: []
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      }
    };
    
    this.state = {
      initialized: false,
      profiling: false,
      lastCleanup: Date.now()
    };
    
    console.log('🐛 Trading Bot Debugger initialized');
  }
  
  /**
   * Initialize debugger
   */
  async initialize() {
    try {
      console.log('🚀 Initializing debugger...');
      
      // Start performance monitoring
      if (this.config.enableProfiling) {
        this.startProfiling();
      }
      
      // Start periodic cleanup
      this.startCleanupInterval();
      
      this.state.initialized = true;
      console.log('✅ Debugger ready');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize debugger:', error);
      throw error;
    }
  }
  
  /**
   * Start performance profiling
   */
  startProfiling() {
    this.state.profiling = true;
    
    // Monitor memory usage
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.metrics.performance.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      });
      
      // Check memory threshold
      const memoryRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
      if (memoryRatio > this.config.memoryThreshold) {
        this.logWarning('High memory usage detected', {
          ratio: memoryRatio.toFixed(2),
          heapUsed: this.formatBytes(memoryUsage.heapUsed),
          heapTotal: this.formatBytes(memoryUsage.heapTotal)
        });
      }
      
    }, 60000); // Every minute
    
    console.log('📊 Performance profiling enabled');
  }
  
  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000); // Every 5 minutes
  }
  
  /**
   * Cleanup old metrics
   */
  cleanupOldMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    // Cleanup performance metrics older than 5 minutes
    this.metrics.performance.memoryUsage = 
      this.metrics.performance.memoryUsage.filter(m => m.timestamp > fiveMinutesAgo);
    
    this.metrics.performance.cpuUsage = 
      this.metrics.performance.cpuUsage.filter(m => m.timestamp > fiveMinutesAgo);
    
    this.metrics.performance.responseTimes = 
      this.metrics.performance.responseTimes.filter(m => m.timestamp > fiveMinutesAgo);
    
    // Keep only last 100 errors
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(-100);
    }
    
    this.state.lastCleanup = now;
    console.log('🧹 Debugger metrics cleaned up');
  }
  
  /**
   * Log API call
   */
  logApiCall(endpoint, method, duration, success = true) {
    this.metrics.apiCalls.total++;
    
    if (!success) {
      this.metrics.apiCalls.failed++;
    }
    
    this.metrics.apiCalls.responseTimes.push({
      timestamp: Date.now(),
      endpoint,
      method,
      duration,
      success
    });
    
    // Update success rate
    this.metrics.apiCalls.successRate = 
      (this.metrics.apiCalls.total - this.metrics.apiCalls.failed) / this.metrics.apiCalls.total;
    
    // Check performance threshold
    if (duration > this.config.performanceThreshold) {
      this.logWarning('Slow API response', {
        endpoint,
        method,
        duration: `${duration}ms`,
        threshold: `${this.config.performanceThreshold}ms`
      });
    }
  }
  
  /**
   * Log trade execution
   */
  logTrade(symbol, quantity, price, type, success, profitLoss = 0) {
    this.metrics.trades.total++;
    
    if (success) {
      this.metrics.trades.successful++;
    } else {
      this.metrics.trades.failed++;
    }
    
    this.metrics.trades.profitLoss += profitLoss;
    
    if (!success) {
      this.logError('Trade execution failed', {
        symbol,
        quantity,
        price,
        type,
        profitLoss
      });
    }
  }
  
  /**
   * Log error
   */
  logError(message, context = {}) {
    this.metrics.errors.total++;
    
    const errorType = context.type || 'unknown';
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
    
    const errorEntry = {
      timestamp: Date.now(),
      message,
      context,
      stack: new Error().stack
    };
    
    this.metrics.errors.recent.push(errorEntry);
    
    console.error(`❌ ${message}:`, context);
    
    // Check for error patterns
    this.detectErrorPatterns();
  }
  
  /**
   * Log warning
   */
  logWarning(message, context = {}) {
    console.warn(`⚠️ ${message}:`, context);
  }
  
  /**
   * Log info
   */
  logInfo(message, context = {}) {
    if (this.config.logLevel === 'info' || this.config.logLevel === 'debug') {
      console.log(`ℹ️ ${message}:`, context);
    }
  }
  
  /**
   * Log debug
   */
  logDebug(message, context = {}) {
    if (this.config.logLevel === 'debug') {
      console.debug(`🐛 ${message}:`, context);
    }
  }
  
  /**
   * Detect error patterns
   */
  detectErrorPatterns() {
    const recentErrors = this.metrics.errors.recent;
    const fiveMinutesAgo = Date.now() - 300000;
    
    // Count errors in last 5 minutes
    const recentErrorCount = recentErrors.filter(e => e.timestamp > fiveMinutesAgo).length;
    
    if (recentErrorCount > 10) {
      this.logWarning('High error rate detected', {
        errorsIn5Minutes: recentErrorCount,
        recommendation: 'Check system health and error logs'
      });
    }
    
    // Check for specific error patterns
    const apiErrors = recentErrors.filter(e => 
      e.context.endpoint && e.timestamp > fiveMinutesAgo
    );
    
    if (apiErrors.length > 5) {
      this.logWarning('API error pattern detected', {
        apiErrors: apiErrors.length,
        recommendation: 'Check API connectivity and credentials'
      });
    }
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const responseTimes = this.metrics.apiCalls.responseTimes
      .filter(r => r.timestamp > Date.now() - 300000) // Last 5 minutes
      .map(r => r.duration);
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    const memoryUsage = this.metrics.performance.memoryUsage;
    const latestMemory = memoryUsage.length > 0 ? memoryUsage[memoryUsage.length - 1] : null;
    
    return {
      api: {
        totalCalls: this.metrics.apiCalls.total,
        failedCalls: this.metrics.apiCalls.failed,
        successRate: this.metrics.apiCalls.successRate,
        avgResponseTime: avgResponseTime.toFixed(2),
        recentResponseTimes: responseTimes.slice(-10)
      },
      trades: {
        total: this.metrics.trades.total,
        successful: this.metrics.trades.successful,
        failed: this.metrics.trades.failed,
        successRate: this.metrics.trades.successful / this.metrics.trades.total || 0,
        totalProfitLoss: this.metrics.trades.profitLoss
      },
      performance: {
        memoryUsage: latestMemory,
        errorCount: this.metrics.errors.total,
        recentErrorRate: this.metrics.errors.recent.filter(e => e.timestamp > Date.now() - 300000).length
      },
      recommendations: this.generateRecommendations()
    };
  }
  
  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const metrics = this.getPerformanceMetrics();
    
    // API performance recommendations
    if (metrics.api.avgResponseTime > 500) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'API response time is high',
        action: 'Consider optimizing API calls or increasing timeout limits'
      });
    }
    
    if (metrics.api.successRate < 0.9) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'API success rate is low',
        action: 'Check API connectivity and error handling'
      });
    }
    
    // Trade performance recommendations
    if (metrics.trades.successRate < 0.7) {
      recommendations.push({
        type: 'trading',
        priority: 'high',
        message: 'Trade success rate is low',
        action: 'Review trading strategies and risk management'
      });
    }
    
    // Memory recommendations
    if (metrics.performance.memoryUsage) {
      const memoryRatio = metrics.performance.memoryUsage.heapUsed / metrics.performance.memoryUsage.heapTotal;
      if (memoryRatio > 0.7) {
        recommendations.push({
          type: 'memory',
          priority: 'medium',
          message: 'High memory usage detected',
          action: 'Consider implementing memory cleanup or reducing data retention'
        });
      }
    }
    
    // Error rate recommendations
    if (metrics.performance.recentErrorRate > 5) {
      recommendations.push({
        type: 'errors',
        priority: 'high',
        message: 'High error rate detected',
        action: 'Investigate recent errors and fix underlying issues'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Get error report
   */
  getErrorReport() {
    const recentErrors = this.metrics.errors.recent
      .filter(e => e.timestamp > Date.now() - 3600000) // Last hour
      .slice(-20); // Last 20 errors
    
    const errorTypes = Object.entries(this.metrics.errors.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 error types
    
    return {
      totalErrors: this.metrics.errors.total,
      recentErrors: recentErrors.length,
      topErrorTypes: errorTypes,
      recentErrorDetails: recentErrors,
      errorTrend: this.calculateErrorTrend()
    };
  }
  
  /**
   * Calculate error trend
   */
  calculateErrorTrend() {
    const now = Date.now();
    const lastHour = this.metrics.errors.recent.filter(e => e.timestamp > now - 3600000).length;
    const previousHour = this.metrics.errors.recent.filter(e => 
      e.timestamp > now - 7200000 && e.timestamp <= now - 3600000
    ).length;
    
    if (previousHour === 0) {
      return lastHour > 0 ? 'increasing' : 'stable';
    }
    
    const trend = ((lastHour - previousHour) / previousHour) * 100;
    
    if (trend > 50) return 'increasing';
    if (trend < -50) return 'decreasing';
    return 'stable';
  }
  
  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Stop debugger
   */
  async stop() {
    console.log('🛑 Stopping debugger...');
    
    this.state.profiling = false;
    this.state.initialized = false;
    
    // Generate final report
    const finalReport = this.getPerformanceMetrics();
    console.log('📊 Final debugger report:', JSON.stringify(finalReport, null, 2));
    
    console.log('✅ Debugger stopped');
  }
}

module.exports = TradingBotDebugger;