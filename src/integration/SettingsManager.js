/**
 * Settings Manager
 * Complete configuration and settings management system
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SettingsManager {
  constructor(config) {
    this.config = {
      configPath: config.configPath || path.join(__dirname, '../../config'),
      encryptionKey: config.encryptionKey || this.generateEncryptionKey(),
      dashboard: config.dashboard,
      ...config
    };
    
    // Settings storage
    this.settings = {
      apiKeys: {
        binance: {
          apiKey: '',
          apiSecret: '',
          testnet: true,
          encrypted: false
        },
        newsapi: {
          apiKey: '',
          encrypted: false
        },
        cryptopanic: {
          apiKey: '',
          encrypted: false
        }
      },
      
      trading: {
        mode: 'paper', // paper, live
        defaultSymbol: 'BTCUSDT',
        defaultOrderType: 'MARKET',
        defaultQuantity: 0.001,
        autoTrade: false,
        strategies: {
          enabled: ['trend_following', 'mean_reversion'],
          active: 'trend_following',
          parameters: {
            trend_following: {
              lookbackPeriod: 20,
              trendStrength: 0.5,
              stopLoss: 0.05,
              takeProfit: 0.15
            },
            mean_reversion: {
              lookbackPeriod: 14,
              deviationThreshold: 2.0,
              stopLoss: 0.03,
              takeProfit: 0.10
            }
          }
        }
      },
      
      risk: {
        dailyLossLimit: 0.10,
        maxPositionSize: 0.02,
        maxPortfolioRisk: 0.20,
        maxLeverage: 3,
        maxDrawdown: 0.25,
        minDiversification: 3,
        maxConcentration: 0.40,
        alertThresholds: {
          dailyLossWarning: 0.07,
          positionSizeWarning: 0.015,
          leverageWarning: 2.5,
          drawdownWarning: 0.20,
          concentrationWarning: 0.35
        }
      },
      
      notifications: {
        enabled: true,
        email: '',
        telegram: '',
        discord: '',
        alerts: {
          tradeExecuted: true,
          riskAlert: true,
          newsAlert: true,
          systemAlert: true
        },
        frequency: 'realtime' // realtime, hourly, daily
      },
      
      dashboard: {
        theme: 'dark',
        layout: 'standard',
        charts: {
          defaultTimeframe: '1h',
          indicators: ['MA', 'RSI', 'MACD', 'Volume'],
          showGrid: true,
          showCrosshair: true
        },
        autoRefresh: true,
        refreshInterval: 5000
      },
      
      system: {
        autoStart: false,
        autoUpdate: true,
        logLevel: 'info',
        dataRetention: 90, // days
        backupEnabled: true,
        backupFrequency: 'daily'
      }
    };
    
    // State
    this.state = {
      initialized: false,
      loaded: false,
      lastSave: null,
      stats: {
        saves: 0,
        loads: 0,
        errors: 0
      }
    };
    
    console.log('⚙️ Settings Manager initialized');
  }
  
  /**
   * Initialize settings manager
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Settings Manager...');
      
      // Ensure config directory exists
      await this.ensureConfigDirectory();
      
      // Load existing settings
      await this.loadSettings();
      
      // Validate and migrate settings if needed
      await this.validateSettings();
      
      this.state.initialized = true;
      this.state.loaded = true;
      
      console.log('✅ Settings Manager ready');
      console.log(`📁 Config path: ${this.config.configPath}`);
      console.log(`📊 Settings loaded: ${this.state.stats.loads} times`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize settings manager:', error);
      throw error;
    }
  }
  
  /**
   * Ensure config directory exists
   */
  async ensureConfigDirectory() {
    try {
      await fs.access(this.config.configPath);
    } catch {
      await fs.mkdir(this.config.configPath, { recursive: true });
      console.log(`📁 Created config directory: ${this.config.configPath}`);
    }
  }
  
  /**
   * Generate encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    if (!text) return '';
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.config.encryptionKey, 'hex'), iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');
      
      return JSON.stringify({
        iv: iv.toString('hex'),
        encrypted,
        authTag
      });
    } catch (error) {
      console.error('Encryption failed:', error.message);
      return text; // Return plain text if encryption fails
    }
  }
  
  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') return '';
    
    try {
      // Check if it's already plain text (not encrypted)
      if (!encryptedData.startsWith('{')) {
        return encryptedData;
      }
      
      const data = JSON.parse(encryptedData);
      const iv = Buffer.from(data.iv, 'hex');
      const encrypted = Buffer.from(data.encrypted, 'hex');
      const authTag = Buffer.from(data.authTag, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.config.encryptionKey, 'hex'), iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return encryptedData; // Return as-is if decryption fails
    }
  }
  
  /**
   * Load settings from file
   */
  async loadSettings() {
    const settingsPath = path.join(this.config.configPath, 'settings.json');
    
    try {
      await fs.access(settingsPath);
      const data = await fs.readFile(settingsPath, 'utf8');
      const loadedSettings = JSON.parse(data);
      
      // Merge with default settings
      this.settings = this.deepMerge(this.settings, loadedSettings);
      
      // Decrypt API keys if they're encrypted
      this.decryptApiKeys();
      
      this.state.loaded = true;
      this.state.stats.loads++;
      
      console.log('📥 Settings loaded from file');
      return true;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📝 No settings file found, using defaults');
        // Save default settings
        await this.saveSettings();
        return true;
      }
      
      console.error('Failed to load settings:', error.message);
      this.state.stats.errors++;
      return false;
    }
  }
  
  /**
   * Save settings to file
   */
  async saveSettings() {
    const settingsPath = path.join(this.config.configPath, 'settings.json');
    
    try {
      // Encrypt API keys before saving
      this.encryptApiKeys();
      
      const data = JSON.stringify(this.settings, null, 2);
      await fs.writeFile(settingsPath, data, 'utf8');
      
      // Decrypt API keys after saving (for runtime use)
      this.decryptApiKeys();
      
      this.state.lastSave = Date.now();
      this.state.stats.saves++;
      
      console.log('💾 Settings saved to file');
      return true;
      
    } catch (error) {
      console.error('Failed to save settings:', error.message);
      this.state.stats.errors++;
      return false;
    }
  }
  
  /**
   * Encrypt API keys for storage
   */
  encryptApiKeys() {
    // Binance API keys
    if (this.settings.apiKeys.binance.apiKey && !this.settings.apiKeys.binance.encrypted) {
      this.settings.apiKeys.binance.apiKey = this.encrypt(this.settings.apiKeys.binance.apiKey);
      this.settings.apiKeys.binance.apiSecret = this.encrypt(this.settings.apiKeys.binance.apiSecret);
      this.settings.apiKeys.binance.encrypted = true;
    }
    
    // NewsAPI key
    if (this.settings.apiKeys.newsapi.apiKey && !this.settings.apiKeys.newsapi.encrypted) {
      this.settings.apiKeys.newsapi.apiKey = this.encrypt(this.settings.apiKeys.newsapi.apiKey);
      this.settings.apiKeys.newsapi.encrypted = true;
    }
    
    // CryptoPanic key
    if (this.settings.apiKeys.cryptopanic.apiKey && !this.settings.apiKeys.cryptopanic.encrypted) {
      this.settings.apiKeys.cryptopanic.apiKey = this.encrypt(this.settings.apiKeys.cryptopanic.apiKey);
      this.settings.apiKeys.cryptopanic.encrypted = true;
    }
  }
  
  /**
   * Decrypt API keys for runtime use
   */
  decryptApiKeys() {
    // Binance API keys
    if (this.settings.apiKeys.binance.encrypted) {
      this.settings.apiKeys.binance.apiKey = this.decrypt(this.settings.apiKeys.binance.apiKey);
      this.settings.apiKeys.binance.apiSecret = this.decrypt(this.settings.apiKeys.binance.apiSecret);
      // Keep encrypted flag for saving
    }
    
    // NewsAPI key
    if (this.settings.apiKeys.newsapi.encrypted) {
      this.settings.apiKeys.newsapi.apiKey = this.decrypt(this.settings.apiKeys.newsapi.apiKey);
    }
    
    // CryptoPanic key
    if (this.settings.apiKeys.cryptopanic.encrypted) {
      this.settings.apiKeys.cryptopanic.apiKey = this.decrypt(this.settings.apiKeys.cryptopanic.apiKey);
    }
  }
  
  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }
  
  /**
   * Check if value is an object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
  
  /**
   * Validate settings
   */
  async validateSettings() {
    const issues = [];
    
    // Validate API keys format
    if (this.settings.apiKeys.binance.apiKey && this.settings.apiKeys.binance.apiKey.length < 10) {
      issues.push('Binance API key appears invalid');
    }
    
    // Validate risk limits
    if (this.settings.risk.dailyLossLimit > 0.5) {
      issues.push('Daily loss limit too high (max 50%)');
      this.settings.risk.dailyLossLimit = 0.10;
    }
    
    if (this.settings.risk.maxPositionSize > 0.1) {
      issues.push('Max position size too high (max 10%)');
      this.settings.risk.maxPositionSize = 0.02;
    }
    
    if (this.settings.risk.maxLeverage > 10) {
      issues.push('Max leverage too high (max 10x)');
      this.settings.risk.maxLeverage = 3;
    }
    
    // Validate notification settings
    if (this.settings.notifications.email && !this.isValidEmail(this.settings.notifications.email)) {
      issues.push('Invalid email format');
      this.settings.notifications.email = '';
    }
    
    if (issues.length > 0) {
      console.warn('⚠️ Settings validation issues:', issues);
      
      // Save corrected settings
      await this.saveSettings();
    }
    
    return issues;
  }
  
  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Get all settings
   */
  getAllSettings() {
    return {
      ...this.settings,
      systemInfo: {
        initialized: this.state.initialized,
        lastSave: this.state.lastSave,
        stats: this.state.stats
      }
    };
  }
  
  /**
   * Get specific setting category
   */
  getSettings(category) {
    if (category && this.settings[category]) {
      return this.settings[category];
    }
    return this.settings;
  }
  
  /**
   * Update settings
   */
  async updateSettings(updates, category = null) {
    try {
      if (category && this.settings[category]) {
        this.settings[category] = this.deepMerge(this.settings[category], updates);
      } else {
        this.settings = this.deepMerge(this.settings, updates);
      }
      
      // Validate updated settings
      await this.validateSettings();
      
      // Save to file
      await this.saveSettings();
      
      // Update dashboard if available
      if (this.config.dashboard) {
        this.config.dashboard.updateSettings(this.getSettingsForDashboard());
      }
      
      console.log('⚙️ Settings updated');
      return { success: true, settings: this.settings };
      
    } catch (error) {
      console.error('Failed to update settings:', error);
      this.state.stats.errors++;
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update API keys
   */
  async updateApiKeys(service, apiKey, apiSecret = null) {
    try {
      if (!this.settings.apiKeys[service]) {
        throw new Error(`Unknown service: ${service}`);
      }
      
      this.settings.apiKeys[service].apiKey = apiKey;
      if (apiSecret !== null) {
        this.settings.apiKeys[service].apiSecret = apiSecret;
      }
      this.settings.apiKeys[service].encrypted = false;
      
      // Encrypt and save
      this.encryptApiKeys();
      await this.saveSettings();
      
      console.log(`🔑 ${service} API keys updated`);
      return { success: true };
      
    } catch (error) {
      console.error('Failed to update API keys:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Test API key connection
   */
  async testApiKey(service) {
    try {
      const keys = this.settings.apiKeys[service];
      
      if (!keys || !keys.apiKey) {
        throw new Error(`No API key configured for ${service}`);
      }
      
      let result;
      
      switch (service) {
        case 'binance':
          result = await this.testBinanceApiKey(keys);
          break;
          
        case 'newsapi':
          result = await this.testNewsApiKey(keys);
          break;
          
        case 'cryptopanic':
          result = await this.testCryptoPanicKey(keys);
          break;
          
        default:
          throw new Error(`Unsupported service: ${service}`);
      }
      
      return { success: true, ...result };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Test Binance API key
   */
  async testBinanceApiKey(keys) {
    // Mock test - in production would make actual API call
    return {
      valid: true,
      permissions: ['SPOT', 'MARGIN'],
      canTrade: true,
      canWithdraw: false,
      message: 'Binance API key test successful (mock)'
    };
  }
  
  /**
   * Test NewsAPI key
   */
  async testNewsApiKey(keys) {
    // Mock test
    return {
      valid: true,
      remaining: 950,
      resetTime: Date.now() + 86400000,
      message: 'NewsAPI key test successful (mock)'
    };
  }
  
  /**
   * Test CryptoPanic key
   */
  async testCryptoPanicKey(keys) {
    // Mock test
    return {
      valid: true,
      plan: 'free',
      remaining: 100,
      message: 'CryptoPanic key test successful (mock)'
    };
  }
  
  /**
   * Get settings for dashboard
   */
  getSettingsForDashboard() {
    // Return safe settings (without decrypted API keys)
    const safeSettings = { ...this.settings };
    
    // Mask API keys in response
    if (safeSettings.apiKeys.binance.apiKey) {
      safeSettings.apiKeys.binance.apiKey = '••••••••' + safeSettings.apiKeys.binance.apiKey.slice(-4);
    }
    
    if (safeSettings.apiKeys.binance.apiSecret) {
      safeSettings.apiKeys.binance.apiSecret = '••••••••';
    }
    
    if (safeSettings.apiKeys.newsapi.apiKey) {
      safeSettings.apiKeys.newsapi.apiKey = '••••••••' + safeSettings.apiKeys.newsapi.apiKey.slice(-4);
    }
    
    if (safeSettings.apiKeys.cryptopanic.apiKey) {
      safeSettings.apiKeys.cryptopanic.apiKey = '••••••••' + safeSettings.apiKeys.cryptopanic.apiKey.slice(-4);
    }
    
    return {
      ...safeSettings,
      systemInfo: {
        initialized: this.state.initialized,
        lastSave: this.state.lastSave,
        stats: this.state.stats
      }
    };
  }
  
  /**
   * Get available strategies
   */
  getAvailableStrategies() {
    return {
      trend_following: {
        name: 'Trend Following',
        description: 'Follows established market trends',
        risk: 'medium',
        winRate: '55-65%',
        holdingPeriod: 'days to weeks',
        parameters: this.settings.trading.strategies.parameters.trend_following
      },
      mean_reversion: {
        name: 'Mean Reversion',
        description: 'Trades deviations from mean price',
        risk: 'medium',
        winRate: '60-70%',
        holdingPeriod: 'hours to days',
        parameters: this.settings.trading.strategies.parameters.mean_reversion
      },
      breakout: {
        name: 'Breakout Trading',
        description: 'Trades breakouts from consolidation',
        risk: 'high',
        winRate: '40-50%',
        holdingPeriod: 'minutes to hours',
        parameters: {
          consolidationPeriod: 20,
          breakoutThreshold: 0.02,
          stopLoss: 0.03,
          takeProfit: 0.10
        }
      },
      scalping: {
        name: 'Scalping',
        description: 'Quick trades for small profits',
        risk: 'high',
        winRate: '70-80%',
        holdingPeriod: 'seconds to minutes',
        parameters: {
          profitTarget: 0.005,
          stopLoss: 0.002,
          maxTradesPerDay: 50
        }
      }
    };
  }
  
  /**
   * Update strategy settings
   */
  async updateStrategy(strategy, updates) {
    try {
      if (!this.settings.trading.strategies.parameters[strategy]) {
        // Add new strategy
        this.settings.trading.strategies.parameters[strategy] = updates;
        
        if (!this.settings.trading.strategies.enabled.includes(strategy)) {
          this.settings.trading.strategies.enabled.push(strategy);
        }
      } else {
        // Update existing strategy
        this.settings.trading.strategies.parameters[strategy] = {
          ...this.settings.trading.strategies.parameters[strategy],
          ...updates
        };
      }
      
      await this.saveSettings();
      
      console.log(`🎯 Strategy ${strategy} updated`);
      return { success: true };
      
    } catch (error) {
      console.error('Failed to update strategy:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Set active strategy
   */
  async setActiveStrategy(strategy) {
    try {
      if (!this.settings.trading.strategies.enabled.includes(strategy)) {
        throw new Error(`Strategy ${strategy} is not enabled`);
      }
      
      this.settings.trading.strategies.active = strategy;
      await this.saveSettings();
      
      console.log(`🎯 Active strategy set to: ${strategy}`);
      return { success: true };
      
    } catch (error) {
      console.error('Failed to set active strategy:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Enable/disable strategy
   */
  async toggleStrategy(strategy, enabled) {
    try {
      if (enabled) {
        if (!this.settings.trading.strategies.enabled.includes(strategy)) {
          this.settings.trading.strategies.enabled.push(strategy);
        }
      } else {
        this.settings.trading.strategies.enabled = 
          this.settings.trading.strategies.enabled.filter(s => s !== strategy);
        
        // If disabling active strategy, switch to first enabled
        if (this.settings.trading.strategies.active === strategy && 
            this.settings.trading.strategies.enabled.length > 0) {
          this.settings.trading.strategies.active = this.settings.trading.strategies.enabled[0];
        }
      }
      
      await this.saveSettings();
      
      console.log(`🎯 Strategy ${strategy} ${enabled ? 'enabled' : 'disabled'}`);
      return { success: true };
      
    } catch (error) {
      console.error('Failed to toggle strategy:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get risk settings for dashboard
   */
  getRiskSettings() {
    return {
      limits: this.settings.risk,
      currentUsage: this.getRiskLimitUsage(),
      recommendations: this.getRiskRecommendations()
    };
  }
  
  /**
   * Get risk limit usage (mock)
   */
  getRiskLimitUsage() {
    return {
      dailyLossUsed: 0.35,
      positionSizeUsed: 0.60,
      leverageUsed: 0.45,
      drawdownUsed: 0.25,
      concentrationUsed: 0.55,
      diversification: 4 // number of positions
    };
  }
  
  /**
   * Get risk recommendations
   */
  getRiskRecommendations() {
    const usage = this.getRiskLimitUsage();
    const recommendations = [];
    
    if (usage.positionSizeUsed > 0.8) {
      recommendations.push({
        type: 'reduce_position_size',
        priority: 'high',
        message: 'Position size usage is high',
        action: 'Consider reducing maximum position size'
      });
    }
    
    if (usage.concentrationUsed > 0.7) {
      recommendations.push({
        type: 'reduce_concentration',
        priority: 'medium',
        message: 'Portfolio concentration is high',
        action: 'Consider diversifying into more assets'
      });
    }
    
    if (usage.diversification < this.settings.risk.minDiversification) {
      recommendations.push({
        type: 'increase_diversification',
        priority: 'medium',
        message: 'Portfolio diversification is low',
        action: `Add more positions (current: ${usage.diversification}, min: ${this.settings.risk.minDiversification})`
      });
    }
    
    return recommendations;
  }
  
  /**
   * Update risk settings
   */
  async updateRiskSettings(updates) {
    try {
      this.settings.risk = {
        ...this.settings.risk,
        ...updates
      };
      
      // Validate risk limits
      await this.validateSettings();
      
      await this.saveSettings();
      
      console.log('🛡️ Risk settings updated');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to update risk settings:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get notification settings
   */
  getNotificationSettings() {
    return {
      ...this.settings.notifications,
      testResults: this.testNotificationChannels()
    };
  }
  
  /**
   * Test notification channels (mock)
   */
  testNotificationChannels() {
    const results = {};
    
    if (this.settings.notifications.email) {
      results.email = {
        valid: this.isValidEmail(this.settings.notifications.email),
        lastTest: Date.now(),
        message: this.isValidEmail(this.settings.notifications.email) ? 
          'Email format valid' : 'Invalid email format'
      };
    }
    
    if (this.settings.notifications.telegram) {
      results.telegram = {
        valid: this.settings.notifications.telegram.length > 5,
        lastTest: Date.now(),
        message: 'Telegram configured'
      };
    }
    
    if (this.settings.notifications.discord) {
      results.discord = {
        valid: this.settings.notifications.discord.includes('discord.com'),
        lastTest: Date.now(),
        message: 'Discord webhook configured'
      };
    }
    
    return results;
  }
  
  /**
   * Update notification settings
   */
  async updateNotificationSettings(updates) {
    try {
      this.settings.notifications = {
        ...this.settings.notifications,
        ...updates
      };
      
      await this.saveSettings();
      
      console.log('🔔 Notification settings updated');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get dashboard settings
   */
  getDashboardSettings() {
    return {
      ...this.settings.dashboard,
      availableThemes: ['dark', 'light', 'blue', 'green'],
      availableLayouts: ['standard', 'compact', 'advanced', 'minimal']
    };
  }
  
  /**
   * Update dashboard settings
   */
  async updateDashboardSettings(updates) {
    try {
      this.settings.dashboard = {
        ...this.settings.dashboard,
        ...updates
      };
      
      await this.saveSettings();
      
      console.log('📊 Dashboard settings updated');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to update dashboard settings:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get system settings
   */
  getSystemSettings() {
    return {
      ...this.settings.system,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }
  
  /**
   * Update system settings
   */
  async updateSystemSettings(updates) {
    try {
      this.settings.system = {
        ...this.settings.system,
        ...updates
      };
      
      await this.saveSettings();
      
      console.log('⚙️ System settings updated');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to update system settings:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Export settings
   */
  exportSettings(format = 'json') {
    const exportData = {
      settings: this.settings,
      exportInfo: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        format
      }
    };
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }
    
    // Simple CSV export
    let csv = 'Category,Setting,Value\n';
    
    Object.entries(this.settings).forEach(([category, settings]) => {
      if (typeof settings === 'object') {
        Object.entries(settings).forEach(([key, value]) => {
          if (typeof value === 'object') {
            csv += `${category},${key},"${JSON.stringify(value)}"\n`;
          } else {
            csv += `${category},${key},"${value}"\n`;
          }
        });
      } else {
        csv += `${category},,"${settings}"\n`;
      }
    });
    
    return csv;
  }
  
  /**
   * Import settings
   */
  async importSettings(data, format = 'json') {
    try {
      let importedSettings;
      
      if (format === 'json') {
        importedSettings = JSON.parse(data);
      } else if (format === 'csv') {
        importedSettings = this.parseCSVSettings(data);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
      
      // Validate imported settings
      this.settings = this.deepMerge(this.settings, importedSettings.settings || importedSettings);
      await this.validateSettings();
      await this.saveSettings();
      
      console.log('📥 Settings imported successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to import settings:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Parse CSV settings (simplified)
   */
  parseCSVSettings(csv) {
    const lines = csv.split('\n');
    const settings = {};
    
    lines.forEach(line => {
      if (line.trim() && !line.startsWith('Category')) {
        const [category, key, value] = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        
        if (!settings[category]) {
          settings[category] = {};
        }
        
        if (key) {
          try {
            settings[category][key] = JSON.parse(value);
          } catch {
            settings[category][key] = value;
          }
        }
      }
    });
    
    return settings;
  }
  
  /**
   * Reset settings to defaults
   */
  async resetSettings(category = null) {
    try {
      const defaults = new SettingsManager({}).settings;
      
      if (category && defaults[category]) {
        this.settings[category] = defaults[category];
      } else {
        this.settings = defaults;
      }
      
      await this.saveSettings();
      
      console.log(`🔄 Settings ${category ? `(${category}) ` : ''}reset to defaults`);
      return { success: true };
      
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Backup settings
   */
  async backupSettings() {
    try {
      const backupDir = path.join(this.config.configPath, 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `settings-backup-${timestamp}.json`);
      
      const backupData = {
        settings: this.settings,
        backupInfo: {
          backedUpAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      
      console.log(`💾 Settings backed up to: ${backupPath}`);
      return { success: true, path: backupPath };
      
    } catch (error) {
      console.error('Failed to backup settings:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * List available backups
   */
  async listBackups() {
    try {
      const backupDir = path.join(this.config.configPath, 'backups');
      
      try {
        await fs.access(backupDir);
      } catch {
        return [];
      }
      
      const files = await fs.readdir(backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime
          });
        }
      }
      
      return backups.sort((a, b) => b.modified - a.modified);
      
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
  
  /**
   * Restore from backup
   */
  async restoreBackup(backupPath) {
    try {
      const data = await fs.readFile(backupPath, 'utf8');
      const backup = JSON.parse(data);
      
      this.settings = this.deepMerge(this.settings, backup.settings);
      await this.validateSettings();
      await this.saveSettings();
      
      console.log(`📥 Settings restored from: ${backupPath}`);
      return { success: true };
      
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Stop settings manager
   */
  async stop() {
    console.log('🛑 Stopping Settings Manager...');
    
    // Save settings before stopping
    await this.saveSettings();
    
    this.state.initialized = false;
    
    console.log('✅ Settings Manager stopped');
  }
}

module.exports = SettingsManager;