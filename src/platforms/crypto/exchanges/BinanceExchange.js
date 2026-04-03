/**
 * Binance Exchange Adapter
 * Intelligent adapter for Binance cryptocurrency exchange with knowledge integration
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const axios = require('axios');

class BinanceExchange {
  constructor(config) {
    this.config = {
      apiKey: config.apiKey || '',
      apiSecret: config.apiSecret || '',
      testnet: config.testnet || false,
      mode: config.mode || 'paper', // paper, live
      learningEnabled: config.learningEnabled !== false,
      ...config
    };
    
    // Binance-specific intelligence
    this.intelligence = {
      exchange: 'binance',
      type: 'centralized',
      features: ['spot', 'futures', 'margin', 'staking', 'options'],
      limits: {
        rateLimit: 1200,
        orderLimit: 10,
        weightLimit: 1200,
        maxLeverage: 125
      },
      fees: {
        maker: 0.001,
        taker: 0.001,
        vipTiers: true
      },
      supportedMarkets: this.getSupportedMarkets(),
      tradingRules: this.getTradingRules()
    };
    
    // API endpoints
    this.baseURL = this.config.testnet 
      ? 'https://testnet.binance.vision' 
      : 'https://api.binance.com';
    
    this.wsURL = this.config.testnet
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
    
    // Connections
    this.ws = null;
    this.wsSubscriptions = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // HTTP client
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'X-MBX-APIKEY': this.config.apiKey
      }
    });
    
    // Market data cache
    this.marketData = {
      tickers: new Map(),
      orderBooks: new Map(),
      klines: new Map(),
      trades: new Map(),
      depth: new Map()
    };
    
    // Knowledge integration
    this.knowledge = {
      patterns: this.getBinancePatterns(),
      strategies: this.getBinanceStrategies(),
      learnings: [],
      performance: {}
    };
    
    // State
    this.state = {
      initialized: false,
      connected: false,
      tradingEnabled: false,
      lastUpdate: null,
      health: 'unknown'
    };
    
    console.log(`💱 Binance Exchange Adapter initialized (${this.config.testnet ? 'Testnet' : 'Mainnet'})`);
  }
  
  /**
   * Get supported markets on Binance
   */
  getSupportedMarkets() {
    return {
      spot: {
        major: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
        minor: ['ADAUSDT', 'DOTUSDT', 'DOGEUSDT', 'MATICUSDT', 'LTCUSDT'],
        stablecoin: ['BTCBUSD', 'ETHBUSD', 'BTCUSDC', 'ETHUSDC'],
        defi: ['UNIUSDT', 'AAVEUSDT', 'LINKUSDT', 'MKRUSDT'],
        meme: ['SHIBUSDT', 'PEPEUSDT', 'FLOKIUSDT']
      },
      futures: {
        perpetual: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'],
        quarterly: ['BTCUSD_2406', 'ETHUSD_2406']
      },
      margin: {
        cross: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
        isolated: ['SOLUSDT', 'ADAUSDT']
      }
    };
  }
  
  /**
   * Get Binance-specific trading rules
   */
  getTradingRules() {
    return {
      // Order rules
      minOrderSize: {
        BTCUSDT: 0.00001,
        ETHUSDT: 0.001,
        BNBUSDT: 0.1,
        default: 0.001
      },
      
      maxOrderSize: {
        BTCUSDT: 1000,
        ETHUSDT: 10000,
        default: 100000
      },
      
      pricePrecision: {
        BTCUSDT: 2,
        ETHUSDT: 2,
        BNBUSDT: 4,
        default: 8
      },
      
      quantityPrecision: {
        BTCUSDT: 6,
        ETHUSDT: 5,
        BNBUSDT: 3,
        default: 8
      },
      
      // Trading rules
      minNotional: 10, // $10 minimum order value
      maxLeverage: 125,
      fundingInterval: 8, // hours
      
      // Risk rules
      liquidationRisk: 'high_with_leverage',
      insuranceFund: true,
      autoDeleveraging: true,
      
      // Time rules
      serverTimeDrift: 5000, // 5 seconds max drift
      orderExpiration: 'GTC', // Good Till Cancelled
      
      // Binance-specific features
      icebergOrders: true,
      postOnly: true,
      timeInForce: ['GTC', 'IOC', 'FOK']
    };
  }
  
  /**
   * Get Binance-specific patterns
   */
  getBinancePatterns() {
    return {
      // Binance listing patterns
      new_listing_pump: {
        description: 'Price pump after new listing on Binance',
        confidence: 0.8,
        typicalGain: '50-200%',
        duration: '1-3 days',
        indicators: ['announcement_time', 'initial_volume', 'social_hype']
      },
      
      // Binance launchpad patterns
      launchpad_effect: {
        description: 'Price movement around Binance Launchpad projects',
        confidence: 0.75,
        phases: ['announcement', 'subscription', 'distribution', 'trading'],
        typicalMovement: 'pump_and_dump'
      },
      
      // Binance futures patterns
      funding_rate_arbitrage: {
        description: 'Arbitrage opportunities from funding rate differences',
        confidence: 0.7,
        requirements: ['high_funding_rate', 'low_fees', 'fast_execution'],
        typicalProfit: '0.1-0.5%'
      },
      
      // Binance volume patterns
      binance_volume_spike: {
        description: 'Unusual volume spikes on Binance',
        confidence: 0.65,
        implications: ['whale_activity', 'news_event', 'market_manipulation'],
        action: 'investigate_before_trading'
      },
      
      // Binance API patterns
      rate_limit_awareness: {
        description: 'Pattern of hitting rate limits during high volatility',
        confidence: 0.9,
        solution: 'implement_request_queue',
        prevention: 'respect_1200_weight_limit'
      }
    };
  }
  
  /**
   * Get Binance-specific strategies
   */
  getBinanceStrategies() {
    return {
      binance_launchpad_arbitrage: {
        name: 'Binance Launchpad Arbitrage',
        description: 'Arbitrage between Launchpad price and market price',
        risk: 'medium',
        requirements: ['launchpad_access', 'fast_execution'],
        typicalReturn: '20-100%',
        holdingPeriod: 'hours'
      },
      
      funding_rate_trading: {
        name: 'Funding Rate Trading',
        description: 'Trade based on perpetual futures funding rates',
        risk: 'low',
        requirements: ['futures_account', 'margin_available'],
        typicalReturn: '5-20% APR',
        holdingPeriod: 'days'
      },
      
      binance_staking_yield: {
        name: 'Binance Staking Yield',
        description: 'Earn yield through Binance staking products',
        risk: 'low',
        requirements: ['asset_holding', 'staking_lockup'],
        typicalReturn: '3-15% APR',
        holdingPeriod: 'weeks_months'
      },
      
      binance_savings: {
        name: 'Binance Savings',
        description: 'Earn interest through Binance savings products',
        risk: 'very_low',
        requirements: ['stablecoin_holding'],
        typicalReturn: '1-10% APR',
        holdingPeriod: 'flexible'
      },
      
      binance_dual_investment: {
        name: 'Binance Dual Investment',
        description: 'Earn yield through structured products',
        risk: 'medium',
        requirements: ['understanding_of_options'],
        typicalReturn: '10-50% APR',
        holdingPeriod: 'days_weeks'
      }
    };
  }
  
  /**
   * Initialize Binance connection
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Binance Exchange...');
      
      // Test connection
      await this.testConnection();
      
      // Get exchange info
      await this.loadExchangeInfo();
      
      // Initialize WebSocket
      await this.initializeWebSocket();
      
      // Load account info if API keys provided
      if (this.config.apiKey && this.config.apiSecret) {
        await this.loadAccountInfo();
      }
      
      // Setup monitoring
      await this.setupMonitoring();
      
      this.state.initialized = true;
      this.state.connected = true;
      this.state.health = 'healthy';
      this.state.lastUpdate = Date.now();
      
      console.log('✅ Binance Exchange initialized successfully');
      console.log(`📊 Mode: ${this.config.mode}`);
      console.log(`🔗 Connection: ${this.config.testnet ? 'Testnet' : 'Mainnet'}`);
      console.log(`🧠 Learning: ${this.config.learningEnabled ? 'Enabled' : 'Disabled'}`);
      
      return { success: true, exchange: 'binance' };
      
    } catch (error) {
      console.error('❌ Failed to initialize Binance:', error);
      this.state.health = 'unhealthy';
      throw error;
    }
  }
  
  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.httpClient.get('/api/v3/ping');
      if (response.status === 200) {
        console.log('✅ Binance API connection test passed');
        return true;
      }
      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      throw new Error(`Binance connection test failed: ${error.message}`);
    }
  }
  
  /**
   * Load exchange information
   */
  async loadExchangeInfo() {
    try {
      const response = await this.httpClient.get('/api/v3/exchangeInfo');
      this.exchangeInfo = response.data;
      
      // Process symbols information
      this.symbolsInfo = {};
      response.data.symbols.forEach(symbol => {
        this.symbolsInfo[symbol.symbol] = {
          symbol: symbol.symbol,
          status: symbol.status,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          filters: symbol.filters.reduce((acc, filter) => {
            acc[filter.filterType] = filter;
            return acc;
          }, {}),
          orderTypes: symbol.orderTypes,
          icebergAllowed: symbol.icebergAllowed,
          ocoAllowed: symbol.ocoAllowed,
          quoteOrderQtyMarketAllowed: symbol.quoteOrderQtyMarketAllowed,
          isSpotTradingAllowed: symbol.isSpotTradingAllowed,
          isMarginTradingAllowed: symbol.isMarginTradingAllowed
        };
      });
      
      console.log(`📊 Loaded ${Object.keys(this.symbolsInfo).length} trading symbols`);
      return this.symbolsInfo;
      
    } catch (error) {
      console.error('Failed to load exchange info:', error);
      throw error;
    }
  }
  
  /**
   * Initialize WebSocket connection
   */
  async initializeWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsURL);
      
      this.ws.on('open', () => {
        console.log('🔌 Binance WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupWebSocketHandlers();
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error('Binance WebSocket error:', error);
        reject(error);
      });
      
      this.ws.on('close', () => {
        console.log('🔌 Binance WebSocket disconnected');
        this.isConnected = false;
        this.handleReconnection();
      });
    });
  }
  
  /**
   * Setup WebSocket message handlers
   */
  setupWebSocketHandlers() {
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });
  }
  
  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(message) {
    // Handle different message types
    if (message.e) {
      // Event-based messages
      switch (message.e) {
        case 'depthUpdate':
          this.handleDepthUpdate(message);
          break;
        case '24hrTicker':
          this.handleTickerUpdate(message);
          break;
        case 'kline':
          this.handleKlineUpdate(message);
          break;
        case 'trade':
          this.handleTradeUpdate(message);
          break;
        case 'outboundAccountPosition':
          this.handleAccountUpdate(message);
          break;
        case 'executionReport':
          this.handleOrderUpdate(message);
          break;
      }
    }
    
    // Call subscription callbacks
    if (message.id && this.wsSubscriptions.has(message.id)) {
      const callback = this.wsSubscriptions.get(message.id);
      callback(message);
    }
  }
  
  /**
   * Handle depth (order book) updates
   */
  handleDepthUpdate(data) {
    const symbol = data.s.toLowerCase();
    
    if (!this.marketData.depth.has(symbol)) {
      this.marketData.depth.set(symbol, {
        bids: [],
        asks: [],
        lastUpdateId: data.u
      });
    }
    
    const depth = this.marketData.depth.get(symbol);
    
    // Update bids
    if (data.b && data.b.length > 0) {
      depth.bids = this.updatePriceLevels(depth.bids, data.b, 'desc');
    }
    
    // Update asks
    if (data.a && data.a.length > 0) {
      depth.asks = this.updatePriceLevels(depth.asks, data.a, 'asc');
    }
    
    depth.lastUpdateId = data.u;
    
    // Emit event for dashboard
    this.emitMarketData('depth', { symbol, depth });
  }
  
  /**
   * Update price levels in order book
   */
  updatePriceLevels(currentLevels, updates, sortOrder) {
    const levels = new Map();
    
    // Add current levels
    currentLevels.forEach(level => {
      if (parseFloat(level[1]) > 0) {
        levels.set(level[0], parseFloat(level[1]));
      }
    });
    
    // Apply updates
    updates.forEach(update => {
      const quantity = parseFloat(update[1]);
      if (quantity === 0) {
        levels.delete(update[0]);
      } else {
        levels.set(update[0], quantity);
      }
    });
    
    // Convert back to array and sort
    let result = Array.from(levels.entries()).map(([price, quantity]) => [price, quantity.toString()]);
    
    if (sortOrder === 'desc') {
      result.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
    } else {
      result.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    }
    
    return result.slice(0, 20); // Keep top 20 levels
  }
  
  /**
   * Handle ticker updates
   */
  handleTickerUpdate(data) {
    const symbol = data.s.toLowerCase();
    
    const ticker = {
      symbol: data.s,
      price: parseFloat(data.c),
      priceChange: parseFloat(data.p),
      priceChangePercent: parseFloat(data.P),
      volume: parseFloat(data.v),
      quoteVolume: parseFloat(data.q),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      open: parseFloat(data.o),
      close: parseFloat(data.c),
      timestamp: data.E
    };
    
    this.marketData.tickers.set(symbol, ticker);
    
    // Emit event for dashboard
    this.emitMarketData('ticker', { symbol, ticker });
    
    // Update knowledge with price movement
    if (this.config.learningEnabled) {
      this.updatePriceKnowledge(symbol, ticker);
    }
  }
  
  /**
   * Handle kline/candlestick updates
   */
  handleKlineUpdate(data) {
    const symbol = data.s.toLowerCase();
    const interval = data.k.i;
    const key = `${symbol}_${interval}`;
    
    if (!this.marketData.klines.has(key)) {
      this.marketData.klines.set(key, []);
    }
    
    const klines = this.marketData.klines.get(key);
    const kline = {
      openTime: data.k.t,
      open: parseFloat(data.k.o),
      high: parseFloat(data.k.h),
      low: parseFloat(data.k.l),
      close: parseFloat(data.k.c),
      volume: parseFloat(data.k.v),
      closeTime: data.k.T,
      quoteVolume: parseFloat(data.k.q),
      trades: data.k.n,
      takerBuyBaseVolume: parseFloat(data.k.V),
      takerBuyQuoteVolume: parseFloat(data.k.Q)
    };
    
    // Update or add kline
    const existingIndex = klines.findIndex(k => k.openTime === kline.openTime);
    if (existingIndex >= 0) {
