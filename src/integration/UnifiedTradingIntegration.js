/**
 * Universal Trading Bot - Unified Trading Integration
 * Supports both demo (paper trading) and live modes with seamless switching
 */

const BinanceTradingIntegration = require('./BinanceTradingIntegration');
const DemoTradingEngine = require('./DemoTradingEngine');

class UnifiedTradingIntegration {
  constructor(config) {
    this.config = {
      defaultMode: config.defaultMode || 'demo', // 'demo' or 'live'
      demoConfig: {
        initialBalance: 10000,
        defaultCurrency: 'USDT',
        supportedPairs: [
          'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
          'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'MATICUSDT', 'LTCUSDT'
        ],
        commissionRate: 0.001,
        enableReset: true,
        ...config.demoConfig
      },
      liveConfig: {
        apiKey: config.liveConfig?.apiKey || '',
        apiSecret: config.liveConfig?.apiSecret || '',
        testnet: config.liveConfig?.testnet || true,
        mode: config.liveConfig?.mode || 'paper',
        ...config.liveConfig
      },
      enableAutoSwitch: config.enableAutoSwitch || false,
      ...config
    };
    
    // Trading engines
    this.demoEngine = null;
    this.liveEngine = null;
    this.activeEngine = null;
    
    // State
    this.state = {
      mode: this.config.defaultMode,
      initialized: false,
      switching: false,
      lastSwitch: null
    };
    
    console.log(`🔄 Unified Trading Integration initialized (default mode: ${this.config.defaultMode})`);
  }
  
  /**
   * Initialize unified trading
   */
  async initialize() {
    try {
      console.log('🚀 Initializing unified trading integration...');
      
      // Initialize based on default mode
      if (this.config.defaultMode === 'demo') {
        await this.initializeDemoMode();
      } else {
        await this.initializeLiveMode();
      }
      
      this.state.initialized = true;
      console.log(`✅ Unified trading ready (mode: ${this.state.mode})`);
      
      return {
        success: true,
        mode: this.state.mode,
        engine: this.activeEngine.constructor.name,
        canSwitch: true
      };
      
    } catch (error) {
      console.error('❌ Failed to initialize unified trading:', error);
      throw error;
    }
  }
  
  /**
   * Initialize demo mode
   */
  async initializeDemoMode() {
    console.log('🎮 Initializing demo trading engine...');
    
    this.demoEngine = new DemoTradingEngine(this.config.demoConfig);
    await this.demoEngine.initialize();
    
    this.activeEngine = this.demoEngine;
    this.state.mode = 'demo';
    
    console.log('✅ Demo mode ready');
  }
  
  /**
   * Initialize live mode
   */
  async initializeLiveMode() {
    console.log('💰 Initializing live trading engine...');
    
    this.liveEngine = new BinanceTradingIntegration(this.config.liveConfig);
    await this.liveEngine.initialize();
    
    this.activeEngine = this.liveEngine;
    this.state.mode = 'live';
    
    console.log('✅ Live mode ready');
  }
  
  /**
   * Switch between demo and live modes
   */
  async switchMode(newMode) {
    try {
      if (this.state.switching) {
        throw new Error('Mode switch already in progress');
      }
      
      if (newMode === this.state.mode) {
        return { success: true, message: `Already in ${newMode} mode` };
      }
      
      console.log(`🔄 Switching from ${this.state.mode} to ${newMode} mode...`);
      this.state.switching = true;
      
      // Stop current engine if needed
      if (this.activeEngine && this.activeEngine.stop) {
        await this.activeEngine.stop();
      }
      
      // Initialize new engine
      if (newMode === 'demo') {
        if (!this.demoEngine) {
          await this.initializeDemoMode();
        } else {
          this.activeEngine = this.demoEngine;
          this.state.mode = 'demo';
        }
      } else {
        if (!this.liveEngine) {
          await this.initializeLiveMode();
        } else {
          this.activeEngine = this.liveEngine;
          this.state.mode = 'live';
        }
      }
      
      this.state.switching = false;
      this.state.lastSwitch = Date.now();
      
      console.log(`✅ Successfully switched to ${newMode} mode`);
      
      return {
        success: true,
        mode: this.state.mode,
        engine: this.activeEngine.constructor.name,
        message: `Switched to ${newMode} mode`
      };
      
    } catch (error) {
      this.state.switching = false;
      console.error(`❌ Failed to switch to ${newMode} mode:`, error);
      
      // Revert to previous engine if possible
      if (this.activeEngine) {
        try {
          await this.activeEngine.initialize();
        } catch (e) {
          console.error('❌ Failed to revert to previous engine:', e);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Get current mode info
   */
  getModeInfo() {
    return {
      currentMode: this.state.mode,
      engine: this.activeEngine ? this.activeEngine.constructor.name : 'none',
      demoAvailable: !!this.demoEngine,
      liveAvailable: !!this.liveEngine,
      canSwitch: !this.state.switching,
      lastSwitch: this.state.lastSwitch,
      demoConfig: this.config.demoConfig,
      liveConfig: {
        ...this.config.liveConfig,
        apiKey: this.config.liveConfig.apiKey ? '***' + this.config.liveConfig.apiKey.slice(-4) : 'not set',
        apiSecret: this.config.liveConfig.apiSecret ? '********' : 'not set'
      }
    };
  }
  
  /**
   * Unified buy method
   */
  async buy(symbol, quantity, orderType = 'MARKET', price = null) {
    try {
      if (!this.activeEngine) {
        throw new Error('No active trading engine');
      }
      
      console.log(`🛒 ${this.state.mode.toUpperCase()} BUY: ${quantity} ${symbol}`);
      
      const result = await this.activeEngine.buy(symbol, quantity, orderType, price);
      
      return {
        ...result,
        mode: this.state.mode,
        demo: this.state.mode === 'demo'
      };
      
    } catch (error) {
      console.error(`❌ ${this.state.mode.toUpperCase()} buy failed:`, error);
      
      return {
        success: false,
        error: error.message,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        message: `${this.state.mode.toUpperCase()} buy failed: ${error.message}`
      };
    }
  }
  
  /**
   * Unified sell method
   */
  async sell(symbol, quantity, orderType = 'MARKET', price = null) {
    try {
      if (!this.activeEngine) {
        throw new Error('No active trading engine');
      }
      
      console.log(`🛒 ${this.state.mode.toUpperCase()} SELL: ${quantity} ${symbol}`);
      
      const result = await this.activeEngine.sell(symbol, quantity, orderType, price);
      
      return {
        ...result,
        mode: this.state.mode,
        demo: this.state.mode === 'demo'
      };
      
    } catch (error) {
      console.error(`❌ ${this.state.mode.toUpperCase()} sell failed:`, error);
      
      return {
        success: false,
        error: error.message,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        message: `${this.state.mode.toUpperCase()} sell failed: ${error.message}`
      };
    }
  }
  
  /**
   * Unified get balance
   */
  async getBalance() {
    try {
      if (!this.activeEngine) {
        throw new Error('No active trading engine');
      }
      
      const balance = await this.activeEngine.getBalance();
      
      return {
        ...balance,
        mode: this.state.mode,
        demo: this.state.mode === 'demo'
      };
      
    } catch (error) {
      console.error(`❌ ${this.state.mode.toUpperCase()} get balance failed:`, error);
      
      return {
        success: false,
        error: error.message,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        message: `Failed to get balance: ${error.message}`
      };
    }
  }
  
  /**
   * Unified get portfolio
   */
  async getPortfolio() {
    try {
      if (!this.activeEngine) {
        throw new Error('No active trading engine');
      }
      
      const portfolio = await this.activeEngine.getPortfolio();
      
      return {
        ...portfolio,
        mode: this.state.mode,
        demo: this.state.mode === 'demo'
      };
      
    } catch (error) {
      console.error(`❌ ${this.state.mode.toUpperCase()} get portfolio failed:`, error);
      
      return {
        success: false,
        error: error.message,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        message: `Failed to get portfolio: ${error.message}`
      };
    }
  }
  
  /**
   * Unified get market data
   */
  async getMarketData(symbol = null) {
    try {
      if (!this.activeEngine) {
        throw new Error('No active trading engine');
      }
      
      const marketData = await this.activeEngine.getMarketData(symbol);
      
      return {
        ...marketData,
        mode: this.state.mode,
        demo: this.state.mode === 'demo'
      };
      
    } catch (error) {
      console.error(`❌ ${this.state.mode.toUpperCase()} get market data failed:`, error);
      
      return {
        success: false,
        error: error.message,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        message: `Failed to get market data: ${error.message}`
      };
    }
  }
  
  /**
   * Unified get trade history
   */
  async getTradeHistory(limit = 50) {
    try {
      if (!this.activeEngine) {
        throw new Error('No active trading engine');
      }
      
      const history = await this.activeEngine.getTradeHistory(limit);
      
      return {
        ...history,
        mode: this.state.mode,
        demo: this.state.mode === 'demo'
      };
      
    } catch (error) {
      console.error(`❌ ${this.state.mode.toUpperCase()} get trade history failed:`, error);
      
      return {
        success: false,
        error: error.message,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        message: `Failed to get trade history: ${error.message}`
      };
    }
  }
  
  /**
   * Unified get performance
   */
  async getPerformance() {
    try {
      if (!this.activeEngine) {
        throw new Error('No active trading engine');
      }
      
      const performance = await this.activeEngine.getPerformance();
      
      return {
        ...performance,
        mode: this.state.mode,
        demo: this.state.mode === 'demo'
      };
      
    } catch (error) {
      console.error(`❌ ${this.state.mode.toUpperCase()} get performance failed:`, error);
      
      return {
        success: false,
        error: error.message,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        message: `Failed to get performance: ${error.message}`
      };
    }
  }
  
  /**
   * Reset demo account (demo mode only)
   */
  async resetDemoAccount() {
    if (this.state.mode !== 'demo') {
      throw new Error('Reset demo account is only available in demo mode');
    }
    
    if (!this.demoEngine || !this.demoEngine.resetDemoAccount) {
      throw new Error('Demo engine does not support reset');
    }
    
    try {
      console.log('🔄 Resetting demo account...');
      
      const result = await this.demoEngine.resetDemoAccount();
      
      return {
        ...result,
        mode: this.state.mode,
        demo: true,
        message: 'Demo account reset successfully'
      };
      
    } catch (error) {
      console.error('❌ Failed to reset demo account:', error);
      throw error;
    }
  }
  
  /**
   * Get unified dashboard data
   */
  async getDashboardData() {
    try {
      const [
        balance,
        portfolio,
        marketData,
        performance,
        tradeHistory
      ] = await Promise.all([
        this.getBalance(),
        this.getPortfolio(),
        this.getMarketData(),
        this.getPerformance(),
        this.getTradeHistory(10)
      ]);
      
      return {
        success: true,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        balance,
        portfolio,
        marketData,
        performance,
        tradeHistory,
        modeInfo: this.getModeInfo(),
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Failed to get dashboard data:', error);
      
      return {
        success: false,
        error: error.message,
        mode: this.state.mode,
        demo: this.state.mode === 'demo',
        message: `Failed to get dashboard data: ${error.message}`
      };
    }
  }
  
  /**
   * Stop unified trading
   */
  async stop() {
    console.log('🛑 Stopping unified trading integration...');
    
    // Stop both engines
    const stops = [];
    
    if (this.demoEngine && this.demoEngine.stop) {
      stops.push(this.demoEngine.stop().catch(e => console.warn('Demo engine stop failed:', e)));
    }
    
    if (this.liveEngine && this.liveEngine.stop) {
      stops.push(this.liveEngine.stop().catch(e => console.warn('Live engine stop failed:', e)));
    }
    
    await Promise.all(stops);
    
    this.activeEngine = null;
    this.state.initialized = false;
    
    console.log('✅ Unified trading stopped');
  }
}

module.exports = UnifiedTradingIntegration;